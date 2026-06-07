// Anthropic API melalui Vite proxy (/anthropic-api → api.anthropic.com)
// Proxy dalam vite.config.ts menyelesaikan isu CORS browser.
// Jangan guna @anthropic-ai/sdk terus dari browser — CORS akan blok.

import { FREE_SYSTEM_PROMPT, PRO_SYSTEM_PROMPT } from './systemPrompts'

function resolveModel(userTier: string): string {
  return userTier === 'free' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'
}

function resolveMaxTokens(userTier: string): number {
  if (userTier === 'free') return 1024
  if (userTier === 'pro') return 2048
  return 4096
}

function resolveSystemPrompt(userTier: string): string {
  return userTier === 'free' ? FREE_SYSTEM_PROMPT : PRO_SYSTEM_PROMPT
}

export async function sendIAMMessage(
  messages: { role: 'user' | 'assistant'; content: string }[],
  userTier: string,
  systemPrompt?: string,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey?.startsWith('sk-ant-')) {
    console.error('[IAM] API key tidak sah atau tidak dijumpai')
    throw new Error('Tiada Anthropic API key yang sah dalam .env.local')
  }

  console.log('[IAM] Hantar permintaan... model:', resolveModel(userTier), 'tier:', userTier)

  const res = await fetch('/anthropic-api/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: resolveModel(userTier),
      max_tokens: resolveMaxTokens(userTier),
      system: systemPrompt ?? resolveSystemPrompt(userTier),
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = (err as any).error?.message ?? `HTTP ${res.status}`
    console.error('[IAM] API error:', res.status, msg)
    throw new Error(`Anthropic: ${msg}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text

  if (!text) {
    console.error('[IAM] Response kosong:', data)
    return 'Maaf, cuba sekali lagi.'
  }

  console.log('[IAM] Response berjaya, panjang:', text.length, 'aksara')
  return text
}
