export type ChecklistCategory = 
  | 'Abertura da loja'
  | 'Fechamento'
  | 'Limpeza'
  | 'Produção'
  | 'Estoque'
  | 'Segurança alimentar'
  | 'Caixa'
  | 'Equipamentos'
  | 'Delivery'
  | 'Manutenção';

export type ResponseType =
  | 'sim_nao'
  | 'texto'
  | 'numero'
  | 'foto'
  | 'assinatura'
  | 'multipla_escolha'
  | 'temperatura'
  | 'data_hora';

export interface IntelligentFlow {
  triggerOnValue: string; // 'NÃO' for Yes/No, or range for numbers/temperatures
  actionPlanTitle: string;
  requirePhotoOnTrigger: boolean;
}

export interface ChecklistQuestion {
  id: string;
  questionText: string;
  responseType: ResponseType;
  required: boolean;
  weight: number; // Peso da pergunta
  photoRequired: boolean; // Foto obrigatória geral
  enableObservation: boolean; // Observação habilitada
  responsible: string; // Responsável
  deadline: string; // Prazo (ex: "Imediato", "24h", "2 dias")
  storeId: string; // Unidade (ou 'all' para todas as lojas)
  category: ChecklistCategory; // Categoria / Tipo de checklist
  options?: string[]; // Para múltipla escolha, ex: ["Excelente", "Bom", "Regular", "Ruim"]
  intelligentFlow?: IntelligentFlow;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  description: string;
  category: ChecklistCategory;
  questions: ChecklistQuestion[];
  storeId: string; // 'all' or specific storeId
  createdAt: string;
}

export interface ChecklistAnswer {
  questionId: string;
  questionText: string;
  responseType: ResponseType;
  value: string; // Text string value of response (e.g. "SIM", "15", "url", text)
  photoUrl?: string; // Optional camera image captured
  observation?: string; // Observação informada pelo operador
  signatureData?: string; // Base64 signature image if signature response
}

export interface ChecklistSubmission {
  id: string;
  templateId: string;
  templateTitle: string;
  category: ChecklistCategory;
  storeId: string;
  storeName: string;
  submittedBy: string;
  submittedAt: string;
  answers: ChecklistAnswer[];
  score: number; // Pontuação alcançada (soma dos pesos das perguntas em conformidade)
  maxScore: number; // Pontuação máxima possível
  conformityIndex: number; // Porcentagem de conformidade (score / maxScore * 100)
}

export interface ActionPlan {
  id: string;
  submissionId: string;
  storeId: string;
  storeName: string;
  category: ChecklistCategory;
  questionText: string;
  triggerAnswer: string;
  actionTitle: string;
  deadline: string;
  responsible: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  resolutionPhoto?: string;
}
