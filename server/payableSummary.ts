// Shared Accounts Payable hourly summary logic.
// Used by server.ts (manual trigger endpoint) and scripts/hourly-payable.ts (GitHub Actions schedule).
// Pure functions only: each caller reads Firestore and sends push with its own SDK.

// All stores are in Ceará / Rio Grande do Norte (UTC-3, no daylight saving)
export const STORE_TIME_ZONE = "America/Fortaleza";

export const PAYABLE_STORES = [
  { id: "1", name: "B32 (Mossoró)" },
  { id: "2", name: "B28 (Bebelu Rio Mar)" },
  { id: "3", name: "Vero Pasta" },
];

export interface PayableTimeParts {
  todayStr: string;         // YYYY-MM-DD in store local time
  currentMonthYear: string; // YYYY-MM
  hour: number;             // 0-23 in store local time
  hourKey: string;          // YYYY-MM-DD_H<hour>
}

export interface StorePayableSummary {
  storeName: string;
  overdue: number;
  overdueCount: number;
  today: number;
  paid: number;
  upcoming: number;
}

export function getPayableTimeParts(now: Date = new Date()): PayableTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const todayStr = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));
  return {
    todayStr,
    currentMonthYear: todayStr.slice(0, 7),
    hour,
    hourKey: `${todayStr}_H${hour}`,
  };
}

export function formatBrl(val: number): string {
  return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Accounts are stored either inline on stores/{id}/accounts_payable/all or split into chunk docs
export function parseAccountsDoc(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

export function parseAccountsChunks(chunks: { index: number; data: string }[]): any[] {
  if (chunks.length === 0) return [];
  const list = [...chunks].sort((a, b) => (a.index || 0) - (b.index || 0));
  const parsed = JSON.parse(list.map((c) => c.data).join(""));
  return Array.isArray(parsed.data) ? parsed.data : Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
}

// Strict store isolation boundary matching AccountsPayable.tsx & NotificationService.ts
function belongsToStore(storeId: string, ac: any): boolean {
  if (!ac || !ac.dueDate || ac.deleted) return false;

  if (storeId === "1") {
    if (ac.storeId === "2" || ac.storeId === "3") return false;
    const sName = String(ac.storeName || "").toUpperCase();
    if (sName.includes("RIO MAR") || sName.includes("B28") || sName.includes("PAPICU") || sName.includes("VERO") || sName.includes("PASTA")) {
      return false;
    }
    return true;
  }

  if (storeId === "2") {
    if (ac.storeId === "2") return true;
    const sName = String(ac.storeName || "").toUpperCase();
    return sName.includes("RIO MAR") || sName.includes("B28") || sName.includes("PAPICU");
  }

  if (storeId === "3") {
    if (ac.storeId === "3") return true;
    const sName = String(ac.storeName || "").toUpperCase();
    return sName.includes("VERO") || sName.includes("PASTA");
  }

  return !ac.storeId || ac.storeId === storeId;
}

export function summarizeStorePayables(
  store: { id: string; name: string },
  accounts: any[],
  time: PayableTimeParts
): StorePayableSummary {
  const { todayStr, currentMonthYear } = time;
  const summary: StorePayableSummary = { storeName: store.name, overdue: 0, overdueCount: 0, today: 0, paid: 0, upcoming: 0 };

  for (const ac of accounts.filter((a) => belongsToStore(store.id, a))) {
    const val = Number(ac.value) || 0;
    const partial = Number(ac.partialAmountPaid) || 0;
    const fine = Number(ac.fine) || 0;
    const interest = Number(ac.interest) || 0;
    const discount = Number(ac.discount) || 0;
    const remaining = Math.max(0, val - partial);

    const statusNorm = String(ac.status || "Pendente").trim().toLowerCase();
    const due = String(ac.dueDate);

    const isPaid = statusNorm === "pago" || statusNorm === "paid";
    const isCanceled = statusNorm === "cancelado" || statusNorm === "canceled";
    const isPartiallyPaid = statusNorm === "parcialmente pago" || statusNorm === "partially_paid";
    const isOverdue = statusNorm === "vencido" || statusNorm === "overdue" ||
      ((statusNorm === "pendente" || statusNorm === "agendado" || isPartiallyPaid) && due < todayStr);

    if (isCanceled) continue;

    // A Pagar Hoje: due today and not paid
    if (due === todayStr && !isPaid && remaining > 0) {
      summary.today += remaining;
    }

    // Total Vencido: overdue unpaid/partially-unpaid balance
    if (isOverdue && !isPaid && remaining > 0) {
      summary.overdue += remaining;
      summary.overdueCount++;
    }

    // Pagas no Mês: strictly assigned to their actual payment execution month
    const hasDueDateInRange = due.startsWith(currentMonthYear);
    const hasPaymentDateInRange = ac.paymentDate && String(ac.paymentDate).startsWith(currentMonthYear);
    const matchesPaymentPeriod = ac.paymentDate ? hasPaymentDateInRange : hasDueDateInRange;

    if (isPaid && matchesPaymentPeriod) {
      summary.paid += (val + fine + interest - discount);
    } else if (isPartiallyPaid && matchesPaymentPeriod && partial > 0) {
      summary.paid += partial;
    }

    // Compromissos Futuros: due in future (after today) and not paid
    if (due > todayStr && !isPaid && remaining > 0) {
      summary.upcoming += remaining;
    }
  }

  return summary;
}

export type PayableStatus = "critical" | "attention" | "ok";

export interface PayableReportStore {
  storeId: string;
  storeName: string;
  status: PayableStatus;
  today: number;
  overdue: number;
  overdueCount: number;
  paid: number;
  upcoming: number;
}

/** Structured hourly report: the app draws its own card from this; the text versions are for phones. */
export interface PayableReport {
  version: 1;
  hourKey: string;
  hour: number;
  date: string; // YYYY-MM-DD in store local time
  status: PayableStatus;
  stores: PayableReportStore[];
  total: Omit<PayableReportStore, "storeId" | "storeName" | "status">;
}

// Short store labels so each phone line fits: "B32 (Mossoró)" -> "B32 Mossoró"
function shortStoreName(name: string): string {
  return name.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
}

function storeStatus(s: { overdue: number; today: number }): PayableStatus {
  if (s.overdue > 0) return "critical";
  if (s.today > 0) return "attention";
  return "ok";
}

export function buildPayableReport(summaries: StorePayableSummary[], time: PayableTimeParts, storeIds?: string[]): PayableReport {
  const stores = summaries.map((s, i) => ({
    storeId: storeIds?.[i] ?? PAYABLE_STORES.find((p) => p.name === s.storeName)?.id ?? String(i + 1),
    storeName: s.storeName,
    status: storeStatus(s),
    today: s.today,
    overdue: s.overdue,
    overdueCount: s.overdueCount,
    paid: s.paid,
    upcoming: s.upcoming,
  }));
  const total = stores.reduce(
    (acc, s) => ({
      today: acc.today + s.today,
      overdue: acc.overdue + s.overdue,
      overdueCount: acc.overdueCount + s.overdueCount,
      paid: acc.paid + s.paid,
      upcoming: acc.upcoming + s.upcoming,
    }),
    { today: 0, overdue: 0, overdueCount: 0, paid: 0, upcoming: 0 }
  );
  return {
    version: 1,
    hourKey: time.hourKey,
    hour: time.hour,
    date: time.todayStr,
    status: storeStatus(total),
    stores,
    total,
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Phone push text (no HTML possible there): one headline, one line per store ordered by urgency.
 * Example title: "Contas a Pagar · 07h · R$ 17.327,90 vencidos"
 */
export function payableReportText(report: PayableReport): { title: string; body: string } {
  const hh = String(report.hour).padStart(2, "0");
  const { total } = report;
  const headline =
    report.status === "critical"
      ? `${formatBrl(total.overdue)} vencidos`
      : report.status === "attention"
        ? `${formatBrl(total.today)} vencem hoje`
        : "tudo em dia";
  const title = `${report.status === "critical" ? "🔴" : report.status === "attention" ? "🟡" : "🟢"} Contas a Pagar · ${hh}h · ${headline}`;

  const rank = { critical: 0, attention: 1, ok: 2 } as const;
  const lines = [...report.stores]
    .sort((a, b) => rank[a.status] - rank[b.status] || b.overdue - a.overdue)
    .map((s) => {
      const name = shortStoreName(s.storeName);
      const parts: string[] = [];
      if (s.overdue > 0) parts.push(`vencido ${formatBrl(s.overdue)} (${plural(s.overdueCount, "boleto", "boletos")})`);
      if (s.today > 0) parts.push(`hoje ${formatBrl(s.today)}`);
      if (parts.length === 0) parts.push(s.upcoming > 0 ? `em dia · a vencer ${formatBrl(s.upcoming)}` : "em dia");
      const dot = s.status === "critical" ? "🔴" : s.status === "attention" ? "🟡" : "🟢";
      return `${dot} ${name}: ${parts.join(" · ")}`;
    });
  lines.push(`Grupo · hoje ${formatBrl(total.today)} · pago no mês ${formatBrl(total.paid)} · a vencer ${formatBrl(total.upcoming)}`);
  return { title, body: lines.join("\n") };
}

export function buildPayableNotification(summaries: StorePayableSummary[], time: PayableTimeParts) {
  const report = buildPayableReport(summaries, time);
  const { title, body } = payableReportText(report);
  const tag = `payable_hourly_${time.hourKey}`;
  return {
    title,
    body,
    tag,
    report,
    notificationDoc: {
      title,
      body,
      report,
      // Only admin/finance read it (firestore.rules): it has the payables of every store
      adminOnly: true,
      storeId: "group",
      type: "PAYABLE_HOURLY",
      tag,
      url: "/accounts-payable",
      icon: "/logo_azevedo.png?v=11",
      createdAt: new Date().toISOString(),
      createdByDeviceId: "cloud_server_worker",
    },
    pushPayload: JSON.stringify({
      title,
      body,
      icon: "/logo_azevedo.png?v=11",
      badge: "/logo_azevedo.png?v=11",
      tag,
      data: {
        url: "/accounts-payable",
        hourKey: time.hourKey,
      },
    }),
  };
}

// Expired, revoked, or key-mismatched subscriptions should be pruned from Firestore
export function isPermanentPushError(pushErr: any): boolean {
  return (
    pushErr.statusCode === 400 ||
    pushErr.statusCode === 401 ||
    pushErr.statusCode === 403 ||
    pushErr.statusCode === 404 ||
    pushErr.statusCode === 410 ||
    String(pushErr.message || "").includes("unexpected response code")
  );
}
