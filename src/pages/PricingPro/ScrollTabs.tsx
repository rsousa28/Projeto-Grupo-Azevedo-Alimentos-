// Barra de abas com rolagem horizontal discreta: sem barra de rolagem visível, setas e esmaecido
// nas bordas só quando há mais abas para os lados, aba ativa sempre à vista e navegação pelo teclado.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from './ui';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon: React.ElementType;
  count?: number;
}

export default function ScrollTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: Array<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, tabs.length]);

  // Mantém a aba ativa visível (ao abrir a página e ao trocar de aba)
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [value]);

  const page = (dir: -1 | 1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === value);
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    scroller.current?.querySelector<HTMLElement>(`[data-tab="${tabs[next].id}"]`)?.focus();
  };

  return (
    <div className="relative border-b border-stone-200 dark:border-white/10">
      <div
        ref={scroller}
        onScroll={measure}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map(({ id, label: text, icon: Icon, count }) => {
          const active = id === value;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              data-tab={id}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(id)}
              className={cx(
                'group relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3 pb-3 pt-2 text-sm font-medium outline-none transition-colors',
                'focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-orange-500/40',
                active ? 'text-stone-900 dark:text-white' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100',
              )}
            >
              <Icon className={cx('h-4 w-4', active ? 'text-orange-500' : 'text-stone-400 group-hover:text-stone-500')} />
              {text}
              {count !== undefined && (
                <span
                  className={cx(
                    'min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-semibold tabular-nums',
                    active
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
                      : 'bg-stone-100 text-stone-500 dark:bg-white/5 dark:text-stone-400',
                  )}
                >
                  {count}
                </span>
              )}
              <span
                aria-hidden
                className={cx(
                  'absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors',
                  active ? 'bg-orange-500' : 'bg-transparent group-hover:bg-stone-300 dark:group-hover:bg-white/20',
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Bordas: esmaecido + seta só quando existe conteúdo escondido daquele lado */}
      {edges.left && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-16 items-center bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/80 to-transparent dark:from-[#0F0F0F] dark:via-[#0F0F0F]/80">
          <EdgeButton side="left" onClick={() => page(-1)} />
        </div>
      )}
      {edges.right && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-16 items-center justify-end bg-gradient-to-l from-[#F8FAFC] via-[#F8FAFC]/80 to-transparent dark:from-[#0F0F0F] dark:via-[#0F0F0F]/80">
          <EdgeButton side="right" onClick={() => page(1)} />
        </div>
      )}
    </div>
  );
}

function EdgeButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      aria-label={side === 'left' ? 'Ver abas anteriores' : 'Ver mais abas'}
      className="pointer-events-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:text-stone-900 dark:border-white/10 dark:bg-[#1c1917] dark:text-stone-300 dark:hover:text-white"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
