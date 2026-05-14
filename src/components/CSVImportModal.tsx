import React, { useState } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { extractDataFromCSV } from '../services/geminiService';
import { useStore } from '../contexts/StoreContext';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'products' | 'inventory';
}

export default function CSVImportModal({ isOpen, onClose, type }: CSVImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode, setTopProducts, setInventoryItems } = useStore();

  const handleImport = async () => {
    if (!csvText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await extractDataFromCSV(csvText, type);
      
      if (type === 'products') {
        const productCategories: Record<string, string> = {
          'REF MIX 300 COCA ZERO': 'Bebidas',
          'REF LATA COCA-COLA': 'Bebidas',
          'MIX 300 FANTA GUARANA': 'Bebidas',
          'REF LT COCA-COLA ZERO': 'Bebidas',
          'REF MIX 300 SPRITE': 'Bebidas',
          'REF MIX 500 COCA-ZER': 'Bebidas',
          'REF LATA FANTA UVA': 'Bebidas',
          'REF MIX 500 SPRITE': 'Bebidas',
          'MIX 500 FANTA GUARANA': 'Bebidas',
          'AMSTEL LATA': 'Bebidas',
          'HEINEKEN LN': 'Bebidas',
          'REF MIX 300 KUAT': 'Combo Lojista',
          'REF MIX 500 KUAT': 'Combo Lojista',
          'DIF REF PEQ P/ GRANDE': 'Combo Lojista',
          'AQUARIUS FRESH': 'Combo Lojista',
          'REF MIX 300 FANTA LARANJA': 'Combo Lojista',
        };

        const productsWithIds = data.map((p: any, i: number) => {
          const autoCategory = productCategories[p.name.toUpperCase()];
          return {
            ...p,
            id: (Date.now() + i).toString(),
            active: true,
            category: autoCategory || p.category || 'Geral',
          };
        });
        setTopProducts(productsWithIds);
      } else {
        const itemsWithIds = data.map((item: any, i: number) => ({
          ...item,
          id: (Date.now() + i).toString(),
        }));
        setInventoryItems(itemsWithIds);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setCsvText('');
        onClose();
      }, 2000);
    } catch (err) {
      setError('Ocorreu um erro ao processar o arquivo. Verifique o formato e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (isExcel) {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            setCsvText(csv);
          } catch (err) {
            setError('Erro ao ler arquivo Excel. Tente converter para CSV.');
          }
        } else {
          setCsvText(event.target?.result as string);
        }
      };

      if (isExcel) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`relative w-full max-w-2xl rounded-[2.5rem] border overflow-hidden shadow-2xl ${
              isDarkMode ? 'bg-[#1A1A1A] border-[#333]' : 'bg-white border-slate-100'
            }`}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black dark:text-white uppercase italic tracking-tighter">
                    Importar {type === 'products' ? 'Produtos & Vendas' : 'Insumos & CMV'}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium italic">
                    A IA identificará automaticamente os campos do seu relatório
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex flex-col items-center justify-center gap-3 p-8 rounded-3xl border-2 border-dashed cursor-pointer transition-all hover:border-[#FFB800] group ${
                    isDarkMode ? 'border-[#333] hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input type="file" className="hidden" accept=".csv,.txt,.xlsx,.xls" onChange={handleFileUpload} />
                    <Upload className="w-8 h-8 text-[#FFB800]" />
                    <div className="text-center">
                      <div className="text-xs font-black uppercase tracking-widest dark:text-white mb-1">Selecionar Arquivo</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Excel, CSV ou TXT</div>
                    </div>
                  </label>
                  
                  <div className={`flex flex-col gap-3 p-8 rounded-3xl border ${
                    isDarkMode ? 'bg-black/20 border-[#333]' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest dark:text-white mb-1">Dica da IA</div>
                      <div className="text-[10px] text-slate-500 font-bold italic leading-tight">
                        Você pode colar o conteúdo do seu relatório do iFood, Totvs ou de qualquer planilha diretamente abaixo.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Cole aqui o conteúdo do seu CSV ou relatório..."
                    className={`w-full h-48 p-6 rounded-3xl border outline-none transition-all focus:ring-2 focus:ring-[#FFB800] font-mono text-xs ${
                      isDarkMode ? 'bg-[#121212] border-[#333] text-slate-300' : 'bg-white border-slate-100 text-slate-600'
                    }`}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={!csvText.trim() || isLoading}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSuccess 
                      ? 'bg-green-500 text-white' 
                      : 'bg-[#FFB800] text-black hover:bg-black hover:text-white shadow-xl shadow-[#FFB800]/20'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processando com IA...
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Importado com Sucesso!
                    </>
                  ) : (
                    <>
                      Importar e Analisar com IA
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
