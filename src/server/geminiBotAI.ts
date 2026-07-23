import { sanitizeChatMessage } from './chatFilter';

export type BotWorldAction =
  | 'DO_TASK'
  | 'GO_ROOM'
  | 'FOLLOW_PLAYER'
  | 'HUNT_PLAYER'
  | 'FIX_SABOTAGE'
  | 'REPORT_BODY'
  | 'SABOTAGE'
  | 'WAIT';

export interface BotActionDecision {
  action: BotWorldAction;
  target: string;
  sabotageType: 'LIGHTS' | 'REACTOR' | 'O2' | 'NONE';
}

export interface BotVoteDecision {
  targetId: string;
  confidence: number;
  message: string;
}

export interface BotAIProvider {
  readonly configured: boolean;
  createChat(worldContext: string, requestedReaction?: string): Promise<string | null>;
  chooseVote(worldContext: string, eligibleTargetIds: string[]): Promise<BotVoteDecision | null>;
  chooseAction(worldContext: string, validTargets: string[]): Promise<BotActionDecision | null>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export class GeminiBotAI implements BotAIProvider {
  public readonly configured: boolean;

  private readonly apiKey: string;
  private readonly model: string;
  private lastWarningAt = 0;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
    this.apiKey = apiKey;
    this.configured = Boolean(apiKey && !apiKey.startsWith('your_'));
    this.model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
  }

  public async createChat(worldContext: string, requestedReaction?: string): Promise<string | null> {
    if (!this.configured) return null;

    const prompt = `Você controla um jogador autônomo em um jogo brasileiro de dedução social.
Escreva exatamente como uma pessoa real no chat: natural, curta, coerente com os fatos e com sua função secreta.
Não use prefixo, nome do personagem, aspas, JSON visível, narração ou texto de sistema.
Não invente ter visto eventos ausentes do contexto. Jogador assassino deve mentir de modo plausível sem confessar.
Você pode ficar em silêncio quando não houver algo útil.
${requestedReaction ? `Reação obrigatória: ${requestedReaction} Neste caso, speak deve ser true.` : ''}

ESTADO CONFIÁVEL DO JOGO:
${worldContext}

Retorne a decisão de fala.`;

    const result = await this.request<{ speak: boolean; message: string }>(prompt, {
      type: 'object',
      properties: {
        speak: { type: 'boolean' },
        message: {
          type: 'string',
          description: 'Mensagem natural em português brasileiro, com no máximo 140 caracteres; vazia se não falar.'
        }
      },
      required: ['speak', 'message']
    }, 0.9);

    if (!result || (!result.speak && !requestedReaction)) return null;
    return sanitizeChatMessage(result.message);
  }

  public async chooseVote(worldContext: string, eligibleTargetIds: string[]): Promise<BotVoteDecision | null> {
    if (!this.configured || eligibleTargetIds.length === 0) return null;

    const prompt = `Você decide e anuncia o voto de um jogador autônomo em um jogo brasileiro de dedução social.
Leia a conversa completa e a análise estruturada fornecida. Avalie:
- quem acusou quem e qual argumento foi apresentado;
- se há observação verificável, contradição, mudança de versão ou apenas pressão sem prova;
- certeza, hesitação, agressividade e tentativa de desviar o assunto no modo de falar;
- histórico de acusações erradas: acusadores que expulsaram inocentes merecem desconfiança futura.
Não siga a maioria automaticamente e não trate uma acusação sem argumento como prova.
Use somente fatos, memória e conversa fornecidos. Preserve sua função secreta.
Se for assassino, tente sobreviver e proteger aliados sem agir de forma obviamente artificial.
Escolha exatamente um dos IDs permitidos. SKIP significa pular quando não houver base suficiente.
A mensagem deve parecer uma fala curta e natural no chat explicando o voto, sem prefixo, JSON ou narração.

ESTADO CONFIÁVEL DO JOGO:
${worldContext}

IDs PERMITIDOS: ${eligibleTargetIds.join(', ')}`;

    const result = await this.request<BotVoteDecision>(prompt, {
      type: 'object',
      properties: {
        targetId: {
          type: 'string',
          enum: eligibleTargetIds,
          description: 'ID exato do jogador escolhido ou SKIP.'
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Confiança no voto, entre 0 e 1.'
        },
        message: {
          type: 'string',
          description: 'Uma frase natural em português brasileiro, com no máximo 140 caracteres, justificando o voto ou a dúvida.'
        },
      },
      required: ['targetId', 'confidence', 'message']
    }, 0.35);

    if (!result || !eligibleTargetIds.includes(result.targetId)) return null;
    return {
      targetId: result.targetId,
      confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0)),
      message: sanitizeChatMessage(result.message) ?? ''
    };
  }

  public async chooseAction(worldContext: string, validTargets: string[]): Promise<BotActionDecision | null> {
    if (!this.configured) return null;

    const prompt = `Você controla a estratégia de um personagem em tempo real num jogo de dedução social.
Escolha uma ação de alto nível coerente com a função secreta e o estado do mapa.
O motor do jogo executará movimento, colisão, alcance e recargas; nunca tente alterar coordenadas.
Tripulante deve fazer tarefas, investigar, reportar corpos e consertar sabotagens.
Assassino deve se misturar, perseguir oportunidades, sabotar e usar HUNT_PLAYER quando quiser tentar matar.
Use target="" para WAIT. Para GO_ROOM use o ID da sala; para jogadores/corpos/tarefas use o ID correspondente.

ESTADO CONFIÁVEL DO JOGO:
${worldContext}

ALVOS VÁLIDOS: ${validTargets.join(', ') || '(nenhum)'}`;

    const result = await this.request<BotActionDecision>(prompt, {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['DO_TASK', 'GO_ROOM', 'FOLLOW_PLAYER', 'HUNT_PLAYER', 'FIX_SABOTAGE', 'REPORT_BODY', 'SABOTAGE', 'WAIT']
        },
        target: {
          type: 'string',
          description: 'Um alvo da lista de alvos válidos, ou string vazia para WAIT/SABOTAGE.'
        },
        sabotageType: {
          type: 'string',
          enum: ['LIGHTS', 'REACTOR', 'O2', 'NONE']
        }
      },
      required: ['action', 'target', 'sabotageType']
    }, 0.55);

    if (!result) return null;
    if (result.target && !validTargets.includes(result.target)) return null;
    return result;
  }

  private async request<T>(
    prompt: string,
    responseSchema: Record<string, unknown>,
    temperature: number
  ): Promise<T | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const usesGemini3Config = /^gemini-3[.-]/.test(this.model);
      const generationConfig = usesGemini3Config
        ? {
          maxOutputTokens: 256,
          responseFormat: {
            text: {
              mimeType: 'APPLICATION_JSON',
              schema: responseSchema
            }
          },
          thinkingConfig: { thinkingLevel: 'minimal' }
        }
        : {
          temperature,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
          responseJsonSchema: responseSchema,
          thinkingConfig: { thinkingBudget: 0 }
        };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
          }),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        const errorBody = (await response.text()).slice(0, 300).replace(/\s+/g, ' ');
        this.warn(`Gemini respondeu HTTP ${response.status}: ${errorBody}`);
        return null;
      }

      const payload = await response.json() as GeminiResponse;
      const rawText = payload.candidates?.[0]?.content?.parts
        ?.map(part => part.text ?? '')
        .join('')
        .trim();
      if (!rawText) return null;

      const json = rawText
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '');
      return JSON.parse(json) as T;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'erro desconhecido';
      this.warn(`Falha ao consultar Gemini: ${detail}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private warn(message: string): void {
    const now = Date.now();
    if (now - this.lastWarningAt < 30_000) return;
    this.lastWarningAt = now;
    console.warn(`[Bot AI] ${message}`);
  }
}
