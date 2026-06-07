// Vercel Serverless Function — proxy pengeluaran untuk Anthropic API
// Vite proxy dalam vite.config.ts hanya wujud semasa `npm run dev`.
// Dalam pengeluaran (Vercel), fungsi inilah yang menyelesaikan isu CORS & 405.

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const upstreamPath = url.pathname.replace(/^\/api\/anthropic-api/, '')
  const target = `https://api.anthropic.com${upstreamPath}${url.search}`

  const upstream = await fetch(target, {
    method: req.method,
    headers: {
      'Content-Type': req.headers.get('content-type') ?? 'application/json',
      'x-api-key': req.headers.get('x-api-key') ?? '',
      'anthropic-version': req.headers.get('anthropic-version') ?? '2023-06-01',
    },
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
