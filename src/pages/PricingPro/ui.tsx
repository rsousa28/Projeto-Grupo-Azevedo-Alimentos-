// Componentes visuais compartilhados da Precificação PRO (claro e escuro).
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

// ---------------------------------------------------------------
// Formatação pt-BR
// ---------------------------------------------------------------

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function brl(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return 'R$ 0,00';
  if (digits === 2) return brlFmt.format(value);
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Custo unitário pequeno com casas suficientes (R$ 0,0493). */
export function brlUnit(value: number): string {
  if (!Number.isFinite(value) || value === 0) return 'R$ 0,00';
  const digits = Math.abs(value) >= 1 ? 2 : Math.abs(value) >= 0.01 ? 4 : 5;
  return brl(value, digits);
}

export function pct(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return '0%';
  return `${(fraction * 100).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function num(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function parseBR(text: string): number {
  const t = text.trim().replace(/[R$\s%]/g, '');
  if (!t) return 0;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

// twMerge resolve conflitos (ex.: w-full do campo + w-auto passado por quem usa)
export const cx = (...c: Array<string | false | null | undefined>) => twMerge(c.filter(Boolean).join(' '));

// ---------------------------------------------------------------
// Estrutura
// ---------------------------------------------------------------

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cx('rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171513]', className)}>
      {children}
    </div>
  );
}

export function PanelHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3.5 sm:px-5 dark:border-white/5">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-stone-900 dark:text-stone-100">{title}</h3>
          {subtitle && <p className="text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  orange: 'bg-orange-500 text-white',
  green: 'bg-emerald-500 text-white',
  red: 'bg-rose-500 text-white',
  purple: 'bg-violet-500 text-white',
  blue: 'bg-sky-500 text-white',
  amber: 'bg-amber-500 text-white',
  slate: 'bg-stone-500 text-white',
} as const;

export type Tone = keyof typeof TONES;

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'orange',
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  highlight?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex min-w-0 items-start gap-3 rounded-2xl border p-3.5 shadow-sm xl:p-4',
        highlight
          ? 'border-emerald-900 bg-emerald-950 text-white'
          : 'border-stone-200 bg-white dark:border-white/10 dark:bg-[#171513]',
      )}
    >
      <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm', TONES[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className={cx('text-xs font-semibold uppercase tracking-wide', highlight ? 'text-emerald-200' : 'text-stone-500 dark:text-stone-400')}>
          {label}
        </p>
        <p className={cx('mt-0.5 whitespace-nowrap text-lg font-black tabular-nums xl:text-xl', highlight ? 'text-white' : 'text-stone-900 dark:text-stone-50')}>
          {value}
        </p>
        {hint && <p className={cx('mt-0.5 text-xs', highlight ? 'text-emerald-200' : 'text-stone-500 dark:text-stone-400')}>{hint}</p>}
      </div>
    </div>
  );
}

export function Badge({ tone = 'slate', children }: { tone?: 'green' | 'red' | 'amber' | 'slate' | 'orange' | 'blue'; children: React.ReactNode }) {
  const map = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    red: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300',
    slate: 'bg-stone-100 text-stone-700 ring-stone-500/20 dark:bg-white/5 dark:text-stone-300',
    orange: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-300',
    blue: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300',
  };
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset', map[tone])}>
      {children}
    </span>
  );
}

export function Hint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <Lightbulb className="h-3.5 w-3.5 cursor-help text-amber-500" aria-label={text} />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded-lg bg-stone-900 px-3 py-2 text-[11px] font-medium normal-case leading-snug tracking-normal text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">{icon}</div>
      <p className="font-bold text-stone-900 dark:text-stone-100">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-stone-500 dark:text-stone-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------
// Botões e campos
// ---------------------------------------------------------------

type BtnVariant = 'primary' | 'success' | 'ghost' | 'outline' | 'danger' | 'dark';

export function Btn({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  const v = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-500/20',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20',
    dark: 'bg-stone-900 text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200',
    ghost: 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/5',
    outline: 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-white/10 dark:bg-transparent dark:text-stone-200 dark:hover:bg-white/5',
    danger: 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10',
  }[variant];
  const s = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';
  return (
    <button
      type="button"
      className={cx('inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-50', v, s, className)}
      {...rest}
    />
  );
}

export const inputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 dark:border-white/10 dark:bg-white/5 dark:text-stone-100';

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-400">
        {label}
        {hint && <Hint text={hint} />}
      </span>
      {children}
    </label>
  );
}

/**
 * Campo numérico que aceita vírgula ("1.000,50") e só grava ao sair do campo ou com Enter,
 * para não recalcular a tela a cada tecla.
 */
export function NumInput({
  value,
  onChange,
  mode = 'number',
  digits = 2,
  className,
  placeholder,
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  mode?: 'number' | 'money' | 'pct';
  digits?: number;
  className?: string;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const show = (v: number) => {
    if (!Number.isFinite(v)) return '';
    const shown = mode === 'pct' ? v * 100 : v;
    return shown.toLocaleString('pt-BR', { minimumFractionDigits: mode === 'money' ? 2 : 0, maximumFractionDigits: digits });
  };
  const [text, setText] = useState(show(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  const commit = () => {
    const n = parseBR(text);
    const next = mode === 'pct' ? n / 100 : n;
    if (!(Math.abs(next - value) <= 1e-12)) onChange(next); // também grava quando o valor anterior era vazio (NaN)
    setText(show(next));
  };

  return (
    <div className="relative">
      {mode === 'money' && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">R$</span>}
      <input
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
        }}
        className={cx(inputClass, 'tabular-nums', mode === 'money' && 'pl-9', mode === 'pct' && 'pr-7', className)}
        {...rest}
      />
      {mode === 'pct' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">%</span>}
    </div>
  );
}

/** Texto que grava ao sair do campo. */
export function TextInput({
  value,
  onChange,
  className,
  ...rest
}: { value: string; onChange: (v: string) => void; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onChange(text)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
      }}
      className={cx(inputClass, className)}
      {...rest}
    />
  );
}

export function Select({ className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(inputClass, 'pr-8', className)} {...rest} />;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(inputClass, 'pl-9')} />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: React.ReactNode }>;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1 dark:border-white/10 dark:bg-white/5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition sm:text-sm',
            value === o.value
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-stone-600 hover:bg-white dark:text-stone-300 dark:hover:bg-white/5',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  // Portal no body: o conteúdo da página fica num contexto de empilhamento abaixo da barra lateral.
  // O tema escuro do app é uma classe num div do layout, então repassamos para o portal.
  const dark = !!document.querySelector('.dark');
  return createPortal(
    <div className={cx(dark && 'dark')}>
      <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
        <div
          className={cx(
            'flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-[#1c1917]',
            wide ? 'sm:max-w-4xl' : 'sm:max-w-lg',
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5 dark:border-white/10">
            <h3 className="font-bold text-stone-900 dark:text-stone-100">{title}</h3>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-white/10" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4 text-stone-800 dark:text-stone-200">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-stone-100 px-5 py-3 dark:border-white/10">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Tabela responsiva com rolagem horizontal própria (a página nunca rola de lado). */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>;
}

export const th = 'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400';
export const td = 'px-3 py-2 align-middle text-sm text-stone-800 dark:text-stone-200';
