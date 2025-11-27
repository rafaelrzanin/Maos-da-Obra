
// Standard Libraries for Construction Management

export interface PhaseCategory {
  category: string;
  steps: string[];
}

export const STANDARD_PHASES: PhaseCategory[] = [
  {
    category: 'Preparação do terreno',
    steps: [
      'Levantamento topográfico',
      'Limpeza do terreno',
      'Terraplenagem',
      'Locação da obra',
      'Montagem do canteiro'
    ]
  },
  {
    category: 'Fundações',
    steps: [
      'Escavação',
      'Sapatas / baldrames / radier',
      'Armadura e formas',
      'Concretagem',
      'Impermeabilização'
    ]
  },
  {
    category: 'Estrutura',
    steps: [
      'Pilares',
      'Vigas',
      'Lajes',
      'Escadas estruturais'
    ]
  },
  {
    category: 'Alvenaria de vedação',
    steps: [
      'Paredes externas',
      'Paredes internas',
      'Vergas e contravergas',
      'Chumbamento'
    ]
  },
  {
    category: 'Cobertura',
    steps: [
      'Estrutura',
      'Telhamento',
      'Rufos e cumeeiras',
      'Calhas'
    ]
  },
  {
    category: 'Instalações Hidráulicas',
    steps: [
      'Água fria',
      'Água quente',
      'Esgoto',
      'Pluvial',
      'Caixa d’água'
    ]
  },
  {
    category: 'Instalações Elétricas',
    steps: [
      'Entrada',
      'Quadro',
      'Circuitos',
      'Iluminação',
      'Tomadas',
      'Pontos especiais',
      'Dados/TV/internet'
    ]
  },
  {
    category: 'Revestimentos',
    steps: [
      'Paredes internas',
      'Áreas molhadas',
      'Contrapiso',
      'Piso interno',
      'Piso externo',
      'Forros'
    ]
  },
  {
    category: 'Pintura',
    steps: [
      'Preparo',
      'Pintura interna',
      'Pintura externa',
      'Esquadrias / metais'
    ]
  },
  {
    category: 'Louças',
    steps: [
      'Vasos sanitários',
      'Cubas',
      'Tanques',
      'Acessórios'
    ]
  },
  {
    category: 'Metais',
    steps: [
      'Torneiras',
      'Misturadores',
      'Ducha higiênica',
      'Chuveiro',
      'Válvulas',
      'Ralos'
    ]
  },
  {
    category: 'Esquadrias',
    steps: [
      'Portas internas',
      'Portas externas',
      'Janelas',
      'Vidros',
      'Ferragens'
    ]
  },
  {
    category: 'Acabamentos finais',
    steps: [
      'Rodapés / guarnições',
      'Soleiras / peitoris',
      'Acessórios',
      'Box / espelhos',
      'Limpeza final'
    ]
  }
];

export interface MaterialCatalog {
  [category: string]: {
    [subcategory: string]: string[];
  };
}

export const STANDARD_MATERIAL_CATALOG: MaterialCatalog = {
  'Estrutura': {
    'Concreto': [
      'Cimento CP-II',
      'Areia média',
      'Brita 1',
      'Brita 2',
      'Aditivo plastificante'
    ],
    'Armadura': [
      'Aço CA50 8mm',
      'Aço CA50 10mm',
      'Aço CA50 12.5mm',
      'Vergalhão 5mm',
      'Arame recozido',
      'Espaçador plástico'
    ]
  },
  'Alvenaria': {
    'Blocos': [
      'Bloco cerâmico 9x19x19',
      'Bloco cerâmico 11.5x19x19',
      'Bloco de concreto 14x19x39',
      'Tijolo maciço'
    ],
    'Argamassa': [
        'Argamassa Assentamento',
        'Cal Hidratada',
        'Areia fina'
    ]
  },
  'Hidráulica': {
    'Água Fria': [
      'Tubo PVC 25mm',
      'Tubo PVC 32mm',
      'Joelho 25mm',
      'Registro de pressão',
      'Adesivo PVC'
    ],
    'Esgoto': [
      'Tubo esgoto 100mm',
      'Tubo esgoto 50mm',
      'Caixa sifonada',
      'Cola esgoto'
    ]
  },
  'Elétrica': {
    'Cabeamento': [
      'Cabo 1.5mm',
      'Cabo 2.5mm',
      'Cabo 4mm',
      'Conduíte 20mm',
      'Conduíte 25mm'
    ],
    'Aparelhagem': [
      'Tomada 10A',
      'Tomada 20A',
      'Interruptor simples',
      'Disjuntores',
      'Caixas 4x2 e 4x4'
    ]
  },
  'Acabamento': {
      'Pisos': ['Porcelanato', 'Cerâmica', 'Rejunte'],
      'Pintura': ['Tinta Acrílica', 'Massa Corrida', 'Selador']
  }
};
