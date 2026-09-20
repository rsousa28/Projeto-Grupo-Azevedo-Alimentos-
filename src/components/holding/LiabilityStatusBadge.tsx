import React from 'react';
import { CheckCircle2, Clock, AlertOctagon } from 'lucide-react';
import { TreasuryLiability } from '../../types/treasuryDomain';

interface LiabilityStatusBadgeProps {
  readonly status: TreasuryLiability['status'];
  readonly dueDay?: number;
  readonly daysOverdue?: number;
}

/**
 * Componente atômico para exibição de status financeiro com conformidade WCAG AA
 * (rácio de contraste superior a 4.5:1 com textos em alto contraste).
 */
export const LiabilityStatusBadge: React.FC<LiabilityStatusBadgeProps> = ({
  status,
  daysOverdue,
}) => {
  switch (status) {
    case 'SETTLED':
      return (
        <span 
          role="status"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800/80"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <span>Quitado</span>
        </span>
      );

    case 'OVERDUE':
      return (
        <span 
          role="status"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-300 dark:border-rose-800/80"
        >
          <AlertOctagon className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" aria-hidden="true" />
          <span>Atrasado {daysOverdue ? `(${daysOverdue}d)` : ''}</span>
        </span>
      );

    case 'PENDING':
    default:
      return (
        <span 
          role="status"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800/80"
        >
          <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <span>Em Aberto</span>
        </span>
      );
  }
};
