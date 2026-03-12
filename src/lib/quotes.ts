export interface Quote {
  text: string;
  author?: string;
}

export const QUOTES: Quote[] = [
  { text: 'O dinheiro é um bom servo, mas um mau mestre.', author: 'Francis Bacon' },
  { text: 'Não economize o que sobra após gastar; gaste o que sobra após economizar.', author: 'Warren Buffett' },
  { text: 'A riqueza não consiste em ter grandes posses, mas em ter poucas necessidades.', author: 'Epicteto' },
  { text: 'Invista em você mesmo. Seu carisma é seu melhor ativo.', author: 'Jim Rohn' },
  { text: 'O hábito de economizar é em si uma educação.', author: 'T. T. Munger' },
  { text: 'Não trabalhe pelo dinheiro; faça o dinheiro trabalhar por você.', author: 'Robert Kiyosaki' },
  { text: 'A melhor hora para plantar uma árvore foi há 20 anos. A segunda melhor é agora.', author: 'Provérbio chinês' },
  { text: 'Gastar menos do que ganha é o início de toda virtude financeira.', author: 'Samuel Johnson' },
  { text: 'O orçamento não é uma restrição, é um plano de liberdade.', author: 'Dave Ramsey' },
  { text: 'Pequenas economias diárias se transformam em grandes fortunas.', author: 'Ricardo Bellino' },
  { text: 'O investimento em conhecimento paga os melhores juros.', author: 'Benjamin Franklin' },
  { text: 'Controle seus gastos ou eles controlarão você.', author: 'Dave Ramsey' },
  { text: 'A disciplina financeira é a chave para a liberdade.', author: 'Desconhecido' },
  { text: 'Não poupe o que sobra; gaste o que sobra após poupar.', author: 'George S. Clason' },
  { text: 'Cada real economizado hoje é um real investido no seu futuro.', author: 'Desconhecido' },
  { text: 'A riqueza vem de pequenos hábitos repetidos diariamente.', author: 'Charles Duhigg' },
  { text: 'Pague-se primeiro: antes de gastar, reserve para suas metas.', author: 'George S. Clason' },
  { text: 'O dinheiro é uma ferramenta. Use-a com sabedoria.', author: 'Desconhecido' },
  { text: 'Não compare o que você tem com o que os outros têm.', author: 'Desconhecido' },
  { text: 'A melhor hora para começar a investir foi ontem. A segunda é hoje.', author: 'Desconhecido' },
  { text: 'Metas claras geram resultados claros.', author: 'Brian Tracy' },
  { text: 'O sucesso financeiro é 80% comportamento e 20% conhecimento.', author: 'Dave Ramsey' },
  { text: 'Poupar é ganhar com juros compostos.', author: 'Albert Einstein' },
  { text: 'Não espere o momento perfeito; comece agora.', author: 'Desconhecido' },
  { text: 'Cada decisão financeira importa. Escolha com consciência.', author: 'Desconhecido' },
  { text: 'A liberdade financeira começa com a liberdade de escolha.', author: 'Desconhecido' },
  { text: 'Invista tempo em planejar; economize tempo em corrigir.', author: 'Desconhecido' },
  { text: 'O hábito de economizar é em si uma educação.', author: 'T. T. Munger' },
  { text: 'Seu futuro financeiro é construído hoje.', author: 'Desconhecido' },
];

export function getQuoteOfDay(): Quote {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const index = dayOfYear % QUOTES.length;
  return QUOTES[index];
}

export function getRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

const FRASES_ECONOMIA = [
  'Cada real economizado hoje é um passo em direção à sua meta!',
  'Parabéns! Você está construindo seu futuro financeiro.',
  'Pequenos passos levam a grandes conquistas.',
  'Continue assim! A disciplina faz a diferença.',
];

const FRASES_META_ATINGIDA = [
  'Meta atingida! Você é incrível!',
  'Parabéns! Mais uma conquista no bolso.',
  'Celebre essa vitória! Você merece.',
];

export function getFraseEconomia(): string {
  return FRASES_ECONOMIA[Math.floor(Math.random() * FRASES_ECONOMIA.length)];
}

export function getFraseMetaAtingida(): string {
  return FRASES_META_ATINGIDA[Math.floor(Math.random() * FRASES_META_ATINGIDA.length)];
}
