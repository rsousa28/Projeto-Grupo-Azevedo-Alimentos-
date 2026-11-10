import { TechnicalSheet } from '../types/technicalSheet';

export const INITIAL_TECHNICAL_SHEETS: TechnicalSheet[] = [
  {
    id: 'sheet-spaghetti-frango-ifood',
    nome: 'Spaghetti c/ Frango Desfiado (iFood)',
    canal: 'IFOOD',
    categoria: 'MASSAS',
    descricao: 'Massa grano duro ao molho branco aveludado com peito de frango desfiado temperado e queijo gratinado.',
    ingredientes: [
      { id: 'ing-1', nome: 'Spaghetti Grano Duro Cozido', unidade: 'g', quantidade: 90, custoUnitario: 0.01911, custoTotal: 1.72 },
      { id: 'ing-2', nome: 'Frango Desfiado Temperado', unidade: 'g', quantidade: 70, custoUnitario: 0.03085, custoTotal: 2.16, subRecipeId: 'sub-frango-desfiado', subRecipeNome: 'Frango Desfiado Temperado' },
      { id: 'ing-3', nome: 'Molho Branco Artesanal (Bechamel)', unidade: 'ml', quantidade: 200, custoUnitario: 0.0140, custoTotal: 2.80, subRecipeId: 'sub-molho-branco', subRecipeNome: 'Molho Branco Artesanal (Bechamel)' },
      { id: 'ing-4', nome: 'Queijo Mussarela Ralado', unidade: 'g', quantidade: 40, custoUnitario: 0.0355, custoTotal: 1.42 },
      { id: 'ing-5', nome: 'Azeite de Oliva Extra Virgem', unidade: 'ml', quantidade: 10, custoUnitario: 0.0460, custoTotal: 0.46 },
      { id: 'ing-6', nome: 'Manjericão Fresco', unidade: 'g', quantidade: 2, custoUnitario: 0.010, custoTotal: 0.02 },
      { id: 'ing-7', nome: 'Orégano Desidratado', unidade: 'g', quantidade: 1, custoUnitario: 0.030, custoTotal: 0.03 },
      { id: 'ing-8', nome: 'Sal Temperado Especial', unidade: 'g', quantidade: 2, custoUnitario: 0.005, custoTotal: 0.01 },
    ],
    embalagens: [
      { id: 'emb-1', nome: 'Pote Térmico p/ Massas 500ml', quantidade: 1, custoUnitario: 1.86, custoTotal: 1.86 },
      { id: 'emb-2', nome: 'Saco Kraft Delivery Reforçado', quantidade: 1, custoUnitario: 0.60, custoTotal: 0.60 },
      { id: 'emb-3', nome: 'Lacre de Segurança Adesivo', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
      { id: 'emb-4', nome: 'Guardanapo Sachê Delivery', quantidade: 1, custoUnitario: 0.04, custoTotal: 0.05 },
    ],
    custoInsumos: 8.62,
    custoEmbalagens: 2.58,
    custoTotal: 11.20,
    precoVenda: 35.90,
    cmvTeoricoPercent: 0.312,
    taxaCanalPercent: 0.28,
    impostoSimplesPercent: 0.05,
    margemContribuicaoReais: 12.85,
    margemContribuicaoPercent: 0.358,
    pesoFinalGramas: 410,
    tempoPreparoMinutos: 8,
    utensiliosPadrao: [
      'Balança Digital de Bancada (Precisão 1g)',
      'Pegador Inox para Massas 25cm',
      'Concha Dosadora nº 20 (Molhos)',
      'Frigideira Salteadora Antiaderente 24cm'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Pré-Aquecimento da Frigideira',
        descricao: 'Aquecer a frigideira em fogo médio e adicionar os 10ml de azeite extra virgem.',
        tempoMinutos: 1
      },
      {
        passo: 2,
        titulo: 'Saltear a Proteína',
        descricao: 'Acrescentar 70g de frango desfiado já dosado na balança. Dourar levemente por 2 minutos até soltar o aroma.',
        alertaPonto: 'Cuidado para não ressecar a fibra do frango.',
        tempoMinutos: 2
      },
      {
        passo: 3,
        titulo: 'Incorporação do Molho',
        descricao: 'Verter 200ml de molho branco utilizando a concha dosadora. Misturar em movimentos circulares até levantar fervura uniforme.',
        tempoMinutos: 2
      },
      {
        passo: 4,
        titulo: 'Junção da Massa e Queijo',
        descricao: 'Adicionar os 90g de spaghetti previamente aferido. Saltear envolvendo toda a massa no molho. Finalizar polvilhando os 40g de queijo mussarela, orégano e manjericão até o queijo fundir.',
        alertaPonto: 'A consistência do molho deve ficar aveludada, sem separar a gordura.',
        tempoMinutos: 2
      },
      {
        passo: 5,
        titulo: 'Envasamento e Lacre iFood',
        descricao: 'Transferir cuidadosamente para o pote térmico de 500ml pré-aquecido. Fechar hermeticamente com tampa anti-vazamento, acomodar no saco kraft e aplicar o lacre inviolável imediatamente.',
        alertaPonto: 'Conferir o peso final na balança (meta: 410g ± 15g).',
        tempoMinutos: 1
      }
    ],
    observacoesCozinha: 'Não deixar o spaghetti na água quente após a pré-cocção para manter textura al dente.',
    historicoInflacao: [
      { mes: 'Nov/2025', custoTotal: 10.45, precoVenda: 34.90, cmvPercent: 29.94, motivoVariacao: 'Cotação estável do leite e trigo', itemPrincipalImpactado: 'Leite Integral' },
      { mes: 'Dez/2025', custoTotal: 10.82, precoVenda: 34.90, cmvPercent: 31.00, motivoVariacao: 'Aumento sazonal de 6% no queijo mussarela', itemPrincipalImpactado: 'Queijo Mussarela' },
      { mes: 'Jan/2026', custoTotal: 11.20, precoVenda: 35.90, cmvPercent: 31.20, motivoVariacao: 'Reajuste no pote térmico (+8%) compensado por reajuste no cardápio', itemPrincipalImpactado: 'Pote Térmico 500ml' }
    ],
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sheet-wrap-carne-sol-balcao',
    nome: 'Wrap de Carne de Sol (Balcão)',
    canal: 'BALCAO',
    categoria: 'WRAPS',
    descricao: 'Tortilla artesanal tostada na chapa, recheada com carne de sol desfiada na manteiga da terra, queijo coalho e catupiry cremoso.',
    ingredientes: [
      { id: 'ing-w1', nome: 'Tortilla p/ Wrap 25cm Tradicional', unidade: 'un', quantidade: 1, custoUnitario: 1.12, custoTotal: 1.12 },
      { id: 'ing-w2', nome: 'Queijo Coalho Grelhado em Cubos', unidade: 'g', quantidade: 60, custoUnitario: 0.0328, custoTotal: 1.97 },
      { id: 'ing-w3', nome: 'Carne de Sol Desfiada na Manteiga', unidade: 'g', quantidade: 60, custoUnitario: 0.0606, custoTotal: 3.64, subRecipeId: 'sub-carne-sol', subRecipeNome: 'Carne de Sol Desfiada na Manteiga' },
      { id: 'ing-w4', nome: 'Requeijão Cremoso tipo Catupiry', unidade: 'g', quantidade: 20, custoUnitario: 0.0535, custoTotal: 1.07 },
    ],
    embalagens: [
      { id: 'emb-w1', nome: 'Papel Acoplado / Bandeja Personalizado', quantidade: 1, custoUnitario: 0.22, custoTotal: 0.22 },
      { id: 'emb-w2', nome: 'Guardanapo Sachê (2 folhas)', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
      { id: 'emb-w3', nome: 'Ketchup Sachê Premium 7g', quantidade: 2, custoUnitario: 0.27, custoTotal: 0.54 },
    ],
    custoInsumos: 7.80,
    custoEmbalagens: 0.86,
    custoTotal: 8.66,
    precoVenda: 26.90,
    cmvTeoricoPercent: 0.322,
    taxaCanalPercent: 0.07,
    impostoSimplesPercent: 0.05,
    margemContribuicaoReais: 15.01,
    margemContribuicaoPercent: 0.558,
    pesoFinalGramas: 220,
    tempoPreparoMinutos: 5,
    utensiliosPadrao: [
      'Prensa Elétrica Grill / Chapa Lisa (180°C)',
      'Balança Digital de Precisão',
      'Espátula Curva de Inox',
      'Bisnaga Dosadora c/ Bico Dosador (Catupiry)'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Aferição dos Insumos',
        descricao: 'Pesar 60g de carne de sol desfiada e 60g de queijo coalho em cubos no recipiente padrão.',
        tempoMinutos: 1
      },
      {
        passo: 2,
        titulo: 'Aquecimento do Recheio',
        descricao: 'Levar a carne de sol e o queijo coalho à chapa por 90 segundos para tostar levemente e liberar a manteiga.',
        alertaPonto: 'O queijo coalho deve adquirir casquinha dourada crocante.',
        tempoMinutos: 2
      },
      {
        passo: 3,
        titulo: 'Montagem na Tortilla',
        descricao: 'Abrir a tortilla sobre a bancada limpa. Distribuir os 20g de Catupiry uniformemente na base e acomodar a carne de sol com o queijo coalho.',
        tempoMinutos: 1
      },
      {
        passo: 4,
        titulo: 'Dobra e Tostagem Final',
        descricao: 'Dobrar as pontas laterais e enrolar no formato cilíndrico firme. Colocar na prensa levemente untada por 60 segundos com pressão suave.',
        alertaPonto: 'Não prensar com excesso de força para o catupiry não vazar pelas extremidades.',
        tempoMinutos: 1
      },
      {
        passo: 5,
        titulo: 'Finalização e Saída Balcão',
        descricao: 'Cortar em diagonal em ângulo de 45°, acomodar no papel bandeja dobrado e servir com guardanapo e sachês de ketchup.',
        alertaPonto: 'Apresentar corte diagonal voltado para cima valorizando as camadas.',
        tempoMinutos: 1
      }
    ],
    observacoesCozinha: 'Usar tortilla mantida em temperatura ambiente (não fria de geladeira) para não quebrar na dobra.',
    historicoInflacao: [
      { mes: 'Nov/2025', custoTotal: 8.15, precoVenda: 25.90, cmvPercent: 31.46, motivoVariacao: 'Cotação favorável da carne de sol no atacado', itemPrincipalImpactado: 'Carne de Sol' },
      { mes: 'Dez/2025', custoTotal: 8.42, precoVenda: 25.90, cmvPercent: 32.50, motivoVariacao: 'Alta de fim de ano nos derivados lácteos (coalho)', itemPrincipalImpactado: 'Queijo Coalho' },
      { mes: 'Jan/2026', custoTotal: 8.66, precoVenda: 26.90, cmvPercent: 32.20, motivoVariacao: 'Ajuste de R$ 1,00 no cardápio manteve a margem acima de 55%', itemPrincipalImpactado: 'Reajuste Preventivo' }
    ],
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sheet-lasanha-bolonhesa-ifood',
    nome: 'Lasanha Tradicional à Bolonhesa (iFood)',
    canal: 'IFOOD',
    categoria: 'LASANHAS',
    descricao: 'Camadas de massa fresca intercaladas com ragù de carne moída de primeira, molho bechamel cremoso e queijo gratinado ao forno.',
    ingredientes: [
      { id: 'ing-l1', nome: 'Massa Fresca Laminada Pré-Cozida', unidade: 'g', quantidade: 120, custoUnitario: 0.020, custoTotal: 2.40, subRecipeId: 'sub-massa-fresca', subRecipeNome: 'Massa Fresca Laminada' },
      { id: 'ing-l2', nome: 'Molho Bolonhesa Especial (Patinho)', unidade: 'g', quantidade: 180, custoUnitario: 0.027, custoTotal: 4.86, subRecipeId: 'sub-molho-bolonhesa', subRecipeNome: 'Molho Bolonhesa Especial (Patinho)' },
      { id: 'ing-l3', nome: 'Molho Bechamel Artesanal c/ Noz Moscada', unidade: 'ml', quantidade: 120, custoUnitario: 0.01625, custoTotal: 1.95, subRecipeId: 'sub-molho-branco', subRecipeNome: 'Molho Branco Artesanal (Bechamel)' },
      { id: 'ing-l4', nome: 'Queijo Mussarela Fatiado', unidade: 'g', quantidade: 80, custoUnitario: 0.0355, custoTotal: 2.84 },
      { id: 'ing-l5', nome: 'Queijo Parmesão Ralado Especial', unidade: 'g', quantidade: 15, custoUnitario: 0.080, custoTotal: 1.20 },
    ],
    embalagens: [
      { id: 'emb-l1', nome: 'Marmita Forno de Alumínio c/ Tampa 650g', quantidade: 1, custoUnitario: 1.90, custoTotal: 1.90 },
      { id: 'emb-l2', nome: 'Saco Kraft Reforçado c/ Fundo Largo', quantidade: 1, custoUnitario: 0.85, custoTotal: 0.85 },
      { id: 'emb-l3', nome: 'Lacre de Segurança inviolável', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
      { id: 'emb-l4', nome: 'Kit Talher Reforçado c/ Guardanapo', quantidade: 1, custoUnitario: 0.45, custoTotal: 0.45 },
    ],
    custoInsumos: 13.25,
    custoEmbalagens: 3.30,
    custoTotal: 16.55,
    precoVenda: 46.90,
    cmvTeoricoPercent: 0.3529,
    taxaCanalPercent: 0.28,
    impostoSimplesPercent: 0.05,
    margemContribuicaoReais: 14.87,
    margemContribuicaoPercent: 0.317,
    pesoFinalGramas: 515,
    tempoPreparoMinutos: 12,
    utensiliosPadrao: [
      'Forno Turbo Combinado / Salamandra (200°C)',
      'Concha Medidora Graduada',
      'Espátula Angular de Confeiteiro/Lasanha',
      'Balança Digital de Porcionamento'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Montagem das Camadas',
        descricao: 'Dispor fina camada de bechamel no fundo da marmita de alumínio. Alternar 3 camadas: massa, bolonhesa, mussarela e bechamel.',
        tempoMinutos: 4
      },
      {
        passo: 2,
        titulo: 'Cobertura e Parmesão',
        descricao: 'Cobrir com a última camada de mussarela e finalizar com os 15g de parmesão ralado espalhado uniformemente.',
        alertaPonto: 'Garantir que as bordas da massa estejam cobertas de molho para não ressecar no forno.',
        tempoMinutos: 1
      },
      {
        passo: 3,
        titulo: 'Gratinamento no Forno',
        descricao: 'Levar ao forno a 200°C por 7 minutos até borbulhar e a crosta de queijo ficar dourada e gratinada.',
        alertaPonto: 'Temperatura interna mínima de 75°C no centro da lasanha.',
        tempoMinutos: 7
      },
      {
        passo: 4,
        titulo: 'Fechamento e Expedição Delivery',
        descricao: 'Aguardar 1 minuto para estabilizar, tampar com a tampa de papel cartão laminado, prensar as bordas de alumínio e colocar no saco kraft lacrado.',
        tempoMinutos: 1
      }
    ],
    observacoesCozinha: 'O descanso de 1 minuto antes de tampar evita excesso de condensação na tampa.',
    historicoInflacao: [
      { mes: 'Nov/2025', custoTotal: 15.40, precoVenda: 44.90, cmvPercent: 34.29, motivoVariacao: 'Preço da carne bovina patinho estável', itemPrincipalImpactado: 'Patinho Bovina' },
      { mes: 'Dez/2025', custoTotal: 16.10, precoVenda: 44.90, cmvPercent: 35.85, motivoVariacao: 'Pressão no preço da embalagem de alumínio e mussarela', itemPrincipalImpactado: 'Marmita Alumínio' },
      { mes: 'Jan/2026', custoTotal: 16.55, precoVenda: 46.90, cmvPercent: 35.29, motivoVariacao: 'Reajuste no preço de venda preservou margem líquida acima de R$ 14,80', itemPrincipalImpactado: 'Ajuste de Tabela' }
    ],
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sheet-parmegiana-frango-balcao',
    nome: 'Parmegiana de Frango Crocante (Balcão)',
    canal: 'BALCAO',
    categoria: 'PARMEGIANAS',
    descricao: 'Filé de peito empanado na farinha panko artesanal, coberto com molho sugo de tomates italianos, queijo mussarela derretido, acompanhado de arroz e batata frita.',
    ingredientes: [
      { id: 'ing-p1', nome: 'Filé de Frango Empanado (In Natura)', unidade: 'g', quantidade: 160, custoUnitario: 0.030, custoTotal: 4.80 },
      { id: 'ing-p2', nome: 'Molho de Tomate Sugo Artesanal', unidade: 'ml', quantidade: 130, custoUnitario: 0.015, custoTotal: 1.95 },
      { id: 'ing-p3', nome: 'Queijo Mussarela Fatiado', unidade: 'g', quantidade: 60, custoUnitario: 0.0355, custoTotal: 2.13 },
      { id: 'ing-p4', nome: 'Arroz Branco Cozido', unidade: 'g', quantidade: 140, custoUnitario: 0.0068, custoTotal: 0.95 },
      { id: 'ing-p5', nome: 'Batata Pré-Frita Palito 9mm', unidade: 'g', quantidade: 120, custoUnitario: 0.015, custoTotal: 1.80 },
      { id: 'ing-p6', nome: 'Óleo Vegetal (Absorção Fritura)', unidade: 'ml', quantidade: 25, custoUnitario: 0.014, custoTotal: 0.35 },
    ],
    embalagens: [
      { id: 'emb-p1', nome: 'Papel Bandeja Prato Personalizado', quantidade: 1, custoUnitario: 0.22, custoTotal: 0.22 },
      { id: 'emb-p2', nome: 'Guardanapo Sachê Reforçado', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
      { id: 'emb-p3', nome: 'Sachê Maionese da Casa', quantidade: 1, custoUnitario: 0.35, custoTotal: 0.35 },
    ],
    custoInsumos: 11.98,
    custoEmbalagens: 0.67,
    custoTotal: 12.65,
    precoVenda: 34.90,
    cmvTeoricoPercent: 0.3625,
    taxaCanalPercent: 0.07,
    impostoSimplesPercent: 0.05,
    margemContribuicaoReais: 18.06,
    margemContribuicaoPercent: 0.517,
    pesoFinalGramas: 480,
    tempoPreparoMinutos: 9,
    utensiliosPadrao: [
      'Fritadeira Elétrica Zona Fria (180°C)',
      'Salamandra / Forno Gratinador',
      'Escumadeira Inox Perfurada',
      'Boleador / Aro de Arroz Padrão'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Fritura do Filé e Batatas',
        descricao: 'Mergulhar o filé empanado e as batatas no óleo a 180°C por 4 minutos até coloração dourada e crocância máxima.',
        alertaPonto: 'Escorrer por 30 segundos no suporte perfurado para eliminar óleo residual.',
        tempoMinutos: 4
      },
      {
        passo: 2,
        titulo: 'Gratinamento do Frango',
        descricao: 'Acomodar o filé na travessa, cobrir com 130ml de molho de tomate quente e 60g de mussarela. Levar à salamandra por 2 minutos até derreter.',
        tempoMinutos: 2
      },
      {
        passo: 3,
        titulo: 'Empratamento Padrão de Loja',
        descricao: 'Moldar 140g de arroz no aro à esquerda, posicionar a parmegiana no centro e guarnecer com as batatas crocantes à direita.',
        alertaPonto: 'Não colocar as batatas embaixo do molho para não murchar.',
        tempoMinutos: 2
      },
      {
        passo: 4,
        titulo: 'Serviço Balcão',
        descricao: 'Limpar a borda do prato, colocar na bandeja com papel bandeja, guardanapo e sachê.',
        tempoMinutos: 1
      }
    ],
    observacoesCozinha: 'Monitorar temperatura do óleo com termômetro calibrado a cada troca de turno.',
    historicoInflacao: [
      { mes: 'Nov/2025', custoTotal: 11.90, precoVenda: 33.90, cmvPercent: 35.10, motivoVariacao: 'Cotação normal de aves e óleo vegetal', itemPrincipalImpactado: 'Filé de Frango' },
      { mes: 'Dez/2025', custoTotal: 12.35, precoVenda: 33.90, cmvPercent: 36.43, motivoVariacao: 'Oscilação no óleo de fritura e batata palito', itemPrincipalImpactado: 'Óleo Vegetal' },
      { mes: 'Jan/2026', custoTotal: 12.65, precoVenda: 34.90, cmvPercent: 36.25, motivoVariacao: 'Repasse de R$ 1,00 absorveu novos custos de energia e panko', itemPrincipalImpactado: 'Mussarela e Panko' }
    ],
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sheet-parmegiana-carne-ifood',
    nome: 'Parmegiana de Alcatra Bovina (iFood)',
    canal: 'IFOOD',
    categoria: 'PARMEGIANAS',
    descricao: 'Filé de alcatra selecionada empanado à milanesa, molho pelati rústico, generosa camada de mussarela gratinada, arroz branco e batata rústica.',
    ingredientes: [
      { id: 'ing-pc1', nome: 'Filé de Alcatra Bovina Limpa', unidade: 'g', quantidade: 160, custoUnitario: 0.0525, custoTotal: 8.40 },
      { id: 'ing-pc2', nome: 'Molho de Tomate Pelati Rústico', unidade: 'ml', quantidade: 150, custoUnitario: 0.015, custoTotal: 2.25 },
      { id: 'ing-pc3', nome: 'Queijo Mussarela Especial', unidade: 'g', quantidade: 70, custoUnitario: 0.0355, custoTotal: 2.48 },
      { id: 'ing-pc4', nome: 'Arroz Branco Cozido Soltinho', unidade: 'g', quantidade: 140, custoUnitario: 0.0068, custoTotal: 0.95 },
      { id: 'ing-pc5', nome: 'Batata Rústica c/ Alecrim Pré-Frita', unidade: 'g', quantidade: 120, custoUnitario: 0.015, custoTotal: 1.80 },
    ],
    embalagens: [
      { id: 'emb-pc1', nome: 'Embalagem Bipartida Térmica Anti-Vazamento', quantidade: 1, custoUnitario: 2.80, custoTotal: 2.80 },
      { id: 'emb-pc2', nome: 'Saco Kraft Delivery Premium c/ Fundo Largo', quantidade: 1, custoUnitario: 0.95, custoTotal: 0.95 },
      { id: 'emb-pc3', nome: 'Lacre de Segurança inviolável', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
      { id: 'emb-pc4', nome: 'Envelope de Batata Frita c/ Respiro', quantidade: 1, custoUnitario: 0.40, custoTotal: 0.40 },
    ],
    custoInsumos: 15.88,
    custoEmbalagens: 4.25,
    custoTotal: 20.13,
    precoVenda: 52.90,
    cmvTeoricoPercent: 0.3805,
    taxaCanalPercent: 0.28,
    impostoSimplesPercent: 0.05,
    margemContribuicaoReais: 15.31,
    margemContribuicaoPercent: 0.289,
    pesoFinalGramas: 510,
    tempoPreparoMinutos: 11,
    utensiliosPadrao: [
      'Balança Digital de Precisão',
      'Fritadeira Industrial 180°C',
      'Forno Gratinador de Bancada',
      'Pegador de Silicone p/ Não Danificar Empanado'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Fritura da Alcatra',
        descricao: 'Fritar o bife empanado a 180°C por 3 minutos e meio. Escorrer bem o óleo.',
        tempoMinutos: 4
      },
      {
        passo: 2,
        titulo: 'Molho e Gratinamento',
        descricao: 'Cobrir com os 150ml de molho pelati e 70g de queijo mussarela. Levar ao forno até o queijo fundir por completo e tostar as pontas.',
        tempoMinutos: 3
      },
      {
        passo: 3,
        titulo: 'Montagem na Embalagem Bipartida',
        descricao: 'Na cavidade maior acomodar a parmegiana suculenta com o arroz. As batatas rústicas devem ser colocadas no envelope com respiro para preservar a crocância na viagem.',
        alertaPonto: 'Nunca fechar a batata frita em embalagem hermética sem respiro para não murchar.',
        tempoMinutos: 2
      },
      {
        passo: 4,
        titulo: 'Conferência de Peso e Lacre',
        descricao: 'Verificar peso na balança (meta 510g), inserir no saco kraft e lacrar com carimbo de horário de expedição.',
        tempoMinutos: 2
      }
    ],
    observacoesCozinha: 'O envelope com respiro para a batata é obrigatório para manter a pontuação de qualidade no iFood.',
    historicoInflacao: [
      { mes: 'Nov/2025', custoTotal: 18.90, precoVenda: 49.90, cmvPercent: 37.87, motivoVariacao: 'Corte de alcatra com bom rendimento', itemPrincipalImpactado: 'Alcatra Bovina' },
      { mes: 'Dez/2025', custoTotal: 19.80, precoVenda: 49.90, cmvPercent: 39.67, motivoVariacao: 'Disparada sazonal da carne bovina no varejo (+10%)', itemPrincipalImpactado: 'Alcatra Bovina' },
      { mes: 'Jan/2026', custoTotal: 20.13, precoVenda: 52.90, cmvPercent: 38.05, motivoVariacao: 'Reajuste do cardápio para R$ 52,90 recuperou a margem em R$', itemPrincipalImpactado: 'Preço Venda' }
    ],
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sheet-lasanha-frango-balcao',
    nome: 'Lasanha de Frango c/ Catupiry (Balcão)',
    canal: 'BALCAO',
    categoria: 'LASANHAS',
    descricao: 'Massa artesanal intercalada com frango desfiado suculento, catupiry original, molho bechamel leve e cobertura gratinada.',
    ingredientes: [
      { id: 'ing-lf1', nome: 'Massa Fresca Laminada', unidade: 'g', quantidade: 110, custoUnitario: 0.020, custoTotal: 2.20, subRecipeId: 'sub-massa-fresca', subRecipeNome: 'Massa Fresca Laminada' },
      { id: 'ing-lf2', nome: 'Frango Desfiado Temperado', unidade: 'g', quantidade: 150, custoUnitario: 0.03085, custoTotal: 4.63, subRecipeId: 'sub-frango-desfiado', subRecipeNome: 'Frango Desfiado Temperado' },
      { id: 'ing-lf3', nome: 'Catupiry Original Cremoso', unidade: 'g', quantidade: 50, custoUnitario: 0.0535, custoTotal: 2.68 },
      { id: 'ing-lf4', nome: 'Molho Bechamel Artesanal', unidade: 'ml', quantidade: 100, custoUnitario: 0.0140, custoTotal: 1.40, subRecipeId: 'sub-molho-branco', subRecipeNome: 'Molho Branco Artesanal (Bechamel)' },
      { id: 'ing-lf5', nome: 'Mussarela Gratinada', unidade: 'g', quantidade: 50, custoUnitario: 0.0355, custoTotal: 1.78 },
    ],
    embalagens: [
      { id: 'emb-lf1', nome: 'Papel Bandeja Prato Personalizado', quantidade: 1, custoUnitario: 0.22, custoTotal: 0.22 },
      { id: 'emb-lf2', nome: 'Guardanapo Sachê (2 folhas)', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
      { id: 'emb-lf3', nome: 'Parmesão Sachê 5g', quantidade: 1, custoUnitario: 0.35, custoTotal: 0.35 },
    ],
    custoInsumos: 12.69,
    custoEmbalagens: 0.67,
    custoTotal: 13.36,
    precoVenda: 37.90,
    cmvTeoricoPercent: 0.3525,
    taxaCanalPercent: 0.07,
    impostoSimplesPercent: 0.05,
    margemContribuicaoReais: 19.99,
    margemContribuicaoPercent: 0.527,
    pesoFinalGramas: 470,
    tempoPreparoMinutos: 8,
    utensiliosPadrao: [
      'Forno Gratinador Salamandra',
      'Travessa Refratária Oval Individual',
      'Espátula Curva Inox',
      'Balança Digital'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Montagem na Travessa Refratária',
        descricao: 'Dispor a porção padrão de massa com recheio de frango e catupiry em camadas sobre a travessa aquecida.',
        tempoMinutos: 2
      },
      {
        passo: 2,
        titulo: 'Gratinamento',
        descricao: 'Levar à salamandra até o queijo dourar borbulhante e soltar aroma tostado.',
        tempoMinutos: 5
      },
      {
        passo: 3,
        titulo: 'Saída e Bandeja',
        descricao: 'Acomodar com cuidado sobre o prato de servir com papel bandeja e disponibilizar sachê de queijo ralado.',
        tempoMinutos: 1
      }
    ],
    observacoesCozinha: 'Usar luvas térmicas de silicone para manusear a travessa refratária quente.',
    historicoInflacao: [
      { mes: 'Nov/2025', custoTotal: 12.50, precoVenda: 36.90, cmvPercent: 33.87, motivoVariacao: 'Custos controlados de laticínios', itemPrincipalImpactado: 'Catupiry' },
      { mes: 'Dez/2025', custoTotal: 13.05, precoVenda: 36.90, cmvPercent: 35.36, motivoVariacao: 'Oscilação de final de ano nos queijos', itemPrincipalImpactado: 'Mussarela' },
      { mes: 'Jan/2026', custoTotal: 13.36, precoVenda: 37.90, cmvPercent: 35.25, motivoVariacao: 'Manutenção de margem líquida superior a 52%', itemPrincipalImpactado: 'Ajuste Geral' }
    ],
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sheet-wrap-carne-sol-ifood',
    nome: 'Wrap de Carne de Sol (iFood)',
    canal: 'IFOOD',
    categoria: 'WRAPS',
    descricao: 'Versão delivery do wrap consagrado, com embalagem envelope térmica que preserva crocância e calor durante a viagem do motoboy.',
    ingredientes: [
      { id: 'ing-wi1', nome: 'Tortilla p/ Wrap 25cm Tradicional', unidade: 'un', quantidade: 1, custoUnitario: 1.12, custoTotal: 1.12 },
      { id: 'ing-wi2', nome: 'Queijo Coalho Grelhado em Cubos', unidade: 'g', quantidade: 60, custoUnitario: 0.0328, custoTotal: 1.97 },
      { id: 'ing-wi3', nome: 'Carne de Sol Desfiada na Manteiga', unidade: 'g', quantidade: 60, custoUnitario: 0.0606, custoTotal: 3.64, subRecipeId: 'sub-carne-sol', subRecipeNome: 'Carne de Sol Desfiada na Manteiga' },
      { id: 'ing-wi4', nome: 'Requeijão Cremoso tipo Catupiry', unidade: 'g', quantidade: 20, custoUnitario: 0.0535, custoTotal: 1.07 },
    ],
    embalagens: [
      { id: 'emb-wi1', nome: 'Envelope Térmico Barreira de Gordura', quantidade: 1, custoUnitario: 0.75, custoTotal: 0.75 },
      { id: 'emb-wi2', nome: 'Saco Kraft Delivery Médio', quantidade: 1, custoUnitario: 0.60, custoTotal: 0.60 },
      { id: 'emb-wi3', nome: 'Lacre de Segurança Adesivo', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
      { id: 'emb-wi4', nome: 'Ketchup Sachê Premium 7g', quantidade: 2, custoUnitario: 0.27, custoTotal: 0.54 },
      { id: 'emb-wi5', nome: 'Guardanapo Sachê Reforçado', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
    ],
    custoInsumos: 7.80,
    custoEmbalagens: 2.09,
    custoTotal: 9.89,
    precoVenda: 32.90,
    cmvTeoricoPercent: 0.3006,
    taxaCanalPercent: 0.28,
    impostoSimplesPercent: 0.05,
    margemContribuicaoReais: 12.15,
    margemContribuicaoPercent: 0.369,
    pesoFinalGramas: 220,
    tempoPreparoMinutos: 6,
    utensiliosPadrao: [
      'Prensa Elétrica Grill 180°C',
      'Balança Digital de Precisão',
      'Espátula de Inox',
      'Dosador de Catupiry'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Pesar e Grelhar Recheio',
        descricao: 'Saltear 60g de carne de sol e 60g de coalho na chapa bem aquecida.',
        tempoMinutos: 2
      },
      {
        passo: 2,
        titulo: 'Montagem e Prensagem',
        descricao: 'Distribuir catupiry e recheio na tortilla, enrolar bem fechado e prensar até dourar.',
        tempoMinutos: 2
      },
      {
        passo: 3,
        titulo: 'Corte e Envelope Térmico',
        descricao: 'Cortar em diagonal e acomodar imediatamente no envelope térmico que retém a temperatura sem umedecer a massa.',
        tempoMinutos: 1
      },
      {
        passo: 4,
        titulo: 'Embalagem de Entrega',
        descricao: 'Inserir os sachês no fundo do saco kraft, acomodar o wrap na vertical e selar com lacre de segurança.',
        tempoMinutos: 1
      }
    ],
    observacoesCozinha: 'O envelope térmico evita que o queijo endureça durante o trajeto da entrega.',
    historicoInflacao: [
      { mes: 'Nov/2025', custoTotal: 9.30, precoVenda: 31.90, cmvPercent: 0.2915, motivoVariacao: 'Boa margem de início de trimestre', itemPrincipalImpactado: 'Tortilla' },
      { mes: 'Dez/2025', custoTotal: 9.65, precoVenda: 31.90, cmvPercent: 0.3025, motivoVariacao: 'Alta no envelope térmico e coalho', itemPrincipalImpactado: 'Envelope Térmico' },
      { mes: 'Jan/2026', custoTotal: 9.89, precoVenda: 32.90, cmvPercent: 0.3006, motivoVariacao: 'Ajuste de R$ 1,00 preservou CMV em patamar excelente de 30%', itemPrincipalImpactado: 'Equilíbrio Canal' }
    ],
    ultimaAtualizacao: '2026-10-26'
  },
  {
    id: 'sheet-spaghetti-frango-balcao',
    nome: 'Spaghetti c/ Frango Desfiado (Balcão)',
    canal: 'BALCAO',
    categoria: 'MASSAS',
    descricao: 'Porção servida no prato tradicional do restaurante com apresentação impecável e queijo derretido.',
    ingredientes: [
      { id: 'ing-sb1', nome: 'Spaghetti Grano Duro Cozido', unidade: 'g', quantidade: 90, custoUnitario: 0.01911, custoTotal: 1.72 },
      { id: 'ing-sb2', nome: 'Frango Desfiado Temperado', unidade: 'g', quantidade: 70, custoUnitario: 0.03085, custoTotal: 2.16, subRecipeId: 'sub-frango-desfiado', subRecipeNome: 'Frango Desfiado Temperado' },
      { id: 'ing-sb3', nome: 'Molho Branco Artesanal (Bechamel)', unidade: 'ml', quantidade: 200, custoUnitario: 0.0140, custoTotal: 2.80, subRecipeId: 'sub-molho-branco', subRecipeNome: 'Molho Branco Artesanal (Bechamel)' },
      { id: 'ing-sb4', nome: 'Queijo Mussarela Ralado', unidade: 'g', quantidade: 40, custoUnitario: 0.0355, custoTotal: 1.42 },
      { id: 'ing-sb5', nome: 'Azeite de Oliva Extra Virgem', unidade: 'ml', quantidade: 10, custoUnitario: 0.0460, custoTotal: 0.46 },
      { id: 'ing-sb6', nome: 'Manjericão Fresco', unidade: 'g', quantidade: 2, custoUnitario: 0.010, custoTotal: 0.02 },
      { id: 'ing-sb7', nome: 'Orégano Desidratado', unidade: 'g', quantidade: 1, custoUnitario: 0.030, custoTotal: 0.03 },
      { id: 'ing-sb8', nome: 'Sal Temperado Especial', unidade: 'g', quantidade: 2, custoUnitario: 0.005, custoTotal: 0.01 },
    ],
    embalagens: [
      { id: 'emb-sb1', nome: 'Papel Bandeja Prato Personalizado', quantidade: 1, custoUnitario: 0.22, custoTotal: 0.22 },
      { id: 'emb-sb2', nome: 'Guardanapo Sachê (2 folhas)', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
      { id: 'emb-sb3', nome: 'Queijo Parmesão Sachê 5g', quantidade: 1, custoUnitario: 0.35, custoTotal: 0.35 },
    ],
    custoInsumos: 8.62,
    custoEmbalagens: 0.67,
    custoTotal: 9.29,
    precoVenda: 29.90,
    cmvTeoricoPercent: 0.3107,
    taxaCanalPercent: 0.07,
    impostoSimplesPercent: 0.05,
    margemContribuicaoReais: 17.02,
    margemContribuicaoPercent: 0.569,
    pesoFinalGramas: 410,
    tempoPreparoMinutos: 7,
    utensiliosPadrao: [
      'Frigideira Salteadora 24cm',
      'Pegador Inox 25cm',
      'Concha Dosadora nº 20',
      'Prato Fundo de Porcelana Padrão Loja'
    ],
    passosPreparo: [
      {
        passo: 1,
        titulo: 'Preparo da Frigideira e Frango',
        descricao: 'Refogar 70g de frango com 10ml de azeite e ervas.',
        tempoMinutos: 2
      },
      {
        passo: 2,
        titulo: 'Molho e Incorporação da Massa',
        descricao: 'Verter 200ml de molho branco, juntar 90g de massa e saltear vigorosamente com os 40g de queijo mussarela.',
        tempoMinutos: 3
      },
      {
        passo: 3,
        titulo: 'Empratamento e Saída Balcão',
        descricao: 'Girar o espaguete no pegador formando ninho central no prato aquecido, regar com o restante do molho e guarnecer com folhinha de manjericão fresco.',
        alertaPonto: 'Limpar a borda da porcelana antes de entregar ao atendente.',
        tempoMinutos: 2
      }
    ],
    observacoesCozinha: 'Folhas de manjericão devem estar frescas e verdes, nunca escuras.',
    historicoInflacao: [
      { mes: 'Nov/2025', custoTotal: 8.75, precoVenda: 28.90, cmvPercent: 30.27, motivoVariacao: 'Custos estáveis', itemPrincipalImpactado: 'Massa Grano Duro' },
      { mes: 'Dez/2025', custoTotal: 9.05, precoVenda: 28.90, cmvPercent: 31.31, motivoVariacao: 'Oscilação do queijo mussarela no mês de festas', itemPrincipalImpactado: 'Queijo Mussarela' },
      { mes: 'Jan/2026', custoTotal: 9.29, precoVenda: 29.90, cmvPercent: 31.07, motivoVariacao: 'Ajuste de R$ 1,00 manteve margem de 56,9%', itemPrincipalImpactado: 'Reajuste Cardápio' }
    ],
    ultimaAtualizacao: '2026-10-26'
  }
];
