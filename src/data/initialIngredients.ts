import { IngredientMaster } from '../types/foodService';

export const INITIAL_INGREDIENTS_VERO_PASTA: IngredientMaster[] = [
  // --- PROTEÍNAS ---
  {
    id: 'ing-frango-peito',
    storeId: '3',
    nome: 'Peito de Frango sem Pele e sem Osso',
    categoria: 'PROTEINAS',
    fornecedorPadrao: 'Avícola Cearense',
    unidadeCompraNome: 'Caixa c/ 10 kg',
    precoEmbalagemCompraCentavos: 21900, // R$ 219,00 por 10kg = R$ 21,90/kg
    quantidadeEmbalagemCompra: 10000, // 10.000g -> R$ 0,0219/g
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-01',
    fatorCorrecao: 1.15, // 15% de perda com limpeza de gordura
    indiceCoccao: 0.75, // Perda de água no cozimento
    alergenos: [],
    ativo: true,
    observacoes: 'Peito de frango resfriado de primeira linha.',
    updatedAt: '2026-11-01'
  },
  {
    id: 'ing-file-mignon',
    storeId: '3',
    nome: 'Filé Mignon Bovino Limpo',
    categoria: 'PROTEINAS',
    fornecedorPadrao: 'Frigorífico Central',
    unidadeCompraNome: 'Peça a Vácuo (~2 kg)',
    precoEmbalagemCompraCentavos: 15980, // R$ 159,80 por 2kg = R$ 79,90/kg
    quantidadeEmbalagemCompra: 2000, // 2000g -> R$ 0,0799/g
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-03',
    fatorCorrecao: 1.05, // 5% de toalete fina
    indiceCoccao: 0.80,
    alergenos: [],
    ativo: true,
    observacoes: 'Corte nobre para parmegiana.',
    updatedAt: '2026-11-03'
  },
  {
    id: 'ing-carne-moida',
    storeId: '3',
    nome: 'Carne Moída Patinho de Primeira',
    categoria: 'PROTEINAS',
    fornecedorPadrao: 'Frigorífico Central',
    unidadeCompraNome: 'Pacote 1 kg',
    precoEmbalagemCompraCentavos: 3890, // R$ 38,90/kg
    quantidadeEmbalagemCompra: 1000,
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-05',
    fatorCorrecao: 1.02,
    indiceCoccao: 0.78,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-05'
  },
  {
    id: 'ing-bacon-cubos',
    storeId: '3',
    nome: 'Bacon Defumado em Cubos',
    categoria: 'PROTEINAS',
    fornecedorPadrao: 'Sadia / BRF',
    unidadeCompraNome: 'Pacote 1 kg',
    precoEmbalagemCompraCentavos: 3450, // R$ 34,50/kg
    quantidadeEmbalagemCompra: 1000,
    unidadeUso: 'g',
    dataUltimaCompra: '2026-10-28',
    fatorCorrecao: 1.05,
    indiceCoccao: 0.65, // Perda de gordura ao fritar
    alergenos: [],
    ativo: true,
    updatedAt: '2026-10-28'
  },

  // --- MASSAS & FARINHAS ---
  {
    id: 'ing-spaghetti-seco',
    storeId: '3',
    nome: 'Spaghetti Grano Duro Italiano',
    categoria: 'MASSAS',
    fornecedorPadrao: 'Barilla Brasil',
    unidadeCompraNome: 'Pacote 500 g',
    precoEmbalagemCompraCentavos: 890, // R$ 8,90 por 500g = R$ 17,80/kg
    quantidadeEmbalagemCompra: 500, // -> R$ 0,0178/g cru
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-04',
    fatorCorrecao: 1.00,
    indiceCoccao: 2.20, // 90g cru rende ~200g cozido
    alergenos: ['GLUTEN'],
    ativo: true,
    observacoes: 'Massa grano duro trafilata al bronzo.',
    updatedAt: '2026-11-04'
  },
  {
    id: 'ing-massa-lasanha',
    storeId: '3',
    nome: 'Folhas de Massa para Lasanha Fresca',
    categoria: 'MASSAS',
    fornecedorPadrao: 'Pastifício Artesanal',
    unidadeCompraNome: 'Pacote 1 kg',
    precoEmbalagemCompraCentavos: 1650, // R$ 16,50/kg
    quantidadeEmbalagemCompra: 1000,
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-02',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.25,
    alergenos: ['GLUTEN', 'OVOS'],
    ativo: true,
    updatedAt: '2026-11-02'
  },
  {
    id: 'ing-tortilla-wrap',
    storeId: '3',
    nome: 'Tortilla Tradicional p/ Wrap 25cm',
    categoria: 'MASSAS',
    fornecedorPadrao: 'Bimbo Brasil',
    unidadeCompraNome: 'Pacote c/ 10 un (600g)',
    precoEmbalagemCompraCentavos: 1450, // R$ 14,50 / 10 = R$ 1,45 por disco
    quantidadeEmbalagemCompra: 10,
    unidadeUso: 'un',
    dataUltimaCompra: '2026-11-06',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: ['GLUTEN'],
    ativo: true,
    updatedAt: '2026-11-06'
  },
  {
    id: 'ing-farinha-trigo',
    storeId: '3',
    nome: 'Farinha de Trigo Especial Tipo 1',
    categoria: 'MASSAS',
    fornecedorPadrao: 'Moinho Dias Branco',
    unidadeCompraNome: 'Fardo 5 kg',
    precoEmbalagemCompraCentavos: 2400, // R$ 24,00 por 5kg = R$ 4,80/kg
    quantidadeEmbalagemCompra: 5000, // 5000g -> R$ 0,0048/g
    unidadeUso: 'g',
    dataUltimaCompra: '2026-10-25',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: ['GLUTEN'],
    ativo: true,
    updatedAt: '2026-10-25'
  },

  // --- LATICÍNIOS ---
  {
    id: 'ing-mussarela',
    storeId: '3',
    nome: 'Queijo Mussarela Peça Resfriada',
    categoria: 'LATICINIOS',
    fornecedorPadrao: 'Laticínios Betânia',
    unidadeCompraNome: 'Peça ~4 kg',
    precoEmbalagemCompraCentavos: 14200, // R$ 142,00 por 4kg = R$ 35,50/kg
    quantidadeEmbalagemCompra: 4000, // -> R$ 0,0355/g
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-07',
    fatorCorrecao: 1.02, // Perda mínima no ralador
    indiceCoccao: 0.95,
    alergenos: ['LACTOSE'],
    ativo: true,
    updatedAt: '2026-11-07'
  },
  {
    id: 'ing-parmesao',
    storeId: '3',
    nome: 'Queijo Parmesão Ralado Fino',
    categoria: 'LATICINIOS',
    fornecedorPadrao: 'Faixa Azul',
    unidadeCompraNome: 'Pacote 1 kg',
    precoEmbalagemCompraCentavos: 7800, // R$ 78,00/kg
    quantidadeEmbalagemCompra: 1000, // -> R$ 0,0780/g
    unidadeUso: 'g',
    dataUltimaCompra: '2026-10-30',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: ['LACTOSE'],
    ativo: true,
    updatedAt: '2026-10-30'
  },
  {
    id: 'ing-creme-leite',
    storeId: '3',
    nome: 'Creme de Leite Fresco UHT 20% Gordura',
    categoria: 'LATICINIOS',
    fornecedorPadrao: 'Piracanjuba',
    unidadeCompraNome: 'Caixa 1 L (1000 ml)',
    precoEmbalagemCompraCentavos: 1190, // R$ 11,90 / L
    quantidadeEmbalagemCompra: 1000, // -> R$ 0,0119/ml
    unidadeUso: 'ml',
    dataUltimaCompra: '2026-11-04',
    fatorCorrecao: 1.01, // Raspa de caixa
    indiceCoccao: 0.90, // Redução na fervura
    alergenos: ['LACTOSE'],
    ativo: true,
    updatedAt: '2026-11-04'
  },
  {
    id: 'ing-manteiga',
    storeId: '3',
    nome: 'Manteiga Extra de Primeira sem Sal',
    categoria: 'LATICINIOS',
    fornecedorPadrao: 'Aviação',
    unidadeCompraNome: 'Pote 500 g',
    precoEmbalagemCompraCentavos: 1950, // R$ 19,50 por 500g = R$ 39,00/kg
    quantidadeEmbalagemCompra: 500, // -> R$ 0,039/g
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-02',
    fatorCorrecao: 1.00,
    indiceCoccao: 0.95,
    alergenos: ['LACTOSE'],
    ativo: true,
    updatedAt: '2026-11-02'
  },

  // --- HORTIFRÚTI & MOLHOS BASE ---
  {
    id: 'ing-tomate-pelati',
    storeId: '3',
    nome: 'Tomate Pelati Italiano Inteiro Descascado',
    categoria: 'MOLHOS',
    fornecedorPadrao: 'Cirio / La Pastina',
    unidadeCompraNome: 'Lata 2,5 kg',
    precoEmbalagemCompraCentavos: 2950, // R$ 29,50 por 2,5kg = R$ 11,80/kg
    quantidadeEmbalagemCompra: 2500, // -> R$ 0,0118/g
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-03',
    fatorCorrecao: 1.00,
    indiceCoccao: 0.85,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-03'
  },
  {
    id: 'ing-cebola',
    storeId: '3',
    nome: 'Cebola Roxa e Branca Selecionada',
    categoria: 'HORTIFRUTI',
    fornecedorPadrao: 'Ceasa Fortaleza',
    unidadeCompraNome: 'Saco 5 kg',
    precoEmbalagemCompraCentavos: 2250, // R$ 22,50 por 5kg = R$ 4,50/kg
    quantidadeEmbalagemCompra: 5000,
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-08',
    fatorCorrecao: 1.18, // 18% casca e toalete
    indiceCoccao: 0.70, // Perda de água ao refogar
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-08'
  },
  {
    id: 'ing-alho',
    storeId: '3',
    nome: 'Alho Roxo Descascado Triturado',
    categoria: 'HORTIFRUTI',
    fornecedorPadrao: 'Ceasa Fortaleza',
    unidadeCompraNome: 'Pote 1 kg',
    precoEmbalagemCompraCentavos: 2800, // R$ 28,00/kg
    quantidadeEmbalagemCompra: 1000,
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-05',
    fatorCorrecao: 1.02,
    indiceCoccao: 0.85,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-05'
  },
  {
    id: 'ing-manjericao',
    storeId: '3',
    nome: 'Manjericão Fresco Orgânico',
    categoria: 'HORTIFRUTI',
    fornecedorPadrao: 'Horta Local',
    unidadeCompraNome: 'Maço 200 g',
    precoEmbalagemCompraCentavos: 350, // R$ 3,50 por 200g = R$ 17,50/kg
    quantidadeEmbalagemCompra: 200,
    unidadeUso: 'g',
    dataUltimaCompra: '2026-11-08',
    fatorCorrecao: 1.25, // Ramos e talos descartados
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-08'
  },

  // --- TEMPEROS & CONDIMENTOS (BARATOS POR GRAMA) ---
  {
    id: 'ing-azeite',
    storeId: '3',
    nome: 'Azeite de Oliva Extra Virgem 0.4 Acidez',
    categoria: 'TEMPEROS',
    fornecedorPadrao: 'Gallo',
    unidadeCompraNome: 'Garrafa 500 ml',
    precoEmbalagemCompraCentavos: 2300, // R$ 23,00 por 500ml = R$ 46,00/L
    quantidadeEmbalagemCompra: 500, // -> R$ 0,0460/ml
    unidadeUso: 'ml',
    dataUltimaCompra: '2026-11-01',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-01'
  },
  {
    id: 'ing-sal-refinado',
    storeId: '3',
    nome: 'Sal Refinado Iodado Tradicional',
    categoria: 'TEMPEROS',
    fornecedorPadrao: 'Cisne',
    unidadeCompraNome: 'Pacote 1 kg',
    precoEmbalagemCompraCentavos: 250, // R$ 2,50/kg
    quantidadeEmbalagemCompra: 1000, // -> R$ 0,0025/g (0,25 centavos/g)
    unidadeUso: 'g',
    dataUltimaCompra: '2026-10-15',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-10-15'
  },
  {
    id: 'ing-oregano',
    storeId: '3',
    nome: 'Orégano Desidratado Peruano',
    categoria: 'TEMPEROS',
    fornecedorPadrao: 'Kitano',
    unidadeCompraNome: 'Pacote 500 g',
    precoEmbalagemCompraCentavos: 1500, // R$ 15,00 por 500g = R$ 30,00/kg
    quantidadeEmbalagemCompra: 500, // -> R$ 0,030/g
    unidadeUso: 'g',
    dataUltimaCompra: '2026-10-20',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-10-20'
  },

  // --- EMBALAGENS & DESCARTÁVEIS (CANAL IFOOD & BALCÃO) ---
  {
    id: 'ing-emb-pote-termico',
    storeId: '3',
    nome: 'Pote Térmico p/ Massas 500ml c/ Tampa',
    categoria: 'EMBALAGENS',
    fornecedorPadrao: 'Embalagens Fortaleza',
    unidadeCompraNome: 'Fardo c/ 100 un',
    precoEmbalagemCompraCentavos: 18600, // R$ 186,00 por 100un = R$ 1,86/un
    quantidadeEmbalagemCompra: 100,
    unidadeUso: 'un',
    dataUltimaCompra: '2026-11-05',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-05'
  },
  {
    id: 'ing-emb-saco-kraft',
    storeId: '3',
    nome: 'Saco Kraft Delivery Reforçado c/ Alça',
    categoria: 'EMBALAGENS',
    fornecedorPadrao: 'Embalagens Fortaleza',
    unidadeCompraNome: 'Pacote c/ 100 un',
    precoEmbalagemCompraCentavos: 6000, // R$ 60,00 por 100un = R$ 0,60/un
    quantidadeEmbalagemCompra: 100,
    unidadeUso: 'un',
    dataUltimaCompra: '2026-11-05',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-05'
  },
  {
    id: 'ing-emb-lacre',
    storeId: '3',
    nome: 'Lacre de Segurança Adesivo Inviolável',
    categoria: 'DESCARTAVEIS',
    fornecedorPadrao: 'Gráfica Express',
    unidadeCompraNome: 'Rolo c/ 1000 un',
    precoEmbalagemCompraCentavos: 10000, // R$ 100,00 por 1000 = R$ 0,10/un
    quantidadeEmbalagemCompra: 1000,
    unidadeUso: 'un',
    dataUltimaCompra: '2026-10-18',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-10-18'
  },
  {
    id: 'ing-emb-kit-talher',
    storeId: '3',
    nome: 'Kit Talher Reforçado c/ Guardanapo Sachê',
    categoria: 'DESCARTAVEIS',
    fornecedorPadrao: 'Plásticos Brasil',
    unidadeCompraNome: 'Caixa c/ 200 un',
    precoEmbalagemCompraCentavos: 9000, // R$ 90,00 por 200 = R$ 0,45/un
    quantidadeEmbalagemCompra: 200,
    unidadeUso: 'un',
    dataUltimaCompra: '2026-11-02',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-02'
  },
  {
    id: 'ing-emb-papel-bandeja',
    storeId: '3',
    nome: 'Papel Bandeja Prato Personalizado (Balcão)',
    categoria: 'DESCARTAVEIS',
    fornecedorPadrao: 'Gráfica Express',
    unidadeCompraNome: 'Pacote c/ 500 un',
    precoEmbalagemCompraCentavos: 11000, // R$ 110,00 por 500 = R$ 0,22/un
    quantidadeEmbalagemCompra: 500,
    unidadeUso: 'un',
    dataUltimaCompra: '2026-10-25',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-10-25'
  },
  {
    id: 'ing-emb-envelope-wrap',
    storeId: '3',
    nome: 'Envelope Térmico Barreira de Gordura (Wrap)',
    categoria: 'EMBALAGENS',
    fornecedorPadrao: 'Embalagens Fortaleza',
    unidadeCompraNome: 'Pacote c/ 100 un',
    precoEmbalagemCompraCentavos: 7500, // R$ 75,00 por 100 = R$ 0,75/un
    quantidadeEmbalagemCompra: 100,
    unidadeUso: 'un',
    dataUltimaCompra: '2026-11-01',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-01'
  },
  {
    id: 'ing-emb-marmita-aluminio',
    storeId: '3',
    nome: 'Marmita Forno Alumínio c/ Tampa 650g',
    categoria: 'EMBALAGENS',
    fornecedorPadrao: 'Wyda',
    unidadeCompraNome: 'Caixa c/ 100 un',
    precoEmbalagemCompraCentavos: 19000, // R$ 190,00 por 100 = R$ 1,90/un
    quantidadeEmbalagemCompra: 100,
    unidadeUso: 'un',
    dataUltimaCompra: '2026-11-03',
    fatorCorrecao: 1.00,
    indiceCoccao: 1.00,
    alergenos: [],
    ativo: true,
    updatedAt: '2026-11-03'
  }
];
