import { describe, expect, it } from 'vitest';
import { buildPayableNotification, getPayableTimeParts, type StorePayableSummary } from '../server/payableSummary';

// Intl usa espaço não separável depois de "R$"
const plain = (t: string) => t.replace(/\u00a0/g, ' ');

const time = getPayableTimeParts(new Date('2026-11-11T10:00:00Z')); // 07h em Fortaleza

const store = (storeName: string, over: Partial<StorePayableSummary> = {}): StorePayableSummary => ({
  storeName,
  overdue: 0,
  overdueCount: 0,
  today: 0,
  paid: 0,
  upcoming: 0,
  ...over,
});

describe('relatório horário de contas a pagar', () => {
  it('monta o relatório estruturado com status e totais do grupo', () => {
    const n = buildPayableNotification(
      [
        store('B32 (Mossoró)', { overdue: 16763.91, overdueCount: 11 }),
        store('B28 (Bebelu Rio Mar)', { overdue: 563.99, overdueCount: 1, today: 131.99, paid: 18531.11, upcoming: 20229.45 }),
        store('Vero Pasta'),
      ],
      time,
    );
    expect(n.report.hour).toBe(7);
    expect(n.report.status).toBe('critical');
    expect(n.report.stores.map((s) => [s.storeId, s.status])).toEqual([
      ['1', 'critical'],
      ['2', 'critical'],
      ['3', 'ok'],
    ]);
    expect(n.report.total.overdue).toBeCloseTo(17327.9, 2);
    expect(n.report.total.overdueCount).toBe(12);
    expect(n.notificationDoc.report).toBe(n.report);
  });

  it('texto do celular: manchete com o vencido e uma linha por unidade', () => {
    const n = buildPayableNotification(
      [store('B32 (Mossoró)', { overdue: 100, overdueCount: 1 }), store('Vero Pasta', { upcoming: 50 })],
      time,
    );
    expect(plain(n.title)).toBe('🔴 Contas a Pagar · 07h · R$ 100,00 vencidos');
    const lines = plain(n.body).split('\n');
    expect(lines[0]).toBe('🔴 B32 Mossoró: vencido R$ 100,00 (1 boleto)');
    expect(lines[1]).toBe('🟢 Vero Pasta: em dia · a vencer R$ 50,00');
    expect(lines[2]).toMatch(/^Grupo · hoje/);
  });

  it('sem vencidos destaca o que vence hoje, e tudo em dia fica verde', () => {
    const today = buildPayableNotification([store('Vero Pasta', { today: 80 })], time);
    expect(today.report.status).toBe('attention');
    expect(plain(today.title)).toBe('🟡 Contas a Pagar · 07h · R$ 80,00 vencem hoje');
    const ok = buildPayableNotification([store('Vero Pasta')], time);
    expect(ok.title).toBe('🟢 Contas a Pagar · 07h · tudo em dia');
  });
});
