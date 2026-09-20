import React, { useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Building2, Store, Archive } from 'lucide-react';

export type StatusTab = 'ALL' | 'OPEN' | 'QUITADO';

export interface StoreOption {
  readonly id: string;
  readonly label: string;
  readonly type: 'ALL' | 'STORE' | 'HOLDING' | 'CLOSED';
  readonly subtitle?: string;
  readonly isClosed?: boolean;
}

export interface FilterState {
  readonly status: StatusTab;
  readonly unitId: string;
  readonly searchQuery: string;
}

export interface StatusCounts {
  readonly all: number;
  readonly open: number;
  readonly quitado: number;
}

export interface TableFiltersToolbarProps {
  readonly isDarkMode: boolean;
  readonly status: StatusTab;
  readonly counts: StatusCounts;
  readonly onStatusChange: (status: StatusTab) => void;
  readonly unitId: string;
  readonly storeOptions: readonly StoreOption[];
  readonly onUnitChange: (unitId: string) => void;
  readonly searchQuery: string;
  readonly onSearchChange: (query: string) => void;
}

/**
 * Componente refinado de Toolbar de Filtros Financeiros:
 * - Segmented Control / Tabs com role="tablist", aria-selected e navegação por teclado (Setas, Home, End)
 * - Cores semânticas neutras e suaves (WCAG 2.1 AA) sem saturação excessiva
 * - Dropdown unificado de Unidades com seção clara e destacada para "Lojas Encerradas"
 * - Input de busca rápida integrado por credor, tributo ou contrato
 */
export const TableFiltersToolbar: React.FC<TableFiltersToolbarProps> = ({
  isDarkMode,
  status,
  counts,
  onStatusChange,
  unitId,
  storeOptions,
  onUnitChange,
  searchQuery,
  onSearchChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora ou apertar ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Navegação acessível por teclado no Segmented Control (ArrowLeft / ArrowRight / Home / End)
  const tabKeys: StatusTab[] = ['ALL', 'OPEN', 'QUITADO'];
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabKeys.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabKeys.length) % tabKeys.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabKeys.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    onStatusChange(tabKeys[nextIndex]);
    const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
    buttons?.[nextIndex]?.focus();
  };

  const selectedStore = storeOptions.find(o => o.id === unitId) || storeOptions[0];

  // Separar opções ativas e fechadas para organização visual limpa
  const activeOptions = storeOptions.filter(o => o.type !== 'CLOSED');
  const closedOptions = storeOptions.filter(o => o.type === 'CLOSED');

  return (
    <div 
      className={`p-3 sm:p-4 rounded-2xl border transition-colors flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 ${
        isDarkMode 
          ? 'bg-[#18181C]/90 border-[#26262B] text-slate-200' 
          : 'bg-white border-slate-200 shadow-xs text-slate-800'
      }`}
    >
      {/* 1. SEGMENTED CONTROL / TABS (Dimensão: Estado do Passivo) */}
      <div 
        ref={tablistRef}
        role="tablist" 
        aria-label="Filtrar obrigações por status de pagamento"
        className={`flex items-center p-1 rounded-xl border self-start sm:self-auto shrink-0 w-full sm:w-auto ${
          isDarkMode ? 'bg-[#121215] border-[#222228]' : 'bg-slate-100 border-slate-200'
        }`}
      >
        {/* Aba: Todos */}
        <button
          type="button"
          role="tab"
          id="tab-status-all"
          aria-selected={status === 'ALL'}
          aria-controls="panel-liabilities"
          tabIndex={status === 'ALL' ? 0 : -1}
          onClick={() => onStatusChange('ALL')}
          onKeyDown={(e) => handleTabKeyDown(e, 0)}
          className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
            status === 'ALL'
              ? isDarkMode 
                ? 'bg-[#27272F] text-white shadow-xs font-bold border border-[#3A3A45]' 
                : 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80'
              : isDarkMode 
                ? 'text-slate-400 hover:text-slate-200' 
                : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Todos</span>
          <span 
            className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
              status === 'ALL'
                ? isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-800'
                : isDarkMode ? 'bg-[#1C1C22] text-slate-500' : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            {counts.all}
          </span>
        </button>

        {/* Aba: Em Aberto */}
        <button
          type="button"
          role="tab"
          id="tab-status-open"
          aria-selected={status === 'OPEN'}
          aria-controls="panel-liabilities"
          tabIndex={status === 'OPEN' ? 0 : -1}
          onClick={() => onStatusChange('OPEN')}
          onKeyDown={(e) => handleTabKeyDown(e, 1)}
          className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
            status === 'OPEN'
              ? isDarkMode 
                ? 'bg-[#27272F] text-amber-300 shadow-xs font-bold border border-amber-500/30' 
                : 'bg-white text-amber-700 shadow-xs font-bold border border-amber-300/80'
              : isDarkMode 
                ? 'text-slate-400 hover:text-slate-200' 
                : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Em Aberto</span>
          <span 
            className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
              status === 'OPEN'
                ? isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                : isDarkMode ? 'bg-amber-500/10 text-amber-400/70' : 'bg-amber-50 text-amber-700/80'
            }`}
          >
            {counts.open}
          </span>
        </button>

        {/* Aba: Quitados */}
        <button
          type="button"
          role="tab"
          id="tab-status-quitado"
          aria-selected={status === 'QUITADO'}
          aria-controls="panel-liabilities"
          tabIndex={status === 'QUITADO' ? 0 : -1}
          onClick={() => onStatusChange('QUITADO')}
          onKeyDown={(e) => handleTabKeyDown(e, 2)}
          className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
            status === 'QUITADO'
              ? isDarkMode 
                ? 'bg-[#27272F] text-emerald-300 shadow-xs font-bold border border-emerald-500/30' 
                : 'bg-white text-emerald-700 shadow-xs font-bold border border-emerald-300/80'
              : isDarkMode 
                ? 'text-slate-400 hover:text-slate-200' 
                : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
          <span>Quitados</span>
          <span 
            className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
              status === 'QUITADO'
                ? isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                : isDarkMode ? 'bg-emerald-500/10 text-emerald-400/70' : 'bg-emerald-50 text-emerald-700/80'
            }`}
          >
            {counts.quitado}
          </span>
        </button>
      </div>

      {/* 2. BARRA DE FERRAMENTAS INTEGRADA: Busca + Dropdown Unidade (com seção para Lojas Encerradas) */}
      <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
        
        {/* Campo de Busca Rápida */}
        <div className="relative flex-1 sm:w-64 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar credor, tributo, notas..."
            aria-label="Buscar passivo por credor, tributo ou descrição"
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
              isDarkMode 
                ? 'bg-[#121215] border-[#2B2B33] text-white placeholder-slate-500 focus:border-amber-500/50' 
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500'
            }`}
          />
        </div>

        {/* Dropdown de Unidades / Lojas (com seção Lojas Encerradas) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            aria-label={`Unidade selecionada: ${selectedStore?.label || 'Todas as Unidades'}`}
            onClick={() => setIsDropdownOpen(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border inline-flex items-center gap-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
              selectedStore?.type === 'CLOSED'
                ? isDarkMode 
                  ? 'bg-rose-950/30 hover:bg-rose-950/40 border-rose-800/60 text-rose-300' 
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-900 shadow-2xs'
                : isDarkMode 
                  ? 'bg-[#1E1E24] hover:bg-[#25252D] border-[#2C2C35] text-slate-200' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
            }`}
          >
            {selectedStore?.type === 'HOLDING' ? (
              <Building2 className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            ) : selectedStore?.type === 'CLOSED' ? (
              <Archive className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
            ) : (
              <Store className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            )}
            <span className="max-w-[150px] truncate">{selectedStore?.label || 'Todas as Unidades'}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {isDropdownOpen && (
            <div 
              role="listbox" 
              aria-label="Selecione a Unidade ou Loja"
              className={`absolute right-0 mt-1.5 w-64 rounded-2xl border shadow-xl z-30 py-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 max-h-80 overflow-y-auto ${
                isDarkMode ? 'bg-[#1A1A20] border-[#2C2C36] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Seção 1: Unidades Ativas & Holding */}
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-[#262630] mb-1">
                Unidades Ativas & Central
              </div>
              {activeOptions.map((opt) => {
                const isSelected = opt.id === unitId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onUnitChange(opt.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? isDarkMode ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-800 font-bold'
                        : isDarkMode ? 'hover:bg-[#25252E] text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.type === 'HOLDING' ? (
                        <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                      ) : (
                        <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      )}
                      <div className="truncate">
                        <p className="truncate leading-tight">{opt.label}</p>
                        {opt.subtitle && (
                          <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">{opt.subtitle}</p>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />}
                  </button>
                );
              })}

              {/* Seção 2: Unidades Encerradas (Destacada e organizada) */}
              {closedOptions.length > 0 && (
                <>
                  <div className="mt-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-500/90 dark:text-rose-400 border-t border-b border-slate-100 dark:border-[#262630] bg-rose-50/50 dark:bg-rose-950/20 flex items-center gap-1.5">
                    <Archive className="w-3 h-3 text-rose-500" aria-hidden="true" />
                    <span>Lojas Encerradas / Extintas</span>
                  </div>
                  {closedOptions.map((opt) => {
                    const isSelected = opt.id === unitId;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onUnitChange(opt.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? isDarkMode ? 'bg-rose-950/40 text-rose-300 font-bold' : 'bg-rose-100 text-rose-900 font-bold'
                            : isDarkMode ? 'hover:bg-[#25252E] text-slate-300' : 'hover:bg-rose-50/50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Archive className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden="true" />
                          <div className="truncate">
                            <p className="truncate leading-tight text-rose-900 dark:text-rose-200 font-bold">{opt.label}</p>
                            {opt.subtitle && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-normal truncate mt-0.5">{opt.subtitle}</p>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

