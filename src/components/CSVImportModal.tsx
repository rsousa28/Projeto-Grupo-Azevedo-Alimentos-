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
  const { isDarkMode, setTopProducts, setInventoryItems, currentStore, brandColors } = useStore();
  const isBebelu = currentStore?.brand === 'BEBELU';
  const themeButtonBg = brandColors?.button;
  const themeTextContrast = isBebelu ? '#121212' : '#FFFFFF';

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
        const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) throw new Error("Conteúdo insuficiente para importação manual.");
        
        // Detect separator by looking at the first 3 lines
        const sample = lines.slice(0, 3).join('\n');
        const sep = sample.includes(';') ? ';' : (sample.includes('\t') ? '\t' : (sample.includes('|') ? '|' : ','));
        
        const rows = lines.map(line => line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, '')));
        
        let headers = rows[0].map(h => h.toLowerCase());
        let content = rows.slice(1);

        // Header detection logic
        const headerKeywords = ['prod', 'item', 'nome', 'qtd', 'vend', 'cmv', 'custo', 'venda', 'vlr', 'fat', 'mercador', 'receita'];
        const looksLikeHeader = (r: string[]) => r.some(cell => 
          headerKeywords.some(k => cell.toLowerCase().includes(k))
        );

        if (!looksLikeHeader(headers)) {
          const headerRowIdx = rows.findIndex(r => looksLikeHeader(r));
          if (headerRowIdx !== -1) {
            headers = rows[headerRowIdx].map(h => h.toLowerCase());
            content = rows.slice(headerRowIdx + 1);
          }
        }
        
        data = content.filter(row => row.length > 0).map(row => {
          const cleanNum = (str: any, isQty = false) => {
            if (str === null || str === undefined) return isQty ? 1 : 0;
            if (typeof str === 'number') return str;
            let s = String(str).trim();
            if (!s) return isQty ? 1 : 0;
            
            // Remove currency, percentage, * and ALL spaces including non-breaking ones
            s = s.replace(/R\$/g, '').replace(/%/g, '').replace(/[\s\u00A0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, '').replace(/\*/g, '');
            
            const hasComma = s.includes(',');
            const hasDot = s.includes('.');

            if (hasComma && hasDot) {
              // BR: 1.234,56 -> last separator is comma
              // US: 1,234.56 -> last separator is dot
              const lastComma = s.lastIndexOf(',');
              const lastDot = s.lastIndexOf('.');
              if (lastComma > lastDot) {
                // If there are multiple dots, strip them all.
                s = s.replace(/\./g, '').replace(',', '.');
              } else {
                // US: 1,234.56 -> strip comma.
                s = s.replace(/,/g, '');
              }
            } else if (hasComma) {
              // ONLY comma: in Brazil it's always decimal (e.g., 687,99 -> 687.99)
              // We replace ALL commas with nothing except the last one which becomes a dot if there are multiple? 
              // Usually there's only one.
              if ((s.match(/,/g) || []).length > 1) {
                // Multiple commas? 123.456.789 style but using commas? 
                // Rare but let's be safe: 1,234,567 -> 1234567
                s = s.replace(/,/g, '');
              } else {
                s = s.replace(',', '.');
              }
            } else if (hasDot) {
              // ONLY dot: could be thousands (1.000) or decimal (1.50)
              // If there's more than one dot, they are thousands separators
              if ((s.match(/\./g) || []).length > 1) {
                s = s.replace(/\./g, '');
              } else {
                // Single dot. Ambiguity zone: 1.000 or 1.00?
                // Heuristic: If it's a price and followed by 3 digits, and parts[0] is not 0
                const parts = s.split('.');
                // If it looks like exactly 3 digits, we lean towards thousands ONLY if it's not a common decimal pattern.
                // But the user's issue with 687,99 becoming 687990.00 suggests something is being stripped incorrectly.
                // WE REMOVE the smart detection for single dots with 3 digits because it's too risky for items like "687.990" (meaning 687.99 with trailing zero)
                // In modern web data, a SINGLE dot is almost always a decimal.
                
                // s = s.replace(/\./g, ''); // REMOVED THIS RISKY LINE
              }
            }
            
            const num = parseFloat(s);
            return isNaN(num) ? (isQty ? 1 : 0) : num;
          };

          if (type === 'products') {
            const findColumn = (keywords: string[]) => {
              const normalizedHeaders = headers.map(h => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ''));
              
              // 1. Try exact match first with original or normalized
              for (const kw of keywords) {
                const normKW = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                const idx = headers.findIndex((h, i) => 
                  h.toLowerCase() === kw.toLowerCase() || 
                  normalizedHeaders[i] === normKW
                );
                if (idx !== -1) return idx;
              }
              
              // 2. Try partial match, but only if it's not a generic word that might be in other headers
              for (const kw of keywords) {
                const normKW = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                if (normKW.length < 3) continue;
                
                // Special check for 'venda' vs 'venda total'
                const idx = normalizedHeaders.findIndex((h, i) => {
                  if (normKW === 'venda' && normalizedHeaders[i].includes('total')) return false;
                  return h.includes(normKW);
                });
                if (idx !== -1) return idx;
              }
              
              return -1;
            };

            const nameIdx = findColumn(['descricao', 'nome', 'item', 'produto', 'mercadoria', 'desc', 'label', 'titulo']);
            const qtyIdx = findColumn(['quantidade', 'qtd', 'quant', 'volume', 'unid', 'vendidas', 'pecas', 'quatidade', 'qtde', 'quantid']);
            
            // Priority: Total Revenue
            const totalRevenueIdx = findColumn(['venda total', 'faturamento', 'vl total', 'valor total', 'fat total', 'receita total', 'total venda', 'faturat', 'vlr fatur']);
            // Price: Unit price
            const unitPriceIdx = findColumn(['venda unit', 'preco unit', 'p.medio', 'unitario', 'p. medio', 'vlr unit', 'venda', 'preco', 'venda un']);
            
            // CMV variants
            const cmvUnitIdx = findColumn(['custo unitario', 'vlr unit custo', 'cmv unit', 'cmv unitario', 'custo pr', 'custo unit', 'custo medio', 'cmv un']);
            const cmvPercentIdx = findColumn(['cmv(%)', 'cmv%', 'perc cmv', '% cmv', 'cmv perc', 'cmv %', 'cmv porc', 'cmv']);
            const cmvTotalIdx = findColumn(['custo total', 'cmv total', 'vlr cmv', 'valor cmv', 'total cmv', 'vlr.cmv', 'cmv total', 'vl custo tot', 'vlr total custo', 'custo bruto']);
            
            const marginIdx = findColumn(['rentabilidade', 'margem', 'mc', 'lucro', 'margin', 'resultado', 'margem %', 'mrg %']);
            
            const qty = qtyIdx !== -1 ? cleanNum(row[qtyIdx], true) : 1;
            const totalRevenue = totalRevenueIdx !== -1 ? cleanNum(row[totalRevenueIdx]) : 0;
            const unitPrice = unitPriceIdx !== -1 ? cleanNum(row[unitPriceIdx]) : (qty > 0 ? totalRevenue / qty : 0);
            
            const faturamento = totalRevenue || (qty * unitPrice);
            const actualUnitPrice = unitPrice || (qty > 0 ? faturamento / qty : 0);

            const cmvUnitRaw = cmvUnitIdx !== -1 ? cleanNum(row[cmvUnitIdx]) : null;
            const cmvPercentRaw = cmvPercentIdx !== -1 ? cleanNum(row[cmvPercentIdx]) : null;
            const cmvTotalRaw = cmvTotalIdx !== -1 ? cleanNum(row[cmvTotalIdx]) : null;
            const marginRaw = marginIdx !== -1 ? cleanNum(row[marginIdx]) : null;
            
            let finalCmvUnit = 0;

            if (cmvTotalRaw !== null && cmvTotalRaw > 0) {
              finalCmvUnit = cmvTotalRaw / (qty || 1);
            } else if (cmvUnitRaw !== null && cmvUnitRaw > 0) {
              finalCmvUnit = cmvUnitRaw;
            } else if (cmvPercentRaw !== null && cmvPercentRaw > 0) {
              // Heuristic: If CMV percent is > 100, it's likely a misidentified monetary value (Total or Unit)
              if (cmvPercentRaw > 100) {
                // If it looks like a total value (it's close to 30-40% of faturamento)
                const ratio = cmvPercentRaw / (faturamento || 1);
                if (ratio > 0.05 && ratio < 0.8) {
                  finalCmvUnit = cmvPercentRaw / (qty || 1);
                } else {
                  finalCmvUnit = cmvPercentRaw;
                }
              } else {
                const factor = cmvPercentRaw > 1 ? cmvPercentRaw / 100 : cmvPercentRaw;
                finalCmvUnit = actualUnitPrice * factor;
              }
            } else if (marginRaw !== null && marginRaw > 0) {
              const marginFactor = marginRaw > 1 ? marginRaw / 100 : marginRaw;
              finalCmvUnit = actualUnitPrice * (1 - marginFactor);
            } else {
              finalCmvUnit = actualUnitPrice * 0.35;
            }


            let finalMarginPercent = 0;
            if (actualUnitPrice > 0) {
              finalMarginPercent = ((actualUnitPrice - finalCmvUnit) / actualUnitPrice) * 100;
            } else {
              finalMarginPercent = 65;
            }
            
            return {
              name: row[nameIdx] || 'Sem Nome',
              quantidadeVendas: qty,
              faturamento: faturamento,
              cmv: finalCmvUnit,
              margin: finalMarginPercent
            };
          } else {
            // Mapping for Inventory
            const findColumn = (keywords: string[]) => {
              const normalizedHeaders = headers.map(h => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ''));
              for (const kw of keywords) {
                const normKW = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                const idx = headers.findIndex((h, i) => 
                  h.toLowerCase() === kw.toLowerCase() || 
                  normalizedHeaders[i] === normKW
                );
                if (idx !== -1) return idx;
              }
              for (const kw of keywords) {
                const normKW = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                if (normKW.length < 3) continue;
                const idx = normalizedHeaders.findIndex(h => h.includes(normKW));
                if (idx !== -1) return idx;
              }
              return -1;
            };

            const nameIdx = findColumn(['prod', 'nome', 'item', 'insumo', 'desc', 'descricao']);
            const unitIdx = findColumn(['unid', 'um', 'medida', 'unidade', 'un.']);
            const priceIdx = findColumn(['preco unit', 'unitario', 'valor unit', 'vlr unit', 'venc. unit', 'custo pr', 'custo unit', 'custo medio']);
            const supplierIdx = findColumn(['fornecedor', 'origem', 'marca', 'fornec']);
            
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

        // Aggregate products by name to avoid duplicates in the same import
        const aggregatedProducts = new Map<string, any>();
        
        data.forEach((p: any) => {
          // Extra normalization to catch slight differences
          const name = (p.name || 'Sem Nome').trim().replace(/\s+/g, ' ');
          const nameKey = name.toUpperCase();
          if (aggregatedProducts.has(nameKey)) {
            const existing = aggregatedProducts.get(nameKey);
            const newQty = (existing.quantidadeVendas || 0) + (p.quantidadeVendas || 0);
            const newRevenue = (existing.faturamento || 0) + (p.faturamento || 0);
            
            // Weighted average for CMV unit
            const totalCmvVal = ((existing.cmv || 0) * (existing.quantidadeVendas || 1)) + ((p.cmv || 0) * (p.quantidadeVendas || 1));
            const newCmvUnit = newQty > 0 ? totalCmvVal / newQty : 0;
            const newMargin = newRevenue > 0 ? ((newRevenue - totalCmvVal) / newRevenue) * 100 : 0;
            
            aggregatedProducts.set(nameKey, {
              ...existing,
              name: name, // Keep normalized name
              quantidadeVendas: newQty,
              faturamento: newRevenue,
              cmv: newCmvUnit,
              margin: newMargin
            });
          } else {
            aggregatedProducts.set(nameKey, { ...p, name });
          }
        });

        const productsWithIds = Array.from(aggregatedProducts.values()).map((p: any, i: number) => {
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
        // Aggregate inventory by name
        const aggregatedInventory = new Map<string, any>();
        data.forEach((item: any) => {
          const name = (item.name || 'Sem Nome').trim();
          const nameKey = name.toUpperCase();
          // For inventory, we just take the last occurrence if duplicated in same file
          aggregatedInventory.set(nameKey, { ...item });
        });

        const itemsWithIds = Array.from(aggregatedInventory.values()).map((item: any, i: number) => ({
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
            
            // Convert sheet to JSON array of arrays (header: 1)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            // Filter out empty rows and convert to CSV string for the textarea and compatibility
            // but we might want to store the structured data directly.
            // For now, let's convert to a safe CSV format with ';' as separator
            const csv = jsonData
              .filter(row => row.length > 0)
              .map(row => row.map(cell => {
                const s = String(cell ?? '');
                if (s.includes(';') || s.includes('"') || s.includes('\n')) {
                  return `"${s.replace(/"/g, '""')}"`;
                }
                return s;
              }).join(';'))
              .join('\n');
              
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
                  style={(!isSuccess && !(!csvText.trim() || isLoading)) ? {
                    backgroundColor: themeButtonBg,
                    color: themeTextContrast,
                    boxShadow: `0 10px 15px -3px ${themeButtonBg}30`
                  } : {}}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSuccess 
                      ? 'bg-green-500 text-white' 
                      : 'hover:brightness-110'
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
