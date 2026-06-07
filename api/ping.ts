export const config = { runtime: 'edge' }

export default async function handler(): Promise<Response> {
  return new Response('pong', { status: 200 })
}
