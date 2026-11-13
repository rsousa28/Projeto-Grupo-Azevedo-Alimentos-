// Importação com IA: leitura dos arquivos no navegador e consulta à IA pelo servidor (/api/ai/generate,
// que guarda a chave do Gemini e o limite diário). Planilhas viram texto por aba; PDF e foto vão inteiros.
import * as XLSX from 'xlsx';
import { apiFetch } from '../../lib/firebase';
import { FICHAS_INSTRUCTION, FICHAS_SCHEMA, SALES_INSTRUCTION, SALES_SCHEMA, type AiExtraction } from '../../lib/pricing/aiImport';

export type ImportKind = 'fichas' | 'sales';

export interface AiChunk {
  file: string;
  label: string;
  parts: Array<Record<string, unknown>>;
}

const MAX_CHARS = 30_000; // texto por consulta: deixa folga para a resposta da IA
const MAX_PDF_BYTES = 2.5 * 1024 * 1024; // limite de envio do servidor
export const ACCEPT = '.xlsx,.xls,.xlsm,.ods,.csv,.pdf,.jpg,.jpeg,.png,.webp';

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

/** CSV em UTF-8 ou no padrão do Excel/Windows (acentos de "Mês", "Preço" chegam certos nos dois). */
function decodeCsv(buf: ArrayBuffer): string {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    text = new TextDecoder('windows-1252').decode(buf);
  }
  return text.replace(/^﻿/, '');
}

/** Foto reduzida para JPEG (lado maior 2000 px): legível para a IA e leve para enviar. */
function imageToJpeg(file: File, maxSide = 2000): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name}: não consegui abrir esta imagem.`));
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas indisponível'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.src = url;
  });
}

/** Divide o arquivo em consultas: uma por aba da planilha (abas grandes em partes), ou o PDF/foto inteiro. */
export async function fileToChunks(file: File): Promise<AiChunk[]> {
  const name = file.name;
  if (/\.(xlsx|xlsm|xls|ods|csv)$/i.test(name)) {
    const buf = await file.arrayBuffer();
    const wb = /\.csv$/i.test(name) ? XLSX.read(decodeCsv(buf), { type: 'string' }) : XLSX.read(buf, { type: 'array' });
    const chunks: AiChunk[] = [];
    for (const sheet of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheet], { FS: ';', blankrows: false, strip: true });
      const lines = csv
        .split('\n')
        .map((l) => l.replace(/;+$/, ''))
        .filter((l) => l.replace(/[;\s]/g, '').length > 0);
      if (!lines.length) continue;
      const head = lines.slice(0, 3);
      let buf: string[] = [];
      let size = 0;
      let part = 1;
      const flush = () => {
        if (!buf.length) return;
        const body = part > 1 ? [...head, '...', ...buf] : buf;
        chunks.push({
          file: name,
          label: part > 1 ? `${sheet} (parte ${part})` : sheet,
          parts: [{ text: `Arquivo: ${name}\nAba: ${sheet}${part > 1 ? ` (continuação, parte ${part})` : ''}\n\n${body.join('\n')}` }],
        });
        part++;
        buf = [];
        size = 0;
      };
      for (const line of lines) {
        if (size + line.length > MAX_CHARS && buf.length) flush();
        buf.push(line);
        size += line.length + 1;
      }
      flush();
    }
    if (!chunks.length) throw new Error(`${name}: a planilha está vazia.`);
    return chunks;
  }
  if (/\.pdf$/i.test(name) || file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new Error(`${name}: PDF maior que 2,5 MB. Envie a planilha original ou divida o PDF.`);
    return [{ file: name, label: 'PDF', parts: [{ text: `Arquivo: ${name}` }, { inlineData: { mimeType: 'application/pdf', data: toBase64(await file.arrayBuffer()) } }] }];
  }
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(name)) {
    return [{ file: name, label: 'Foto', parts: [{ text: `Arquivo: ${name}` }, { inlineData: { mimeType: 'image/jpeg', data: await imageToJpeg(file) } }] }];
  }
  throw new Error(`${name}: formato não suportado. Use Excel, CSV, PDF ou foto.`);
}

export async function readWithAi(kind: ImportKind, chunk: AiChunk): Promise<Partial<AiExtraction>> {
  const res = await apiFetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-flash-latest',
      contents: [{ role: 'user', parts: chunk.parts }],
      config: {
        systemInstruction: kind === 'fichas' ? FICHAS_INSTRUCTION : SALES_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: kind === 'fichas' ? FICHAS_SCHEMA : SALES_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 16384,
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `A IA não respondeu (${res.status}).`);
  try {
    return JSON.parse(body.text || '{}');
  } catch {
    throw new Error(`A resposta da IA para "${chunk.label}" veio cortada. Divida essa aba em partes menores e tente de novo.`);
  }
}
