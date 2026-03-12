import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function getModel() {
  if (!genAI) throw new Error('Chave da API Gemini não configurada. Adicione VITE_GEMINI_API_KEY no .env');
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

export interface InsightItem {
  type: 'alert' | 'opportunity' | 'achievement' | 'projection';
  title: string;
  description: string;
  impact?: string;
}

export interface ParsedTransaction {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

export interface ScenarioResult {
  summary: string;
  monthly_impact: number;
  yearly_impact: number;
  months_to_goal: number | null;
  recommendation: string;
}

export async function generateInsights(
  transactions: { type: string; amount: number; category: string; date: string }[],
  budgets: { category: string; limit: number; spent?: number }[],
  goals: { name: string; targetAmount: number; currentAmount: number; deadline: string }[]
): Promise<InsightItem[]> {
  try {
    const model = getModel();
    const prompt = `Você é um assistente financeiro. Com base nos dados abaixo, gere até 4 insights curtos em português, no formato JSON array. Cada item: { "type": "alert"|"opportunity"|"achievement"|"projection", "title": string, "description": string, "impact": string opcional }. Seja objetivo.

Transações (últimas): ${JSON.stringify(transactions.slice(0, 30))}
Orçamentos: ${JSON.stringify(budgets)}
Metas: ${JSON.stringify(goals)}

Responda APENAS com o array JSON, sem markdown.`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = text.replace(/```\w*\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(json) as InsightItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch (err) {
    if (err instanceof Error && err.message.includes('API')) throw err;
    throw new Error('Não foi possível gerar insights. Tente novamente mais tarde.');
  }
}

export async function parseAudioTransaction(transcript: string): Promise<ParsedTransaction> {
  try {
    const model = getModel();
    const prompt = `Extraia da fala em português os dados de uma transação financeira. Fale em valor em reais. Responda APENAS um JSON com: description (string), amount (number), type ("income" ou "expense"), category (string, ex: Alimentação, Transporte, Salário), date (string YYYY-MM-DD, use hoje se não mencionado).

Fala: "${transcript}"

Responda só o JSON, sem markdown.`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = text.replace(/```\w*\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(json) as ParsedTransaction;
    const today = new Date().toISOString().split('T')[0];
    return {
      description: parsed.description || 'Transação por voz',
      amount: Number(parsed.amount) || 0,
      type: parsed.type === 'income' ? 'income' : 'expense',
      category: parsed.category || 'Outros',
      date: parsed.date || today,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('API')) throw err;
    throw new Error('Não foi possível entender o áudio. Tente falar de forma clara: valor e descrição.');
  }
}

export async function generateChatResponse(
  userMessage: string,
  context: { monthlyIncome?: number; financialGoal?: string; recentSummary?: string }
): Promise<string> {
  try {
    const model = getModel();
    const prompt = `Você é um coach financeiro amigável. O usuário perguntou: "${userMessage}"

Contexto do usuário: Renda mensal R$ ${context.monthlyIncome ?? 0}, objetivo: ${context.financialGoal ?? 'não definido'}. ${context.recentSummary ?? ''}

Responda de forma breve, objetiva e motivadora em português. Máximo 3 parágrafos curtos. Não use markdown.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    if (err instanceof Error && err.message.includes('API')) throw err;
    throw new Error('Não foi possível processar. Tente novamente.');
  }
}

export async function simulateScenario(
  scenario: string,
  financialData: {
    monthlyIncome: number;
    monthlyExpenses: number;
    goals?: { name: string; targetAmount: number; currentAmount: number }[];
  }
): Promise<ScenarioResult> {
  try {
    const model = getModel();
    const prompt = `Simule o cenário financeiro descrito. Dados: renda mensal R$ ${financialData.monthlyIncome}, gastos mensais R$ ${financialData.monthlyExpenses}. Metas: ${JSON.stringify(financialData.goals || [])}.
Cenário: ${scenario}

Responda APENAS um JSON: { "summary": string, "monthly_impact": number (variação mensal em R$), "yearly_impact": number, "months_to_goal": number ou null, "recommendation": string }. Tudo em português.`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = text.replace(/```\w*\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(json) as ScenarioResult;
    return {
      summary: parsed.summary || 'Simulação concluída.',
      monthly_impact: Number(parsed.monthly_impact) ?? 0,
      yearly_impact: Number(parsed.yearly_impact) ?? 0,
      months_to_goal: parsed.months_to_goal != null ? Number(parsed.months_to_goal) : null,
      recommendation: parsed.recommendation || '',
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('API')) throw err;
    throw new Error('Não foi possível simular o cenário. Tente novamente.');
  }
}
