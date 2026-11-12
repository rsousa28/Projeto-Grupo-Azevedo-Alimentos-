// Permissões pelo cargo do perfil (users/{uid}.role). Espelha firestore.rules: o banco é quem
// garante o acesso; aqui o app só decide o que mostrar. Nunca decidir por nome de usuário.

export type Role = 'ADMIN' | 'MANAGER' | 'FINANCIAL' | 'MANAGER_BEBELU_MOSSORO' | 'MANAGER_BEBELU_RIOMAR_PAPICU' | 'MANAGER_VERO_PASTA';

interface WithRole {
  role?: string | null;
}

const STORE_OF_MANAGER: Record<string, string> = {
  MANAGER_BEBELU_MOSSORO: '1',
  MANAGER_BEBELU_RIOMAR_PAPICU: '2',
  MANAGER_VERO_PASTA: '3',
};

export const isAdminUser = (u?: WithRole | null): boolean => u?.role === 'ADMIN';

/** Admin e financeiro: contas a pagar de todas as lojas, holding e relatórios do grupo. */
export const isFinanceUser = (u?: WithRole | null): boolean => u?.role === 'ADMIN' || u?.role === 'FINANCIAL';

export const isStoreManager = (u?: WithRole | null): boolean => !!u?.role && (u.role === 'MANAGER' || u.role.startsWith('MANAGER_'));

/** Lojas que o cargo alcança (mesma regra de canAccessStore em firestore.rules). */
export function permittedStoreIds(u?: WithRole | null): string[] {
  if (!u?.role) return [];
  if (u.role === 'ADMIN') return ['1', '2', '3', 'admin-global'];
  const own = STORE_OF_MANAGER[u.role];
  if (own) return [own];
  return ['1', '2', '3'];
}
