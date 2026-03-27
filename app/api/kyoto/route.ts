import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemPromptPath = path.join(process.cwd(), 'kyoto-context', 'system-prompt.md');
  let systemPrompt = '';
  try {
    systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
  } catch {
    systemPrompt = 'You are Kyoto, an AI assistant specialized in Meta Ads traffic management and analysis.';
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-COLOQUE_SUA_CHAVE_AQUI') {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: messages,
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
