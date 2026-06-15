// Wrapper kongsi untuk panggil /api/anthropic-chat dengan retry sekali.
// Sebab: system prompt besar (cache-write ~7-8K token) kadang ambil >25s
// semasa Anthropic sibuk, menyebabkan Vercel Edge Function timeout (504).
// Retry sekali biasanya berjaya sebab cache dah ditulis pada percubaan pertama.

const MAX_ATTEMPTS = 2

export async function callAnthropic(body: unknown, signal?: AbortSignal) {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch('/api/anthropic-chat', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err: any = await res.json().catch(() => ({}))
        const message = err?.error?.message ?? `HTTP ${res.status}`
        if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
          lastError = new Error(message)
          continue
        }
        throw new Error(message)
      }

      return await res.json()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e
      if (attempt < MAX_ATTEMPTS) {
        lastError = e
        continue
      }
      throw e
    }
  }

  throw lastError
}
