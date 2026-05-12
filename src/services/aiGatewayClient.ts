import type { Message } from '../domain/types';

export type ChatCompletionRequest = {
  sessionId: string;
  messages: Message[];
  provider?: string;
  model?: string;
  runId?: string;
};

export type ChatCompletionChunk = {
  delta: string;
  done: boolean;
};

export type AIGatewayRuntime = {
  mode: 'mock' | 'sse';
  provider: string;
  model: string;
  endpointLabel: string;
};

function clean(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

export class AIGatewayClient {
  readonly runtime: AIGatewayRuntime;

  constructor(
    private readonly baseUrl = import.meta.env.VITE_AI_GATEWAY_URL ?? '',
    private readonly defaultProvider = import.meta.env.VITE_AI_PROVIDER ?? 'mock',
    private readonly defaultModel = import.meta.env.VITE_AI_MODEL ?? 'gateway/mock-stream',
  ) {
    const endpoint = this.baseUrl.trim();
    this.runtime = {
      mode: endpoint ? 'sse' : 'mock',
      provider: clean(this.defaultProvider, 'mock'),
      model: clean(this.defaultModel, 'gateway/mock-stream'),
      endpointLabel: endpoint ? `${endpoint}/v1/sessions/:id/messages` : 'local mock stream',
    };
  }

  async *streamSessionMessage(request: ChatCompletionRequest): AsyncGenerator<ChatCompletionChunk> {
    const provider = clean(request.provider, this.runtime.provider);
    const model = clean(request.model, this.runtime.model);

    if (!this.baseUrl.trim()) {
      const latest = request.messages.at(-1)?.content ?? '';
      const response = `已收到：${latest}。我會把重點整理成可保存的工作內容；你可以繼續追問，或把結果保存為成果文件。`;
      for (const token of response.split('')) {
        await new Promise((resolve) => setTimeout(resolve, 6));
        yield { delta: token, done: false };
      }
      yield { delta: '', done: true };
      return;
    }

    const response = await fetch(`${this.baseUrl.trim()}/v1/sessions/${request.sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: request.messages, provider, model, runId: request.runId }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`AI Gateway request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const dataLines = frame.split('\n').filter((line) => line.startsWith('data:'));
        if (!dataLines.length) {
          yield { delta: frame, done: false };
          continue;
        }
        for (const line of dataLines) {
          const payload = line.replace(/^data:\s?/, '');
          if (payload === '[DONE]') {
            yield { delta: '', done: true };
            return;
          }
          try {
            const parsed = JSON.parse(payload) as { delta?: string; content?: string };
            yield { delta: parsed.delta ?? parsed.content ?? '', done: false };
          } catch {
            yield { delta: payload, done: false };
          }
        }
      }
    }
    if (buffer.trim()) yield { delta: buffer, done: false };
    yield { delta: '', done: true };
  }
}
