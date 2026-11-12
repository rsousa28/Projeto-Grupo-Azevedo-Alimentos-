// SEFAZ "Distribuição DF-e": every NF-e issued against the company's CNPJ in the last 90 days, then
// each new one, fetched with the company's A1 certificate (mutual TLS). Read-only: nothing here sends
// an event (such as "Ciência da Operação") on the company's behalf.
import https from "node:https";
import { gunzipSync } from "node:zlib";
import { X509Certificate } from "node:crypto";

export interface SefazCertificate {
  certPem: string;
  keyPem: string;
}

export interface DistDoc {
  nsu: string;
  schema: string; // resNFe_v1.01.xsd, procNFe_v4.00.xsd, resEvento_v1.01.xsd, procEventoNFe_v1.00.xsd
  xml: string;
}

export interface DistResult {
  cStat: string; // 138 = documents found, 137 = nothing new, 656 = too many requests
  xMotivo: string;
  ultNSU: string;
  maxNSU: string;
  docs: DistDoc[];
}

export interface DfeClient {
  distribution(ultNSU: string): Promise<DistResult>;
}

const DIST_URL = "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
const DIST_ACTION = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse";

/** Reads the company CNPJ from an ICP-Brasil certificate ("NAME:CNPJ" in the subject CN). */
export function certificateInfo(certPem: string): { cnpj: string; name: string; validTo: Date } {
  const x509 = new X509Certificate(certPem);
  const cn = x509.subject.match(/CN=([^\n]+)/)?.[1] || "";
  const [name, cnpj = ""] = cn.split(/:(?=\d{14}$)/);
  return { cnpj, name, validTo: new Date(x509.validTo) };
}

/** Parses the SEFAZ certificate secret (JSON with certPem and keyPem). */
export function parseCertificateSecret(raw: string): SefazCertificate {
  const parsed = JSON.parse(raw || "{}");
  if (!parsed.certPem || !parsed.keyPem) throw new Error("SEFAZ_CERTIFICATE must hold certPem and keyPem");
  return { certPem: parsed.certPem, keyPem: parsed.keyPem };
}

export const padNSU = (nsu: string | number) => String(nsu).replace(/\D/g, "").padStart(15, "0").slice(-15);

function soapPost(url: string, action: string, body: string, cert: SefazCertificate, timeoutMs = 45000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        cert: cert.certPem,
        key: cert.keyPem,
        timeout: timeoutMs,
        headers: {
          "Content-Type": `application/soap+xml; charset=utf-8; action="${action}"`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if ((res.statusCode || 0) >= 400) reject(new Error(`SEFAZ HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
          else resolve(text);
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("SEFAZ did not answer in time")));
    req.on("error", reject);
    req.end(body);
  });
}

export function buildDistributionRequest(cnpj: string, uf: number, ultNSU: string): string {
  return (
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>' +
    '<nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDadosMsg>' +
    '<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">' +
    `<tpAmb>1</tpAmb><cUFAutor>${uf}</cUFAutor><CNPJ>${cnpj}</CNPJ>` +
    `<distNSU><ultNSU>${padNSU(ultNSU)}</ultNSU></distNSU>` +
    "</distDFeInt></nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>"
  );
}

const tag = (xml: string, name: string) =>
  xml.match(new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([^<]*)</(?:[\\w-]+:)?${name}>`))?.[1]?.trim() || "";

export function parseDistributionResponse(soap: string): DistResult {
  const ret = soap.match(/<retDistDFeInt[\s\S]*?<\/retDistDFeInt>/)?.[0];
  if (!ret) throw new Error(`Unexpected SEFAZ answer: ${soap.slice(0, 300)}`);
  const docs = Array.from(ret.matchAll(/<docZip\s+([^>]*)>([^<]+)<\/docZip>/g), (m) => ({
    nsu: padNSU(m[1].match(/NSU="(\d+)"/)?.[1] || "0"),
    schema: m[1].match(/schema="([^"]+)"/)?.[1] || "",
    xml: gunzipSync(Buffer.from(m[2], "base64")).toString("utf8"),
  }));
  return {
    cStat: tag(ret, "cStat"),
    xMotivo: tag(ret, "xMotivo"),
    ultNSU: padNSU(tag(ret, "ultNSU") || "0"),
    maxNSU: padNSU(tag(ret, "maxNSU") || "0"),
    docs,
  };
}

export function createDfeClient(cert: SefazCertificate, company: { cnpj: string; uf: number }): DfeClient {
  return {
    async distribution(ultNSU) {
      const soap = await soapPost(DIST_URL, DIST_ACTION, buildDistributionRequest(company.cnpj, company.uf, ultNSU), cert);
      return parseDistributionResponse(soap);
    },
  };
}

export interface NFeSummary {
  key: string;
  supplierCnpj: string;
  supplierName: string;
  issuedAt: string;
  total: number;
  situation: "authorized" | "denied" | "cancelled";
}

/** resNFe: the short version SEFAZ sends before the full XML is available to the recipient. */
export function parseSummary(xml: string): NFeSummary {
  const issued = tag(xml, "dhEmi");
  const sit = tag(xml, "cSitNFe");
  return {
    key: tag(xml, "chNFe"),
    supplierCnpj: tag(xml, "CNPJ") || tag(xml, "CPF"),
    supplierName: tag(xml, "xNome"),
    issuedAt: issued ? new Date(issued).toISOString() : new Date().toISOString(),
    total: Number(tag(xml, "vNF")) || 0,
    situation: sit === "3" ? "cancelled" : sit === "2" ? "denied" : "authorized",
  };
}

/** resEvento / procEventoNFe: only cancellations matter here. */
export function parseEvent(xml: string): { key: string; type: string; cancelled: boolean } {
  const type = tag(xml, "tpEvento");
  return { key: tag(xml, "chNFe"), type, cancelled: type === "110111" || type === "110112" };
}
