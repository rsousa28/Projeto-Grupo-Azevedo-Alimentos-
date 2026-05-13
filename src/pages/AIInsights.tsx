import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight,
  MessageSquare,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { GoogleGenAI } from '@google/genai';

export default function AIInsights() {
  const { isDarkMode } = useStore();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState([
    {
      title: 'CMV Alerta: Proteínas',
      description: 'O custo do Queijo Muçarela subiu 12% nos últimos 15 dias. Isso impacta sua margem em 1.5% na Pizza Calabresa.',
      impact: 'Negativo',
      category: 'CMV',
      recommendation: 'Sugerimos renegociar com o fornecedor Laticínios Vale ou reduzir o desperdício na montagem em 5g por pizza.'
    },
    {
      title: 'Oportunidade: Ticket Médio',
      description: 'O canal Delivery possui ticket médio de R$ 74, enquanto o balcão está em R$ 52.',
      impact: 'Oportunidade',
      category: 'Vendas',
      recommendation: 'Lance um combo exclusivo de balcão (Lanche + Batata + Bebida) para elevar o ticket físico.'
    },
    {
      title: 'Eficiência Operacional',
      description: 'Sua folha de pagamento está em 18% da receita. O ideal para sua rede é 22%.',
      impact: 'Positivo',
      category: 'RH',
      recommendation: 'Você possui margem para contratação de mais um motoboy nos horários de pico (Sex/Sáb).'
    }
  ]);

  const generateNewInsights = async () => {
    setLoading(true);
    // Mimic AI generation logic
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Inteligência Artificial</h2>
          <p className="text-slate-500">Insights automáticos e preditivos para sua rede Food Service</p>
        </div>
        <button 
          onClick={generateNewInsights}
          disabled={loading}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          } ${isDarkMode ? 'bg-[#E63946] text-white' : 'bg-[#0066FF] text-white'}`}
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          Atualizar Insights
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-8 rounded-3xl border flex flex-col h-full transition-all ${
              isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                insight.impact === 'Positivo' ? 'bg-green-500/10 text-green-500' : 
                insight.impact === 'Negativo' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'
              }`}>
                {insight.impact}
              </span>
              <div className="p-2 bg-slate-100 dark:bg-[#333] rounded-lg">
                <Zap className={`w-4 h-4 ${isDarkMode ? 'text-[#E63946]' : 'text-[#0066FF]'}`} />
              </div>
            </div>
            
            <h3 className="text-xl font-bold dark:text-white mb-2 italic uppercase">{insight.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {insight.description}
            </p>

            <div className="mt-auto">
              <div className={`p-4 rounded-2xl italic text-[11px] leading-relaxed ${
                isDarkMode ? 'bg-black/20 text-slate-300' : 'bg-slate-50 text-slate-600'
              }`}>
                <span className="font-bold block mb-1 uppercase tracking-widest text-[#E63946]/80 dark:text-indigo-400">Recomendação IA:</span>
                {insight.recommendation}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className={`p-10 rounded-3xl border transition-all ${
        isDarkMode ? 'bg-gradient-to-br from-[#1E1E1E] to-black border-[#333]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
         <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
               <h3 className="text-2xl font-bold dark:text-white mb-4">Chat com Consultor IA</h3>
               <p className="text-slate-500 mb-8 max-w-md">Pergunte qualquer coisa sobre sua operação, desde previsões de faturamento até otimização de escala.</p>
               
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   placeholder="Ex: 'Qual será meu lucro se eu aumentar o preço do burger em 10%?'"
                   className={`flex-1 px-6 py-4 rounded-2xl outline-none border transition-all focus:ring-2 focus:ring-indigo-500 ${
                     isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                   }`}
                 />
                 <button className={`p-4 rounded-2xl transition-all ${
                   isDarkMode ? 'bg-[#E63946] text-white' : 'bg-[#0066FF] text-white'
                 }`}>
                   <MessageSquare className="w-6 h-6" />
                 </button>
               </div>
            </div>
            <div className="hidden lg:block w-64 h-64 relative">
               <div className={`absolute inset-0 rounded-full blur-[60px] opacity-20 ${isDarkMode ? 'bg-[#E63946]' : 'bg-[#0066FF]'}`} />
               <motion.div 
                 animate={{ y: [0, -10, 0] }}
                 transition={{ repeat: Infinity, duration: 3 }}
                 className={`w-full h-full rounded-full border-4 flex items-center justify-center p-6 ${
                   isDarkMode ? 'border-[#E63946]/30 bg-[#1E1E1E]' : 'border-[#0066FF]/20 bg-white shadow-2xl'
                 }`}
               >
                 <Zap className={`w-24 h-24 ${isDarkMode ? 'text-[#E63946]' : 'text-[#0066FF]'}`} />
               </motion.div>
            </div>
         </div>
      </div>
    </div>
  );
}
