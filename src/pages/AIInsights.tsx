import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Send,
  Loader2,
  X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../contexts/StoreContext';
import { chatWithConsultant, generatePredictiveInsights } from '../services/geminiService';

export default function AIInsights() {
  const { isDarkMode, metrics, dreTimeline, topProducts, currentStore } = useStore();
  const [loading, setLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  
  const [insights, setInsights] = useState<any[]>([
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
    try {
      const context = {
        storeName: currentStore.name,
        metrics,
        dre: dreTimeline.slice(-3),
        products: topProducts
      };
      
      const newInsights = await generatePredictiveInsights(context);
      if (newInsights && newInsights.length > 0) {
        setInsights(newInsights);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Generate automatically on first load if we have data
  useEffect(() => {
    if (dreTimeline.length > 0 && insights[0].title === 'CMV Alerta: Proteínas') {
      generateNewInsights();
    }
  }, [dreTimeline]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isChatLoading) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const context = {
        storeName: currentStore.name,
        metrics: metrics,
        dre: dreTimeline.slice(-3), // Last 3 months as context
        products: topProducts.map(p => ({ name: p.name, margin: p.margin, sales: p.quantidadeVendas }))
      };

      const response = await chatWithConsultant(userMessage, context, history);
      setChatMessages(prev => [...prev, { role: 'model', text: response || 'Erro ao processar sua solicitação.' }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'model', text: 'Erro ao conectar-se ao consultor AI. Tente novamente em instantes.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>Inteligência Artificial</h2>
          <p className={`text-sm font-bold italic ${isDarkMode ? 'text-slate-500' : 'text-slate-700'}`}>Insights automáticos e preditivos para sua rede Food Service</p>
        </div>
        <button 
          onClick={generateNewInsights}
          disabled={loading}
          className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black hover:text-white'
          } ${isDarkMode ? 'bg-[#FFB800] text-black shadow-[#FFB800]/20' : 'bg-black text-white shadow-black/20'}`}
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
            className={`p-8 rounded-[2.5rem] border flex flex-col h-full transition-all group hover:scale-[1.02] ${
              isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] ${
                insight.impact === 'Positivo' ? 'bg-green-500/10 text-green-500' : 
                insight.impact === 'Negativo' ? 'bg-red-700/10 text-red-700' : 'bg-indigo-500/10 text-indigo-500'
              }`}>
                {insight.impact}
              </span>
              <div className="p-3 bg-slate-100 dark:bg-black/20 rounded-2xl group-hover:rotate-12 transition-transform">
                <Zap className={`w-5 h-5 ${isDarkMode ? 'text-[#FFB800]' : 'text-indigo-600'}`} />
              </div>
            </div>
            
            <h3 className={`text-xl font-black mb-2 italic uppercase tracking-tighter break-words whitespace-normal leading-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>{insight.title}</h3>
            <p className={`text-sm mb-6 leading-relaxed font-bold italic ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
              {insight.description}
            </p>

            <div className="mt-auto">
              <div className={`p-5 rounded-3xl italic text-[11px] leading-relaxed border ${
                isDarkMode ? 'bg-black/20 text-slate-300 border-white/5' : 'bg-slate-50 text-slate-700 border-slate-100'
              }`}>
                <span className="font-black block mb-2 uppercase tracking-[0.2em] text-indigo-500">Recomendação IA:</span>
                {insight.recommendation}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className={`p-1 flex flex-col rounded-[3rem] border shadow-2xl overflow-hidden ${
        isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-indigo-100/30'
      }`}>
         <div className="flex flex-col lg:flex-row h-full min-h-[500px]">
            {/* Chat Sidebar/Header for mobile */}
            <div className={`lg:w-1/3 p-10 flex flex-col justify-center ${isDarkMode ? 'bg-black/20' : 'bg-slate-50'}`}>
               <div className="p-4 bg-indigo-600 rounded-3xl w-fit mb-6 shadow-xl shadow-indigo-600/30">
                 <MessageSquare className="w-8 h-8 text-white" />
               </div>
               <h3 className={`text-3xl font-black mb-4 uppercase italic tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-black'}`}>Consultor IA Food Service</h3>
               <p className={`text-sm font-bold italic ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} leading-relaxed`}>
                 Analiso sua rede em tempo real. Pergunte sobre metas, escala de funcionários ou novos combos.
               </p>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col h-[600px] lg:h-auto">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-10">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p className="text-sm font-black uppercase italic tracking-widest">Inicie uma conversa!</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-[2rem] p-6 text-sm font-bold ${
                        msg.role === 'user' 
                          ? (isDarkMode ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-black text-white rounded-tr-none shadow-xl')
                          : (isDarkMode ? 'bg-black/40 text-slate-300 border border-white/5 rounded-tl-none' : 'bg-slate-100 text-slate-800 rounded-tl-none')
                      }`}>
                        {msg.role === 'model' ? (
                          <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className={`rounded-3xl p-5 ${isDarkMode ? 'bg-black/40 border border-white/5' : 'bg-slate-100'}`}>
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-8 mt-auto">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex items-center"
                >
                  <input 
                    type="text" 
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Ex: 'Qual será meu lucro se eu aumentar o preço do burger em 10%?'"
                    className={`w-full px-8 py-5 rounded-3xl outline-none border transition-all text-sm font-black italic focus:ring-4 focus:ring-indigo-500/20 ${
                      isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100 text-slate-900 shadow-inner'
                    }`}
                  />
                  <button 
                    type="submit"
                    disabled={!currentMessage.trim() || isChatLoading}
                    className={`absolute right-2 p-4 rounded-2xl transition-all shadow-xl active:scale-90 disabled:opacity-50 ${
                      isDarkMode ? 'bg-[#FFB800] text-black hover:bg-white' : 'bg-black text-white hover:bg-indigo-600'
                    }`}
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
