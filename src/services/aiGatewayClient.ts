import type { Message } from '../domain/types';

export type ChatCompletionRequest = {
  sessionId: string;
  messages: Message[];
};

export type ChatCompletionChunk = {
  delta: string;
  done: boolean;
};

export class AIGatewayClient {
  constructor(private readonly baseUrl = import.meta.env.VITE_AI_GATEWAY_URL ?? '') {}

  async *streamSessionMessage(request: ChatCompletionRequest): AsyncGenerator<ChatCompletionChunk> {
    if (!this.baseUrl) {
      const latest = request.messages.at(-1)?.content ?? '';
      const response = `Mock gateway 已接收：${latest}。下一步接 FastAPI /v1/sessions/${request.sessionId}/messages 後，這裡會換成真實 SSE token stream。`;
      for (const token of response.split('')) {
        await new Promise((resolve) => setTimeout(resolve, 8));
        yield { delta: token, done: false };
      }
      yield { delta: '', done: true };
      return;
    }

    const response = await fetch(`${this.baseUrl}/v1/sessions/${request.sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: request.messages }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`AI Gateway request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      yield { delta: decoder.decode(value, { stream: true }), done: false };
    }
    yield { delta: '', done: true };
  }
}
