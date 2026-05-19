import { ChecklistTemplate, ChecklistQuestion } from '../../types/checklist';

export const INITIAL_QUESTIONS: ChecklistQuestion[] = [
  // Segurança Alimentar
  {
    id: 'q_seg_1',
    questionText: 'O freezer vertical de congelados está abaixo de -18ºC?',
    responseType: 'temperatura',
    required: true,
    weight: 5,
    photoRequired: false,
    enableObservation: true,
    responsible: 'Gerente de Turno',
    deadline: 'Imediato (1h)',
    storeId: 'all',
    category: 'Segurança alimentar',
    intelligentFlow: {
      triggerOnValue: '< -18', // If the user inputs a temperature warmer than -18 (or types "NÃO" if answered as Yes/No, we'll support both yes/no and numeric checking!) Wait, let's treat Yes/No or temperature! Let's configure it specifically. To make it extremely robust, we can support triggerOnValue "NÃO" if the user gets asked a Sim/Não or a Temperature check failure. Let's specify for Sim/Não!
      actionPlanTitle: 'Temperatura do freezer inadequada! Acionar equipe de manutenção de equipamentos e mover insumos para outra câmera fria.',
      requirePhotoOnTrigger: true
    }
  },
  {
    id: 'q_seg_2',
    questionText: 'Todos os insumos na bancada estão com etiquetas de validade legíveis?',
    responseType: 'sim_nao',
    required: true,
    weight: 4,
    photoRequired: false,
    enableObservation: true,
    responsible: 'Líder de Cozinha',
    deadline: '24 horas',
    storeId: 'all',
    category: 'Segurança alimentar',
    intelligentFlow: {
      triggerOnValue: 'NÃO',
      actionPlanTitle: 'Etiquetar imediatamente todos os produtos vencidos/abertos sem identificação.',
      requirePhotoOnTrigger: true
    }
  },
  {
    id: 'q_seg_3',
    questionText: 'Verificar higiene pessoal da equipe (unhas cortadas, cabelos presos, avental limpo):',
    responseType: 'sim_nao',
    required: true,
    weight: 3,
    photoRequired: false,
    enableObservation: true,
    responsible: 'Gerente da Unidade',
    deadline: 'Imediato',
    storeId: 'all',
    category: 'Segurança alimentar'
  },

  // Abertura da loja
  {
    id: 'q_abe_1',
    questionText: 'Fachada frontal limpa, calçada varrida e lâmpadas funcionando?',
    responseType: 'sim_nao',
    required: true,
    weight: 3,
    photoRequired: true,
    enableObservation: false,
    responsible: 'Auxiliar de Serviços Gerais',
    deadline: 'Abertura',
    storeId: 'all',
    category: 'Abertura da loja'
  },
  {
    id: 'q_abe_2',
    questionText: 'Fundo de troco do caixa conferido e correto com o sistema?',
    responseType: 'numero',
    required: true,
    weight: 4,
    photoRequired: false,
    enableObservation: true,
    responsible: 'Operador de Caixa',
    deadline: 'Abertura',
    storeId: 'all',
    category: 'Abertura da loja'
  },
  {
    id: 'q_abe_3',
    questionText: 'Assinatura eletrônica do gerente autorizando a abertura do dia:',
    responseType: 'assinatura',
    required: true,
    weight: 5,
    photoRequired: false,
    enableObservation: false,
    responsible: 'Gerente da Unidade',
    deadline: 'Imediato',
    storeId: 'all',
    category: 'Abertura da loja'
  },

  // Fechamento
  {
    id: 'q_fec_1',
    questionText: 'Todos os aparelhos de ar-condicionado e TVs desligados?',
    responseType: 'sim_nao',
    required: true,
    weight: 3,
    photoRequired: true,
    enableObservation: true,
    responsible: 'Operador de Fechamento',
    deadline: 'Fechamento',
    storeId: 'all',
    category: 'Fechamento'
  },
  {
    id: 'q_fec_2',
    questionText: 'Portas e portões de segurança trancados?',
    responseType: 'sim_nao',
    required: true,
    weight: 5,
    photoRequired: false,
    enableObservation: false,
    responsible: 'Gerente',
    deadline: 'Imediato',
    storeId: 'all',
    category: 'Fechamento'
  },

  // Caixa
  {
    id: 'q_cai_1',
    questionText: 'Sangrias realizadas periodicamente e guardadas no cofre?',
    responseType: 'sim_nao',
    required: true,
    weight: 4,
    photoRequired: false,
    enableObservation: true,
    responsible: 'Operador de Caixa',
    deadline: 'Turno',
    storeId: 'all',
    category: 'Caixa'
  },

  // Limpeza
  {
    id: 'q_lim_1',
    questionText: 'Banheiros limpos, abastecidos com papel e sabonete?',
    responseType: 'sim_nao',
    required: true,
    weight: 3,
    photoRequired: true,
    enableObservation: true,
    responsible: 'Higiene',
    deadline: '2 horas',
    storeId: 'all',
    category: 'Limpeza'
  },

  // Equipamentos
  {
    id: 'q_equ_1',
    questionText: 'Chapa e fritadeiras limpas e com óleo filtrado?',
    responseType: 'sim_nao',
    required: true,
    weight: 4,
    photoRequired: false,
    enableObservation: true,
    responsible: 'Cozinheiro',
    deadline: 'Carga de Turno',
    storeId: 'all',
    category: 'Equipamentos'
  }
];

export const INITIAL_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'temp_segalimentar',
    title: 'Auditoria Diária de Segurança Alimentar',
    description: 'Verificação crítica de higiene, validades e controle de temperaturas de freezers e bancadas.',
    category: 'Segurança alimentar',
    questions: INITIAL_QUESTIONS.filter(q => q.category === 'Segurança alimentar'),
    storeId: 'all',
    createdAt: '2026-05-01T08:00:00Z'
  },
  {
    id: 'temp_abertura',
    title: 'Checklist de Abertura da Loja',
    description: 'Garantir que a operação inicie de forma impecável, limpa e com caixas conciliados.',
    category: 'Abertura da loja',
    questions: INITIAL_QUESTIONS.filter(q => q.category === 'Abertura da loja'),
    storeId: 'all',
    createdAt: '2026-05-01T08:00:00Z'
  },
  {
    id: 'temp_fechamento',
    title: 'Checklist de Fechamento de Turno',
    description: 'Controle de segurança, desligamento de equipamentos e refrigeração ativa pós expediente.',
    category: 'Fechamento',
    questions: INITIAL_QUESTIONS.filter(q => q.category === 'Fechamento'),
    storeId: 'all',
    createdAt: '2026-05-01T08:00:00Z'
  },
  {
    id: 'temp_limpeza',
    title: 'Rotina de Inspeção de Limpeza',
    description: 'Auditoria visual periódica do salão, banheiros e retaguarda da loja.',
    category: 'Limpeza',
    questions: INITIAL_QUESTIONS.filter(q => q.category === 'Limpeza'),
    storeId: 'all',
    createdAt: '2026-05-01T08:00:00Z'
  }
];
