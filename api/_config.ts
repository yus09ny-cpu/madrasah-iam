// Kongsi antara semua Vercel Functions dalam api/ — fail berawalan `_` tidak jadi route.
// SEBAB fail ni wujud: madrasahiam.com (root domain) TIDAK proxy ke Vercel (ia GitHub Pages,
// laman statik berasingan). App sebenar (dengan /api routes) hidup di auditjiwa.madrasahiam.com.
// Guna APP_URL ni untuk apa-apa URL yang perlu hit balik app/API kita — JANGAN build dari
// request origin/Host header (origin browser boleh jadi domain root yang salah).

export const APP_URL = process.env.APP_URL || 'https://auditjiwa.madrasahiam.com'

if (!process.env.APP_URL) {
  console.warn(`[config] APP_URL env var tidak ditetapkan di Vercel — guna fallback: ${APP_URL}. Tetapkan APP_URL di Vercel Project Settings supaya ini tak bergantung pada fallback.`)
}
