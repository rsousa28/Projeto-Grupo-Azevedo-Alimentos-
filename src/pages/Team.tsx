import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Edit2, 
  Trash2, 
  X, 
  Check,
  AlertCircle,
  Lock,
  Mail,
  User as UserIcon,
  MoreVertical,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

export default function Team() {
  const { isDarkMode } = useStore();
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'MANAGER' as User['role']
  });

  const fetchUsers = async () => {
    setLoading(true);
    const path = 'users';
    try {
      const q = collection(db, path);
      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      // Ensure we display something on error/first run
      setUsers(prev => prev.length > 0 ? prev : [{ id: 'root-admin', name: 'Admin Geral Grupo AZ', username: 'adm', role: 'ADMIN' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        username: user.username,
        password: user.password || '', 
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        username: '',
        password: '',
        role: 'MANAGER'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const path = 'users';

    try {
      if (editingUser) {
        const userRef = doc(db, path, editingUser.id);
        const updateData: any = {
          name: formData.name,
          username: formData.username,
          role: formData.role,
          updatedAt: serverTimestamp()
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await updateDoc(userRef, updateData);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updateData } : u));
      } else {
        const newUser = {
          name: formData.name,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, path), newUser);
        setUsers(prev => [...prev, { id: docRef.id, ...newUser } as User]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Erro ao salvar usuário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === 'root-admin') {
      alert("Você não pode excluir o administrador raiz.");
      return;
    }
    
    if (currentUser && id === currentUser.id) {
       alert("Sua sessão está ativa com este ID. Faça logout por segurança antes de remover.");
       return;
    }

    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', deleteConfirmId));
      setUsers(prev => prev.filter(u => u.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Erro de permissão no Firebase. As regras podem estar restringindo a exclusão.");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest italic">
            <ShieldCheck className="w-3 h-3" /> Admin
          </span>
        );
      case 'MANAGER_4ESTYLOS_MOSSORO':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest italic">
            <Shield className="w-3 h-3" /> Ger. 4Est Mossoró
          </span>
        );
      case 'MANAGER_BEBELU_MOSSORO':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest italic">
            <Shield className="w-3 h-3" /> Ger. Bebelu Mossoró
          </span>
        );
      case 'MANAGER_BEBELU_RIOMAR_PAPICU':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest italic">
            <Shield className="w-3 h-3" /> Ger. Bebelu Riomar
          </span>
        );
      case 'FINANCIAL':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest italic">
            <ShieldAlert className="w-3 h-3" /> Financeiro
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 text-slate-500 text-[10px] font-black uppercase tracking-widest italic">
            <Shield className="w-3 h-3" /> {role}
          </span>
        );
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>Gestão de Equipe</h2>
          <p className={`text-sm font-bold italic ${isDarkMode ? 'text-slate-500' : 'text-slate-700'}`}>Controle de acesso e permissões do Grupo Azevedo</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar usuário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-4 py-3 rounded-xl border text-sm font-bold outline-none transition-all ${
                isDarkMode ? 'bg-[#1E1E1E] border-[#333] text-white focus:ring-2 focus:ring-indigo-500/50' : 'bg-white border-slate-200 focus:ring-4 focus:ring-indigo-50/50'
              }`}
            />
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className={`flex items-center gap-2 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
              isDarkMode ? 'bg-[#FFCB05] text-black shadow-[#FFCB05]/20' : 'bg-black text-white shadow-black/20'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Permissions Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-700/20 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-red-700" />
            </div>
            <h4 className={`font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>ADMIN</h4>
          </div>
          <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed">
            Poder total sobre o sistema. Gerenciamento de usuários, insights IA, configurações globais e acesso a todas as lojas.
          </p>
        </div>

        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <h4 className={`font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>GERENTE</h4>
          </div>
          <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed">
            Foco operacional. Acesso ao CMV, Fichas Técnicas e Dashboard. Não pode gerenciar equipe ou ver insights estratégicos de Admin.
          </p>
        </div>

        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-emerald-500" />
            </div>
            <h4 className={`font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>FINANCEIRO</h4>
          </div>
          <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed">
            Lançamentos e conciliação. Acesso ao Financeiro (DRE) e Data Entry para faturamento e despesas.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className={`rounded-[2.5rem] border overflow-hidden ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-xl'}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className={`text-left text-[10px] uppercase tracking-[0.2rem] font-black ${isDarkMode ? 'text-slate-500 bg-black/20' : 'text-slate-400 bg-slate-50/50'}`}>
                <th className="px-8 py-6">Usuário</th>
                <th className="px-8 py-6">Role / Nível</th>
                <th className="px-8 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-4" />
                    <p className="text-xs font-black uppercase italic tracking-widest text-slate-400">Carregando Cooperadores...</p>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? filteredUsers.map((u) => (
                <tr key={u.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black italic shadow-lg ${
                        u.role === 'ADMIN' ? 'bg-red-700 text-white' : 
                        u.role === 'MANAGER' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                      }`}>
                        {(u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={`font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-bold tracking-widest uppercase italic">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {getRoleBadge(u.role)}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        className={`p-3 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className={`p-3 rounded-xl transition-all ${isDarkMode ? 'hover:bg-red-700/10 text-slate-400 hover:text-red-700' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="px-8 py-10 text-center text-slate-500 italic font-bold">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal User */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border ${
                isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-white'
              }`}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                      <UserPlus className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        {editingUser ? 'Editar Cooperador' : 'Novo Cooperador'}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Grupo Azevedo Alimentos</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome Completo</label>
                       <div className="relative">
                         <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input 
                           type="text" 
                           required
                           value={formData.name}
                           onChange={(e) => setFormData({...formData, name: e.target.value})}
                           className={`w-full pl-11 pr-4 py-4 rounded-2xl border outline-none font-bold text-sm transition-all focus:ring-4 ${
                             isDarkMode ? 'bg-black/20 border-[#333] text-white focus:ring-indigo-500/20' : 'bg-slate-50 border-slate-100 focus:bg-white focus:ring-indigo-50/50'
                           }`}
                           placeholder="João Silva"
                         />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Username</label>
                       <div className="relative">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black italic">@</span>
                         <input 
                           type="text" 
                           required
                           value={formData.username}
                           onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '.')})}
                           className={`w-full pl-8 pr-4 py-4 rounded-2xl border outline-none font-bold text-sm transition-all focus:ring-4 ${
                             isDarkMode ? 'bg-black/20 border-[#333] text-white focus:ring-indigo-500/20' : 'bg-slate-50 border-slate-100 focus:bg-white focus:ring-indigo-50/50'
                           }`}
                           placeholder="joao.silva"
                         />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Senha de Acesso</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="password" 
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className={`w-full pl-11 pr-4 py-4 rounded-2xl border outline-none font-bold text-sm transition-all focus:ring-4 ${
                          isDarkMode ? 'bg-black/20 border-[#333] text-white focus:ring-indigo-500/20' : 'bg-slate-50 border-slate-100 focus:bg-white focus:ring-indigo-50/50'
                        }`}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nível de Permissão</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['ADMIN', 'FINANCIAL', 'MANAGER_4ESTYLOS_MOSSORO', 'MANAGER_BEBELU_MOSSORO', 'MANAGER_BEBELU_RIOMAR_PAPICU'] as User['role'][]).map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setFormData({...formData, role})}
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                            formData.role === role 
                              ? (role === 'ADMIN' ? 'bg-red-700 border-red-700 text-white shadow-lg shadow-red-700/20' : 
                                 role === 'FINANCIAL' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                                 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20')
                              : (isDarkMode ? 'bg-black/20 border-[#333] text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100')
                          } ${role === 'ADMIN' ? 'col-span-2' : ''}`}
                        >
                          {role === 'ADMIN' ? <ShieldCheck className="w-5 h-5" /> : role.includes('MANAGER') ? <Shield className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                          <span className="text-[9px] font-black uppercase tracking-tighter italic text-center">
                            {role === 'ADMIN' ? 'Administrador Raiz' : 
                             role === 'FINANCIAL' ? 'Financeiro Geral' :
                             role === 'MANAGER_4ESTYLOS_MOSSORO' ? 'Gerente 4 Estylos Mossoró' :
                             role === 'MANAGER_BEBELU_MOSSORO' ? 'Gerente Bebelu Mossoró' :
                             'Gerente Bebelu Riomar Papicu'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className={`px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className={`px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2 ${
                        isDarkMode ? 'bg-[#FFCB05] text-black shadow-[#FFCB05]/20' : 'bg-black text-white shadow-black/20'
                      }`}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      {editingUser ? 'Salvar Alterações' : 'Criar Cooperador'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border p-8 flex flex-col items-center text-center ${
                isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-white'
              }`}
            >
              <div className="p-4 bg-red-700/10 rounded-3xl mb-6">
                <Trash2 className="w-10 h-10 text-red-700" />
              </div>
              
              <h3 className={`text-xl font-black uppercase italic tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Confirmar Exclusão?
              </h3>
              <p className="text-sm font-bold text-slate-500 italic mb-8">
                Esta ação é irreversível e removerá permanentemente o acesso deste usuário ao Grupo Azevedo.
              </p>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={confirmDelete}
                  disabled={loading}
                  className="w-full py-5 rounded-2xl bg-red-700 text-white font-black uppercase tracking-widest text-[11px] hover:bg-red-800 transition-all active:scale-95 shadow-xl shadow-red-700/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  Confirmar Remoção
                </button>
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                    isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
