// Lapisan ketiga fatwa-boundary — intercept aktif di client sebelum mesej
// pengguna dihantar ke AI. Bukan pengganti FATWA_BOUNDARY (system prompt) atau
// FatwaDisclaimerBanner (banner pasif) — tapi lapisan tambahan yang tak
// bergantung pada AI patuh arahan.

// Peringkat A — kata kunci hukum eksplisit, cukup kuat berdiri sendiri.
const TIER_A_KEYWORDS = [
  'hukum', 'halal', 'haram', 'wajib', 'fardhu', 'makruh', 'mubah', 'batal',
  'sah ke', 'sahkah', 'sah kah', 'dosa ke', 'dosakah', 'berdosa ke', 'berdosakah',
]

// Peringkat B — ambiguous, hanya trigger bila digabung dengan konteks ibadah/amalan
// (cth. "boleh ke" sahaja terlalu longgar — "boleh saya tahu apa itu ghaflah?" akan
// tersekat kalau berdiri sendiri). "sunat"/"sunnah" turut di sini — muncul dalam
// konteks rohani biasa ("amalan sunat guru"), bukan hanya konteks fiqh.
const TIER_B_AMBIGUOUS_KEYWORDS = [
  'boleh ke', 'bolehkah', 'boleh tak', 'boleh tidak',
  'kena ke', 'kenakah', 'perlu ke', 'perlukah',
  'sunat', 'sunnah',
]

const IBADAH_CONTEXT_KEYWORDS = [
  'solat', 'sembahyang', 'zikir', 'puasa', 'wudhu', 'wuduk', 'tayamum',
  'talkin', 'khafi', 'jahar', 'ibadah', 'haid', 'nifas', 'qada', 'qadha',
  'zakat', 'haji', 'umrah',
]

function containsKeyword(paddedLower: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Sempadan kata mudah (bukan huruf a-z di kedua-dua hujung) — elak collateral
  // match dalam perkataan lain, cukup untuk teks Melayu/Latin biasa.
  return new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, 'i').test(paddedLower)
}

export function isFiqhQuestion(text: string): boolean {
  const padded = ` ${text.toLowerCase()} `

  if (TIER_A_KEYWORDS.some(kw => containsKeyword(padded, kw))) return true

  const hasAmbiguous = TIER_B_AMBIGUOUS_KEYWORDS.some(kw => containsKeyword(padded, kw))
  if (!hasAmbiguous) return false

  return IBADAH_CONTEXT_KEYWORDS.some(kw => containsKeyword(padded, kw))
}
