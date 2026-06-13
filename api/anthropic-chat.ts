// Vercel Serverless Function — proxy pengeluaran untuk Anthropic Messages API
// Vite proxy dalam vite.config.ts hanya wujud semasa `npm run dev`.
// Dalam pengeluaran (Vercel), fungsi inilah yang menyelesaikan isu CORS & 405.
//
// API key diambil dari server environment (ANTHROPIC_API_KEY) — tidak terdedah ke browser.

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: 'API key tidak dikonfigurasi' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': req.headers.get('anthropic-version') ?? '2023-06-01',
      
    },
    body: await req.text(),
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
