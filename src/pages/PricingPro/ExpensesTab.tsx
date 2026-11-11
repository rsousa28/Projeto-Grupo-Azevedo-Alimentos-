import React, { useState } from 'react';
import { Flame, Plus, Receipt, Trash2, TrendingDown, Users, Wallet, Wrench, Zap } from 'lucide-react';
import {
  employeeMonthlyCost,
  energyCostPerHour,
  laborCostPerMinute,
  monthlyDepreciation,
  monthlyPayroll,
  monthlyStructure,
  newId,
} from '../../lib/pricing/engine';
import type { EnergySource, Expense, PricingConfig } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import { Btn, NumInput, Panel, PanelHeader, Segmented, Select, StatCard, TableWrap, TextInput, brl, brlUnit, td, th } from './ui';

type Sub = 'despesas' | 'equipamentos' | 'funcionarios' | 'energia';

export default function ExpensesTab() {
  const { store, run } = usePricing();
  const config = store.data.config;
  const [sub, setSub] = useState<Sub>('despesas');
  const s = monthlyStructure(config);

  const patch = (p: Partial<PricingConfig>) => run(() => store.saveConfig(p));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Estrutura do mês" value={brl(s.total)} hint="Fixas + variáveis + depreciação" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Fixas" value={brl(s.fixedExpenses)} tone="green" />
        <StatCard icon={<TrendingDown className="h-5 w-5" />} label="Variáveis" value={brl(s.variableExpenses)} tone="amber" />
        <StatCard icon={<Wrench className="h-5 w-5" />} label="Depreciação" value={brl(monthlyDepreciation(config))} tone="purple" />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Folha de pagamento"
          value={brl(monthlyPayroll(config))}
          tone="blue"
          hint={config.payrollMode === 'fixed' ? 'Entra nos custos fixos' : `${brlUnit(laborCostPerMinute(config))} por minuto nas fichas`}
        />
      </div>

      <Segmented<Sub>
        value={sub}
        onChange={setSub}
        options={[
          { value: 'despesas', label: <><Receipt className="h-4 w-4" /> Despesas fixas e variáveis</> },
          { value: 'equipamentos', label: <><Wrench className="h-4 w-4" /> Equipamentos e depreciação</> },
          { value: 'funcionarios', label: <><Users className="h-4 w-4" /> Funcionários</> },
          { value: 'energia', label: <><Flame className="h-4 w-4" /> Gás e energia</> },
        ]}
      />

      {sub === 'despesas' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {(['fixed', 'variable'] as const).map((kind) => (
            <ExpenseList key={kind} kind={kind} config={config} onChange={(expenses) => patch({ expenses })} />
          ))}
        </div>
      )}
      {sub === 'equipamentos' && <EquipmentList config={config} onChange={(equipment) => patch({ equipment })} />}
      {sub === 'funcionarios' && <EmployeeList config={config} onChange={(employees) => patch({ employees })} onMode={(payrollMode) => patch({ payrollMode })} />}
      {sub === 'energia' && <EnergyList config={config} onChange={(energy) => patch({ energy })} />}
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label="Remover">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function ExpenseList({ kind, config, onChange }: { kind: Expense['kind']; config: PricingConfig; onChange: (e: Expense[]) => void }) {
  const items = config.expenses.filter((e) => e.kind === kind);
  const total = items.reduce((s, e) => s + e.value, 0);
  const update = (id: string, p: Partial<Expense>) => onChange(config.expenses.map((e) => (e.id === id ? { ...e, ...p } : e)));
  return (
    <Panel>
      <PanelHeader
        title={kind === 'fixed' ? 'Despesas fixas' : 'Despesas variáveis'}
        subtitle={kind === 'fixed' ? 'Pagas todo mês, vendendo ou não: aluguel, contas, contador.' : 'Mudam a cada mês: manutenção, marketing. Use a média mensal.'}
        actions={
          <Btn variant="success" size="sm" onClick={() => onChange([...config.expenses, { id: newId('exp'), name: 'Nova despesa', value: 0, kind }])}>
            <Plus className="h-4 w-4" /> Adicionar
          </Btn>
        }
      />
      <div className="divide-y divide-stone-100 dark:divide-white/5">
        {items.length === 0 && <p className="px-5 py-6 text-sm text-stone-500">Nenhuma despesa cadastrada.</p>}
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-2 px-4 py-2">
            <TextInput value={e.name} onChange={(name) => update(e.id, { name })} className="flex-1" aria-label="Nome da despesa" />
            <div className="w-36">
              <NumInput mode="money" value={e.value} onChange={(value) => update(e.id, { value })} aria-label="Valor mensal" />
            </div>
            <RemoveBtn onClick={() => onChange(config.expenses.filter((x) => x.id !== e.id))} />
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t border-stone-100 px-5 py-3 text-sm font-bold dark:border-white/5">
        <span className="text-stone-500">Total por mês</span>
        <span className="tabular-nums text-orange-600">{brl(total)}</span>
      </div>
    </Panel>
  );
}

function EquipmentList({ config, onChange }: { config: PricingConfig; onChange: (e: PricingConfig['equipment']) => void }) {
  const update = (id: string, p: Partial<PricingConfig['equipment'][number]>) =>
    onChange(config.equipment.map((e) => (e.id === id ? { ...e, ...p } : e)));
  return (
    <Panel>
      <PanelHeader
        icon={<Wrench className="h-5 w-5" />}
        title="Equipamentos e depreciação"
        subtitle="O sistema separa todo mês o dinheiro para trocar o equipamento quando ele acabar."
        actions={
          <Btn variant="success" size="sm" onClick={() => onChange([...config.equipment, { id: newId('eq'), name: 'Novo equipamento', value: 0, lifeYears: 5, residualValue: 0 }])}>
            <Plus className="h-4 w-4" /> Adicionar
          </Btn>
        }
      />
      <TableWrap>
        <table className="w-full min-w-[640px]">
          <thead className="bg-stone-50 dark:bg-white/5">
            <tr>
              <th className={th}>Equipamento</th>
              <th className={th}>Valor pago</th>
              <th className={th}>Vida útil (anos)</th>
              <th className={th}>Valor de revenda</th>
              <th className={`${th} text-right`}>Por mês</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-white/5">
            {config.equipment.map((eq) => (
              <tr key={eq.id}>
                <td className={td}><TextInput value={eq.name} onChange={(name) => update(eq.id, { name })} /></td>
                <td className={`${td} w-36`}><NumInput mode="money" value={eq.value} onChange={(value) => update(eq.id, { value })} /></td>
                <td className={`${td} w-28`}><NumInput value={eq.lifeYears} digits={1} onChange={(lifeYears) => update(eq.id, { lifeYears })} /></td>
                <td className={`${td} w-36`}><NumInput mode="money" value={eq.residualValue} onChange={(residualValue) => update(eq.id, { residualValue })} /></td>
                <td className={`${td} text-right font-bold tabular-nums text-orange-600`}>
                  {brl(monthlyDepreciation({ ...config, equipment: [eq] }))}
                </td>
                <td className={`${td} w-10`}><RemoveBtn onClick={() => onChange(config.equipment.filter((x) => x.id !== eq.id))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <div className="flex justify-between border-t border-stone-100 px-5 py-3 text-sm font-bold dark:border-white/5">
        <span className="text-stone-500">Depreciação mensal</span>
        <span className="tabular-nums text-orange-600">{brl(monthlyDepreciation(config))}</span>
      </div>
    </Panel>
  );
}

function EmployeeList({
  config,
  onChange,
  onMode,
}: {
  config: PricingConfig;
  onChange: (e: PricingConfig['employees']) => void;
  onMode: (m: PricingConfig['payrollMode']) => void;
}) {
  const update = (id: string, p: Partial<PricingConfig['employees'][number]>) =>
    onChange(config.employees.map((e) => (e.id === id ? { ...e, ...p } : e)));
  return (
    <div className="space-y-4">
      <Panel className="p-4 sm:p-5">
        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Como a folha entra no preço</p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Escolha um jeito só, para a equipe não ser cobrada duas vezes no preço.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {([
            ['unit', 'Por minuto em cada produto', 'Cada ficha soma os minutos de preparo vezes o custo do minuto. Mostra o custo real de cada prato.'],
            ['fixed', 'Como custo fixo do mês', 'A folha inteira vai para a estrutura do mês e é dividida pelo faturamento.'],
          ] as const).map(([mode, title, text]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onMode(mode)}
              className={`rounded-xl border p-3 text-left transition ${
                config.payrollMode === mode
                  ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-500/20 dark:bg-orange-500/10'
                  : 'border-stone-200 hover:border-stone-300 dark:border-white/10'
              }`}
            >
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{text}</p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          icon={<Users className="h-5 w-5" />}
          title="Cadastro de funcionários"
          subtitle={`Custo médio do minuto da equipe: ${brlUnit(laborCostPerMinute(config))}`}
          actions={
            <Btn
              variant="success"
              size="sm"
              onClick={() => onChange([...config.employees, { id: newId('emp'), name: 'Novo funcionário', salary: 0, chargesPct: 0.36, benefits: 0, hoursPerMonth: 220 }])}
            >
              <Plus className="h-4 w-4" /> Adicionar
            </Btn>
          }
        />
        <TableWrap>
          <table className="w-full min-w-[820px]">
            <thead className="bg-stone-50 dark:bg-white/5">
              <tr>
                <th className={th}>Nome / função</th>
                <th className={th}>Salário</th>
                <th className={th}>Encargos</th>
                <th className={th}>Benefícios</th>
                <th className={th}>Horas/mês</th>
                <th className={`${th} text-right`}>Custo mensal</th>
                <th className={`${th} text-right`}>Custo/min</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {config.employees.map((e) => {
                const monthly = employeeMonthlyCost(e);
                return (
                  <tr key={e.id}>
                    <td className={td}><TextInput value={e.name} onChange={(name) => update(e.id, { name })} /></td>
                    <td className={`${td} w-36`}><NumInput mode="money" value={e.salary} onChange={(salary) => update(e.id, { salary })} /></td>
                    <td className={`${td} w-24`}><NumInput mode="pct" value={e.chargesPct} onChange={(chargesPct) => update(e.id, { chargesPct })} /></td>
                    <td className={`${td} w-32`}><NumInput mode="money" value={e.benefits} onChange={(benefits) => update(e.id, { benefits })} /></td>
                    <td className={`${td} w-24`}><NumInput value={e.hoursPerMonth} onChange={(hoursPerMonth) => update(e.id, { hoursPerMonth })} /></td>
                    <td className={`${td} text-right font-bold tabular-nums`}>{brl(monthly)}</td>
                    <td className={`${td} text-right tabular-nums text-orange-600`}>{brlUnit(e.hoursPerMonth > 0 ? monthly / (e.hoursPerMonth * 60) : 0)}</td>
                    <td className={`${td} w-10`}><RemoveBtn onClick={() => onChange(config.employees.filter((x) => x.id !== e.id))} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-white/5">
          Encargos: CLT no Simples costuma ficar entre 30% e 40% (FGTS, férias, 13º). Benefícios: vale-transporte, alimentação, plano.
        </p>
      </Panel>
    </div>
  );
}

function EnergyList({ config, onChange }: { config: PricingConfig; onChange: (e: EnergySource[]) => void }) {
  const update = (id: string, p: Partial<EnergySource>) => onChange(config.energy.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const add = (type: EnergySource['type']) =>
    onChange([
      ...config.energy,
      type === 'gas'
        ? { id: newId('en'), name: 'Fogão (1 boca)', type, cylinderPrice: 130, cylinderKg: 13, kgPerHour: 0.25 }
        : { id: newId('en'), name: 'Equipamento elétrico', type, powerWatts: 2000, kwhPrice: 0.95 },
    ]);
  return (
    <Panel>
      <PanelHeader
        icon={<Zap className="h-5 w-5" />}
        title="Gás e energia"
        subtitle="Cadastre cada equipamento. Na ficha técnica você diz quantos minutos ele fica ligado."
        actions={
          <>
            <Btn variant="outline" size="sm" onClick={() => add('gas')}><Flame className="h-4 w-4 text-orange-500" /> Gás</Btn>
            <Btn variant="outline" size="sm" onClick={() => add('electric')}><Zap className="h-4 w-4 text-amber-500" /> Elétrico</Btn>
          </>
        }
      />
      <div className="divide-y divide-stone-100 dark:divide-white/5">
        {config.energy.length === 0 && <p className="px-5 py-6 text-sm text-stone-500">Nenhum equipamento cadastrado.</p>}
        {config.energy.map((e) => (
          <div key={e.id} className="grid items-end gap-2 px-4 py-3 sm:grid-cols-[1.5fr_repeat(3,1fr)_auto_auto]">
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-stone-500">
                {e.type === 'gas' ? <Flame className="h-3.5 w-3.5 text-orange-500" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                {e.type === 'gas' ? 'Gás' : 'Elétrico'}
              </span>
              <TextInput value={e.name} onChange={(name) => update(e.id, { name })} />
            </label>
            {e.type === 'gas' ? (
              <>
                <Labeled label="Preço do botijão"><NumInput mode="money" value={e.cylinderPrice || 0} onChange={(cylinderPrice) => update(e.id, { cylinderPrice })} /></Labeled>
                <Labeled label="Kg do botijão">
                  <Select value={String(e.cylinderKg || 13)} onChange={(ev) => update(e.id, { cylinderKg: Number(ev.target.value) })}>
                    <option value="13">13 kg (P13)</option>
                    <option value="20">20 kg (P20)</option>
                    <option value="45">45 kg (P45)</option>
                  </Select>
                </Labeled>
                <Labeled label="Consumo kg/hora"><NumInput value={e.kgPerHour || 0} digits={3} onChange={(kgPerHour) => update(e.id, { kgPerHour })} /></Labeled>
              </>
            ) : (
              <>
                <Labeled label="Potência (W)"><NumInput value={e.powerWatts || 0} onChange={(powerWatts) => update(e.id, { powerWatts })} /></Labeled>
                <Labeled label="Tarifa R$/kWh"><NumInput value={e.kwhPrice || 0} digits={3} onChange={(kwhPrice) => update(e.id, { kwhPrice })} /></Labeled>
                <div />
              </>
            )}
            <div className="pb-2 text-right text-sm">
              <span className="block text-[11px] text-stone-500">Por hora</span>
              <span className="font-bold tabular-nums text-orange-600">{brl(energyCostPerHour(e))}</span>
            </div>
            <div className="pb-1"><RemoveBtn onClick={() => onChange(config.energy.filter((x) => x.id !== e.id))} /></div>
          </div>
        ))}
      </div>
      <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-white/5">
        Referência: boca de fogão industrial gasta de 0,2 a 0,4 kg/h. A tarifa de energia está na conta de luz (valor total ÷ kWh).
      </p>
    </Panel>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-stone-500">{label}</span>
      {children}
    </label>
  );
}
