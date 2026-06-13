// Anthropic API melalui /api/anthropic-chat — Vercel Edge Function dalam
// pengeluaran, dan proksi Vite (vite.config.ts) semasa dev. Kedua-dua
// menyelesaikan isu CORS browser (jangan guna @anthropic-ai/sdk terus dari browser).

import { FREE_SYSTEM_PROMPT, PRO_SYSTEM_PROMPT } from './systemPrompts'
import { logApiUsage } from './api-logger'

function resolveModel(userTier: string): string {
  return userTier === 'free' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'
}

function resolveMaxTokens(userTier: string): number {
  if (userTier === 'free') return 500
  return 1024
}

function resolveSystemPrompt(userTier: string): string {
  return userTier === 'free' ? FREE_SYSTEM_PROMPT : PRO_SYSTEM_PROMPT
}

export async function sendIAMMessage(
  messages: { role: 'user' | 'assistant'; content: string }[],
  userTier: string,
  systemPrompt?: string,
  signal?: AbortSignal,
  feature: string = 'iam_chat'
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey?.startsWith('sk-ant-')) {
    console.error('[IAM] API key tidak sah atau tidak dijumpai')
    throw new Error('Tiada Anthropic API key yang sah dalam .env.local')
  }

  const model = resolveModel(userTier)
  console.log('[IAM] Hantar permintaan... model:', model, 'tier:', userTier)

  const res = await fetch('/api/anthropic-chat', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: resolveMaxTokens(userTier),
      // System prompt boleh sehingga ~16K token (Pro) — tanda ia sebagai
      // cache_control supaya Anthropic guna prompt caching: permintaan
      // berulang dalam tempoh cache (~5 minit) dikenakan kos token-baca-cache
      // yang jauh lebih murah berbanding token input penuh.
      system: [
        {
          type: 'text',
          text: systemPrompt ?? resolveSystemPrompt(userTier),
          cache_control: { type: 'ephemeral' },
        },
      ],
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

  const usage = data.usage ?? {}
  void logApiUsage(feature, model, usage.input_tokens ?? 0, usage.output_tokens ?? 0)

  if (!text) {
    console.error('[IAM] Response kosong:', data)
    return 'Maaf, cuba sekali lagi.'
  }

  const cacheRead = usage.cache_read_input_tokens ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  if (cacheRead > 0) {
    console.log(`[IAM] Cache HIT ✓ — ${cacheRead} tokens dari cache (hemat ~90%). Output: ${usage.output_tokens}`)
  } else if (cacheWrite > 0) {
    console.log(`[IAM] Cache WRITE — ${cacheWrite} tokens disimpan. Seterusnya akan hemat. Output: ${usage.output_tokens}`)
  } else {
    console.warn('[IAM] Tiada cache — input:', usage.input_tokens, 'output:', usage.output_tokens)
  }

  return text
}
