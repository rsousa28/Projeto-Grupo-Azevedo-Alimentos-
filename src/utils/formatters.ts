/**
 * Helper formatting functions for financial and operational metrics.
 */

export const formatCleanYAxisCurrency = (val: number): string => {
  if (val === 0 || !val || isNaN(val)) return 'R$ 0';
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (absVal >= 1_000_000) {
    const millions = absVal / 1_000_000;
    return `${sign}R$ ${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (absVal >= 1_000) {
    const thousands = absVal / 1_000;
    return `${sign}R$ ${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(0)}k`;
  }
  return `${sign}R$ ${absVal.toFixed(0)}`;
};
