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
      let data: any[] = [];
      
      // Try AI first
      try {
        data = await extractDataFromCSV(csvText, type);
      } catch (aiErr: any) {
        console.warn("AI extraction failed, trying manual parse fallback...", aiErr);
        
        // Manual Fallback Logic
        const lines = csvText.split('\n');
        if (lines.length < 2) throw new Error("Conteúdo insuficiente para importação manual.");
        
        // Basic CSV to JSON conversion for common headers
        const rows = lines.filter(l => l.trim()).map(line => {
          // Detect separator
          const sep = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
          return line.split(sep).map(c => c.trim());
        });
        
        const headers = rows[0].map(h => h.toLowerCase());
        const content = rows.slice(1);
        
        data = content.map(row => {
          const obj: any = {};
          if (type === 'products') {
            // Mapping for Products
            const nameIdx = headers.findIndex(h => h.includes('prod') || h.includes('nome') || h.includes('item') || h.includes('desc'));
            const qtyIdx = headers.findIndex(h => h.includes('qtd') || h.includes('quant') || h.includes('unid'));
            const valIdx = headers.findIndex(h => h.includes('vend') || h.includes('fat') || h.includes('total') || h.includes('valor') || h.includes('p.médio'));
            const cmvIdx = headers.findIndex(h => h.includes('cmv') || h.includes('cost') || h.includes('custo') || h.includes('vlr.cmv'));
            const marginIdx = headers.findIndex(h => h.includes('marg') || h.includes('mc'));
            
            // Cleaning function for numbers that might be like R$ 1.234,56 or 1234.56
            const cleanNum = (str: string) => {
              if (!str) return 0;
              const cleaned = str.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
              return Number(cleaned) || 0;
            };

            const val = cleanNum(row[valIdx]);
            const qty = Number(row[qtyIdx]?.replace(/[^\d]/g, '') || 1);
            const cmv = cleanNum(row[cmvIdx]);
            const margin = cleanNum(row[marginIdx]);
            
            return {
              name: row[nameIdx] || 'Sem Nome',
              quantidadeVendas: qty,
              faturamento: val,
              cmv: cmv || (val > 0 ? (val / qty) * 0.35 : 0), // Fallback CMV 35% if not found
              margin: margin || (val > 0 ? ((val - (cmv * qty || val * 0.35)) / val) * 100 : 0)
            };
          } else {
            // Mapping for Inventory
            const nameIdx = headers.findIndex(h => h.includes('prod') || h.includes('nome') || h.includes('item') || h.includes('insumo') || h.includes('desc'));
            const unitIdx = headers.findIndex(h => h.includes('unid') || h.includes('um') || h.includes('medida'));
            const priceIdx = headers.findIndex(h => h.includes('preço') || h.includes('valor') || h.includes('vlr') || h.includes('custo') || h.includes('unit'));
            const supplierIdx = headers.findIndex(h => h.includes('fornecedor') || h.includes('origem') || h.includes('marca'));
            
            const cleanNum = (str: string) => {
              if (!str) return 0;
              const cleaned = str.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
              return Number(cleaned) || 0;
            };

            return {
              name: row[nameIdx] || 'Sem Nome',
              unit: row[unitIdx] || 'UN',
              price: cleanNum(row[priceIdx]),
              supplier: row[supplierIdx] || 'Fornecedor'
            };
          }
        });
        
        if (data.length === 0) throw new Error("Não foi possível extrair dados válidos.");
      }
      
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
          'REF MIX 300 KUAT': 'Bebidas',
          'REF MIX 500 KUAT': 'Bebidas',
          'DIF REF PEQ P/ GRANDE': 'Combo Lojista',
          'AQUARIUS FRESH': 'Bebidas',
          'REF MIX 300 FANTA LARANJA': 'Bebidas',
          'DELICIA 02 LJ': 'Combo Lojista',
          'SALA SAL TI FG LJ': 'Combo Lojista',
          'DELICIA 06 BAT LJ': 'Combo Lojista',
          'DELICIA 03 LJ': 'Combo Lojista',
          'DELICIA 10 LJ': 'Combo Lojista',
          'DELICIA 09 LJ': 'Combo Lojista',
          'SALA EX SALP FG LJ': 'Combo Lojista',
          'DELICIA 01 LJ': 'Combo Lojista',
          'DELICIA 04 LJ': 'Combo Lojista',
          'DELICIA 05 LJ': 'Combo Lojista',
          'DELICIA 07 LJ': 'Combo Lojista',
          'SALA EX TRA FG PRA LJ': 'Combo Lojista',
          'DELICIA 06 LJ': 'Combo Lojista',
          'DELICIA 2': 'Delícias',
          'DELICIA 6 C/ BAT': 'Delícias',
          'DELICIA 1': 'Delícias',
          'DELICIA 10': 'Delícias',
          'DELICIA 3': 'Delícias',
          'DELICIA 9': 'Delícias',
          'DELICIA 4': 'Delícias',
          'DELICIA 6': 'Delícias',
          'DELICIA 5': 'Delícias',
          'DELICIA 7': 'Delícias',
          'DELICIA 13': 'Delícias',

          // HotDog
          'BELUSDOG BAC E CHED': 'HotDog',
          'BELUSDOG CARNE DO SOL': 'HotDog',
          'BELUSDOG FRANG DESF': 'HotDog',
          'BELUSDOG CLASSICO': 'HotDog',

          // Linha Catupiry
          'FRANGO C/CATUPIRY': 'Linha Catupiry',
          'FILE C/CATUPIRY': 'Linha Catupiry',
          'LOMBO SUINO C/CATUPIRY': 'Linha Catupiry',

          // Linha Especial
          'PAI DEGUA GDE': 'Linha Especial',
          'LOMBO SUINO': 'Linha Especial',
          'FILET C/FRUTAS': 'Linha Especial',
          'TOSCANESA': 'Linha Especial',
          'CHICKEN ARABE': 'Linha Especial',
          'BELUS BURGAO': 'Linha Especial',
          'CHEESE ARABE': 'Linha Especial',
          'FRANBACON': 'Linha Especial',

          // Linha Imbativel
          'CHEESEFRANGO SIMPLES': 'Linha Imbativel',
          'SANDUICHE VACA E FRANGO': 'Linha Imbativel',
          'PAI DEGUA SIMPLES': 'Linha Imbativel',
          'CHEESEBURGER SIMPLES': 'Linha Imbativel',

          // Linha Infantil
          'KIT PLANETA': 'Linha Infantil',
          'KIT HAMBUR LARAN': 'Linha Infantil',
          'KIT HAMBUR SUCO': 'Linha Infantil',
          'BRINDES': 'Linha Infantil',

          // Linha Petisco
          'MINI BOX TIRINHA': 'Linha Petisco',
          'TIRINHA FRANGO': 'Linha Petisco',
          'BOX BELLUS TIRINHA': 'Linha Petisco',
          'PETISCO PEITO FRANGO': 'Linha Petisco',
          'MINI BALDE TIRINHA': 'Linha Petisco',
          'PETISCO CALABRESA': 'Linha Petisco',
          'BOX FRANBAC TIRINH': 'Linha Petisco',
          'PETISCO FILE MIGNON': 'Linha Petisco',

          // Linha Super
          'SUPER FRANGO': 'Linha Super',

          // Linha Tradicional
          'CHEESEBURGER': 'Linha Tradicional',
          'SUPER CHEESE': 'Linha Tradicional',
          'SALADA CHICKEN BURGUER': 'Linha Tradicional',
          'CHEESE HAMB DUPLO': 'Linha Tradicional',
          'HAMBURGER': 'Linha Tradicional',
          'SUPER QUEIJO QUENTE': 'Linha Tradicional',

          // Natural Light
          'FRANGO C/CENOURA E PASSAS': 'Natural Light',
          'SAND FGO ABACAXI': 'Natural Light',
          'FRANGO RICOTA ESPECIAL': 'Natural Light',
          'FRANGO C/RICOTA': 'Natural Light',
          'FRANGO C/SALADA': 'Natural Light',
          'SAND LEVE ATUM': 'Natural Light',
          'RICOTA C/ CENOURA E PASSA': 'Natural Light',

          // Opcionais
          'ÁGUA MINERAL 500ML': 'Opcionais',
          'BATATA FRITA GND': 'Opcionais',
          'DIF BAT PEQ -> GND': 'Opcionais',
          'BATATA FRITA MED': 'Opcionais',
          'BATATA FRITA PEQ': 'Opcionais',
          'DIF BOLA - ARABE': 'Opcionais',
          'PORCAO MAIO TEMP EXTRA': 'Opcionais',
          'PORÇÃO OVO': 'Opcionais',
          'FATIA DE CHEDDAR': 'Opcionais',
          'MACAXEIRA FRITA 125G': 'Opcionais',
          'PORÇÃO BACON': 'Opcionais',
          'PORÇÃO CALABRESA': 'Opcionais',
          'PORÇÃO MUSSARELA': 'Opcionais',
          'QUEIJO COALHO': 'Opcionais',
          'EMB P/SALADA': 'Opcionais',
          'PORÇ REQ CREMOSO': 'Opcionais',
          'BATATA RUSTICA': 'Opcionais',
          'DIF BAT-> MACAXEIRA': 'Opcionais',
          'EMB. P/ VIAGEM': 'Opcionais',
          'DIF ARABE INF-GRD': 'Opcionais',
          'PORÇÃO MILHO': 'Opcionais',
          'PORÇ APRESUNTADO': 'Opcionais',
          'REF MIX 300 COCA-COLA': 'Opcionais',
          'PORÇÃO ABACAXI': 'Opcionais',
          'DIF BAT PEQ -> MED': 'Opcionais',
          'DIF ARABE - BOLA': 'Opcionais',
          'PORÇÃO PASSAS': 'Opcionais',
          'PORCAO BARBECUE EXTRA': 'Opcionais',
          'SACO VIAGEM GND': 'Opcionais',
          'DIF ARABE-F. INT': 'Opcionais',
          'PORÇÃO ERVILHA': 'Opcionais',
          'MANDAR COPO E GUARDANAPOS': 'Opcionais',

          // PROMO
          'COMBO FRANG CROCAN': 'PROMO',
          'FGO CROCANTE': 'PROMO',
          'PROMO COMBO HAMBURGUER': 'PROMO',
          'PROMO TOSCANESA': 'PROMO',
          'PROMO FGO COM SALADA': 'PROMO',
          'PROMO HAMBURGUER': 'PROMO',
          'PROM FRANG CROCAN': 'PROMO',
          'PROM BELUS DOG CLASSICO': 'PROMO',
          'PROMO COMBO BELUSDOG': 'PROMO',
          'PROMO MILK ACAI': 'PROMO',
          'PROMO COMBO FGO C/SALADA': 'PROMO',
          'ADICIONAL IFOOD': 'PROMO',
          'FRANG C SALA': 'PROMO',
          'PROM SUNDAE MORANGO': 'PROMO',
          'PROMO SUNDAE CHOCOLATE': 'PROMO',
          'PROMO SUNDAE AÇAI': 'PROMO',
          'PROMO SUNDAE CHOCOLATE DDC': 'PROMO',
          'PROM SUNDAE FRUTAS VERME': 'PROMO',
          'PROM PETISCO CALABRESA': 'PROMO',
          'PROMO CP DELICIA 5': 'PROMO',

          // Saladas
          'EXECUTIVO SALPICAO TIRINH': 'Saladas',
          'EXECUTIVO TRADICIO TIRINH': 'Saladas',
          'EXECUTIVO TRADICIO FRANGO': 'Saladas',
          'EXECUTIVO SALPICAO FRANGO': 'Saladas',
          'EXECUTIVO ESSENCIA TIRINH': 'Saladas',
          'EXECUTIVO SALPICAO FILET': 'Saladas',
          'EXECUTIVO ESSENCIA FILET': 'Saladas',
          'SALADA CAESAR': 'Saladas',
          'SALPICAO': 'Saladas',
          'EXECUTIVO ESSENCIA FRANGO': 'Saladas',
          'EXECUTIVO TRADICIO FILET': 'Saladas',
          'SALADA ESP BEBELU': 'Saladas',
          'SALADA ATUM': 'Saladas',

          // Sobremesas
          'MILK OVO MALT 500ML': 'Sobremesas',
          'SORV MILK OVM 300': 'Sobremesas',
          'MILK CHOCOL 500ML': 'Sobremesas',
          'MILK FRUT VER 500': 'Sobremesas',
          'MILK CHOCOL 300ML': 'Sobremesas',
          'MILK ACAI 300ML': 'Sobremesas',
          'SORV MILKSHAK 300': 'Sobremesas',
          'MILK NEGRESCO 300': 'Sobremesas',
          'MILK NEGRESCO 500': 'Sobremesas',
          'MILK MORANG 500ML': 'Sobremesas',
          'MILK ACAI 500': 'Sobremesas',
          'MILK FRUT VER 300': 'Sobremesas',
          'MILK MORANG 300ML': 'Sobremesas',
          'MILK PISTACHE 500ML': 'Sobremesas',
          'MILK SHAKE 500ML': 'Sobremesas',
          'MILK PISTACHE 300ML': 'Sobremesas',
          'MILK ABACAXI 300ML': 'Sobremesas',
          'MILK SHAKE ACAI 300ML': 'Sobremesas',
          'MILK NINHO 300ML': 'Sobremesas',
          'MILK ACAI 500ML': 'Sobremesas',
          'SUNDAE MORANGO': 'Sobremesas',
          'MILK BAUNI 500ML': 'Sobremesas',
          'SUNDAE CHOCOLATE': 'Sobremesas',
          'MILK NINHO 500ML': 'Sobremesas',
          'MILK ABACAXI 500ML': 'Sobremesas',
          'SUNDAE BAUNI': 'Sobremesas',
          'MILK BANANA 500ML': 'Sobremesas',
          'SUNDAE NEGRESCO': 'Sobremesas',
          'SUNDAE ABACAXI': 'Sobremesas',
          'SUNDAE FRUTAS VER': 'Sobremesas',
          'MILK BANANA 300ML': 'Sobremesas',
          'SUNDAE DE PISTACHE': 'Sobremesas',
          'SORVETE SUNDAE': 'Sobremesas',
          'MILK BAUNI 300ML': 'Sobremesas',
          'SUNDAE BANANA FLAMBADA': 'Sobremesas',
          'SUNDAE ACAI': 'Sobremesas',
          'COBERTURA MORANGO': 'Sobremesas',
          'BOLA SORV MORANGO': 'Sobremesas',
          'BOLA SORV BAUNILHA': 'Sobremesas',
          'BOLA SORV CHOCOLATE': 'Sobremesas',
          'COBERTURA CHOCOLATE': 'Sobremesas',

          // Sucos
          'SUCO GOIABA S/LEITE': 'Sucos',
          'SUCO MANGA S/LEITE': 'Sucos',
          'SUCO ACEROLA S/LEITE': 'Sucos',
          'SUCO MARACUJA S/LEITE': 'Sucos',
          'SUCO ACEROLA': 'Sucos',
          'SUCO MARACUJA': 'Sucos',
          'SUCO GOIABA': 'Sucos',
          'SUCO MANGA': 'Sucos',
          'SUCO CAJU S/LEI': 'Sucos',
          'SUCO MORANGO': 'Sucos',

          // Sucos Naturais
          'SUCO LARANJA': 'Sucos Naturais',
          'SUC LARANJA 500ML': 'Sucos Naturais',
          'SUCO ABACAXI C/HORTELA': 'Sucos Naturais',
          'SUCO LARANJA C/CENOURA': 'Sucos Naturais',
          'S ABAX C/HORT 500': 'Sucos Naturais',
          'S LARJ C/BETE 500': 'Sucos Naturais',
          'SUCO LARANJA C/BETERRABA': 'Sucos Naturais',
          'S LARAN C/CEN 500': 'Sucos Naturais',
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
                    O sistema identificará automaticamente os campos do seu relatório
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
                    <Upload className="w-8 h-8 text-indigo-500" />
                    <div className="text-center">
                      <div className="text-xs font-black uppercase tracking-widest dark:text-white mb-1">Selecionar Planilha</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Excel, CSV ou TXT</div>
                    </div>
                  </label>
                  
                  <div className={`flex flex-col gap-3 p-8 rounded-3xl border ${
                    isDarkMode ? 'bg-black/20 border-[#333]' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest dark:text-white mb-1">Dica de Importação</div>
                      <div className="text-[10px] text-slate-500 font-bold italic leading-tight">
                        Cole ou carregue dados com cabeçalhos como: Produto, Qtd, Valor, CMV e Margem.
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
                      : 'bg-indigo-600 text-white hover:bg-black shadow-xl shadow-indigo-500/20'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processando Dados...
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Importado com Sucesso!
                    </>
                  ) : (
                    <>
                      Processar e Importar Planilha
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
