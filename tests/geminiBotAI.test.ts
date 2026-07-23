import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiBotAI } from '../src/server/geminiBotAI';

describe('Gemini bot integration', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  });

  it('requests and validates a structured movement decision', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                action: 'DO_TASK',
                target: 'task_1',
                sabotageType: 'NONE'
              })
            }]
          }
        }]
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    const ai = new GeminiBotAI();
    const decision = await ai.chooseAction('estado do jogo', ['task_1']);

    expect(decision).toEqual({
      action: 'DO_TASK',
      target: 'task_1',
      sabotageType: 'NONE'
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toContain('gemini-3.5-flash-lite');
    expect(request.headers['x-goog-api-key']).toBe('test-key');
    expect(JSON.parse(request.body).generationConfig.responseFormat.text.mimeType).toBe('APPLICATION_JSON');
    expect(JSON.parse(request.body).generationConfig.responseFormat.text.schema.type).toBe('object');
  });

  it('rejects a target that is not present in the authoritative game state', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                action: 'HUNT_PLAYER',
                target: 'invented-player',
                sabotageType: 'NONE'
              })
            }]
          }
        }]
      })
    }));

    const ai = new GeminiBotAI();
    await expect(ai.chooseAction('estado', ['real-player'])).resolves.toBeNull();
  });

  it('returns a structured chat-aware vote with confidence and explanation', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                targetId: 'player_2',
                confidence: 0.82,
                message: 'Vou no jogador 2 porque a versão dele mudou depois da acusação.'
              })
            }]
          }
        }]
      })
    }));

    const ai = new GeminiBotAI();
    const decision = await ai.chooseVote(
      JSON.stringify({
        recentChat: ['Jogador 1 acusou Jogador 2'],
        discussionAnalysis: { learnedFromPreviousMeetings: ['Jogador 1 já acusou um inocente.'] }
      }),
      ['player_1', 'player_2', 'SKIP']
    );

    expect(decision).toEqual({
      targetId: 'player_2',
      confidence: 0.82,
      message: 'Vou no jogador 2 porque a versão dele mudou depois da acusação.'
    });

    const fetchMock = vi.mocked(fetch);
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    const prompt = requestBody.contents[0].parts[0].text as string;
    expect(prompt).toContain('histórico de acusações erradas');
    expect(prompt).toContain('modo de falar');
  });
});
