// Vercel Serverless Function — proxy pengeluaran untuk Anthropic Messages API
// Vite proxy dalam vite.config.ts hanya wujud semasa `npm run dev`.
// Dalam pengeluaran (Vercel), fungsi inilah yang menyelesaikan isu CORS & 405.

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': req.headers.get('x-api-key') ?? '',
      'anthropic-version': req.headers.get('anthropic-version') ?? '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-16',
    },
    body: await req.text(),
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
