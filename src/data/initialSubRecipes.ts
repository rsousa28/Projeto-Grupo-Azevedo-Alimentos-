import { SubRecipe } from '../types/technicalSheet';

export const INITIAL_SUB_RECIPES: SubRecipe[] = [
  {
    id: 'sub-molho-branco',
    nome: 'Molho Branco Artesanal (Bechamel)',
    categoria: 'MOLHOS',
    descricao: 'Base aveludada clássica feita com roux loiro, leite integral pasteurizado, creme de leite fresco e toque de noz moscada.',
    rendimentoLote: 5000, // 5.000 ml (5 Litros)
    unidadeRendimento: 'ml',
    tempoPreparoMinutos: 35,
    validadeDias: 4,
    temperaturaArmazenamento: '0°C a 4°C em GN de policarbonato vedada com filme plástico em contato',
    ingredientes: [
      { id: 'sbi-mb-1', nome: 'Leite Integral Pasteurizado', quantidade: 5, unidade: 'l', custoUnitario: 4.80, custoTotal: 24.00 },
      { id: 'sbi-mb-2', nome: 'Manteiga com Sal Primeira Qualidade', quantidade: 350, unidade: 'g', custoUnitario: 0.045, custoTotal: 15.75 },
      { id: 'sbi-mb-3', nome: 'Farinha de Trigo Especial Tipo 1', quantidade: 350, unidade: 'g', custoUnitario: 0.0055, custoTotal: 1.93 },
      { id: 'sbi-mb-4', nome: 'Creme de Leite UHT 20% Gordura', quantidade: 1000, unidade: 'g', custoUnitario: 0.024, custoTotal: 24.00 },
      { id: 'sbi-mb-5', nome: 'Noz Moscada em Grão Ralada na Hora', quantidade: 10, unidade: 'g', custoUnitario: 0.28, custoTotal: 2.80 },
      { id: 'sbi-mb-6', nome: 'Sal Refinado Iodado', quantidade: 40, unidade: 'g', custoUnitario: 0.003, custoTotal: 0.12 },
      { id: 'sbi-mb-7', nome: 'Pimenta do Reino Branca Moída', quantidade: 5, unidade: 'g', custoUnitario: 0.28, custoTotal: 1.40 },
    ],
    custoTotalLote: 70.00,
    custoUnitarioCalculado: 0.014, // R$ 0,014 por ml (R$ 14,00 por Litro)
    utensiliosPadrao: [
      'Caldeirão / Caçarola Funda Inox 12 Litros',
      'Fouet Profissional Inox 40cm',
      'Peneira Cônica (Chinois) de Inox',
      'Termômetro Culinário Espeto'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Preparo do Roux Loiro',
        descricao: 'Em fogo brando, derreter os {{manteiga}} no caldeirão. Adicionar os {{farinha}} peneirada e cozinhar mexendo constantemente com fouet por 3 a 4 minutos até perder o cheiro de farinha crua.',
        alertaPonto: 'Não deixar escurecer; o roux deve manter tonalidade clara e aroma de amêndoas.',
        tempoMinutos: 5
      },
      {
        passo: 2,
        titulo: 'Incorporação do Leite Aquecido',
        descricao: 'Despejar os {{leite}} gradualmente em fio contínuo, batendo vigorosamente com o fouet para evitar qualquer formação de grumos.',
        tempoMinutos: 10
      },
      {
        passo: 3,
        titulo: 'Cocção e Espessamento',
        descricao: 'Cozinhar em fogo médio-baixo até atingir ponto napé (cobrir as costas da colher sem escorrer imediatamente). Incorporar os {{creme-leite}}.',
        alertaPonto: 'Mexer até o fundo do caldeirão a cada 30 segundos para não queimar a base de leite.',
        tempoMinutos: 15
      },
      {
        passo: 4,
        titulo: 'Temperagem, Filtragem e Resfriamento Rápido',
        descricao: 'Apagar o fogo, temperar com {{noz-moscada}}, {{sal}} e {{pimenta}}. Passar pelo chinois para textura 100% aveludada. Cobrir com filme plástico em contato e resfriar no abatedor até < 4°C.',
        tempoMinutos: 5
      }
    ],
    observacoes: 'Base vinculada ao Spaghetti Balcão, Spaghetti iFood e Lasanhas. Se o leite ou a manteiga oscilarem, atualizar este lote.',
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sub-molho-bolonhesa',
    nome: 'Molho Bolonhesa Especial (Patinho)',
    categoria: 'MOLHOS',
    descricao: 'Ragù italiano cozido lentamente com carne bovina magra moída duas vezes, soffritto de legumes, tomate pelati San Marzano e vinho tinto.',
    rendimentoLote: 6000, // 6.000 g (6 Kg)
    unidadeRendimento: 'g',
    tempoPreparoMinutos: 90,
    validadeDias: 5,
    temperaturaArmazenamento: '0°C a 4°C em cubas GN herméticas',
    ingredientes: [
      { id: 'sbi-mbo-1', nome: 'Carne Bovina Patinho Fresco Moído', quantidade: 3000, unidade: 'g', custoUnitario: 0.038, custoTotal: 114.00 },
      { id: 'sbi-mbo-2', nome: 'Tomate Pelati Italiano Inteiro Pelado', quantidade: 2500, unidade: 'g', custoUnitario: 0.0125, custoTotal: 31.25 },
      { id: 'sbi-mbo-3', nome: 'Cebola Branca Triturada', quantidade: 500, unidade: 'g', custoUnitario: 0.006, custoTotal: 3.00 },
      { id: 'sbi-mbo-4', nome: 'Alho Triturado In Natura', quantidade: 100, unidade: 'g', custoUnitario: 0.028, custoTotal: 2.80 },
      { id: 'sbi-mbo-5', nome: 'Azeite de Oliva Extra Virgem', quantidade: 150, unidade: 'ml', custoUnitario: 0.046, custoTotal: 6.90 },
      { id: 'sbi-mbo-6', nome: 'Vinho Tinto Seco Culinário', quantidade: 200, unidade: 'ml', custoUnitario: 0.018, custoTotal: 3.60 },
      { id: 'sbi-mbo-7', nome: 'Sal Temperado e Especiarias Finas', quantidade: 50, unidade: 'g', custoUnitario: 0.009, custoTotal: 0.45 },
    ],
    custoTotalLote: 162.00,
    custoUnitarioCalculado: 0.027, // R$ 0,027 por g (R$ 27,00 por Kg)
    utensiliosPadrao: [
      'Caçarola Industrial Inox Fundo Triplo 15L',
      'Espátula Pá Inox para Caldeirão 60cm',
      'Processador Industrial de Alimentos',
      'Abatedor de Temperatura'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Soffritto Inicial',
        descricao: 'Aquecer o azeite na caçarola, adicionar cebola e alho, refogando até ficarem translúcidos e levemente caramelizados.',
        tempoMinutos: 10
      },
      {
        passo: 2,
        titulo: 'Selagem da Carne Moída',
        descricao: 'Acrescentar o patinho moído em pequenas porções para não juntar água fria. Dourar e soltar bem os grumos com a pá inox.',
        tempoMinutos: 15
      },
      {
        passo: 3,
        titulo: 'Deglace com Vinho Tinto',
        descricao: 'Verter o vinho tinto raspando todo o fundo caramelizado da panela. Deixar o álcool evaporar completamente por 5 minutos.',
        tempoMinutos: 5
      },
      {
        passo: 4,
        titulo: 'Cocção Lenta do Ragù',
        descricao: 'Adicionar os tomates pelati previamente esmagados com as mãos. Tampar parcialmente e cozinhar em fogo baixo por 60 minutos.',
        alertaPonto: 'O molho deve reduzir até textura densa e brilho avermelhado rico.',
        tempoMinutos: 60
      }
    ],
    observacoes: 'Base de recheio da Lasanha Bolonhesa iFood e Balcão. Proibido usar carnes com gordura acima de 10%.',
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sub-massa-fresca',
    nome: 'Massa Fresca Laminada',
    categoria: 'MASSAS',
    descricao: 'Massa artesanal italiana de sêmola de trigo grano duro e ovos pasteurizados, laminada na espessura padrão de 1,2mm para lasanhas e massas cortadas.',
    rendimentoLote: 5000, // 5.000 g (5 Kg)
    unidadeRendimento: 'g',
    tempoPreparoMinutos: 45,
    validadeDias: 6,
    temperaturaArmazenamento: '0°C a 2°C sob refrigeração em filme stretch microperfurado',
    ingredientes: [
      { id: 'sbi-mf-1', nome: 'Sêmola de Trigo Grano Duro Importada', quantidade: 3500, unidade: 'g', custoUnitario: 0.021, custoTotal: 73.50 },
      { id: 'sbi-mf-2', nome: 'Ovo Integral Líquido Pasteurizado', quantidade: 1200, unidade: 'g', custoUnitario: 0.018, custoTotal: 21.60 },
      { id: 'sbi-mf-3', nome: 'Azeite de Oliva Extra Virgem', quantidade: 100, unidade: 'ml', custoUnitario: 0.046, custoTotal: 4.60 },
      { id: 'sbi-mf-4', nome: 'Sal Refinado', quantidade: 30, unidade: 'g', custoUnitario: 0.010, custoTotal: 0.30 },
    ],
    custoTotalLote: 100.00,
    custoUnitarioCalculado: 0.020, // R$ 0,020 por g (R$ 20,00 por Kg)
    utensiliosPadrao: [
      'Amassadeira Espiral ou Batedeira Planetária com Gancho',
      'Laminadora Elétrica de Rolos Inox',
      'Mesa de Manipulação em Aço Inox 304',
      'Cortador Giratório de Massa'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Homogeneização e Sovagem',
        descricao: 'Bater a sêmola com os ovos pasteurizados e o azeite na amassadeira em velocidade 1 por 8 minutos até formar massa firme e lisa.',
        tempoMinutos: 10
      },
      {
        passo: 2,
        titulo: 'Descanso da Malha Glútica',
        descricao: 'Envolver a massa em plástico filme e deixar repousar por 20 minutos sob temperatura controlada.',
        tempoMinutos: 20
      },
      {
        passo: 3,
        titulo: 'Laminação Gradual',
        descricao: 'Passar pelos cilindros da laminadora iniciando no ponto 6 e reduzindo gradualmente até o ponto 2 (1,2mm de espessura uniforme).',
        alertaPonto: 'Polvilhar apenas sêmola fina para enfarinhar os rolos.',
        tempoMinutos: 15
      }
    ],
    observacoes: 'Produção centralizada para todas as lasanhas e cortes frescos.',
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sub-frango-desfiado',
    nome: 'Frango Desfiado Temperado',
    categoria: 'PROTEINAS',
    descricao: 'Peito de frango selecionado cozido na pressão com aromáticos, desfiado finamente e refogado no azeite com colorau e cheiro verde cearense.',
    rendimentoLote: 4000, // 4.000 g (4 Kg pronto)
    unidadeRendimento: 'g',
    tempoPreparoMinutos: 50,
    validadeDias: 4,
    temperaturaArmazenamento: '0°C a 4°C em GN profunda com tampa hermética',
    ingredientes: [
      { id: 'sbi-fd-1', nome: 'Peito de Frango sem Pele e sem Osso', quantidade: 4800, unidade: 'g', custoUnitario: 0.0215, custoTotal: 103.20 },
      { id: 'sbi-fd-2', nome: 'Azeite de Oliva / Composto Especial', quantidade: 150, unidade: 'ml', custoUnitario: 0.038, custoTotal: 5.70 },
      { id: 'sbi-fd-3', nome: 'Cebola Branca Triturada', quantidade: 400, unidade: 'g', custoUnitario: 0.006, custoTotal: 2.40 },
      { id: 'sbi-fd-4', nome: 'Alho Batido sem Conservante', quantidade: 100, unidade: 'g', custoUnitario: 0.028, custoTotal: 2.80 },
      { id: 'sbi-fd-5', nome: 'Colorau / Páprica Doce Defumada', quantidade: 50, unidade: 'g', custoUnitario: 0.045, custoTotal: 2.25 },
      { id: 'sbi-fd-6', nome: 'Cheiro Verde Fresco (Coentro e Cebolinha)', quantidade: 150, unidade: 'g', custoUnitario: 0.040, custoTotal: 6.00 },
      { id: 'sbi-fd-7', nome: 'Sal Temperado da Casa', quantidade: 60, unidade: 'g', custoUnitario: 0.0175, custoTotal: 1.05 },
    ],
    custoTotalLote: 123.40,
    custoUnitarioCalculado: 0.03085, // R$ 0,03085 por g (R$ 30,85 por Kg)
    utensiliosPadrao: [
      'Panela de Pressão Industrial 20L',
      'Desfiador Elétrico de Frango / Batedeira Planetária com Pá',
      'Balança Digital'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Cocção na Pressão',
        descricao: 'Cozinhar o frango com água, sal e louro por 25 minutos após pegar pressão.',
        tempoMinutos: 25
      },
      {
        passo: 2,
        titulo: 'Desfibramento',
        descricao: 'Escorrer o caldo e desfiar ainda quente no desfiador elétrico em fios longos e uniformes.',
        tempoMinutos: 10
      },
      {
        passo: 3,
        titulo: 'Refogado e Temperagem Final',
        descricao: 'Refogar cebola, alho e colorau no azeite, misturar o frango desfiado ajustando o sal e finalizar com cheiro verde fresco picado.',
        alertaPonto: 'Frango deve ficar úmido e suculento, nunca ressecado.',
        tempoMinutos: 15
      }
    ],
    observacoes: 'Insumo presente no Spaghetti c/ Frango e na Lasanha de Frango.',
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sub-carne-sol',
    nome: 'Carne de Sol Desfiada na Manteiga',
    categoria: 'PROTEINAS',
    descricao: 'Carne de sol artesanal cearense de coxão mole, dessalgada, cozida na pressão e desfiada refogada na autêntica manteiga da terra com cebola roxa.',
    rendimentoLote: 3000, // 3.000 g (3 Kg)
    unidadeRendimento: 'g',
    tempoPreparoMinutos: 60,
    validadeDias: 5,
    temperaturaArmazenamento: '0°C a 4°C em GN com tampa hermética',
    ingredientes: [
      { id: 'sbi-cs-1', nome: 'Carne de Sol de Coxão Mole Limpa', quantidade: 3800, unidade: 'g', custoUnitario: 0.042, custoTotal: 159.60 },
      { id: 'sbi-cs-2', nome: 'Manteiga da Terra / de Garrafa Pura', quantidade: 300, unidade: 'ml', custoUnitario: 0.052, custoTotal: 15.60 },
      { id: 'sbi-cs-3', nome: 'Cebola Roxa Finamente Fatiada', quantidade: 500, unidade: 'g', custoUnitario: 0.007, custoTotal: 3.50 },
      { id: 'sbi-cs-4', nome: 'Alho Triturado', quantidade: 80, unidade: 'g', custoUnitario: 0.028, custoTotal: 2.24 },
      { id: 'sbi-cs-5', nome: 'Pimenta de Cheiro Doce Picadinha', quantidade: 30, unidade: 'g', custoUnitario: 0.028, custoTotal: 0.86 },
    ],
    custoTotalLote: 181.80,
    custoUnitarioCalculado: 0.0606, // R$ 0,0606 por g (R$ 60,60 por Kg)
    utensiliosPadrao: [
      'Panela de Pressão Industrial 15L',
      'Desfiador de Carnes',
      'Chapa ou Frigideira Basculante',
      'Balança Digital de Precisão'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Dessalga e Cozimento',
        descricao: 'Dessalgar em água fria trocada 3 vezes, cortar em cubos e cozinhar na pressão por 30 minutos até amaciar.',
        tempoMinutos: 35
      },
      {
        passo: 2,
        titulo: 'Desfibramento',
        descricao: 'Passar pelo desfiador garantindo fibras macias sem pedaços grossos.',
        tempoMinutos: 10
      },
      {
        passo: 3,
        titulo: 'Finalização na Manteiga da Terra',
        descricao: 'Aquecer a manteiga da terra na chapa basculante, dourar o alho, murchar a cebola roxa e refogar a carne de sol com a pimenta de cheiro.',
        alertaPonto: 'Cuidado para não fritar em excesso para não endurecer as fibras.',
        tempoMinutos: 15
      }
    ],
    observacoes: 'Base nobre para todos os Wraps de Carne de Sol e complementos.',
    ultimaAtualizacao: '2026-10-26'
  }
];
