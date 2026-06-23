import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Briefcase,
  PieChart as PieIcon,
  TrendingUp,
  Download,
  Info,
  ArrowRight,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ChevronDown,
  AlertCircle,
  FileText,
  ArrowLeft,
  Save,
  Loader2,
  Check,
  MessagesSquare,
  X,
  Send,
  Lightbulb,
  Trash2,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { useStore } from "../contexts/StoreContext";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { AuditService } from "../services/AuditService";
import DataEntrySection from "../components/DataEntrySection";
import { chatWithConsultant } from "../services/geminiService";
import { DREData } from "../types";
import { getDocCached } from "../lib/firestoreQueryCache";

const monthsGlobal = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    val,
  );

const getVarianceColor = (val: number, isExpense: boolean): string => {
  if (Math.abs(val) < 0.001) return "text-slate-400 dark:text-slate-500 font-medium";
  const isGood = isExpense ? val < 0 : val > 0;
  return isGood 
    ? "text-emerald-600 dark:text-emerald-400 font-extrabold" 
    : "text-rose-600 dark:text-rose-400 font-extrabold";
};

const calculateRowValue = (budgetObj: Record<string, number> | undefined, rowId: string): number => {
  if (!budgetObj) return 0;
  const fat = budgetObj.faturamento || 0;
  const ded = budgetObj.deducoes || 0;
  const cmv = budgetObj.cmv || 0;
  const desV = budgetObj.despesas_var || 0;
  
  const mc = fat - ded - cmv - desV;
  
  const col = budgetObj.colaboradores || 0;
  const func = budgetObj.funcionamento || 0;
  const man = budgetObj.manutencao || 0;
  const com = budgetObj.comerciais || 0;
  const adm = budgetObj.administrativas || 0;
  
  const ebitda = mc - col - func - man - com - adm;
  
  const fin = budgetObj.financeiro || 0;
  const net = ebitda - fin;
  
  if (rowId === "margem_contrib") return mc;
  if (rowId === "ebitda") return ebitda;
  if (rowId === "net_profit") return net;
  return 0;
};

const getActualRowValue = (data: any, rowId: string): number => {
  if (!data) return 0;
  switch (rowId) {
    case "faturamento":
      return data.faturamento || 0;
    case "deducoes":
      return Math.abs(data.details?.deducoes?.darfSimples || data.taxes || 0);
    case "cmv":
      return Math.abs(data.cmv || 0);
    case "despesas_var":
      return Math.abs(data.despesasVariaveis || 0);
    case "margem_contrib": {
      const fat = data.faturamento || 0;
      const ded = Math.abs(data.details?.deducoes?.darfSimples || data.taxes || 0);
      const cmv = Math.abs(data.cmv || 0);
      const desV = Math.abs(data.despesasVariaveis || 0);
      return fat - ded - cmv - desV;
    }
    case "colaboradores":
      return Math.abs(data.payroll || 0);
    case "funcionamento": {
      if (data.details?.funcionamento) {
        return Math.abs(
          (Object.values(data.details.funcionamento) as any[]).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
        );
      }
      return 0;
    }
    case "manutencao": {
      if (data.details?.manutencao) {
        return Math.abs(
          (Object.values(data.details.manutencao) as any[]).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
        );
      }
      return 0;
    }
    case "comerciais": {
      if (data.details?.comerciais) {
        return Math.abs(
          (Object.values(data.details.comerciais) as any[]).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
        );
      }
      return 0;
    }
    case "administrativas": {
      if (data.details?.administrativas) {
        return Math.abs(
          (Object.values(data.details.administrativas) as any[]).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
        );
      }
      return Math.abs(data.operational || 0);
    }
    case "ebitda": {
      const mc = getActualRowValue(data, "margem_contrib");
      const col = getActualRowValue(data, "colaboradores");
      const func = getActualRowValue(data, "funcionamento");
      const man = getActualRowValue(data, "manutencao");
      const com = getActualRowValue(data, "comerciais");
      const adm = getActualRowValue(data, "administrativas");
      return mc - col - func - man - com - adm;
    }
    case "financeiro": {
      const resFin = Math.abs(data.resultadoFinanceiro || 0);
      const griStr = Math.abs(data.details?.griFinal || data.details?.despesasVariaveis?.griSecretaria || 0);
      return resFin + griStr;
    }
    case "net_profit":
      return data.netProfit || 0;
    default:
      return 0;
  }
};

const getActualDetailValue = (data: any, groupId: string, itemLabel: string): number => {
  if (!data || !data.details) return 0;
  const details = data.details;
  const label = itemLabel.trim();
  
  if (groupId === "deducoes") {
    if (label.includes("Simples Nacional") || label.includes("Simples")) {
      return -(details.deducoes?.darfSimples || 0);
    }
    if (label.includes("Taxa Câmbio")) {
      return -(details.deducoes?.taxasCambio || 0);
    }
  }
  if (groupId === "despesas_variaveis") {
    if (label.includes("Royalties")) return -(details.despesasVariaveis?.royalties || 0);
    if (label.includes("Fundo de Promoção")) return -(details.despesasVariaveis?.fundoPromo || 0);
    if (label.includes("Comissão de Vendas")) return -(details.despesasVariaveis?.comissaoVendas || 0);
    if (label.includes("Taxas de Cartão")) return -(details.despesasVariaveis?.taxasCartao || 0);
    if (label.includes("Bonificações")) return -(details.despesasVariaveis?.bonificacoes || 0);
    if (label.includes("Cortesia")) return -(details.despesasVariaveis?.descontos || 0);
    if (label.includes("iFood") || label.includes("Ifood")) return -(details.despesasVariaveis?.despesasIfood || 0);
  }
  if (groupId === "despesas_fixas_5") {
    const col = details.colaboradores || {};
    if (label.includes("Salários")) return -(col.salarios || 0);
    if (label.includes("Pro Labore")) return -(col.proLabore || 0);
    if (label.includes("Avulso")) return -(col.avulso || 0);
    if (label.includes("Diárias")) return -(col.diarias || 0);
    if (label.includes("Premiação")) return -(col.premiacao || 0);
    if (label.includes("Gratificações")) return -(col.gratificacoes || 0);
    if (label.includes("13o")) return -(col.decimoTerceiro || 0);
    if (label.includes("Férias")) return -(col.ferias || 0);
    if (label.includes("INSS")) return -(col.INSS || 0);
    if (label.includes("FGTS")) return -(col.FGTS || 0);
    if (label.includes("rescisórias")) return -(col.rescisorias || 0);
    if (label.includes("Cortesia")) return -(col.cortesia || 0);
    if (label.includes("transporte")) return -(col.valeTransp || 0);
    if (label.includes("Alimentação") && label.includes("Vale")) return -(col.valeAlim || 0);
    if (label.includes("Alimentação") && !label.includes("Vale")) return -(col.alimentacao || 0);
    if (label.includes("POS")) return -(col.pos || 0);
    if (label.includes("Atestado")) return -(col.atestadoExame || 0);
    if (label.includes("Uniformes")) return -(col.uniformesEPI || 0);
    if (label.includes("Outros")) return -(col.outros || 0);
  }
  if (groupId === "despesas_fixas_6") {
    const func = details.funcionamento || {};
    if (label.includes("Aluguel")) return -(func.aluguel || 0);
    if (label.includes("Condominio")) return -(func.condominio || 0);
    if (label.includes("Fria") || label.includes("Rio Mar")) return -(func.energiaCâmaraFria || 0);
    if (label.includes("IPTU")) return -(func.iptu || 0);
    if (label.includes("Elétrica")) return -(func.energiaEletrica || 0);
    if (label.includes("Água")) return -(func.agua || 0);
    if (label.includes("Ar Condicionado")) return -(func.arCondicionado || 0);
    if (label.includes("Internet")) return -(func.internetTelefonia || 0);
  }
  if (groupId === "despesas_fixas_7") {
    const man = details.manutencao || {};
    if (label.includes("Escritórios")) return -(man.escritorios || 0);
    if (label.includes("Locação")) return -(man.locacaoMaq || 0);
    if (label.includes("sistemas")) return -(man.manutencaoSist || 0);
    if (label.includes("equipamentos")) return -(man.manutencaoEquip || 0);
    if (label.includes("Outros")) return -(man.outros || 0);
  }
  if (groupId === "despesas_fixas_8") {
    const com = details.comerciais || {};
    if (label.includes("Aplicativo")) return -(com.aplicativo || 0);
    if (label.includes("Marketing")) return -(com.marketing || 0);
    if (label.includes("Seguro") || label.includes("Frete")) return -(com.frete || 0);
  }
  if (groupId === "despesas_fixas_9") {
    const adm = details.administrativas || {};
    if (label.includes("Sindicato")) return -(adm.sindicato || 0);
    if (label.includes("Limpeza")) return -(adm.limpeza || 0);
    if (label.includes("Call Center")) return -(adm.taxaCallCenter || 0);
    if (label.includes("BERP")) return -(adm.sistemaBERP || 0);
    if (label.includes("Consultoria")) return -(adm.consultoria || 0);
    if (label.includes("Contabilidade")) return -(adm.contabilidade || 0);
    if (label.includes("Premiação")) return -(adm.premiacao || 0);
    if (label.includes("Dedetização")) return -(adm.dedetizacao || 0);
    if (label.includes("Certificado")) return -(adm.certificado || 0);
    if (label.includes("Diversos")) return -(adm.fretesDiversos || 0);
    if (label.includes("Utencilios")) return -(adm.utensilios || 0);
    if (label.includes("Fardamento") || label.includes("consumo")) return -(adm.materialConsumo || 0);
    if (label.includes("escritorio")) return -(adm.materialEscritorio || 0);
    if (label.includes("limpeza")) return -(adm.materialLimpeza || 0);
    if (label.includes("Confraternização") || label.includes("Combustiveis")) return -(adm.combustiveis || 0);
    if (label.includes("Uber") || label.includes("Rony")) return -(adm.ronyXimenes || 0);
    if (label.includes("Seguros")) return -(adm.seguros || 0);
    if (label.includes("Alvara")) return -(adm.taxaAlvara || 0);
    if (label.includes("Operacionais")) return -(adm.despesasOperacionais || 0);
    if (label.includes("Gerais")) return -(adm.despesasGerais || 0);
  }
  if (groupId === "apuracao_financeira") {
    const fin = details.resultadoFinanceiro || {};
    if (label.includes("Ifood")) return -(fin.taxasIfood || 0);
    if (label.includes("Tarifas")) return -(fin.tarifasBancarias || 0);
    if (label.includes("Taxas Bancárias")) return -(fin.taxasBancarias || 0);
    if (label.includes("Juros")) return (fin.jurosRecebidos || 0);
    if (label.includes("GRI")) return -(details.griFinal || details.despesasVariaveis?.griSecretaria || 0);
  }
  return 0;
};

export default function Finance() {
  const {
    isDarkMode,
    dreTimeline,
    brandColors,
    currentStore,
    topProducts,
    loadDREPeriod,
    loadCMVPeriod,
    deletePeriodData,
    yearlyHistory,
  } = useStore();
  const isBebelu = currentStore?.brand === 'BEBELU';
  const themeButtonBg = brandColors?.button;
  const themeTextContrast = isBebelu ? '#121212' : '#FFFFFF';
  const { success: toastSuccess, error: toastError } = useToast();
  const { user } = useAuth();
  const isBebeluRioMar =
    currentStore?.id === "2" || currentStore?.code === "B28";
  const currentInitialDate = new Date();
  const initialMonthStr = String(currentInitialDate.getMonth() + 1).padStart(
    2,
    "0",
  );
  const initialYearStr = String(currentInitialDate.getFullYear());

  const [selectedMonth, setSelectedMonth] = useState(initialMonthStr); // Current dynamic month
  const [selectedYear, setSelectedYear] = useState(initialYearStr);

  const isRoot = currentStore?.id === "admin-global";
  const [allStoresDreData, setAllStoresDreData] = useState<{ [storeId: string]: DREData[] }>({});
  const [loadingConsolidation, setLoadingConsolidation] = useState(false);

  useEffect(() => {
    if (isRoot) {
      const fetchAllStoresData = async () => {
        setLoadingConsolidation(true);
        const storeIds = ['1', '2', '3'];
        const monthsList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const yearsToLoad = [selectedYear, (parseInt(selectedYear) - 1).toString(), (parseInt(selectedYear) - 2).toString()];
        
        const tempDreData: { [storeId: string]: DREData[] } = { '1': [], '2': [], '3': [] };

        try {
          const { doc } = await import("firebase/firestore");
          const { db } = await import("../lib/firebase");

          const promises = storeIds.flatMap(storeId => {
            return yearsToLoad.flatMap(y => {
              return monthsList.map(async (m) => {
                const periodId = `${y}-${m}`;
                try {
                  const dreRef = doc(db, 'stores', storeId, 'dre_periods', periodId);
                  const snap = await getDocCached(dreRef, currentStore.id, user);
                  if (snap.exists()) {
                    const data = { ...snap.data(), year: y } as DREData;
                    tempDreData[storeId].push(data);
                  }
                } catch (e) {
                  // Ignore single period load failures quietly
                }
              });
            });
          });

          await Promise.all(promises);
          setAllStoresDreData(tempDreData);
        } catch (err) {
          console.error("Error loading consolidation:", err);
        } finally {
          setLoadingConsolidation(false);
        }
      };

      fetchAllStoresData();
    }
  }, [selectedYear, isRoot]);

  const consolidatedTimeline = React.useMemo(() => {
    if (!isRoot) return [];
    
    const timelineList: DREData[] = [];
    const monthsMapToLabel: Record<string, string> = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril', '05': 'Maio', '06': 'Junho',
      '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    
    const yearsToCompile = [selectedYear, (parseInt(selectedYear) - 1).toString(), (parseInt(selectedYear) - 2).toString()];
    const storeIds = ['1', '2', '3'];

    yearsToCompile.forEach(y => {
      Object.keys(monthsMapToLabel).forEach(mCode => {
        const mLabel = monthsMapToLabel[mCode];
        
        let totalFat = 0;
        let totalCmv = 0;
        let totalPayroll = 0;
        let totalRent = 0;
        let totalMarketing = 0;
        let totalOperational = 0;
        let totalTaxes = 0;
        let totalRoyalties = 0;
        let totalEbitda = 0;
        let totalNetProfit = 0;
        let totalPedidos = 0;
        let totalReceitaIfood = 0;
        let totalReceitaWedo = 0;
        let totalReceitaBalcao = 0;
        let totalMetaFaturamento = 0;
        let exists = false;

        let totalDetailedFuncionamentoObj: Record<string, number> = {};
        let totalDetailedColaboradoresObj: Record<string, number> = {};
        let totalDetailedManutencaoObj: Record<string, number> = {};
        let totalDetailedComerciaisObj: Record<string, number> = {};
        let totalDetailedAdministrativasObj: Record<string, number> = {};
        let totalDetailedDeducoesObj: Record<string, number> = {};
        let totalDetailedDespesasVariaveisObj: Record<string, number> = {};
        let totalYearlyHistoryObj: Record<string, number> = {};

        storeIds.forEach(sId => {
          const list = allStoresDreData[sId] || [];
          const match = list.find(d => d.month === mLabel && d.year === y);
          if (match) {
            exists = true;
            totalFat += match.faturamento || 0;
            totalCmv += match.cmv || 0;
            totalPayroll += match.payroll || 0;
            totalRent += match.rent || 0;
            totalMarketing += match.marketing || 0;
            totalOperational += match.operational || 0;
            totalTaxes += match.taxes || 0;
            totalRoyalties += match.royalties || 0;
            totalEbitda += match.ebitda || 0;
            totalNetProfit += match.netProfit || 0;
            totalPedidos += match.quantidadePedidos || 0;
            totalReceitaIfood += match.receitaIfood || 0;
            totalReceitaWedo += match.receitaWedo || 0;
            totalReceitaBalcao += match.receitaBalcao || 0;
            totalMetaFaturamento += match.metaFaturamento || (sId === '1' ? 140000 : sId === '2' ? 140000 : 150000);

            if (match.yearlyHistory) {
              Object.entries(match.yearlyHistory).forEach(([k, v]) => {
                totalYearlyHistoryObj[k] = (totalYearlyHistoryObj[k] || 0) + (Number(v) || 0);
              });
            }

            if (match.details) {
              const det = match.details;
              if (det.funcionamento) {
                Object.entries(det.funcionamento).forEach(([k, v]) => {
                  totalDetailedFuncionamentoObj[k] = (totalDetailedFuncionamentoObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.colaboradores) {
                Object.entries(det.colaboradores).forEach(([k, v]) => {
                  totalDetailedColaboradoresObj[k] = (totalDetailedColaboradoresObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.manutencao) {
                Object.entries(det.manutencao).forEach(([k, v]) => {
                  totalDetailedManutencaoObj[k] = (totalDetailedManutencaoObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.comerciais) {
                Object.entries(det.comerciais).forEach(([k, v]) => {
                  totalDetailedComerciaisObj[k] = (totalDetailedComerciaisObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.administrativas) {
                Object.entries(det.administrativas).forEach(([k, v]) => {
                  totalDetailedAdministrativasObj[k] = (totalDetailedAdministrativasObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.deducoes) {
                Object.entries(det.deducoes).forEach(([k, v]) => {
                  totalDetailedDeducoesObj[k] = (totalDetailedDeducoesObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.despesasVariaveis) {
                Object.entries(det.despesasVariaveis).forEach(([k, v]) => {
                  totalDetailedDespesasVariaveisObj[k] = (totalDetailedDespesasVariaveisObj[k] || 0) + (Number(v) || 0);
                });
              }
            }
          }
        });

        if (exists) {
          timelineList.push({
            month: mLabel,
            year: y,
            faturamento: totalFat,
            cmv: totalCmv,
            payroll: totalPayroll,
            rent: totalRent,
            marketing: totalMarketing,
            operational: totalOperational,
            taxes: totalTaxes,
            royalties: totalRoyalties,
            ebitda: totalEbitda,
            netProfit: totalNetProfit,
            quantidadePedidos: totalPedidos,
            receitaIfood: totalReceitaIfood,
            receitaWedo: totalReceitaWedo,
            receitaBalcao: totalReceitaBalcao,
            metaFaturamento: totalMetaFaturamento,
            yearlyHistory: totalYearlyHistoryObj,
            details: {
              funcionamento: totalDetailedFuncionamentoObj,
              colaboradores: totalDetailedColaboradoresObj,
              manutencao: totalDetailedManutencaoObj,
              comerciais: totalDetailedComerciaisObj,
              administrativas: totalDetailedAdministrativasObj,
              deducoes: totalDetailedDeducoesObj,
              despesasVariaveis: totalDetailedDespesasVariaveisObj
            }
          });
        }
      });
    });

    return timelineList;
  }, [allStoresDreData, isRoot, selectedYear]);

  const activeDreTimeline = isRoot ? consolidatedTimeline : dreTimeline;

  const [showEntry, setShowEntry] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isHoverExport, setIsHoverExport] = useState(false);

  // Professional DRE System States
  const [activeDRETab, setActiveDRETab] = useState<"unico_mes" | "comparativo" | "base_real" | "base_orcado">("comparativo");
  const [yearlyBudgets, setYearlyBudgets] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [isSavingBudgets, setIsSavingBudgets] = useState(false);
  const [realYearForTab, setRealYearForTab] = useState(selectedYear);
  const [isLoadingAllMonths, setIsLoadingAllMonths] = useState(false);

  const fetchBudgetsForYear = async (year: string) => {
    setIsLoadingBudgets(true);
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      
      const monthsList = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      const newYearData: Record<string, Record<string, number>> = {};
      
      for (const m of monthsList) {
        const periodId = `${year}-${m}`;
        const docRef = doc(db, 'stores', currentStore.id, 'budget_periods', periodId);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          newYearData[m] = snap.data().budget || snap.data();
        } else {
          const localString = localStorage.getItem(`g_azevedo_budget_backup_${currentStore.id}_${year}_${m}`);
          if (localString) {
            try {
              newYearData[m] = JSON.parse(localString);
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
      
      setYearlyBudgets(prev => ({
        ...prev,
        [year]: newYearData
      }));
    } catch (err) {
      console.warn("Could not load budgets for year:", year, err);
    } finally {
      setIsLoadingBudgets(false);
    }
  };

  const handleSaveBudget = async () => {
    setIsSavingBudgets(true);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      
      const yearBudgets = yearlyBudgets[selectedYear] || {};
      const monthsList = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      
      for (const m of monthsList) {
        const monthData = yearBudgets[m] || {};
        const periodId = `${selectedYear}-${m}`;
        const docRef = doc(db, 'stores', currentStore.id, 'budget_periods', periodId);
        
        await setDoc(docRef, {
          ...monthData,
          year: selectedYear,
          month: m,
          updatedAt: new Date().toISOString()
        });
        
        localStorage.setItem(`g_azevedo_budget_backup_${currentStore.id}_${selectedYear}_${m}`, JSON.stringify(monthData));
      }
      
      toastSuccess(`Orçamento de ${selectedYear} salvo com sucesso!`);
      
      if (user && currentStore) {
        AuditService.logAction({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'BUDGET_SAVE' as any,
          description: `Salvou as metas do DRE Orçado anual para o ano ${selectedYear}.`,
          storeCode: currentStore.code,
          storeName: currentStore.name
        }).catch(err => console.error(err));
      }
    } catch (err) {
      console.error("Error saving budgets:", err);
      toastError("Erro ao salvar o orçamento. Verifique se possui permissão ou sua conexão.");
    } finally {
      setIsSavingBudgets(false);
    }
  };

  useEffect(() => {
    fetchBudgetsForYear(selectedYear);
    const prevYear = (parseInt(selectedYear) - 1).toString();
    fetchBudgetsForYear(prevYear);
    
    // Set default real view year
    setRealYearForTab(selectedYear);
    
    const loadAllYearMonths = async () => {
      setIsLoadingAllMonths(true);
      try {
        const yearsToLoad = [selectedYear, prevYear];
        const monthsList = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        const promises: Promise<any>[] = [];
        
        yearsToLoad.forEach((y) => {
          monthsList.forEach((m) => {
            promises.push(loadDREPeriod(m, y).catch(() => false));
          });
        });
        
        await Promise.all(promises);
      } catch (err) {
        console.warn("Background DRE load warning:", err);
      } finally {
        setIsLoadingAllMonths(false);
      }
    };
    loadAllYearMonths();
  }, [selectedYear, currentStore.id]);

  const handleResetPeriod = async () => {
    if (!showConfirmReset) {
      setShowConfirmReset(true);
      setTimeout(() => setShowConfirmReset(false), 3000);
      return;
    }

    setIsDeleting(true);
    setShowConfirmReset(false);
    try {
      await deletePeriodData(selectedMonth, selectedYear);

      // We don't need to reload immediately as deletePeriodData already filters the local state
      // but we wait a bit and sync just to be safe with the cloud
      await new Promise((resolve) => setTimeout(resolve, 800));
      await loadDREPeriod(selectedMonth, selectedYear);
      await loadCMVPeriod(selectedMonth, selectedYear);

      toastSuccess("Dados do período zerados com sucesso.");
    } catch (error) {
      console.error("Erro ao zerar dados:", error);
      toastError("Erro ao zerar dados. Verifique sua conexão.");
    } finally {
      setIsDeleting(false);
    }
  };
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "model"; text: string }[]
  >([
    {
      role: "model",
      text: "Como posso ajudar a otimizar sua margem este mês? Pergunte sobre qualquer conta da DRE e etc.",
    },
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Auto-load data when period changes
  useEffect(() => {
    loadDREPeriod(selectedMonth, selectedYear);

    // Load previous month for trend comparison
    const prevMonthNum =
      parseInt(selectedMonth) === 1 ? 12 : parseInt(selectedMonth) - 1;
    const prevMonthStr = String(prevMonthNum).padStart(2, "0");
    const prevYearStr =
      parseInt(selectedMonth) === 1
        ? (parseInt(selectedYear) - 1).toString()
        : selectedYear;
    loadDREPeriod(prevMonthStr, prevYearStr);

    // Pre-load previous years for comparison to ensure chart is populated
    const prevYear1 = (parseInt(selectedYear) - 1).toString();
    const prevYear2 = (parseInt(selectedYear) - 2).toString();
    loadDREPeriod(selectedMonth, prevYear1);
    loadDREPeriod(selectedMonth, prevYear2);

    loadCMVPeriod(selectedMonth, selectedYear);

    if (user && currentStore && currentStore.code !== "ROOT") {
      const monthLabel =
        monthsGlobal.find((m) => m.value === selectedMonth)?.label ||
        selectedMonth;
      AuditService.logAction({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "DRE_VIEW",
        description: `Visualizou e analisou os demonstrativos financeiros (DRE) do período ${monthLabel}/${selectedYear}.`,
        storeCode: currentStore.code,
        storeName: currentStore.name,
      }).catch((err) => console.error(err));
    }
  }, [selectedMonth, selectedYear, currentStore.id]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "receita",
    "deducoes",
    "cmv",
    "despesas_var",
    "despesas_fixas_5",
    "despesas_fixas_6",
    "despesas_fixas_7",
    "despesas_fixas_8",
    "despesas_fixas_9",
    "financeiro",
  ]);

  const months = monthsGlobal;

  const currentMonthLabel = months.find(
    (m) => m.value === selectedMonth,
  )?.label;

  const currentMonthData = activeDreTimeline.find(
    (d) =>
      d.month === currentMonthLabel &&
      (d.year === selectedYear || (!d.year && selectedYear === "2026")),
  ) || {
    month: currentMonthLabel || "Não Iniciado",
    faturamento: 0,
    receitaBalcao: 0,
    receitaDelivery: 0,
    receitaIfood: 0,
    receitaWedo: 0,
    taxes: 0,
    cmv: 0,
    payroll: 0,
    royalties: 0,
    rent: 0,
    marketing: 0,
    operational: 0,
    ebitda: 0,
    netProfit: 0,
    quantidadePedidos: 0,
  };

  const selectedPeriod = `${currentMonthLabel} ${selectedYear}`;

  // For comparison, let's find previous month
  const prevMonthVal = parseInt(selectedMonth) - 1;
  const prevMonthStr =
    prevMonthVal < 1 ? "12" : prevMonthVal.toString().padStart(2, "0");
  const prevYearStr =
    prevMonthVal < 1 ? (parseInt(selectedYear) - 1).toString() : selectedYear;
  const prevMonthLabel = months.find((m) => m.value === prevMonthStr)?.label;

  const prevMonthData = activeDreTimeline.find(
    (d) =>
      d.month === prevMonthLabel &&
      (d.year === prevYearStr || (!d.year && prevYearStr === "2026")),
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  const dreGroups = [
    {
      id: "receita",
      label: "1. RECEITA BRUTA",
      isTotal: false,
      items: [
        { label: "Venda Balção", valor: currentMonthData.receitaBalcao || 0 },
        {
          label: "Venda Delivery",
          valor: currentMonthData.receitaDelivery || 0,
        },
      ],
      total: currentMonthData.faturamento,
    },
    {
      id: "deducoes",
      label: "2. DEDUÇÕES DA RECEITA",
      isTotal: false,
      items: [
        {
          label: "DARF/SIMPLES",
          valor: -(
            currentMonthData.details?.deducoes?.darfSimples ||
            currentMonthData.taxes
          ),
        },
      ],
      total: -(
        currentMonthData.details?.deducoes?.darfSimples ||
        currentMonthData.taxes
      ),
    },
    {
      id: "cmv",
      label: "3. CUSTOS VARIÁVEIS DAS MERCADORIAS",
      isTotal: false,
      items: [
        {
          label: "CMV - Balcão",
          valor: -(
            currentMonthData.details?.cmvDetailed?.balcao ||
            currentMonthData.cmv * 0.4
          ),
        },
        {
          label: "CMV - Delivery",
          valor: -(
            currentMonthData.details?.cmvDetailed?.delivery ||
            currentMonthData.cmv * 0.6
          ),
        },
      ],
      total: -currentMonthData.cmv,
    },
    {
      id: "despesas_variaveis",
      label: "4. DESPESAS VARIÁVEIS",
      isTotal: false,
      items: [
        {
          label: "Taxas de Cartão de Créditos e Débitos",
          valor: -(
            currentMonthData.details?.despesasVariaveis?.taxaCartao || 0
          ),
        },
        {
          label: "Taxa Motoqueiro",
          valor: -(
            currentMonthData.details?.despesasVariaveis?.taxaMotoqueiro || 0
          ),
        },
        {
          label: "Taxa Ifood",
          valor: -(currentMonthData.details?.despesasVariaveis?.taxaIfood || 0),
        },
        {
          label: "Frete Compras",
          valor: -(
            currentMonthData.details?.despesasVariaveis?.freteCompras || 0
          ),
        },
        {
          label: "Fundo de Marketing - Franquia",
          valor: -(
            currentMonthData.details?.despesasVariaveis?.fundoMarketing || 0
          ),
        },
        {
          label: "Royaltis - Franquia",
          valor: -(currentMonthData.details?.despesasVariaveis?.royalties || 0),
        },
        {
          label: isBebeluRioMar
            ? "Taxa Juros Banco do Nordeste"
            : "Taxa Bancaria + Juros",
          valor: -(
            currentMonthData.details?.despesasVariaveis?.taxaBancariaJuros || 0
          ),
        },
        {
          label: isBebeluRioMar ? "Taxas Conta Garantida" : "Taxas PIX",
          valor: -(currentMonthData.details?.despesasVariaveis?.taxaPix || 0),
        },
        {
          label: "Bonificações ou Comissões para Colaboradores",
          valor: -(
            currentMonthData.details?.despesasVariaveis?.bonificacoes || 0
          ),
        },
        {
          label: "Descontos Concedidos para Clientes - Cortesia",
          valor: -(currentMonthData.details?.despesasVariaveis?.descontos || 0),
        },
        {
          label: "Despesas Ifood",
          valor: -(
            currentMonthData.details?.despesasVariaveis?.despesasIfood || 0
          ),
        },
      ],
      total: -(currentMonthData.despesasVariaveis || 0),
    },
    {
      id: "margem_contribuicao",
      label: "(=) MARGEM DE CONTRIBUIÇÃO",
      isTotal: true,
      total:
        currentMonthData.faturamento -
        (currentMonthData.details?.deducoes?.darfSimples ||
          currentMonthData.taxes) -
        currentMonthData.cmv -
        (currentMonthData.despesasVariaveis || 0),
      highlight: true,
      color:
        currentStore.brand === "BEBELU" ? "text-amber-600" : "text-blue-600",
    },
    {
      id: "despesas_fixas_5",
      label: "DESPESAS COM COLABORADORES E ENCARGOS",
      isTotal: false,
      items: [
        {
          label: "Salários",
          valor: -(currentMonthData.details?.colaboradores?.salarios || 0),
        },
        {
          label: "Pro Labore",
          valor: -(currentMonthData.details?.colaboradores?.proLabore || 0),
        },
        {
          label: "Avulso",
          valor: -(currentMonthData.details?.colaboradores?.avulso || 0),
        },
        {
          label: "Diárias",
          valor: -(currentMonthData.details?.colaboradores?.diarias || 0),
        },
        {
          label: "Premiação",
          valor: -(currentMonthData.details?.colaboradores?.premiacao || 0),
        },
        {
          label: "Gratificações",
          valor: -(currentMonthData.details?.colaboradores?.gratificacoes || 0),
        },
        {
          label: "13o. salário",
          valor: -(
            currentMonthData.details?.colaboradores?.decimoTerceiro || 0
          ),
        },
        {
          label: "Férias",
          valor: -(currentMonthData.details?.colaboradores?.ferias || 0),
        },
        {
          label: "INSS",
          valor: -(currentMonthData.details?.colaboradores?.INSS || 0),
        },
        {
          label: "FGTS",
          valor: -(currentMonthData.details?.colaboradores?.FGTS || 0),
        },
        {
          label: "Verbas rescisórias",
          valor: -(currentMonthData.details?.colaboradores?.rescisorias || 0),
        },
        {
          label: "Cortesia",
          valor: -(currentMonthData.details?.colaboradores?.cortesia || 0),
        },
        {
          label: "Vale transporte",
          valor: -(currentMonthData.details?.colaboradores?.valeTransp || 0),
        },
        {
          label: "Vale Alimentação",
          valor: -(currentMonthData.details?.colaboradores?.valeAlim || 0),
        },
        {
          label: "Alimentação",
          valor: -(currentMonthData.details?.colaboradores?.alimentacao || 0),
        },
        {
          label: "POS",
          valor: -(currentMonthData.details?.colaboradores?.pos || 0),
        },
        {
          label: "Atestado / Exame",
          valor: -(currentMonthData.details?.colaboradores?.atestadoExame || 0),
        },
        {
          label: "Uniformes / EPI",
          valor: -(currentMonthData.details?.colaboradores?.uniformesEPI || 0),
        },
        {
          label: "Outros Benefícios ou Encargos",
          valor: -(currentMonthData.details?.colaboradores?.outros || 0),
        },
      ],
      total: -currentMonthData.payroll,
    },
    {
      id: "despesas_fixas_6",
      label: "DESPESAS COM FUNCIONAMENTO",
      isTotal: false,
      items: [
        {
          label: "Aluguel",
          valor: -(currentMonthData.details?.funcionamento?.aluguel || 0),
        },
        {
          label: "Condominio",
          valor: -(currentMonthData.details?.funcionamento?.condominio || 0),
        },
        {
          label: isBebeluRioMar
            ? "Fundo Promocional Rio Mar"
            : "Energia Camara Fria",
          valor: -(
            currentMonthData.details?.funcionamento?.energiaCâmaraFria || 0
          ),
        },
        {
          label: "IPTU",
          valor: -(currentMonthData.details?.funcionamento?.iptu || 0),
        },
        {
          label: "Energia Elétrica",
          valor: -(
            currentMonthData.details?.funcionamento?.energiaEletrica || 0
          ),
        },
        {
          label: "Água",
          valor: -(currentMonthData.details?.funcionamento?.agua || 0),
        },
        {
          label: isBebeluRioMar
            ? "Ar Condicionado e Exaustor"
            : "Ar Condicionado",
          valor: -(
            currentMonthData.details?.funcionamento?.arCondicionado || 0
          ),
        },
        {
          label: "Internet + Telefonia",
          valor: -(
            currentMonthData.details?.funcionamento?.internetTelefonia || 0
          ),
        },
      ],
      total: -Object.values(
        currentMonthData.details?.funcionamento || {},
      ).reduce((a: number, b: any) => a + (Number(b) || 0), 0),
    },
    {
      id: "despesas_fixas_7",
      label: "DESPESAS COM MANUTENÇÃO",
      isTotal: false,
      items: [
        {
          label: "Escritórios",
          valor: -(currentMonthData.details?.manutencao?.escritorios || 0),
        },
        {
          label: "Locação de Máq. e Equipamentos",
          valor: -(currentMonthData.details?.manutencao?.locacaoMaq || 0),
        },
        {
          label: "Manutenção de sistemas",
          valor: -(currentMonthData.details?.manutencao?.manutencaoSist || 0),
        },
        {
          label: "Manutenção de equipamentos e reforma",
          valor: -(currentMonthData.details?.manutencao?.manutencaoEquip || 0),
        },
        {
          label: "Outros Gastos com manutenção",
          valor: -(currentMonthData.details?.manutencao?.outros || 0),
        },
      ],
      total: -Object.values(currentMonthData.details?.manutencao || {}).reduce(
        (a: number, b: any) => a + (Number(b) || 0),
        0,
      ),
    },
    {
      id: "despesas_fixas_8",
      label: "DESPESAS COMERCIAIS",
      isTotal: false,
      items: [
        {
          label: "Aplicativo",
          valor: -(currentMonthData.details?.comerciais?.aplicativo || 0),
        },
        {
          label: "Marketing",
          valor: -(currentMonthData.details?.comerciais?.marketing || 0),
        },
        {
          label: isBebeluRioMar ? "Seguro" : "Frete",
          valor: -(currentMonthData.details?.comerciais?.frete || 0),
        },
      ],
      total: -Object.values(currentMonthData.details?.comerciais || {}).reduce(
        (a: number, b: any) => a + (Number(b) || 0),
        0,
      ),
    },
    {
      id: "despesas_fixas_9",
      label: "DESPESAS ADMINISTRATIVAS",
      isTotal: false,
      items: [
        {
          label: "Sindicato",
          valor: -(currentMonthData.details?.administrativas?.sindicato || 0),
        },
        {
          label: "Limpeza",
          valor: -(currentMonthData.details?.administrativas?.limpeza || 0),
        },
        {
          label: "Taxa Call Center",
          valor: -(
            currentMonthData.details?.administrativas?.taxaCallCenter || 0
          ),
        },
        {
          label: "Sistema BERP",
          valor: -(currentMonthData.details?.administrativas?.sistemaBERP || 0),
        },
        {
          label: "Consultoria",
          valor: -(currentMonthData.details?.administrativas?.consultoria || 0),
        },
        {
          label: "Contabilidade",
          valor: -(
            currentMonthData.details?.administrativas?.contabilidade || 0
          ),
        },
        {
          label: "Premiação",
          valor: -(currentMonthData.details?.administrativas?.premiacao || 0),
        },
        {
          label: "Dedetização",
          valor: -(currentMonthData.details?.administrativas?.dedetizacao || 0),
        },
        {
          label: "Certificado",
          valor: -(currentMonthData.details?.administrativas?.certificado || 0),
        },
        {
          label: "Fretes e Carretos Diversos",
          valor: -(
            currentMonthData.details?.administrativas?.fretesDiversos || 0
          ),
        },
        {
          label: "Utencilios",
          valor: -(currentMonthData.details?.administrativas?.utensilios || 0),
        },
        {
          label: isBebeluRioMar
            ? "Material de Fardamento"
            : "Material de consumo",
          valor: -(
            currentMonthData.details?.administrativas?.materialConsumo || 0
          ),
        },
        {
          label: "Material de escritorio",
          valor: -(
            currentMonthData.details?.administrativas?.materialEscritorio || 0
          ),
        },
        {
          label: "Material de limpeza",
          valor: -(
            currentMonthData.details?.administrativas?.materialLimpeza || 0
          ),
        },
        {
          label: isBebeluRioMar ? "Confraternização" : "Combustiveis",
          valor: -(
            currentMonthData.details?.administrativas?.combustiveis || 0
          ),
        },
        {
          label: isBebeluRioMar ? "Uber" : "Retirado P Rony Ximenes",
          valor: -(currentMonthData.details?.administrativas?.ronyXimenes || 0),
        },
        {
          label: "Seguros / Segurança",
          valor: -(currentMonthData.details?.administrativas?.seguros || 0),
        },
        {
          label: "Taxa de Alvara",
          valor: -(currentMonthData.details?.administrativas?.taxaAlvara || 0),
        },
        {
          label: "Despesas Operacionais",
          valor: -(
            currentMonthData.details?.administrativas?.despesasOperacionais || 0
          ),
        },
        {
          label: "Despesas Gerais",
          valor: -(
            currentMonthData.details?.administrativas?.despesasGerais || 0
          ),
        },
      ],
      total: currentMonthData.details?.administrativas
        ? -Object.values(currentMonthData.details.administrativas).reduce(
            (a: number, b: any) => a + (Number(b) || 0),
            0,
          )
        : -currentMonthData.operational,
    },
    {
      id: "resultado_operacional_financeiro",
      label: "(=) EBITDA - RESULTADO OPERACIONAL",
      isTotal: true,
      total: currentMonthData.ebitda,
      color:
        currentStore.brand === "BEBELU" ? "text-amber-600" : "text-indigo-600",
    },
    {
      id: "apuracao_financeira",
      label: "10. APURAÇÃO DO RESULTADO FINANCEIRO E IMPOSTOS/GRI",
      isTotal: false,
      items: [
        {
          label: "Taxas Ifood",
          valor: -(
            currentMonthData.details?.resultadoFinanceiro?.taxasIfood || 0
          ),
        },
        {
          label: "Tarifas Bancárias",
          valor: -(
            currentMonthData.details?.resultadoFinanceiro?.tarifasBancarias || 0
          ),
        },
        {
          label: "Taxas Bancárias",
          valor: -(
            currentMonthData.details?.resultadoFinanceiro?.taxasBancarias || 0
          ),
        },
        {
          label: "Juros Recebidos",
          valor:
            currentMonthData.details?.resultadoFinanceiro?.jurosRecebidos || 0,
        },
        {
          label: "GRI - Secretaria de Estado da Tributação",
          valor: -(
            currentMonthData.details?.griFinal ||
            currentMonthData.details?.despesasVariaveis?.griSecretaria ||
            0
          ),
        },
      ],
      total: -(
        (currentMonthData.resultadoFinanceiro || 0) +
        (currentMonthData.details?.griFinal ||
          currentMonthData.details?.despesasVariaveis?.griSecretaria ||
          0)
      ),
    },
    {
      id: "resultado_liquido",
      label: "(=) RESULTADO LÍQUIDO FINANCEIRO",
      isTotal: true,
      total: currentMonthData.netProfit,
      highlight: true,
      color:
        currentMonthData.netProfit < 0
          ? "text-red-600 dark:text-red-400"
          : "text-green-600",
      border: true,
    },
  ];

  const faturamentoVal = currentMonthData.faturamento || 0;
  const mc =
    currentMonthData.faturamento -
    (currentMonthData.details?.deducoes?.darfSimples ||
      currentMonthData.taxes) -
    currentMonthData.cmv -
    (currentMonthData.despesasVariaveis || 0);
  const mcPercent = faturamentoVal > 0 ? mc / faturamentoVal : 0;

  const totalPayroll = currentMonthData.payroll || 0;
  const totalFunc = Object.values(
    currentMonthData.details?.funcionamento || {},
  ).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  const totalManut = Object.values(
    currentMonthData.details?.manutencao || {},
  ).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  const totalComer = Object.values(
    currentMonthData.details?.comerciais || {},
  ).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  const totalAdmin = Object.values(
    currentMonthData.details?.administrativas || {},
  ).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

  const fixedExpenses = currentMonthData.details
    ? totalPayroll + totalFunc + totalManut + totalComer + totalAdmin
    : totalPayroll + (currentMonthData.operational || 0);

  const pontoEquilibrio = mcPercent > 0 ? fixedExpenses / mcPercent : 0;
  const ticketMedio =
    currentMonthData.quantidadePedidos > 0
      ? currentMonthData.faturamento / currentMonthData.quantidadePedidos
      : 0;

  const marginBruta =
    faturamentoVal > 0
      ? ((currentMonthData.faturamento - currentMonthData.cmv) /
          faturamentoVal) *
        100
      : 0;
  const lucratividade =
    faturamentoVal > 0
      ? (currentMonthData.netProfit / faturamentoVal) * 100
      : 0;
  const cmvPercent =
    faturamentoVal > 0 ? (currentMonthData.cmv / faturamentoVal) * 100 : 0;
  const payrollPercent =
    faturamentoVal > 0 ? (currentMonthData.payroll / faturamentoVal) * 100 : 0;
  const cmvCmoPercent = cmvPercent + payrollPercent;

  // Usa o mês anterior já calculado acima para tendências de Margem Bruta e Lucratividade
  const prevFaturamentoVal = prevMonthData?.faturamento || 0;
  const prevMarginBruta =
    prevFaturamentoVal > 0
      ? ((prevMonthData.faturamento - prevMonthData.cmv) / prevFaturamentoVal) *
        100
      : 0;
  const prevLucratividade =
    prevFaturamentoVal > 0
      ? (prevMonthData.netProfit / prevFaturamentoVal) * 100
      : 0;

  const marginBrutaDiff =
    prevFaturamentoVal > 0 ? marginBruta - prevMarginBruta : 0;
  const lucratividadeDiff =
    prevFaturamentoVal > 0 ? lucratividade - prevLucratividade : 0;

  const marginBrutaTrend =
    prevFaturamentoVal > 0
      ? marginBrutaDiff >= 0
        ? `+${marginBrutaDiff.toFixed(1)}%`
        : `${marginBrutaDiff.toFixed(1)}%`
      : "---";
  const lucratividadeTrend =
    prevFaturamentoVal > 0
      ? lucratividadeDiff >= 0
        ? `+${lucratividadeDiff.toFixed(1)}%`
        : `${lucratividadeDiff.toFixed(1)}%`
      : "---";

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const title = `DRE - ${currentStore.name} - ${currentMonthLabel} ${selectedYear}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);

    const tableData = dreGroups.flatMap((group) => {
      const rows = [];
      // Group header
      rows.push([
        {
          content: group.label,
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        {
          content: `${((Math.abs(group.total) / faturamentoVal) * 100).toFixed(1)}%`,
          styles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            halign: "right",
          },
        },
        {
          content: formatCurrency(group.total),
          styles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            halign: "right",
          },
        },
      ]);

      // Items
      if (group.items) {
        group.items.forEach((item) => {
          rows.push([
            `  ${item.label}`,
            {
              content: `${((Math.abs(item.valor) / faturamentoVal) * 100).toFixed(1)}%`,
              styles: { halign: "right" },
            },
            {
              content: formatCurrency(item.valor),
              styles: { halign: "right" },
            },
          ]);
        });
      }
      return rows;
    });

    // Add Key Financial Performance Metrics Section BEFORE the main table
    const perfData = [
      ["Margem Bruta (Meta: > 50%)", `${marginBruta.toFixed(1)}%`, "---"],
      [
        "Margem Líquida",
        `${lucratividade.toFixed(1)}%`,
        lucratividade < 0 ? "Crítico (Prejuízo)" : "Saudável",
      ],
      [
        "Ponto de Equilíbrio",
        pontoEquilibrio > 0 ? formatCurrency(pontoEquilibrio) : "---",
        pontoEquilibrio > 0
          ? pontoEquilibrio > faturamentoVal
            ? "Crítico (Acima do Fat.)"
            : "Saudável (Abaixo do Fat.)"
          : "Margem Contribuição Negativa",
      ],
      [
        "CMV + CMO (Meta: <= 52%)",
        faturamentoVal > 0 ? `${cmvCmoPercent.toFixed(1)}%` : "---",
        cmvCmoPercent > 0
          ? cmvCmoPercent <= 52
            ? "Saudável"
            : "Elevado"
          : "---",
      ],
    ];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Medidas de Desempenho e Saúde Financeira", 14, 38);

    autoTable(doc, {
      startY: 42,
      head: [["Métrica de Performance", "Valor Mês", "Status / Avaliação"]],
      body: perfData,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      }, // Indigo tint
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 70 },
        1: { fontStyle: "bold", cellWidth: 50 },
        2: { fontStyle: "bold" },
      },
    });

    const kpiEndY = (doc as any).lastAutoTable.finalY + 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(
      "Detalhamento da Demonstração do Resultado do Exercício (DRE)",
      14,
      kpiEndY - 4,
    );

    autoTable(doc, {
      startY: kpiEndY,
      head: [["Descrição", "AV %", "Valor"]],
      body: tableData as any,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 30, halign: "right" },
        2: { cellWidth: 40, halign: "right" },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY || kpiEndY;

    // Add Operational Indicators section
    const tempoMedioVal =
      currentMonthData?.tempoMedio !== undefined
        ? currentMonthData.tempoMedio
        : 25;
    const avaliacaoIfoodVal =
      currentMonthData?.avaliacaoIfood !== undefined
        ? currentMonthData.avaliacaoIfood
        : 4.8;

    const tempoStatus =
      tempoMedioVal <= 20
        ? "Excelente (<= 20 min)"
        : "Abaixo do Esperado (> 20 min)";
    const avaliacaoStatus =
      avaliacaoIfoodVal >= 4.8
        ? "Excelente (>= 4.8)"
        : "Abaixo do Esperado (< 4.8)";

    const opData = [
      [
        "Tempo Médio de Produção Geral",
        `${tempoMedioVal} minutos`,
        "20 minutos",
        tempoStatus,
      ],
      [
        "Avaliação de Atendimento iFood",
        `${avaliacaoIfoodVal.toFixed(1)} / 5.0`,
        "4.8 / 5.0",
        avaliacaoStatus,
      ],
    ];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Indicadores Operacionais do Período", 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 16,
      head: [
        [
          "Indicador Operacional",
          "Valor Realizado",
          "Meta Estabelecida",
          "Status",
        ],
      ],
      body: opData,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: {
        fillColor: [80, 80, 80],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { fontStyle: "bold" },
        3: { fontStyle: "bold" },
      },
    });

    doc.save(
      `DRE_${currentStore.name.replace(/\s+/g, "_")}_${selectedMonth}_${selectedYear}.pdf`,
    );
  };

  // Dynamic Insights
  const getInsights = () => {
    const insights = [];

    if (cmvPercent > 35) {
      insights.push({
        title: "CMV Elevado",
        desc: `Seu CMV está em ${cmvPercent.toFixed(1)}%. O ideal é abaixo de 32%. Verifique desperdícios e negocie insumos.`,
        icon: <AlertCircle className="w-5 h-5 text-red-700" />,
        color: "bg-red-700/10",
      });
    } else if (cmvPercent > 0) {
      insights.push({
        title: "CMV Saudável",
        desc: `Parabéns! Sua margem bruta está protegida com CMV de ${cmvPercent.toFixed(1)}%.`,
        icon: <Check className="w-5 h-5 text-green-500" />,
        color: "bg-green-500/10",
      });
    }

    if (payrollPercent > 22) {
      insights.push({
        title: "Ajuste de Escala",
        desc: `Sua folha (${payrollPercent.toFixed(1)}%) ultrapassa o teto de 20%. Avalie a produtividade por colaborador.`,
        icon: <Briefcase className="w-5 h-5 text-amber-500" />,
        color: "bg-amber-500/10",
      });
    }

    if (lucratividade < 10 && faturamentoVal > 0) {
      insights.push({
        title: "Margem de Lucro Baixa",
        desc: `Margem Líquida de ${lucratividade.toFixed(1)}% está abaixo da média de 15% do setor.`,
        icon: <TrendingUp className="w-5 h-5 text-red-700" />,
        color: "bg-red-700/10",
      });
    }

    if (insights.length === 0) {
      insights.push({
        title: "Tudo em Ordem",
        desc: "Suas métricas principais estão dentro da normalidade para este período.",
        icon: <Lightbulb className="w-5 h-5 text-indigo-500" />,
        color: "bg-indigo-500/10",
      });
    }

    return insights;
  };

  const currentInsights = getInsights();

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isChatLoading) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsChatLoading(true);

    try {
      // History should alternate between user and model, usually starting with user.
      // If our first message is from the model (the welcome message), we might want to skip it for the API
      // if it's the very first exchange.
      const history = chatMessages
        .filter((_, i) => i > 0 || chatMessages[i].role === "user") // Simplified: if first is model, skip it for API history
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      const dreContext = {
        month: currentMonthLabel,
        year: selectedYear,
        summary: {
          faturamento: currentMonthData.faturamento,
          ebitda: currentMonthData.ebitda,
          netProfit: currentMonthData.netProfit,
          mc: mc,
          mcPercent: (mcPercent * 100).toFixed(1) + "%",
          lucratividade: lucratividade.toFixed(1) + "%",
        },
        groups: dreGroups.map((g) => ({
          label: g.label,
          total: g.total,
          items: g.items?.map((i) => ({ label: i.label, valor: i.valor })),
        })),
      };

      const response = await chatWithConsultant(
        userMessage,
        dreContext,
        history,
      );
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          text:
            response || "Desculpe, tive um erro ao processar sua solicitação.",
        },
      ]);
    } catch (error) {
      console.error(error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Erro ao conectar-se ao consultor. Verifique sua chave de API.",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Dynamic yearly data for the current month comparison
  const yearNum = parseInt(selectedYear);
  const yearsToCompare = [
    (yearNum - 2).toString(),
    (yearNum - 1).toString(),
    selectedYear,
  ];

  const yearlyComparisonData = yearsToCompare.map((y, idx) => {
    // Attempt to find data for this specific year and month in the timeline
    const timelineData = activeDreTimeline.find(
      (p) =>
        String(p.month).trim().toLowerCase() ===
          String(currentMonthLabel).trim().toLowerCase() &&
        String(p.year || "2026").trim() === String(y).trim(),
    );

    // Prioritize manual yearlyHistory from currentMonthData over database timeline
    const manualFaturamento = currentMonthData?.yearlyHistory?.[y];
    const faturamento =
      y === selectedYear
        ? currentMonthData.faturamento
        : (manualFaturamento !== undefined 
          ? manualFaturamento 
          : (timelineData 
            ? timelineData.faturamento 
            : (yearlyHistory[y] || 0)));

    const colors = [isDarkMode ? "#475569" : "#CBD5E1", "#8B5CF6", "#0EA5E9"];

    return {
      year: y,
      faturamento,
      color: colors[idx],
    };
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-[#333]">
        <div>
          <h2 className={`text-2xl sm:text-3xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>
            {showEntry ? "Lançamentos DRE" : `DRE Inteligente`}
          </h2>
          <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400 mt-1'}`}>
            {showEntry
              ? "Preencha os dados financeiros da unidade"
              : "Demonstrativo de Resultados do Exercício Detalhado"}
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          {!showEntry && (
            <button
              onClick={handleExportPDF}
              className={`flex-1 md:flex-initial btn-save-secondary ${
                isDarkMode 
                  ? 'bg-[#1E1E1E] border-[#333] hover:bg-[#252525] text-white' 
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
              }`}
            >
              <Download className="w-4 h-4 shrink-0" />
              Baixar PDF
            </button>
          )}

          <button 
            onClick={() => setShowEntry(!showEntry)}
            style={{
              backgroundColor: themeButtonBg,
              color: themeTextContrast,
              boxShadow: `0 10px 15px -3px ${themeButtonBg}40`,
            }}
            className="flex-1 md:flex-initial btn-save-primary"
          >
            {showEntry ? (
              <>
                <ArrowLeft className="w-4 h-4 shrink-0" />
                Voltar à DRE
              </>
            ) : (
              <>
                Lançamentos DRE
                <ArrowRight className="w-4 h-4 shrink-0" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Período de Trabalho (Active Period Selection) */}
      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-amber-500/5 border-amber-500/20'} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Período Ativo do Financeiro (DRE)
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Defina o período para visualizar, cadastrar e analisar os demonstrativos de resultados.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`flex-1 md:flex-initial text-xs font-bold px-3 py-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
            } outline-none cursor-pointer`}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className={`flex-1 md:flex-initial text-xs font-bold px-3 py-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
            } outline-none cursor-pointer`}
          >
            {["2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030"].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {showEntry ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-end">
            <button
              onClick={handleResetPeriod}
              disabled={isDeleting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${
                showConfirmReset
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20"
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Zerando Dados...
                </>
              ) : showConfirmReset ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Clique denovo para Confirmar
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Zerar Informações do Período
                </>
              )}
            </button>
          </div>
          <DataEntrySection
            isEmbedded={true}
            mode="finance"
            initialMonth={selectedMonth}
            initialYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                label: "Margem Bruta",
                value: `${marginBruta.toFixed(1)}%`,
                trend: marginBrutaTrend,
                trendColor:
                  marginBrutaTrend === "---"
                    ? "bg-slate-500/10 text-slate-400"
                    : marginBrutaTrend.startsWith("+")
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500",
                color: "text-indigo-600",
              },
              {
                label: "Margem Líquida",
                value: `${lucratividade.toFixed(1)}%`,
                trend: lucratividadeTrend,
                trendColor:
                  lucratividadeTrend === "---"
                    ? "bg-slate-500/10 text-slate-400"
                    : lucratividadeTrend.startsWith("+")
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500",
                color: "text-green-500",
              },
              {
                label: "Ponto Equilíbrio",
                value:
                  pontoEquilibrio > 0 ? formatCurrency(pontoEquilibrio) : "---",
                trend:
                  pontoEquilibrio > 0
                    ? pontoEquilibrio > (currentMonthData.faturamento || 0)
                      ? "Crítico"
                      : "Saudável"
                    : "MC Negativa",
                trendColor:
                  pontoEquilibrio > 0
                    ? pontoEquilibrio > (currentMonthData.faturamento || 0)
                      ? "bg-red-500/10 text-red-500"
                      : "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500",
                color: "text-amber-500",
              },
              {
                label: "CMV + CMO",
                value:
                  faturamentoVal > 0 ? `${cmvCmoPercent.toFixed(1)}%` : "---",
                trend:
                  cmvCmoPercent > 0
                    ? cmvCmoPercent <= 52
                      ? "Saudável"
                      : "Elevado"
                    : "---",
                trendColor:
                  cmvCmoPercent > 0
                    ? cmvCmoPercent <= 52
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                    : "bg-slate-500/10 text-slate-400",
                color: "text-blue-500",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`p-5 rounded-3xl border ${isDarkMode ? "bg-[#1E1E1E] border-[#333]" : "bg-white border-slate-100 shadow-sm"}`}
              >
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  {stat.label}
                </div>
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-black ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(stat as any).trendColor ? (stat as any).trendColor : stat.trend.startsWith("+") ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
                  >
                    {stat.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparativo Anual do Mês Chart */}
          <div
            className={`p-8 rounded-[2.5rem] border ${isDarkMode ? "bg-[#1E1E1E] border-[#333]" : "bg-white border-slate-100 shadow-sm"}`}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3
                  className={`font-black uppercase tracking-tighter italic text-xl flex items-center gap-2 ${isDarkMode ? "text-white" : "text-black"}`}
                >
                  <TrendingUp
                    className="w-5 h-5"
                    style={{ color: brandColors.primary }}
                  />{" "}
                  Comparativo Anual do Mês
                </h3>
                <p className="text-[10px] text-slate-500 font-medium italic">
                  Faturamento de {currentMonthLabel} em{" "}
                  {yearsToCompare.join(", ")}
                </p>
              </div>
              <div className="flex gap-4">
                {yearlyComparisonData.map((item) => (
                  <div key={item.year} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {item.year}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={yearlyComparisonData}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  barSize={60}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDarkMode ? "#333" : "#f0f0f0"}
                  />
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#888", fontSize: 11, fontWeight: 800 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#888", fontSize: 11, fontWeight: 800 }}
                    tickFormatter={(val) => `R$ ${val / 1000}k`}
                  />
                  <Tooltip
                    cursor={{ fill: isDarkMode ? "#ffffff05" : "#00000005" }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      backgroundColor: isDarkMode ? "#1E1E1E" : "#fff",
                      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                    formatter={(val: number) => [
                      formatCurrency(val),
                      "Faturamento",
                    ]}
                  />
                  <Bar dataKey="faturamento" radius={[12, 12, 0, 0]}>
                    {yearlyComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main DRE Table */}
            <div className="lg:col-span-2 space-y-8">
              {/* Tab Selector Segment */}
              <div
                className={`p-1 flex flex-col md:flex-row gap-1.5 rounded-2xl border shadow-sm ${
                  isDarkMode ? "bg-zinc-900 border-[#333]" : "bg-slate-100/90 border-slate-200"
                }`}
              >
                {[
                  { id: "unico_mes", label: "DRE Realizado Mês", desc: "Apenas o realizado", icon: DollarSign },
                  { id: "comparativo", label: "Comparativo DRE", desc: "Real x Orçado x YoY", icon: BarChart3 },
                  { id: "base_real", label: "Planilha Real Mensal", desc: "Histórico Realizado", icon: Calendar },
                  { id: "base_orcado", label: "Orçamento Anual", desc: "Metas e Planejado", icon: FileText },
                ].map((t) => {
                  const IconComp = t.icon;
                  const isActive = activeDRETab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveDRETab(t.id as any)}
                      className={`flex-1 py-1.5 px-3 rounded-xl flex items-center gap-3.5 transition-all cursor-pointer ${
                        isActive
                          ? isDarkMode
                            ? "bg-zinc-800 text-amber-500 border border-zinc-700/60 shadow-md"
                            : "bg-white text-indigo-600 shadow-sm border border-slate-200"
                          : "text-slate-500 hover:text-slate-800 dark:text-zinc-505 dark:hover:text-zinc-100"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                        isActive 
                          ? isDarkMode ? "bg-black/30" : "bg-indigo-50/70" 
                          : "bg-transparent"
                      }`}>
                        <IconComp className="w-4 h-4 shrink-0 text-current" />
                      </div>
                      <div className="text-left leading-none">
                        <div className="text-[11px] font-black uppercase tracking-tight mb-0.5">
                          {t.label}
                        </div>
                        <div className={`text-[8.5px] font-medium ${isActive ? "text-slate-500" : "text-slate-400"}`}>
                          {t.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeDRETab === "unico_mes" && (
                <div
                  className={`rounded-[2.5rem] border overflow-hidden ${
                    isDarkMode ? "bg-[#1E1E1E] border-[#333]" : "bg-white border-slate-100 shadow-sm"
                  }`}
                >
                  <div
                    className={`px-10 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isDarkMode ? "bg-black/20 border-[#333]" : "bg-slate-50/50 border-slate-100"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic block mb-1">
                        DRE Realizado Mensal Do Período
                      </span>
                      <h3 className={`text-base font-black uppercase tracking-tight italic ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                        DRE Realizado de {monthsGlobal.find(m => m.value === selectedMonth)?.label} - {selectedYear}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-800 text-[10px] font-black tracking-wider text-slate-400 dark:text-zinc-500">
                          <th className="py-4 px-3 w-[50%] border-r border-slate-200/80 dark:border-zinc-800">
                            Conta DRE
                          </th>
                          <th className="py-4 px-3 text-right w-[25%] bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01] border-r border-slate-200/80 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">
                            Valor Realizado (R$)
                          </th>
                          <th className="py-4 px-3 text-right w-[25%] bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">
                            Participação (AV %)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/30">
                        {[
                          { id: "faturamento", label: "RECEITA BRUTA", type: "income", mapGroupId: "receita" },
                          { id: "deducoes", label: "DEDUÇÕES DA RECEITA", type: "expense", mapGroupId: "deducoes" },
                          { id: "cmv", label: "CUSTOS VARIÁVEIS", type: "expense", mapGroupId: "cmv" },
                          { id: "despesas_var", label: "DESPESAS VARIÁVEIS", type: "expense", mapGroupId: "despesas_variaveis" },
                          { id: "margem_contrib", label: "Margem de Contribuição", type: "total", mapGroupId: "margem_contribuicao" },
                          { id: "colaboradores", label: "DESPESAS COM PESSOAL", type: "expense", mapGroupId: "despesas_fixas_5" },
                          { id: "funcionamento", label: "CUSTOS DE FUNCIONAMENTO", type: "expense", mapGroupId: "despesas_fixas_6" },
                          { id: "manutencao", label: "MANUTENÇÃO E TÉCNICA", type: "expense", mapGroupId: "despesas_fixas_7" },
                          { id: "comerciais", label: "DESPESAS COMERCIAIS / MKT", type: "expense", mapGroupId: "despesas_fixas_8" },
                          { id: "administrativas", label: "DESPESAS ADM / GERAIS", type: "expense", mapGroupId: "despesas_fixas_9" },
                          { id: "ebitda", label: "EBITDA - Resultado Operacional", type: "total", mapGroupId: "resultado_operacional_financeiro" },
                          { id: "financeiro", label: "Result. Financeiro & Impostos", type: "expense", mapGroupId: "apuracao_financeira" },
                          { id: "net_profit", label: "Resultado Líquido do Exercício", type: "total", mapGroupId: "resultado_liquido" },
                        ].map((row) => {
                          const compMonthLabel = monthsGlobal.find(m => m.value === selectedMonth)?.label || "";

                          const matchCurr = activeDreTimeline.find(d => d.month === compMonthLabel && d.year === selectedYear);
                          const valCurr = getActualRowValue(matchCurr, row.id);
                          const fatCurr = getActualRowValue(matchCurr, "faturamento") || 1;
                          const avCurr = row.id === "faturamento" ? 100 : (Math.abs(valCurr) / fatCurr) * 100;

                          const isTotalRow = row.type === "total";

                          const rowGroup = dreGroups.find(g => g.id === row.mapGroupId);
                          const hasDetails = rowGroup && rowGroup.items && rowGroup.items.length > 0;

                          return (
                            <React.Fragment key={row.id}>
                              <tr
                                onClick={() => hasDetails && toggleGroup(row.mapGroupId)}
                                className={`group/row transition-all hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 cursor-pointer ${
                                  isTotalRow 
                                    ? isDarkMode
                                      ? "bg-zinc-900 border-y-2 border-zinc-800 font-extrabold"
                                      : "bg-indigo-50/20 border-y border-indigo-100 font-extrabold"
                                    : ""
                                }`}
                              >
                                <td className="py-3 px-3 flex items-center gap-2 border-r border-slate-100 dark:border-zinc-800/40">
                                  {hasDetails && (
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                                        expandedGroups.includes(row.mapGroupId) ? "rotate-180" : ""
                                      }`}
                                    />
                                  )}
                                  <span className={`text-[11px] uppercase tracking-tight ${
                                    isTotalRow 
                                      ? "text-indigo-600 dark:text-amber-500 font-black leading-none" 
                                      : isDarkMode ? "text-slate-200" : "text-slate-800 font-bold"
                                  }`}>
                                    {row.label}
                                  </span>
                                </td>
                                {/* REAL CURR */}
                                <td className="py-3 px-3 text-right font-black font-sans text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/15 dark:bg-indigo-950/10 border-r border-slate-100 dark:border-zinc-800/40">
                                  {formatCurrency(valCurr)}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-[11px] font-mono text-slate-600 dark:text-zinc-300 bg-indigo-50/15 dark:bg-indigo-950/10">
                                  {avCurr.toFixed(1)}%
                                </td>
                              </tr>

                              <AnimatePresence initial={false}>
                                {expandedGroups.includes(row.mapGroupId) && hasDetails && (
                                  rowGroup.items.map((item) => {
                                    const detCurr = getActualDetailValue(matchCurr, row.mapGroupId, item.label);
                                    
                                    return (
                                      <tr
                                        key={item.label}
                                        className="bg-slate-50/30 dark:bg-black/10 hover:bg-slate-100/40 dark:hover:bg-zinc-800/20 transition-all border-b border-slate-100/50 dark:border-zinc-800/20"
                                      >
                                        <td className="py-2.5 pl-8 pr-3 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 border-r border-slate-100 dark:border-zinc-800/40 leading-tight">
                                          {item.label}
                                        </td>
                                        {/* REAL CURR DET */}
                                        <td className="py-2.5 px-3 text-right text-indigo-600/90 dark:text-indigo-400 font-sans font-semibold text-[10px] bg-indigo-50/5 dark:bg-indigo-950/5 border-r border-slate-100/50 dark:border-zinc-800/20">
                                          {formatCurrency(detCurr)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-[10px] font-bold font-mono text-slate-400 dark:text-zinc-400 bg-indigo-50/5 dark:bg-indigo-950/5">
                                          {((Math.abs(detCurr) / fatCurr) * 100).toFixed(1)}%
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeDRETab === "comparativo" && (
                <div
                  className={`rounded-[2.5rem] border overflow-hidden ${
                    isDarkMode ? "bg-[#1E1E1E] border-[#333]" : "bg-white border-slate-100 shadow-sm"
                  }`}
                >
                  <div
                    className={`px-10 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isDarkMode ? "bg-black/20 border-[#333]" : "bg-slate-50/50 border-slate-100"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic block mb-1">
                        Painel Analítico de DRE Comparativa
                      </span>
                      <h3 className={`text-base font-black uppercase tracking-tight italic ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                        Análise de {monthsGlobal.find(m => m.value === selectedMonth)?.label} - {selectedYear} x {parseInt(selectedYear) - 1}
                      </h3>
                    </div>
                    {isLoadingAllMonths && (
                      <span className="text-[10px] bg-indigo-500/15 text-indigo-500 font-bold px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5 shrink-0 self-start md:self-auto">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Sincronizando Histórico...
                      </span>
                    )}
                  </div>

                  <div className="p-4 overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse min-w-[1050px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-800 text-[10px] font-black tracking-wider text-slate-400 dark:text-zinc-500">
                          <th className="py-4 px-3 w-[22%] border-r border-slate-200/80 dark:border-zinc-800">
                            Conta DRE
                          </th>
                          <th className="py-4 px-3 text-center w-[14%] bg-slate-50/50 dark:bg-zinc-900/30 border-r border-slate-200/80 dark:border-zinc-800 uppercase" colSpan={2}>
                            REAL {parseInt(selectedYear) - 1}
                          </th>
                          <th className="py-4 px-3 text-center w-[14%] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] border-r border-slate-200/80 dark:border-zinc-800 text-amber-600/90 dark:text-amber-400/90 uppercase font-extrabold" colSpan={2}>
                            ORÇADO {selectedYear}
                          </th>
                          <th className="py-4 px-3 text-center w-[14%] bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01] border-r border-slate-200/80 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 uppercase font-extrabold" colSpan={2}>
                            REAL {selectedYear}
                          </th>
                          <th className="py-4 px-3 text-center w-[18%] bg-rose-500/[0.02] dark:bg-rose-500/[0.01] border-r border-slate-200/80 dark:border-zinc-800 text-rose-600 dark:text-rose-450 font-extrabold uppercase" colSpan={2}>
                            Divergência (Real x Orc)
                          </th>
                          <th className="py-4 px-3 text-center w-[18%] bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase" colSpan={2}>
                            Crescimento YoY
                          </th>
                        </tr>
                        <tr className="border-b border-slate-150 dark:border-zinc-800/60 text-[9px] font-bold text-slate-400 dark:text-zinc-500 tracking-wider">
                          <th className="py-2.5 px-3 border-r border-slate-200/80 dark:border-zinc-800">CONCEITO / COMPONENTES</th>
                          <th className="py-2.5 px-2 text-right bg-slate-50/50 dark:bg-zinc-900/30">VALOR (R$)</th>
                          <th className="py-2.5 px-2 text-right bg-slate-50/50 dark:bg-zinc-900/30 border-r border-slate-200/80 dark:border-zinc-800">PART. %</th>
                          <th className="py-2.5 px-2 text-right bg-amber-500/[0.02] dark:bg-amber-500/[0.01]">VALOR (R$)</th>
                          <th className="py-2.5 px-2 text-right bg-amber-500/[0.02] dark:bg-amber-500/[0.01] border-r border-slate-200/80 dark:border-zinc-800">PART. %</th>
                          <th className="py-2.5 px-2 text-right bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01]">VALOR (R$)</th>
                          <th className="py-2.5 px-2 text-right bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01] border-r border-slate-200/80 dark:border-zinc-800">PART. %</th>
                          <th className="py-2.5 px-2 text-right bg-rose-500/[0.02] dark:bg-rose-500/[0.01]">VALOR (R$)</th>
                          <th className="py-2.5 px-2 text-right bg-rose-500/[0.02] dark:bg-rose-500/[0.01] border-r border-slate-200/80 dark:border-zinc-800">DIF. %</th>
                          <th className="py-2.5 px-2 text-right bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]">R$ HISTATIV</th>
                          <th className="py-2.5 px-2 text-right bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]">CRESC. %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/30">
                        {[
                          { id: "faturamento", label: "RECEITA BRUTA", type: "income", mapGroupId: "receita" },
                          { id: "deducoes", label: "DEDUÇÕES DA RECEITA", type: "expense", mapGroupId: "deducoes" },
                          { id: "cmv", label: "CUSTOS VARIÁVEIS", type: "expense", mapGroupId: "cmv" },
                          { id: "despesas_var", label: "DESPESAS VARIÁVEIS", type: "expense", mapGroupId: "despesas_variaveis" },
                          { id: "margem_contrib", label: "Margem de Contribuição", type: "total", mapGroupId: "margem_contribuicao" },
                          { id: "colaboradores", label: "DESPESAS COM PESSOAL", type: "expense", mapGroupId: "despesas_fixas_5" },
                          { id: "funcionamento", label: "CUSTOS DE FUNCIONAMENTO", type: "expense", mapGroupId: "despesas_fixas_6" },
                          { id: "manutencao", label: "MANUTENÇÃO E TÉCNICA", type: "expense", mapGroupId: "despesas_fixas_7" },
                          { id: "comerciais", label: "DESPESAS COMERCIAIS / MKT", type: "expense", mapGroupId: "despesas_fixas_8" },
                          { id: "administrativas", label: "DESPESAS ADM / GERAIS", type: "expense", mapGroupId: "despesas_fixas_9" },
                          { id: "ebitda", label: "EBITDA - Resultado Operacional", type: "total", mapGroupId: "resultado_operacional_financeiro" },
                          { id: "financeiro", label: "Result. Financeiro & Impostos", type: "expense", mapGroupId: "apuracao_financeira" },
                          { id: "net_profit", label: "Resultado Líquido do Exercício", type: "total", mapGroupId: "resultado_liquido" },
                        ].map((row) => {
                          const prevYearStr = (parseInt(selectedYear) - 1).toString();
                          const compMonthLabel = monthsGlobal.find(m => m.value === selectedMonth)?.label || "";

                          const matchPrev = activeDreTimeline.find(d => d.month === compMonthLabel && d.year === prevYearStr);
                          const valPrev = getActualRowValue(matchPrev, row.id);
                          const fatPrev = getActualRowValue(matchPrev, "faturamento") || 1;
                          const avPrev = row.id === "faturamento" ? 100 : (Math.abs(valPrev) / fatPrev) * 100;

                          const monthlyBudgetObj = yearlyBudgets[selectedYear]?.[selectedMonth] || {};
                          const valBudget = row.type === "total" 
                            ? calculateRowValue(monthlyBudgetObj, row.id) 
                            : (monthlyBudgetObj[row.id] || 0);
                          const fatBudget = (yearlyBudgets[selectedYear]?.[selectedMonth]?.["faturamento"]) || 1;
                          const avBudget = row.id === "faturamento" ? 100 : (Math.abs(valBudget) / fatBudget) * 100;

                          const matchCurr = activeDreTimeline.find(d => d.month === compMonthLabel && d.year === selectedYear);
                          const valCurr = getActualRowValue(matchCurr, row.id);
                          const fatCurr = getActualRowValue(matchCurr, "faturamento") || 1;
                          const avCurr = row.id === "faturamento" ? 100 : (Math.abs(valCurr) / fatCurr) * 100;

                          // Variance vs Budget: Real - Budget (Variance of Expenses uses custom style where negative is good saving)
                          const varBudVal = valCurr - valBudget;
                          const varBudAH = valBudget !== 0 ? (varBudVal / Math.abs(valBudget)) * 100 : 0;

                          // Variance YoY: Real Curr - Real Prev
                          const varYoYVal = valCurr - valPrev;
                          const varYoYAH = valPrev !== 0 ? (varYoYVal / Math.abs(valPrev)) * 100 : 0;

                          const isExpenseRow = row.type === "expense";
                          const isTotalRow = row.type === "total";

                          const rowGroup = dreGroups.find(g => g.id === row.mapGroupId);
                          const hasDetails = rowGroup && rowGroup.items && rowGroup.items.length > 0;

                          return (
                            <React.Fragment key={row.id}>
                              <tr
                                onClick={() => hasDetails && toggleGroup(row.mapGroupId)}
                                className={`group/row transition-all hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 cursor-pointer ${
                                  isTotalRow 
                                    ? isDarkMode
                                      ? "bg-zinc-900 border-y-2 border-zinc-800 font-extrabold"
                                      : "bg-indigo-50/20 border-y border-indigo-100 font-extrabold"
                                    : ""
                                }`}
                              >
                                <td className="py-3 px-3 flex items-center gap-2 border-r border-slate-100 dark:border-zinc-800/40">
                                  {hasDetails && (
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                                        expandedGroups.includes(row.mapGroupId) ? "" : "-rotate-90"
                                      }`}
                                    />
                                  )}
                                  <span className={`text-[11px] uppercase tracking-tight ${
                                    isTotalRow 
                                      ? "text-indigo-600 dark:text-amber-500 font-black leading-none" 
                                      : isDarkMode ? "text-slate-200" : "text-slate-800 font-bold"
                                  }`}>
                                    {row.label}
                                  </span>
                                </td>
                                {/* REAL PREV */}
                                <td className="py-3 px-2 text-right font-semibold font-sans text-xs text-slate-700 dark:text-zinc-300">
                                  {formatCurrency(valPrev)}
                                </td>
                                <td className="py-3 px-2 text-right font-normal text-[10px] font-mono text-slate-450 border-r border-slate-100 dark:border-zinc-800/40">
                                  {avPrev.toFixed(1)}%
                                </td>
                                {/* ORÇADO CURR */}
                                <td className="py-3 px-2 text-right font-semibold font-sans text-xs text-amber-700 dark:text-amber-400/90">
                                  {formatCurrency(valBudget)}
                                </td>
                                <td className="py-3 px-2 text-right font-normal text-[10px] font-mono text-slate-450 border-r border-slate-100 dark:border-zinc-800/40">
                                  {avBudget.toFixed(1)}%
                                </td>
                                {/* REAL CURR */}
                                <td className="py-3 px-2 text-right font-black font-sans text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/15 dark:bg-indigo-950/10">
                                  {formatCurrency(valCurr)}
                                </td>
                                <td className="py-3 px-2 text-right font-normal text-[10px] font-mono text-slate-450 border-r border-slate-200/60 dark:border-zinc-800/60 bg-indigo-50/15 dark:bg-indigo-950/10">
                                  {avCurr.toFixed(1)}%
                                </td>
                                {/* VAR vs BUDGET */}
                                <td className={`py-3 px-2 text-right font-bold font-sans text-[11px] ${getVarianceColor(varBudVal, isExpenseRow)}`}>
                                  {varBudVal > 0 ? "+" : ""}{formatCurrency(varBudVal)}
                                </td>
                                <td className={`py-3 px-2 text-right font-bold text-[10px] font-mono border-r border-slate-100 dark:border-zinc-800/40 ${getVarianceColor(varBudAH, isExpenseRow)}`}>
                                  {varBudAH > 0 ? "+" : ""}{varBudAH.toFixed(1)}%
                                </td>
                                {/* VAR YOY */}
                                <td className={`py-3 px-2 text-right font-bold font-sans text-[11px] ${getVarianceColor(varYoYVal, isExpenseRow)}`}>
                                  {varYoYVal > 0 ? "+" : ""}{formatCurrency(varYoYVal)}
                                </td>
                                <td className={`py-3 px-2 text-right font-bold text-[10px] font-mono ${getVarianceColor(varYoYAH, isExpenseRow)}`}>
                                  {varYoYAH > 0 ? "+" : ""}{varYoYAH.toFixed(1)}%
                                </td>
                              </tr>

                              {/* Nested Details Sub Rows */}
                              <AnimatePresence>
                                {hasDetails && expandedGroups.includes(row.mapGroupId) && (
                                  rowGroup.items.map((item) => {
                                    const detPrev = getActualDetailValue(matchPrev, row.mapGroupId, item.label);
                                    const detCurr = getActualDetailValue(matchCurr, row.mapGroupId, item.label);
                                    
                                    const detVar = detCurr - detPrev;
                                    const detVarPct = detPrev !== 0 ? (detVar / Math.abs(detPrev)) * 105 : 0;

                                    return (
                                      <tr
                                        key={item.label}
                                        className="bg-slate-50/30 dark:bg-black/10 hover:bg-slate-100/40 dark:hover:bg-zinc-800/20 transition-all border-b border-slate-100/50 dark:border-zinc-800/20"
                                      >
                                        <td className="py-2.5 pl-8 pr-3 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 border-r border-slate-100 dark:border-zinc-800/40 leading-tight">
                                          {item.label}
                                        </td>
                                        {/* REAL PREV DET */}
                                        <td className="py-2.5 px-2 text-right text-slate-500 font-sans font-medium text-[10px]">
                                          {formatCurrency(detPrev)}
                                        </td>
                                        <td className="py-2.5 px-2 text-right text-[9.5px] font-mono text-slate-400 border-r border-slate-100 dark:border-zinc-800/40">
                                          {((Math.abs(detPrev) / fatPrev) * 100).toFixed(1)}%
                                        </td>
                                        {/* METAS ORÇADO (NOT SPECIFIED AT ACCOUNT LEVEL) */}
                                        <td className="py-2.5 px-2 text-center text-[10px] font-mono text-slate-350 dark:text-zinc-600 italic">
                                          —
                                        </td>
                                        <td className="py-2.5 px-2 text-center text-[9px] font-mono text-slate-350 dark:text-zinc-600 italic border-r border-slate-100 dark:border-zinc-800/40">
                                          —
                                        </td>
                                        {/* REAL CURR DET */}
                                        <td className="py-2.5 px-2 text-right text-indigo-600/90 dark:text-indigo-400 font-sans font-semibold text-[10px] bg-indigo-50/5 dark:bg-indigo-950/5">
                                          {formatCurrency(detCurr)}
                                        </td>
                                        <td className="py-2.5 px-2 text-right text-[9.5px] font-mono text-slate-400 border-r border-slate-150 dark:border-[#333]/40 bg-indigo-50/5 dark:bg-indigo-950/5">
                                          {((Math.abs(detCurr) / fatCurr) * 105).toFixed(1)}%
                                        </td>
                                        {/* COMPAR BUDGET (NOT ENTERED AT DETAIL LEVEL) */}
                                        <td className="py-2.5 px-2 text-center text-[10px] font-mono text-slate-350 dark:text-zinc-650 italic">
                                          —
                                        </td>
                                        <td className="py-2.5 px-2 text-center text-[9px] font-mono text-slate-350 dark:text-zinc-650 italic border-r border-slate-100 dark:border-zinc-800/40">
                                          —
                                        </td>
                                        {/* VAR YOY DET */}
                                        <td className={`py-2.5 px-2 text-right font-sans font-semibold text-[10px] ${getVarianceColor(detVar, isExpenseRow)}`}>
                                          {detVar > 0 ? "+" : ""}{formatCurrency(detVar)}
                                        </td>
                                        <td className={`py-2.5 px-2 text-right font-mono font-semibold text-[9.5px] ${getVarianceColor(detVarPct, isExpenseRow)}`}>
                                          {detVarPct > 0 ? "+" : ""}{detVarPct.toFixed(1)}%
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeDRETab === "base_real" && (
                <div
                  className={`rounded-[2.5rem] border overflow-hidden ${
                    isDarkMode ? "bg-[#1E1E1E] border-[#333]" : "bg-white border-slate-100 shadow-sm"
                  }`}
                >
                  <div
                    className={`px-10 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isDarkMode ? "bg-black/20 border-[#333]" : "bg-slate-50/50 border-slate-100"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic block mb-1">
                        PLANILHA MENSAL REALIZADO (HISTÓRICO)
                      </span>
                      <h3 className={`text-base font-black uppercase tracking-tight italic ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                        DRE Realizada Multi-Mês de {realYearForTab}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0 mr-1">Selectionar Ano DRE:</span>
                      <select
                        value={realYearForTab}
                        onChange={(e) => setRealYearForTab(e.target.value)}
                        className={`text-xs font-black px-3 py-2 rounded-xl border ${
                          isDarkMode ? "bg-[#252525] border-[#3C3C3C] text-white" : "bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        {["2023", "2024", "2025", "2026", "2027", "2028"].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-4 overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse min-w-[1280px]">
                      <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-zinc-800 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                          <th className="py-4 px-3 w-[16%] border-r border-slate-200/80 dark:border-zinc-800">CONCEITO / COMPONENTES</th>
                          {monthsGlobal.map((m) => (
                            <th key={m.value} className="py-4 px-2 text-right w-[6.5%] font-extrabold">{m.label.substring(0, 3).toUpperCase()}</th>
                          ))}
                          <th className="py-4 px-3 text-right bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01] border-l border-indigo-150/50 dark:border-zinc-800/80 text-indigo-600 dark:text-indigo-400 font-extrabold w-[8%]">ACUMULADO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/30">
                        {[
                          { id: "faturamento", label: "RECEITA BRUTA", type: "income" },
                          { id: "deducoes", label: "DEDUÇÕES DA RECEITA", type: "expense" },
                          { id: "cmv", label: "CUSTOS VARIÁVEIS", type: "expense" },
                          { id: "despesas_var", label: "DESPESAS VARIÁVEIS", type: "expense" },
                          { id: "margem_contrib", label: "Margem de Contribuição", type: "total" },
                          { id: "colaboradores", label: "DESPESAS COM PESSOAL", type: "expense" },
                          { id: "funcionamento", label: "CUSTOS DE FUNCIONAMENTO", type: "expense" },
                          { id: "manutencao", label: "MANUTENÇÃO E TÉCNICA", type: "expense" },
                          { id: "comerciais", label: "DESPESAS COMERCIAIS / MKT", type: "expense" },
                          { id: "administrativas", label: "DESPESAS ADM / GERAIS", type: "expense" },
                          { id: "ebitda", label: "EBITDA - Resultado Operacional", type: "total" },
                          { id: "financeiro", label: "Result. Financeiro & Impostos", type: "expense" },
                          { id: "net_profit", label: "Resultado Líquido do Exercício", type: "total" },
                        ].map((row) => {
                          const isTotalRow = row.type === "total";
                          let accumulatedValue = 0;

                          return (
                            <tr
                              key={row.id}
                              className={`group/row transition-all hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 ${
                                isTotalRow 
                                  ? isDarkMode 
                                    ? "bg-zinc-900 border-y border-zinc-800 font-extrabold" 
                                    : "bg-indigo-50/20 border-y border-indigo-100 font-extrabold" 
                                  : ""
                              }`}
                            >
                              <td className="py-3 px-3 border-r border-slate-100 dark:border-zinc-800/40">
                                <span className={`text-[11px] uppercase tracking-tight ${
                                  isTotalRow 
                                    ? "text-indigo-600 dark:text-amber-500 font-black" 
                                    : isDarkMode ? "text-slate-300" : "text-slate-750 font-bold"
                                }`}>
                                  {row.label}
                                </span>
                              </td>
                              {monthsGlobal.map((m) => {
                                const compMonthName = m.label;
                                const match = activeDreTimeline.find(d => d.month === compMonthName && d.year === realYearForTab);
                                const cellVal = getActualRowValue(match, row.id);
                                accumulatedValue += cellVal;

                                return (
                                  <td key={m.value} className={`py-3 px-2 text-right font-semibold font-sans text-xs ${
                                    isTotalRow 
                                      ? (cellVal >= 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold") 
                                      : isDarkMode ? "text-slate-400" : "text-slate-650"
                                  }`}>
                                    {cellVal !== 0 ? formatCurrency(cellVal) : "—"}
                                  </td>
                                );
                              })}
                              {/* Accumulated Column */}
                              <td className={`py-3 px-3 text-right font-bold font-mono text-xs border-l border-indigo-150/40 dark:border-zinc-800 bg-indigo-500/[0.04] dark:bg-indigo-950/20 ${
                                accumulatedValue >= 0 
                                  ? "text-emerald-600 dark:text-emerald-400 font-black" 
                                  : "text-rose-600 dark:text-rose-450 font-black"
                              }`}>
                                {formatCurrency(accumulatedValue)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeDRETab === "base_orcado" && (
                <div
                  className={`rounded-[2.5rem] border overflow-hidden ${
                    isDarkMode ? "bg-[#1E1E1E] border-[#333]" : "bg-white border-slate-100 shadow-sm"
                  }`}
                >
                  <div
                    className={`px-10 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isDarkMode ? "bg-black/20 border-[#333]" : "bg-slate-50/50 border-slate-100"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic block mb-1">
                        PLANILHA MENSAL PREVISTA / ORÇADA
                      </span>
                      <h3 className={`text-base font-black uppercase tracking-tight italic ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                        Editar DRE Orçada do Ano {selectedYear}
                      </h3>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          const lastY = (parseInt(selectedYear) - 1).toString();
                          // Pre-populate budget state
                          const newYearBudgetData: Record<string, Record<string, number>> = {};
                          monthsGlobal.forEach((m) => {
                            const match = activeDreTimeline.find(d => d.month === m.label && d.year === lastY);
                            newYearBudgetData[m.value] = {
                              faturamento: getActualRowValue(match, "faturamento"),
                              deducoes: getActualRowValue(match, "deducoes"),
                              cmv: getActualRowValue(match, "cmv"),
                              despesas_var: getActualRowValue(match, "despesas_var"),
                              colaboradores: getActualRowValue(match, "colaboradores"),
                              funcionamento: getActualRowValue(match, "funcionamento"),
                              manutencao: getActualRowValue(match, "manutencao"),
                              comerciais: getActualRowValue(match, "comerciais"),
                              administrativas: getActualRowValue(match, "administrativas"),
                              financeiro: getActualRowValue(match, "financeiro"),
                            };
                          });
                          
                          setYearlyBudgets(prev => ({
                            ...prev,
                            [selectedYear]: newYearBudgetData
                          }));
                          toastSuccess(`Copiou dados históricos de ${lastY} como rascunho de orçamento!`);
                        }}
                        className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl border active:scale-95 transition-all ${
                          isDarkMode 
                            ? "bg-black/30 border-white/5 text-amber-500 hover:bg-black/50" 
                            : "bg-amber-100/30 border-amber-200 text-amber-700 hover:bg-amber-100/50"
                        }`}
                      >
                        📋 Copiar do Real {parseInt(selectedYear) - 1}
                      </button>

                      <button
                        onClick={handleSaveBudget}
                        disabled={isSavingBudgets}
                        style={{ backgroundColor: themeButtonBg, color: themeTextContrast }}
                        className="text-[10px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSavingBudgets ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            Salvar Orçamento
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse min-w-[1280px]">
                      <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-zinc-800 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                          <th className="py-4 px-3 w-[16%] border-r border-slate-200/80 dark:border-zinc-800">CONCEITO / COMPONENTES</th>
                          {monthsGlobal.map((m) => (
                            <th key={m.value} className="py-4 px-2 text-right w-[6.5%] font-extrabold">{m.label.substring(0, 3).toUpperCase()}</th>
                          ))}
                          <th className="py-4 px-3 text-right bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01] border-l border-indigo-150/50 dark:border-zinc-800/80 text-indigo-600 dark:text-indigo-400 font-extrabold w-[8%]">ACUMULADO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/30">
                        {[
                          { id: "faturamento", label: "RECEITA BRUTA", type: "income", isCalculated: false },
                          { id: "deducoes", label: "DEDUÇÕES DA RECEITA", type: "expense", isCalculated: false },
                          { id: "cmv", label: "CUSTOS VARIÁVEIS", type: "expense", isCalculated: false },
                          { id: "despesas_var", label: "DESPESAS VARIÁVEIS", type: "expense", isCalculated: false },
                          { id: "margem_contrib", label: "Margem de Contribuição", type: "total", isCalculated: true },
                          { id: "colaboradores", label: "DESPESAS COM PESSOAL", type: "expense", isCalculated: false },
                          { id: "funcionamento", label: "CUSTOS DE FUNCIONAMENTO", type: "expense", isCalculated: false },
                          { id: "manutencao", label: "MANUTENÇÃO E TÉCNICA", type: "expense", isCalculated: false },
                          { id: "comerciais", label: "DESPESAS COMERCIAIS / MKT", type: "expense", isCalculated: false },
                          { id: "administrativas", label: "DESPESAS ADM / GERAIS", type: "expense", isCalculated: false },
                          { id: "ebitda", label: "EBITDA - Resultado Operacional", type: "total", isCalculated: true },
                          { id: "financeiro", label: "Result. Financeiro & Impostos", type: "expense", isCalculated: false },
                          { id: "net_profit", label: "Resultado Líquido do Exercício", type: "total", isCalculated: true },
                        ].map((row) => {
                          const isTotalRow = row.isCalculated;
                          let accumulatedBudget = 0;

                          return (
                            <tr
                              key={row.id}
                              className={`group/row transition-all hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 ${
                                isTotalRow 
                                  ? isDarkMode 
                                    ? "bg-zinc-900 border-y border-zinc-800 font-extrabold" 
                                    : "bg-indigo-50/20 border-y border-indigo-100 font-extrabold" 
                                  : ""
                              }`}
                            >
                              <td className="py-3 px-3 border-r border-slate-100 dark:border-zinc-800/40">
                                <span className={`text-[11px] uppercase tracking-tight ${
                                  isTotalRow 
                                    ? "text-indigo-600 dark:text-amber-500 font-black" 
                                    : isDarkMode ? "text-slate-300" : "text-slate-750 font-bold"
                                }`}>
                                  {row.label}
                                </span>
                              </td>
                              {monthsGlobal.map((m) => {
                                const mObj = yearlyBudgets[selectedYear]?.[m.value] || {};
                                const cellValue = row.isCalculated 
                                  ? calculateRowValue(mObj, row.id) 
                                  : (mObj[row.id] || 0);

                                accumulatedBudget += cellValue;

                                if (isTotalRow) {
                                  return (
                                    <td key={m.value} className="py-3 px-2 text-right font-semibold font-sans text-xs text-slate-700 dark:text-zinc-300">
                                      {formatCurrency(cellValue)}
                                    </td>
                                  );
                                }

                                return (
                                  <td key={m.value} className="py-1 px-1 text-right">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="—"
                                      value={cellValue || ""}
                                      onChange={(e) => {
                                        const cleanVal = e.target.value.replace(/[^\d.-]/g, "").replace(",", ".");
                                        const parsed = parseFloat(cleanVal) || 0;
                                        setYearlyBudgets(prev => {
                                          const tempY = prev[selectedYear] ? { ...prev[selectedYear] } : {};
                                          const tempM = tempY[m.value] ? { ...tempY[m.value] } : {};
                                          tempM[row.id] = parsed;
                                          tempY[m.value] = tempM;
                                          return { ...prev, [selectedYear]: tempY };
                                        });
                                      }}
                                      className={`w-full text-right font-sans text-xs font-bold px-1.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0 select-all transition-all ${
                                        isDarkMode 
                                          ? "bg-[#252525] border-[#383838] text-white focus:ring-amber-500 focus:bg-zinc-800" 
                                          : "bg-white border-slate-200 text-slate-800 focus:ring-indigo-500 focus:bg-slate-50"
                                      }`}
                                    />
                                  </td>
                                );
                              })}
                              {/* Accumulated Budget Column */}
                              <td className={`py-3 px-3 text-right font-bold font-mono text-xs border-l border-indigo-150/40 dark:border-zinc-800 bg-indigo-500/[0.04] dark:bg-indigo-950/20 ${
                                accumulatedBudget >= 0 
                                  ? "text-emerald-600 dark:text-emerald-400 font-black" 
                                  : "text-rose-600 dark:text-rose-455 font-black"
                              }`}>
                                {formatCurrency(accumulatedBudget)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}


            </div>

            {/* Action Sidebar */}
            <div className="space-y-6">
              <div
                className={`p-8 rounded-[2.5rem] border ${isDarkMode ? "bg-[#1E1E1E] border-[#333]" : "bg-white border-slate-100 shadow-sm"}`}
              >
                <h4
                  className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic ${isDarkMode ? "text-slate-400" : "text-black"}`}
                >
                  Insights Operacionais
                </h4>
                <div className="space-y-6">
                  {currentInsights.map((insight, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className={`p-2 rounded-xl ${insight.color}`}>
                        {insight.icon}
                      </div>
                      <div>
                        <div
                          className={`text-xs font-black mb-1 uppercase tracking-tighter ${isDarkMode ? "dark:text-white" : "text-black"}`}
                        >
                          {insight.title}
                        </div>
                        <p
                          className={`text-[10px] italic leading-relaxed ${isDarkMode ? "text-slate-500" : "text-black"}`}
                        >
                          {insight.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  onClick={handleExportPDF}
                  onMouseEnter={() => setIsHoverExport(true)}
                  onMouseLeave={() => setIsHoverExport(false)}
                  style={isHoverExport ? {
                    backgroundColor: brandColors.button,
                    borderColor: brandColors.button,
                    color: currentStore.brand === "BEBELU" ? "#121212" : "#FFFFFF"
                  } : {}}
                  className={`mt-10 p-5 rounded-3xl border flex items-center justify-between group cursor-pointer active:scale-95 transition-all ${
                    isDarkMode
                      ? "bg-black/20 border-white/5"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`w-5 h-5 transition-colors ${isHoverExport ? (currentStore.brand === "BEBELU" ? "text-amber-950" : "text-white") : "text-amber-500"}`} />
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isHoverExport ? (currentStore.brand === "BEBELU" ? "text-amber-950" : "text-white") : (isDarkMode ? "dark:text-white" : "text-slate-900")}`}
                    >
                      Exportar DRE PDF
                    </span>
                  </div>
                  <ArrowRight className={`w-4 h-4 transition-colors ${isHoverExport ? (currentStore.brand === "BEBELU" ? "text-amber-950" : "text-white") : "text-slate-400"}`} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* AI Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-2xl h-[80vh] flex flex-col rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDarkMode ? "bg-[#1E1E1E] border-[#333]" : "bg-white border-slate-100"}`}
            >
              {/* Chat Header */}
              <div
                className={`px-8 py-6 border-b flex items-center justify-between ${isDarkMode ? "bg-black/20 border-[#333]" : "bg-slate-50 border-slate-100"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-xl">
                    <MessagesSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-black dark:text-white uppercase tracking-tighter italic text-lg leading-tight">
                      Consultor IA Financeiro
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold italic tracking-wider">
                      Gestão & Otimização de Margem
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-10">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-2">
                      <Zap className="w-8 h-8 text-indigo-500" />
                    </div>
                    <p className="text-sm font-black dark:text-white uppercase italic tracking-tighter">
                      Olá! Como posso te ajudar hoje?
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                      Tenho acesso aos seus dados de {currentMonthLabel}{" "}
                      {selectedYear}. Pergunte sobre sua margem, despesas ou
                      como aumentar seu lucro.
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      style={
                        msg.role === "user"
                          ? {
                              backgroundColor: brandColors.button,
                              color: currentStore.brand === "BEBELU" ? "#121212" : "#FFFFFF"
                            }
                          : {}
                      }
                      className={`max-w-[85%] rounded-3xl p-5 text-sm ${
                        msg.role === "user"
                          ? "rounded-tr-none shadow-md"
                          : isDarkMode
                            ? "bg-black/40 text-slate-300 border border-white/5"
                            : "bg-slate-100 text-slate-800 rounded-tl-none"
                      }`}
                    >
                      {msg.role === "model" ? (
                        <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div
                      className={`rounded-3xl p-5 ${isDarkMode ? "bg-black/40 border border-white/5" : "bg-slate-100"}`}
                    >
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: brandColors.primary }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div
                className={`p-6 border-t ${isDarkMode ? "bg-black/20 border-[#333]" : "bg-slate-50 border-slate-100"}`}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative"
                >
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Pergunte sobre sua DRE..."
                    className={`w-full bg-white dark:bg-[#1E1E1E] border ${isDarkMode ? "border-[#333] text-white" : "border-slate-200"} rounded-2xl py-4 pl-6 pr-14 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
                  />
                  <button
                    type="submit"
                    disabled={!currentMessage.trim() || isChatLoading}
                    className="absolute right-2 top-2 p-3 bg-[#FFB800] hover:bg-black text-black hover:text-white rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-[#FFB800] disabled:hover:text-black"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
