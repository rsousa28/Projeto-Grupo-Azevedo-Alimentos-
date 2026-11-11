import { describe, expect, it } from 'vitest';
import {
  cashClosingNotification,
  checklistNotification,
  parseCard,
  payableChangeNotification,
  pushText,
  syncNotification,
} from '../src/lib/notifications';

// Intl usa espaço não separável depois de "R$"
const plain = (t: string) => t.replace(/ /g, ' ');

describe('padrão das notificações', () => {
  it('caixa: falta vira crítico, sobra vira aviso, zerado vira sucesso', () => {
    const base = { storeName: 'Vero Pasta', userName: 'Ana', date: '2026-11-11', totalGeral: 5230.5, totalSistema: 5280.5 };
    const falta = cashClosingNotification({ ...base, diff: -50 });
    expect(falta.tone).toBe('critical');
    expect(falta.title).toBe('Caixa fechado com falta');
    expect(falta.subtitle).toBe('Vero Pasta · Ana · 11/11/2026');
    expect(plain(falta.fields![1].value)).toBe('−R$ 50,00');
    expect(cashClosingNotification({ ...base, diff: 12 }).tone).toBe('warning');
    expect(cashClosingNotification({ ...base, diff: 0 }).tone).toBe('success');
  });

  it('push do celular: "bolinha + categoria · manchete", contexto e números', () => {
    const n = cashClosingNotification({ storeName: 'B32', userName: 'Leo', date: '2026-11-11', totalGeral: 1000, totalSistema: 1000, diff: 0 });
    const { title, body } = pushText(n);
    expect(title).toBe('🟢 Caixa · Caixa fechado e conferido');
    expect(plain(body)).toBe('B32 · Leo · 11/11/2026\nReceita do dia R$ 1.000,00 · Sistema R$ 1.000,00 · Diferença R$ 0,00');
  });

  it('checklist usa a conformidade como número principal', () => {
    const n = checklistNotification({ storeName: 'B28', templateTitle: 'Abertura', userName: 'Bia', conformityIndex: 72.4, plansCount: 2 });
    expect(n.tone).toBe('warning');
    expect(n.metric).toEqual({ label: 'Conformidade', value: '72%', tone: 'warning' });
    expect(n.fields?.map((f) => f.label)).toEqual(['Responsável', 'Planos de ação']);
  });

  it('contas e sincronização seguem o mesmo formato', () => {
    const paid = payableChangeNotification({ action: 'PAID', supplier: 'Atacadão', value: 320, storeName: 'Vero Pasta', userName: 'Rennan' });
    expect(paid.tone).toBe('success');
    expect(plain(pushText(paid).body)).toBe('Vero Pasta · Rennan\nAtacadão R$ 320,00');
    expect(syncNotification(1).subtitle).toBe('1 registro salvo offline foi enviado');
  });

  it('parseCard só aceita o formato versionado', () => {
    expect(parseCard({ version: 1, title: 'x', category: 'Caixa' })).toBeTruthy();
    expect(parseCard({ title: 'x' })).toBeUndefined();
    expect(parseCard(null)).toBeUndefined();
  });
});
