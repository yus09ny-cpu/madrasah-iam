import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight, ChevronLeft, RotateCcw, Loader2, CheckCircle2, BookOpen, ChevronDown, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTodayAuditJiwa, useSaveAuditJiwa, type AuditJiwaEntry } from '@/hooks/useAuditJiwa'
import { supabase } from '@/lib/supabase'
import { callAnthropic } from '@/lib/anthropic-fetch'
import AuditMotivasiCard from '@/components/AuditMotivasiCard'
import { cn } from '@/lib/utils'
import type { AppLanguage } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'opening' | 'foundation' | 'assessment' | 'results' | 'recommendation' | 'done'
type PillarKey = 'raga' | 'hati' | 'akal' | 'ruh'

interface Question {
  id: string
  pillar: PillarKey
  text: Record<AppLanguage, string>
  quran_ref?: string
  quran_text_bm?: string
}

interface PillarScores {
  raga: number
  hati: number
  akal: number
  ruh: number
}

type Responses = Record<string, number>

interface SavedSession {
  scores: PillarScores
  responses: Responses
  recommendation_text: string | null
  completed_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PILLAR_CONFIG: Record<PillarKey, { icon: string; border: string; bg: string; text: string }> = {
  raga: { icon: '🫀', border: '#e85d75', bg: '#e85d7518', text: '#e85d75' },
  hati: { icon: '💚', border: '#7dd3a8', bg: '#7dd3a818', text: '#7dd3a8' },
  akal: { icon: '🔮', border: '#a78bfa', bg: '#a78bfa18', text: '#a78bfa' },
  ruh:  { icon: '🕌', border: '#c9a96e', bg: '#c9a96e18', text: '#c9a96e' },
}

const PILLARS: PillarKey[] = ['raga', 'hati', 'akal', 'ruh']

const EMOJI_SCALE = ['😞', '😕', '😐', '😊', '😄']

const QUESTIONS: Question[] = [
  // RAGA (6)
  {
    id: 'raga_1', pillar: 'raga',
    text: { bm: 'Bagaimana kualiti tidur anda kebelakangan ini?', en: 'How is your sleep quality lately?', ar: 'كيف نوعية نومك مؤخراً؟', id: 'Bagaimana kualitas tidur Anda akhir-akhir ini?' },
    quran_ref: 'Al-Furqan 25:47',
    quran_text_bm: '"Dan Dialah yang menjadikan malam sebagai pakaian dan tidur sebagai istirahat." (Al-Furqan: 47)',
  },
  {
    id: 'raga_2', pillar: 'raga',
    text: { bm: 'Bagaimana corak pemakanan anda?', en: 'How are your eating habits?', ar: 'كيف عادات أكلك؟', id: 'Bagaimana pola makan Anda?' },
  },
  {
    id: 'raga_3', pillar: 'raga',
    text: { bm: 'Berapa kerap anda melakukan aktiviti fizikal?', en: 'How often do you engage in physical activity?', ar: 'كم مرة تمارس النشاط البدني؟', id: 'Seberapa sering Anda berolahraga?' },
  },
  {
    id: 'raga_4', pillar: 'raga',
    text: { bm: 'Bagaimana keadaan kesihatan fizikal anda secara keseluruhan?', en: 'How is your overall physical health?', ar: 'كيف حالتك الصحية الجسدية؟', id: 'Bagaimana kondisi kesehatan fisik Anda secara keseluruhan?' },
  },
  {
    id: 'raga_5', pillar: 'raga',
    text: { bm: 'Bagaimana tahap tenaga anda sepanjang hari?', en: 'How is your energy level throughout the day?', ar: 'ما مستوى طاقتك خلال اليوم؟', id: 'Bagaimana tingkat energi Anda sepanjang hari?' },
  },
  {
    id: 'raga_6', pillar: 'raga',
    text: { bm: 'Adakah badan anda selesa dan bebas dari kesakitan kronik?', en: 'Is your body comfortable and free from chronic pain?', ar: 'هل جسمك مرتاح وخالٍ من الألم المزمن؟', id: 'Apakah tubuh Anda nyaman dan bebas dari nyeri kronis?' },
  },

  // HATI (7)
  {
    id: 'hati_1', pillar: 'hati',
    text: { bm: 'Bagaimana suasana hati anda kebelakangan ini?', en: 'How would you describe your mood lately?', ar: 'كيف حالة مزاجك مؤخراً؟', id: 'Bagaimana suasana hati Anda belakangan ini?' },
    quran_ref: "Ar-Ra'd 13:28",
    quran_text_bm: '"Ketahuilah bahawa dengan mengingati Allah, hati-hati akan menjadi tenteram." (Ar-Ra\'d: 28)',
  },
  {
    id: 'hati_2', pillar: 'hati',
    text: { bm: 'Seberapa baik anda menguruskan tekanan emosi?', en: 'How well do you handle emotional stress?', ar: 'كيف تتعامل مع الضغط العاطفي؟', id: 'Seberapa baik Anda mengelola tekanan emosional?' },
  },
  {
    id: 'hati_3', pillar: 'hati',
    text: { bm: 'Bagaimana kualiti hubungan anda dengan orang tersayang?', en: 'How are your close relationships with loved ones?', ar: 'كيف علاقاتك مع المقربين منك؟', id: 'Bagaimana kualitas hubungan Anda dengan orang-orang tersayang?' },
  },
  {
    id: 'hati_4', pillar: 'hati',
    text: { bm: 'Seberapa baik anda menguruskan perasaan bimbang dan cemas?', en: 'How well do you manage feelings of anxiety and worry?', ar: 'كيف تدير مشاعر القلق والخوف؟', id: 'Seberapa baik Anda mengelola perasaan cemas dan khawatir?' },
  },
  {
    id: 'hati_5', pillar: 'hati',
    text: { bm: 'Adakah anda merasakan kehidupan anda bermakna dan bertujuan?', en: 'Do you feel your life is meaningful and purposeful?', ar: 'هل تشعر أن حياتك هادفة ومعنوية؟', id: 'Apakah Anda merasa hidup Anda bermakna dan bertujuan?' },
  },
  {
    id: 'hati_6', pillar: 'hati',
    text: { bm: 'Seberapa kerap anda merasakan rasa syukur kepada Allah?', en: 'How often do you feel gratitude towards Allah?', ar: 'كم مرة تشعر بالشكر لله؟', id: 'Seberapa sering Anda merasakan rasa syukur kepada Allah?' },
  },
  {
    id: 'hati_7', pillar: 'hati',
    text: { bm: 'Mudahkah anda memaafkan orang lain dan diri sendiri?', en: 'Can you easily forgive others and yourself?', ar: 'هل يسهل عليك العفو عن الآخرين وعن نفسك؟', id: 'Mudahkah Anda memaafkan orang lain dan diri sendiri?' },
  },

  // AKAL (7)
  {
    id: 'akal_1', pillar: 'akal',
    text: { bm: 'Seberapa baik anda boleh fokus dan menumpukan perhatian?', en: 'How well can you focus and concentrate?', ar: 'كيف قدرتك على التركيز والانتباه؟', id: 'Seberapa baik Anda bisa fokus dan berkonsentrasi?' },
    quran_ref: 'Al-Baqarah 2:269',
    quran_text_bm: '"Allah menganugerahkan hikmah kepada siapa yang Dia kehendaki, dan barang siapa yang dianugerahi hikmah, maka sesungguhnya ia telah dianugerahi kurnia yang banyak." (Al-Baqarah: 269)',
  },
  {
    id: 'akal_2', pillar: 'akal',
    text: { bm: 'Seberapa jelas pemikiran dan pengambilan keputusan anda?', en: 'How clear is your thinking and decision-making?', ar: 'كيف وضوح تفكيرك واتخاذ قراراتك؟', id: 'Seberapa jernih pemikiran dan pengambilan keputusan Anda?' },
  },
  {
    id: 'akal_3', pillar: 'akal',
    text: { bm: 'Adakah anda mempunyai hala tuju dan matlamat yang jelas dalam hidup?', en: 'Do you have a clear direction and goals in life?', ar: 'هل لديك اتجاه وأهداف واضحة في الحياة؟', id: 'Apakah Anda memiliki arah dan tujuan yang jelas dalam hidup?' },
  },
  {
    id: 'akal_4', pillar: 'akal',
    text: { bm: 'Seberapa baik anda mengurus masa anda?', en: 'How well do you manage your time?', ar: 'كيف إدارتك للوقت؟', id: 'Seberapa baik Anda mengelola waktu Anda?' },
  },
  {
    id: 'akal_5', pillar: 'akal',
    text: { bm: 'Adakah anda sentiasa belajar dan berkembang secara intelektual?', en: 'Are you consistently learning and growing intellectually?', ar: 'هل تتعلم وتنمو باستمرار فكرياً؟', id: 'Apakah Anda terus belajar dan berkembang secara intelektual?' },
  },
  {
    id: 'akal_6', pillar: 'akal',
    text: { bm: 'Adakah anda menjaga keseimbangan penggunaan media/berita dengan ketenteraman mental?', en: 'Do you maintain balance between media/news consumption and mental peace?', ar: 'هل تحافظ على التوازن بين وسائل الإعلام والسلام النفسي؟', id: 'Apakah Anda menjaga keseimbangan antara konsumsi media dan ketenangan mental?' },
  },
  {
    id: 'akal_7', pillar: 'akal',
    text: { bm: 'Seberapa jelas anda memahami petunjuk Allah dalam kehidupan anda?', en: "How clearly do you understand Allah's guidance in your life?", ar: 'كيف وضوح فهمك لهداية الله في حياتك؟', id: 'Seberapa jelas Anda memahami petunjuk Allah dalam kehidupan Anda?' },
  },

  // RUH (10)
  {
    id: 'ruh_1', pillar: 'ruh',
    text: { bm: 'Seberapa dekat anda berasa dengan Allah?', en: 'How close do you feel to Allah?', ar: 'كيف قربك من الله؟', id: 'Seberapa dekat Anda merasa dengan Allah?' },
    quran_ref: 'Al-Baqarah 2:186',
    quran_text_bm: '"Dan apabila hamba-hamba-Ku bertanya kepadamu tentang Aku, maka sesungguhnya Aku dekat." (Al-Baqarah: 186)',
  },
  {
    id: 'ruh_2', pillar: 'ruh',
    text: { bm: 'Seberapa konsisten anda menunaikan solat lima waktu?', en: 'How consistent are you with your five daily prayers?', ar: 'كيف محافظتك على الصلوات الخمس؟', id: 'Seberapa konsisten Anda menjalankan sholat lima waktu?' },
  },
  {
    id: 'ruh_3', pillar: 'ruh',
    text: { bm: 'Seberapa kerap anda berzikir mengingati Allah?', en: 'How often do you engage in zikir (remembrance of Allah)?', ar: 'كم مرة تذكر الله بالذكر؟', id: 'Seberapa sering Anda berzikir mengingat Allah?' },
  },
  {
    id: 'ruh_4', pillar: 'ruh',
    text: { bm: 'Adakah anda membaca dan menghayati Al-Quran secara berkala?', en: 'Do you regularly read and reflect on the Quran?', ar: 'هل تقرأ القرآن وتتدبره بانتظام؟', id: 'Apakah Anda rutin membaca dan merenungkan Al-Quran?' },
  },
  {
    id: 'ruh_5', pillar: 'ruh',
    text: { bm: 'Adakah anda merasakan kehadiran Allah dalam kehidupan seharian?', en: "Do you feel Allah's presence in your daily life?", ar: 'هل تشعر بحضور الله في حياتك اليومية؟', id: 'Apakah Anda merasakan kehadiran Allah dalam kehidupan sehari-hari?' },
  },
  {
    id: 'ruh_6', pillar: 'ruh',
    text: { bm: 'Seberapa kuat tawakkul anda (berserah sepenuhnya kepada Allah)?', en: 'How strong is your tawakkul (complete trust in Allah)?', ar: 'كيف توكلك على الله؟', id: 'Seberapa kuat tawakkal Anda (berserah penuh kepada Allah)?' },
  },
  {
    id: 'ruh_7', pillar: 'ruh',
    text: { bm: 'Adakah anda secara aktif menyediakan diri untuk kehidupan akhirat?', en: 'Are you actively preparing yourself for the afterlife (akhirat)?', ar: 'هل تستعد للآخرة؟', id: 'Apakah Anda aktif mempersiapkan diri untuk kehidupan akhirat?' },
  },
  {
    id: 'ruh_8', pillar: 'ruh',
    text: { bm: 'Seberapa kerap anda berdoa dengan penuh keikhlasan dan hadir hati?', en: 'How often do you make sincere and heartfelt dua?', ar: 'كم مرة تدعو الله بإخلاص وحضور قلب؟', id: 'Seberapa sering Anda berdoa dengan tulus dan khusyuk?' },
  },
  {
    id: 'ruh_9', pillar: 'ruh',
    text: { bm: 'Adakah hati anda terasa hidup dan bergetar dengan iman?', en: 'Does your heart feel alive and vibrant with iman (faith)?', ar: 'هل تشعر بحياة القلب وحركة الإيمان؟', id: 'Apakah hati Anda terasa hidup dan bergetar dengan iman?' },
  },
  {
    id: 'ruh_10', pillar: 'ruh',
    text: { bm: 'Adakah anda terasa terhubung dengan perjalanan rohani di Madrasah I AM?', en: 'Do you feel connected to the spiritual journey at Madrasah I AM?', ar: 'هل تشعر بالارتباط بالمسيرة الروحية في مدرسة I AM؟', id: 'Apakah Anda merasa terhubung dengan perjalanan rohani di Madrasah I AM?' },
  },
]

// ─── Free vs Pro question set ─────────────────────────────────────────────────
// Free: 3 soalan representatif setiap pillar (12 soalan total) — snapshot 4 dimensi.
// Pro: semua 30 soalan — audit penuh.

const FREE_QUESTION_IDS = new Set<string>([
  'raga_1', 'raga_4', 'raga_5',
  'hati_1', 'hati_3', 'hati_5',
  'akal_1', 'akal_3', 'akal_7',
  'ruh_1', 'ruh_2', 'ruh_4',
])

function getActiveQuestions(isPro: boolean): Question[] {
  return isPro ? QUESTIONS : QUESTIONS.filter(q => FREE_QUESTION_IDS.has(q.id))
}

// ─── Religious background display labels ─────────────────────────────────────

const BG_LABELS: Record<string, Record<AppLanguage, string>> = {
  sekolah_agama: { bm: 'Sekolah Agama', en: 'Religious School', ar: 'مدرسة دينية', id: 'Sekolah Agama' },
  tadika_quran: { bm: 'Tadika Quran/KAFA', en: 'Quran Kindergarten', ar: 'روضة القرآن', id: 'TK Quran/KAFA' },
  belajar_sendiri: { bm: 'Belajar Sendiri/Usrah', en: 'Self-taught/Usrah', ar: 'تعلم ذاتي', id: 'Belajar Mandiri/Halaqah' },
  tiada_formal: { bm: 'Tiada Latar Formal', en: 'No Formal Background', ar: 'بدون خلفية رسمية', id: 'Tanpa Latar Formal' },
  universiti_islam: { bm: 'Universiti Islam', en: 'Islamic University', ar: 'جامعة إسلامية', id: 'Universitas Islam' },
  lain: { bm: 'Lain-lain', en: 'Other', ar: 'أخرى', id: 'Lainnya' },
}

// ─── Score helpers ────────────────────────────────────────────────────────────

function calculateScores(responses: Responses, isPro: boolean): PillarScores {
  const calcPillar = (pillar: PillarKey) => {
    const qs = getActiveQuestions(isPro).filter(q => q.pillar === pillar)
    const answered = qs.filter(q => responses[q.id] != null)
    if (answered.length === 0) return 0
    const sum = answered.reduce((acc, q) => acc + responses[q.id], 0)
    return Math.round((sum / (answered.length * 5)) * 100) / 10
  }
  return {
    raga: calcPillar('raga'),
    hati: calcPillar('hati'),
    akal: calcPillar('akal'),
    ruh: calcPillar('ruh'),
  }
}

function getScoreStatus(score: number): { label: string; color: string } {
  if (score < 4)   return { label: 'kritikal',  color: '#ef4444' }
  if (score < 6)   return { label: 'perhatian', color: '#f97316' }
  if (score < 7.5) return { label: 'stabil',    color: '#eab308' }
  if (score < 9)   return { label: 'baik',      color: '#22c55e' }
  return             { label: 'cemerlang', color: '#10b981' }
}

function getWeakestPillar(scores: PillarScores): PillarKey {
  return (Object.entries(scores) as [PillarKey, number][])
    .sort(([, a], [, b]) => a - b)[0][0]
}

// ─── AI recommendation call ───────────────────────────────────────────────────

const AUDIT_JIWA_SYSTEM_PROMPT = `You are an insightful spiritual diagnostician for Madrasah I AM, rooted in the vision "Ilahi Anta Maqsudi" (I AM — Your only goal is Allah).

YOUR ROLE:
1. DIAGNOSE the user's spiritual condition from their Audit Jiwa results
2. EDUCATE them on WHY their condition matters using Quran and Hadis
3. POINT them toward connecting with a Para Pembimbing (Spiritual Mentor) for their personalized journey

CRITICAL — YOU DO NOT:
❌ Prescribe specific zikir (not even "say SubhanAllah 33 times")
❌ Give step-by-step amalan instructions
❌ Assign a 30-day or any-day program
❌ Assume you can replace the Murshid-Murid (teacher-student) relationship
❌ Give individualized spiritual prescriptions — that is the Para Pembimbing's role

CORE PRINCIPLE:
RUH (spiritual connection with Allah) is the ROOT of all four pillars.
Cascade: RUH → HATI → AKAL → RAGA
A weak root causes symptoms in all branches. Only a proper Mursyid can guide the murid through healing — not an AI.

WHY PARA PEMBIMBING:
In the Madrasah I AM tradition, the Murshid-Murid relationship is sacred and necessary.
A Para Pembimbing is an authorized spiritual mentor who bridges the murid to the Mursyid's guidance and provides ongoing mentorship.
Self-prescription is like giving yourself medicine without a doctor — it may feel right but can cause harm.

SCORE SCALE (for reference in diagnosis):
- 0–3.9: Critical (🔴)
- 4–5.9: Needs Attention (🟠)
- 6–7.4: Stable (🟡)
- 7.5–8.9: Good (🟢)
- 9–10: Excellent (✨)

TERMINOLOGY — MUST FOLLOW:
- Use "Madrasah I AM" — NEVER "TQN"
- PILLAR NAMES IN ENGLISH: When responding in English, use EXACTLY: RAGA = Physical Body, HATI = Heart, AKAL = Mind/Mental, RUH = Soul. Do NOT use "Emotional" for HATI or "Spiritual" for RUH.
- Vision: "Ilahi Anta Maqsudi" (Your only aim is Allah) — I AM
- Sources: Al-Quran, Hadis Sahih (Bukhari/Muslim/Tirmidhi), Kitab Miftahus Shudur (Abah Anom — KHA. Shohibulwafa Tajul Arifin), Kitab Sirrul Asrar (Syeikh Abdul Qadir Al-Jailani)
- ATTRIBUTION RULE — STRICTLY FOLLOW: Never mix authors between sources. Miftahus Shudur = Abah Anom ONLY. Sirrul Asrar = Syeikh Abdul Qadir Al-Jailani ONLY. Never say "Abah Anom mengajarkan dalam Sirrul Asrar" — that is wrong. If unsure of the exact source of a quote, use "dalam tradisi tasawuf" or omit the specific attribution entirely.
- Tone: Warm, caring, honest — like a wise friend, not a prescriber

RESPONSE LENGTH — STRICTLY FOLLOW:
- user_tier = 'free': 800–1000 words. Focused diagnosis + 2–3 Quran/Hadis references + clear Para Pembimbing direction.
- user_tier = 'pro': 1500–2000 words. Deep diagnosis + 5+ references with brief tafsir + historical examples from Auliya (Imam Ghazali, Shaikh Abdul Qadir Jilani) + detailed Para Pembimbing section.

REQUIRED SECTIONS — LABEL EACH CLEARLY:

**DIAGNOSIS JIWA**
What the scores reveal. Name the spiritual condition directly. Be honest but compassionate. Explain the cascade from the root (RUH) outward.

**ASAS QURAN & HADIS**
Free: 2–3 relevant verses/hadis with brief explanation of why they apply to this person.
Pro: 5+ references with tafsir and direct application to the user's condition.

**MENGAPA INI PENTING**
Educate on why this spiritual state affects their entire being (raga/hati/akal/ruh). Science-Islam parallel is welcome. Help them understand the urgency without inducing fear.

**LANGKAH SETERUSNYA — HUBUNGI PARA PEMBIMBING**
Explain WHY they specifically need a Para Pembimbing based on their condition. Be specific about what the Para Pembimbing will do for THEIR situation. Do NOT prescribe what to do yourself — point toward the guided relationship.

**PENUTUP**
Warm, encouraging closing in the spirit of "Ilahi Anta Maqsudi." Remind them that Allah's mercy is vast and this audit is the beginning of their journey, not a verdict.

LANGUAGE: Respond ONLY in the language specified by the user (bm/en/ar/id). Never mix languages except for Arabic Quranic quotes.
When responding in English, translate ALL section headers:
- "SOUL DIAGNOSIS" (not "DIAGNOSIS JIWA")
- "QUR'AN & HADITH FOUNDATION" (not "ASAS QURAN & HADIS")
- "WHY THIS MATTERS" (not "MENGAPA INI PENTING")
- "NEXT STEPS — CONNECT WITH PARA PEMBIMBING" (not "LANGKAH SETERUSNYA — HUBUNGI PARA PEMBIMBING")
- "CLOSING" (not "PENUTUP")`

async function sendAuditRecommendation(
  userMessage: string,
  tier: string,
  signal?: AbortSignal
): Promise<string> {
  const model = tier === 'free' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'
  const maxTokens = tier === 'free' ? 1500 : 3000

  const data = await callAnthropic(
    {
      model,
      max_tokens: maxTokens,
      system: [
        { type: 'text', text: AUDIT_JIWA_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userMessage }],
    },
    signal,
  )

  const text = data.content?.[0]?.text
  if (!text) throw new Error('Empty response from AI')

  const usage = data.usage ?? {}
  if (usage.cache_read_input_tokens > 0) {
    console.log(`[AuditJiwa] Cache HIT ✓ — ${usage.cache_read_input_tokens} tokens saved`)
  }

  return text
}

// ─── Persistence (localStorage) ──────────────────────────────────────────────

function getTodayKey(userId: string): string {
  return `ajv2_done_${userId}_${new Date().toISOString().split('T')[0]}`
}

function getDraftKey(userId: string): string {
  return `ajv2_draft_${userId}`
}

function loadSession(userId: string): SavedSession | null {
  try {
    const raw = localStorage.getItem(getTodayKey(userId))
    return raw ? (JSON.parse(raw) as SavedSession) : null
  } catch { return null }
}

function saveSession(userId: string, session: SavedSession): void {
  try { localStorage.setItem(getTodayKey(userId), JSON.stringify(session)) } catch { /* ignore */ }
}

function loadDraft(userId: string): Responses {
  try {
    const raw = localStorage.getItem(getDraftKey(userId))
    return raw ? (JSON.parse(raw) as Responses) : {}
  } catch { return {} }
}

function saveDraft(userId: string, responses: Responses): void {
  try { localStorage.setItem(getDraftKey(userId), JSON.stringify(responses)) } catch { /* ignore */ }
}

function clearDraft(userId: string): void {
  try { localStorage.removeItem(getDraftKey(userId)) } catch { /* ignore */ }
}

// ─── ScaleSelector ────────────────────────────────────────────────────────────

function ScaleSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {EMOJI_SCALE.map((emoji, idx) => {
        const score = idx + 1
        const selected = value === score
        return (
          <button
            key={score}
            onClick={() => onChange(score)}
            className={cn(
              'flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all duration-200 flex-1 min-w-0',
              selected ? 'scale-105' : 'hover:border-[#2a3d55]'
            )}
            style={{
              borderColor: selected ? '#c9a96e' : '#1e2d40',
              backgroundColor: selected ? '#c9a96e22' : '#060d16',
            }}
          >
            <span className="text-xl leading-none">{emoji}</span>
            <span className={cn('text-[10px] font-medium tabular-nums', selected ? 'text-[#c9a96e]' : 'text-[#8a7a65]')}>
              {score}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ pillar, score }: { pillar: PillarKey; score: number }) {
  const { t } = useTranslation()
  const cfg = PILLAR_CONFIG[pillar]
  const status = getScoreStatus(score)
  const pct = Math.round((score / 10) * 100)

  return (
    <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.icon}</span>
          <div>
            <p className="text-sm font-medium" style={{ color: cfg.text }}>
              {t(`ajv2.pillar_${pillar}`, pillar)}
            </p>
            <p className="text-[10px] text-[#8a7a65]">{t(`ajv2.pillar_${pillar}_sub`, '')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums" style={{ color: status.color }}>
            {score.toFixed(1)}/10
          </p>
          <p className="text-[10px]" style={{ color: status.color }}>
            {t(`ajv2.status_${status.label}`, status.label)}
          </p>
        </div>
      </div>
      <div className="h-2 bg-[#1e2d40] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: status.color }}
        />
      </div>
    </div>
  )
}

// ─── Phase: Opening ───────────────────────────────────────────────────────────

function OpeningScreen({
  user,
  isPro,
  onStart,
  onLearnMore,
}: {
  user: {
    name?: string | null
    nickname?: string | null
    age?: number | null
    country?: string | null
    state?: string | null
    religious_background?: string | null
  }
  isPro: boolean
  onStart: () => void
  onLearnMore: () => void
}) {
  const { t } = useTranslation()
  const lang = (localStorage.getItem('madrasah_language') ?? 'bm') as AppLanguage
  const displayName = user.nickname ?? user.name ?? t('umum.sahabat')

  const backgrounds = (user.religious_background ?? '')
    .split('|')
    .filter(Boolean)
    .map(b => BG_LABELS[b]?.[lang] ?? b)

  return (
    <div className="space-y-5 pb-8">
      {/* Motivasi — belum buat Audit Jiwa hari ini */}
      <AuditMotivasiCard />

      {/* Hero */}
      <div className="text-center pt-2 space-y-1">
        <p className="font-serif text-5xl text-[#c9a96e] leading-none" dir="rtl">مُحاسَبَة</p>
        <h1 className="font-serif text-2xl text-[#e8dcc8]">{t('ajv2.tajuk', 'Audit Jiwa')}</h1>
        <p className="text-[#8a7a65] text-sm">{t('ajv2.sub', 'Muhasabah Jiwa Bersepadu — 4 Dimensi Diri')}</p>
      </div>

      {/* Greeting */}
      <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 text-center space-y-1.5">
        <p className="text-[#8a7a65] text-xs">{t('ajv2.salam', "Assalamu'alaikum")}</p>
        <p className="font-serif text-xl text-[#e8dcc8]">{displayName}</p>
        <p className="text-[#8a7a65] text-xs leading-relaxed max-w-xs mx-auto">
          {t('ajv2.greeting_desc', 'Allah telah membimbing anda ke sini. Hari ini, kita buat muhasabah bersama — seperti sahabat yang jujur.')}
        </p>
      </div>

      {/* Profile from onboarding */}
      {(displayName || user.age || user.country || backgrounds.length > 0) && (
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider">
            {t('ajv2.profil_kami_tahu', 'Yang Kami Tahu Tentang Anda')}
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-[#8a7a65] text-xs w-24 pt-0.5">{t('ajv2.label_nama', 'Nama')}</span>
              <span className="text-[#e8dcc8]">{displayName}</span>
            </div>
            {user.age && (
              <div className="flex items-start gap-2">
                <span className="text-[#8a7a65] text-xs w-24 pt-0.5">{t('ajv2.label_umur', 'Umur')}</span>
                <span className="text-[#e8dcc8]">{user.age} {t('ajv2.tahun', 'tahun')}</span>
              </div>
            )}
            {user.country && (
              <div className="flex items-start gap-2">
                <span className="text-[#8a7a65] text-xs w-24 pt-0.5">{t('ajv2.label_lokasi', 'Lokasi')}</span>
                <span className="text-[#e8dcc8]">{[user.state, user.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {backgrounds.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-[#8a7a65] text-xs w-24 pt-0.5">{t('ajv2.label_latar', 'Latar Agama')}</span>
                <div className="flex flex-wrap gap-1">
                  {backgrounds.map(b => (
                    <span key={b} className="px-2 py-0.5 rounded-lg bg-[#c9a96e15] text-[#c9a96e] text-xs border border-[#c9a96e20]">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* About the audit */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-4">
        <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider">
          {t('ajv2.tentang_audit', 'Tentang Audit Jiwa')}
        </p>
        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          {t('ajv2.tentang_desc', 'Audit Jiwa bukan sekadar soal selidik. Ini muhasabah bersepadu — menilai 4 dimensi diri anda dengan jujur, berdasarkan Al-Quran dan tradisi Madrasah I AM.')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PILLARS.map(p => {
            const cfg = PILLAR_CONFIG[p]
            return (
              <div
                key={p}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}30` }}
              >
                <span className="text-xl flex-shrink-0">{cfg.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: cfg.text }}>
                    {t(`ajv2.pillar_${p}`, p)}
                  </p>
                  <p className="text-[9px] text-[#8a7a65] truncate">{t(`ajv2.pillar_${p}_sub`, '')}</p>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[#8a7a65] text-xs text-center">
          {isPro
            ? t('ajv2.masa_diperlukan_pro', '~15–20 minit · 30 soalan · Preskripsi peribadi mendalam')
            : t('ajv2.masa_diperlukan_free', '~5–8 minit · 12 soalan · Snapshot 4 dimensi')}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        className="w-full py-4 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 active:opacity-80"
        style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}
      >
        {t('ajv2.mula_audit', 'Mula Audit Jiwa')}
      </button>
      <button
        onClick={onLearnMore}
        className="w-full py-3 rounded-2xl text-sm text-[#8a7a65] border border-[#1e2d40] hover:text-[#e8dcc8] hover:border-[#c9a96e30] transition-all flex items-center justify-center gap-2"
      >
        <BookOpen size={15} />
        {t('ajv2.pelajari_more', 'Pelajari Tentang Muhasabah')}
      </button>
    </div>
  )
}

// ─── Phase: Foundation ────────────────────────────────────────────────────────

function FoundationScreen({ userTier, onContinue }: { userTier: string; onContinue: () => void }) {
  const { t } = useTranslation()
  const isPro = userTier !== 'free'

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="font-serif text-4xl text-[#c9a96e] leading-none" dir="rtl">مُحاسَبَة</p>
        <h2 className="font-serif text-xl text-[#e8dcc8] mt-1">{t('ajv2.mengapa_muhasabah', 'Mengapa Muhasabah?')}</h2>
      </div>

      {/* Quran verse */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-3 text-center">
        <p className="font-serif text-[#c9a96e] text-lg leading-loose" dir="rtl">
          أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
        </p>
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">
          "{t('ajv2.quran_rad_28', 'Ketahuilah bahawa dengan mengingati Allah, hati-hati akan menjadi tenteram.')}"
          — Ar-Ra'd: 28
        </p>
      </div>

      {/* Free: short explanation */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          {t('ajv2.foundation_short', 'Dunia moden merawat badan (gym, diet, tidur) tetapi melupakan jiwa. Hasilnya: badan sihat, hati kosong — anxieti, depresi, hilang arah. Penyelesaian Islam: audit BERSEPADU. Apabila RUH (akar) sembuh, segalanya sembuh.')}
        </p>
      </div>

      {/* Pro: 4 pillar breakdown */}
      {isPro && (
        <div className="space-y-3">
          {PILLARS.map(p => {
            const cfg = PILLAR_CONFIG[p]
            return (
              <div key={p} className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cfg.icon}</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: cfg.text }}>
                      {t(`ajv2.pillar_${p}`, p)} — {t(`ajv2.pillar_${p}_sub`, '')}
                    </p>
                  </div>
                </div>
                <p className="text-[#8a7a65] text-xs leading-relaxed">
                  {t(`ajv2.foundation_${p}`, '')}
                </p>
              </div>
            )
          })}

          {/* Cascade diagram */}
          <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-3">
            <p className="text-[#c9a96e] font-semibold text-sm">{t('ajv2.cascade_title', 'Kesan Kaskad')}</p>
            <div className="space-y-0.5 text-sm">
              {[
                { p: 'ruh' as PillarKey, suffix: t('ajv2.cascade_root_label', '← Akar') },
                { p: 'hati' as PillarKey, suffix: t('ajv2.bergantung_ruh', '← bergantung pada Ruh') },
                { p: 'akal' as PillarKey, suffix: t('ajv2.bergantung_hati', '← bergantung pada Hati') },
                { p: 'raga' as PillarKey, suffix: t('ajv2.bergantung_akal', '← bergantung pada Akal') },
              ].map(({ p, suffix }, idx) => {
                const cfg = PILLAR_CONFIG[p]
                return (
                  <div key={p}>
                    {idx > 0 && <p className="text-[#8a7a65] text-xs pl-7">↓</p>}
                    <div className="flex items-center gap-2">
                      <span>{cfg.icon}</span>
                      <span className="font-medium" style={{ color: cfg.text }}>{t(`ajv2.pillar_${p}`, p)}</span>
                      <span className="text-[#8a7a65] text-xs">{suffix}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[#8a7a65] text-xs italic">
              {t('ajv2.cascade_desc', 'Bila RUH (akar) sembuh → Hati tenang → Akal jernih → Raga kuat.')}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full py-4 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}
      >
        {t('ajv2.teruskan_penilaian', 'Teruskan ke Penilaian →')}
      </button>
    </div>
  )
}

// ─── Phase: Assessment ────────────────────────────────────────────────────────

function AssessmentScreen({
  pillarIndex,
  responses,
  onAnswer,
  onNext,
  onPrev,
  userTier,
  isLast,
}: {
  pillarIndex: number
  responses: Responses
  onAnswer: (qId: string, val: number) => void
  onNext: () => void
  onPrev: () => void
  userTier: string
  isLast: boolean
}) {
  const { t } = useTranslation()
  const isPro = userTier !== 'free'
  const lang = (localStorage.getItem('madrasah_language') ?? 'bm') as AppLanguage
  const pillar = PILLARS[pillarIndex]
  const cfg = PILLAR_CONFIG[pillar]
  const activeQuestions = getActiveQuestions(isPro)
  const pillarQs = activeQuestions.filter(q => q.pillar === pillar)
  const allAnswered = pillarQs.every(q => responses[q.id] != null)
  const totalAnswered = activeQuestions.filter(q => responses[q.id] != null).length
  const totalPct = Math.round((totalAnswered / activeQuestions.length) * 100)

  return (
    <div className="space-y-5 pb-8">
      {/* Overall progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#8a7a65]">{t('ajv2.penilaian', 'Penilaian')}</span>
          <span className="text-xs font-medium text-[#c9a96e] tabular-nums">
            {totalAnswered}/{activeQuestions.length}
          </span>
        </div>
        <div className="h-1.5 bg-[#1e2d40] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#c9a96e] rounded-full transition-all duration-500"
            style={{ width: `${totalPct}%` }}
          />
        </div>
      </div>

      {/* Pillar step indicators */}
      <div className="flex gap-1.5">
        {PILLARS.map((p, i) => {
          const pCfg = PILLAR_CONFIG[p]
          const pDone = activeQuestions.filter(q => q.pillar === p).every(q => responses[q.id] != null)
          const isCurrent = i === pillarIndex
          return (
            <div
              key={p}
              className="flex-1 h-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: pDone || isCurrent ? pCfg.border : '#1e2d40',
                opacity: isCurrent || pDone ? 1 : 0.35,
              }}
            />
          )
        })}
      </div>

      {/* Pillar header */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}40` }}
        >
          {cfg.icon}
        </div>
        <div>
          <p className="text-xs text-[#8a7a65] uppercase tracking-wider">
            {t('ajv2.pillar_label', 'Pillar')} {pillarIndex + 1} {t('ajv2.dari', 'daripada')} 4
          </p>
          <h2 className="font-serif text-lg" style={{ color: cfg.text }}>
            {t(`ajv2.pillar_${pillar}`, pillar)}
            <span className="text-sm text-[#8a7a65] font-sans ml-2">
              — {t(`ajv2.pillar_${pillar}_sub`, '')}
            </span>
          </h2>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {pillarQs.map((q, idx) => {
          const answered = responses[q.id] != null
          return (
            <div
              key={q.id}
              className="bg-[#0d1821] rounded-2xl p-5 space-y-4 transition-colors duration-200"
              style={{ border: `1px solid ${answered ? cfg.border + '40' : '#1e2d40'}` }}
            >
              {/* Pro: Quran context */}
              {isPro && q.quran_text_bm && (
                <div className="bg-[#060d16] rounded-xl px-4 py-3 space-y-1">
                  <p className="text-[#c9a96e] text-[10px] font-medium">{q.quran_ref}</p>
                  <p className="text-[#8a7a65] text-xs italic leading-relaxed">{q.quran_text_bm}</p>
                </div>
              )}

              {/* Question number + text */}
              <div className="flex items-start gap-2.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 transition-colors"
                  style={{
                    backgroundColor: answered ? cfg.border : '#1e2d40',
                    color: answered ? '#060d16' : '#8a7a65',
                  }}
                >
                  {idx + 1}
                </div>
                <p className="text-[#e8dcc8] text-sm leading-relaxed">{q.text[lang]}</p>
              </div>

              {/* Emoji scale */}
              <ScaleSelector value={responses[q.id] ?? null} onChange={v => onAnswer(q.id, v)} />

              {/* Scale labels */}
              <div className="flex justify-between px-0.5">
                <span className="text-[#8a7a65] text-[9px]">{t('ajv2.scale_1', 'Sangat Buruk')}</span>
                <span className="text-[#8a7a65] text-[9px]">{t('ajv2.scale_5', 'Sangat Baik')}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {pillarIndex > 0 && (
          <button
            onClick={onPrev}
            className="flex items-center gap-2 px-4 py-3 border border-[#1e2d40] rounded-xl text-sm text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors"
          >
            <ChevronLeft size={16} />
            {t('umum.kembali', 'Kembali')}
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!allAnswered}
          className={cn(
            'flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
            !allAnswered && 'bg-[#0d1821] border border-[#1e2d40] text-[#8a7a65] cursor-not-allowed opacity-60'
          )}
          style={allAnswered ? {
            background: `linear-gradient(135deg, ${cfg.border}, ${cfg.border}cc)`,
            color: '#060d16',
          } : {}}
        >
          {isLast
            ? t('ajv2.lihat_keputusan', 'Lihat Keputusan')
            : t('ajv2.pillar_seterusnya', 'Pillar Seterusnya')}
          <ChevronRight size={16} />
        </button>
      </div>

      {!allAnswered && (
        <p className="text-center text-[#8a7a65] text-xs">
          {t('ajv2.jawab_semua', 'Jawab semua soalan untuk teruskan')}
        </p>
      )}
    </div>
  )
}

// ─── Phase: Results ───────────────────────────────────────────────────────────

function ResultsScreen({
  scores,
  userTier,
  onJana,
  onUpgrade,
}: {
  scores: PillarScores
  userTier: string
  onJana: () => void
  onUpgrade: () => void
}) {
  const { t } = useTranslation()
  const isPro = userTier !== 'free'
  const weakest = getWeakestPillar(scores)
  const wcfg = PILLAR_CONFIG[weakest]

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h2 className="font-serif text-2xl text-[#e8dcc8]">{t('ajv2.keputusan', 'Keputusan Audit')}</h2>
        <p className="text-[#8a7a65] text-sm">
          {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Score cards */}
      <div className="space-y-3">
        {PILLARS.map(p => <ScoreBar key={p} pillar={p} score={scores[p]} />)}
      </div>

      {/* Root problem highlight */}
      <div
        className="bg-[#0d1821] rounded-2xl p-5 space-y-2"
        style={{ border: `1px solid ${wcfg.border}40` }}
      >
        <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider">
          {t('ajv2.punca_utama', 'Punca Utama')}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{wcfg.icon}</span>
          <div>
            <p className="font-medium text-sm" style={{ color: wcfg.text }}>
              {t(`ajv2.pillar_${weakest}`, weakest)} — {scores[weakest].toFixed(1)}/10
            </p>
            <p className="text-[#8a7a65] text-xs leading-relaxed">
              {t('ajv2.cascade_root_desc', 'Sembuhkan ini dulu — ia akan memberi kesan positif kepada seluruh jiwa anda.')}
            </p>
          </div>
        </div>
      </div>

      {/* Pro: integrated cascade analysis */}
      {isPro && (
        <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider">
            {t('ajv2.analisis_bersepadu', 'Analisis Bersepadu')}
          </p>
          <p className="text-[#e8dcc8] text-sm leading-relaxed">
            {t('ajv2.analisis_desc', 'Ruh adalah akar pokok jiwa. Apabila Ruh lemah, ia memberi kesan kepada seluruh diri — hati menjadi gelisah, fikiran menjadi kabur, badan merasakan tekanan.')}
          </p>
          <div className="bg-[#060d16] rounded-xl p-4 space-y-1 text-center">
            <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
              أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
            </p>
            <p className="text-[#8a7a65] text-xs italic">
              "{t('ajv2.quran_rad_28', 'Ketahuilah, dengan mengingati Allah hati-hati akan menjadi tenteram.')}" — Ar-Ra'd: 28
            </p>
          </div>
        </div>
      )}

      {/* Free: upsell card — tunjuk terus selepas 12 soalan tanpa perlu tunggu AI */}
      {!isPro && (
        <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider">
            {t('ajv2.upsell_title', 'Audit Lebih Mendalam?')}
          </p>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {t('ajv2.upsell_desc', 'Ini snapshot ringkas 4 dimensi anda. Untuk audit penuh — 30 soalan, analisis mendalam setiap dimensi — naik taraf ke Pro.')}
          </p>
          <button
            onClick={onUpgrade}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}
          >
            {t('ajv2.upsell_cta', 'Audit Lebih Mendalam (30 Soalan) — Naik Taraf ke Pro')}
          </button>
        </div>
      )}

      <button
        onClick={onJana}
        className="w-full py-4 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}
      >
        {t('ajv2.jana_preskripsi', 'Jana Preskripsi Peribadi')} ✦
      </button>
    </div>
  )
}

// ─── Para Pembimbing Contact Links ───────────────────────────────────────────

const WA_CARI = `https://wa.me/60182119135?text=${encodeURIComponent('Assalamualaikum, saya dari app Madrasah I AM.\n\nSaya ingin mencari Para Pembimbing berdekatan kawasan saya.\n\nMohon bimbingan. Terima kasih.')}`
const WA_TANYA = `https://wa.me/60182119135?text=${encodeURIComponent('Assalamualaikum, saya dari app Madrasah I AM.\n\nSaya telah selesai Audit Jiwa dan ingin bertanya tentang perjalanan rohani saya.\n\nMohon bimbingan. Terima kasih.')}`
const TG_MAJLIS = 'https://t.me/+7Bisf3e1cd4xYTA9'

// ─── Phase: Recommendation ────────────────────────────────────────────────────

function RecommendationScreen({ text, isPro, onUpgrade, onReset }: { text: string; isPro: boolean; onUpgrade: () => void; onReset: () => void }) {
  const { t } = useTranslation()
  const [showWho, setShowWho] = useState(false)

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <p className="font-serif text-4xl text-[#c9a96e] leading-none" dir="rtl">تَشْخِيص</p>
        <h2 className="font-serif text-xl text-[#e8dcc8] mt-1">{t('ajv2.diagnosis_title', 'Diagnosis Jiwa Anda')}</h2>
        <p className="text-[#8a7a65] text-sm">
          {isPro
            ? t('ajv2.diagnosis_sub_pro', 'Berdasarkan audit penuh 30 soalan anda')
            : t('ajv2.diagnosis_sub_free', 'Berdasarkan snapshot 12 soalan anda')}
        </p>
      </div>

      {/* AI Diagnosis content */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center flex-shrink-0">
            <span className="font-serif text-[#c9a96e] text-sm">✦</span>
          </div>
          <p className="text-[#c9a96e] text-sm font-medium">{t('ajv2.madrasah_label', 'Madrasah I AM')}</p>
        </div>
        <div className="h-px bg-[#1e2d40]" />
        <div className="markdown-content text-[#e8dcc8] text-sm leading-relaxed">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>

      {/* Free: upsell to full 30-question Pro audit */}
      {!isPro && (
        <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider">
            {t('ajv2.upsell_title', 'Audit Lebih Mendalam?')}
          </p>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {t('ajv2.upsell_desc', 'Ini snapshot ringkas 4 dimensi anda. Untuk audit penuh — 30 soalan, analisis mendalam setiap dimensi — naik taraf ke Pro.')}
          </p>
          <button
            onClick={onUpgrade}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}
          >
            {t('ajv2.upsell_cta', 'Audit Lebih Mendalam (30 Soalan) — Naik Taraf ke Pro')}
          </button>
        </div>
      )}

      {/* Primary CTA — Para Pembimbing */}
      <div className="bg-gradient-to-br from-[#c9a96e18] to-[#a0784010] border border-[#c9a96e40] rounded-2xl p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider">
            {t('ajv2.langkah_seterusnya', 'Langkah Seterusnya')}
          </p>
          <h3 className="font-serif text-lg text-[#e8dcc8]">{t('ajv2.wt_cta_title', 'Hubungi Para Pembimbing')}</h3>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {t('ajv2.wt_cta_sub', 'Ingin mendalami cara untuk merawat jiwa? Sila berhubungi Para Pembimbing kami.')}
          </p>
        </div>

        <div className="space-y-2">
          {[
            {
              icon: '🔍',
              label: t('ajv2.wt_find', 'Cari Para Pembimbing Berdekatan'),
              desc: t('ajv2.wt_find_desc', 'Jumpa Para Pembimbing di kawasan anda'),
              href: WA_CARI,
            },
            {
              icon: '💬',
              label: t('ajv2.wt_message', 'Hantar Pertanyaan'),
              desc: t('ajv2.wt_message_desc', 'Tanya soalan dan dapatkan respons'),
              href: WA_TANYA,
            },
            {
              icon: '🕌',
              label: t('ajv2.wt_event', 'Sertai Majlis Zikir Live'),
              desc: t('ajv2.wt_event_desc', 'Hadir secara dalam talian atau fizikal'),
              href: TG_MAJLIS,
            },
          ].map(opt => (
            <a
              key={opt.label}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 p-3.5 bg-[#060d1680] border border-[#c9a96e25] rounded-xl hover:bg-[#c9a96e08] hover:border-[#c9a96e50] transition-all text-left"
            >
              <span className="text-xl flex-shrink-0">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[#e8dcc8] text-sm font-medium">{opt.label}</p>
                <p className="text-[#8a7a65] text-xs">{opt.desc}</p>
              </div>
              <ChevronRight size={14} className="text-[#8a7a65] flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Who are Para Pembimbing? — collapsible */}
      <div className="border border-[#1e2d40] rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowWho(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-[#c9a96e] hover:bg-[#c9a96e08] transition-colors"
        >
          <span className="flex items-center gap-2">
            <BookOpen size={14} />
            {t('ajv2.wt_who_title', 'Siapakah Para Pembimbing?')}
          </span>
          <ChevronDown size={16} className={cn('transition-transform', showWho && 'rotate-180')} />
        </button>
        {showWho && (
          <div className="px-4 pb-4 border-t border-[#1e2d40] space-y-3">
            <p className="text-[#8a7a65] text-sm leading-relaxed pt-3">
              {t('ajv2.wt_who_body', 'Para Pembimbing ialah pembimbing rohani yang diberi izin untuk membimbing murid dalam perjalanan jiwa. Mereka memberikan bimbingan berterusan atas nama Mursyid dan membantu murid mendekatkan diri kepada Allah.')}
            </p>
            <div className="space-y-2">
              {[
                t('ajv2.wt_step1', 'Para Pembimbing mendengar keadaan dan latar belakang anda'),
                t('ajv2.wt_step2', 'Penilaian rohani peribadi dibuat bersama'),
                t('ajv2.wt_step3', 'Panduan amalan diberikan pada masa yang sesuai'),
                t('ajv2.wt_step4', 'Bimbingan dan pemantauan berterusan bermula'),
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-[#c9a96e] text-xs font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <p className="text-[#8a7a65] text-xs leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preparation while waiting */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
        <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider">
          {t('ajv2.wt_prep_title', 'Persediaan Sambil Menunggu')}
        </p>
        <div className="space-y-2">
          {[
            t('ajv2.wt_prep1', '🤲 Niatkan hati untuk berubah kerana Allah semata-mata'),
            t('ajv2.wt_prep2', '📖 Baca Surah Al-Fatiha setiap pagi dengan penghayatan'),
            t('ajv2.wt_prep3', '💧 Jaga wudhu selama mungkin sepanjang hari'),
            t('ajv2.wt_prep4', '🌙 Utamakan solat Isya & Subuh — jaga kualiti bukan kuantiti'),
            t('ajv2.wt_prep5', '📝 Catat perjalanan jiwa harian dalam Muhasabah'),
          ].map((step, i) => (
            <p key={i} className="text-[#8a7a65] text-xs leading-relaxed">{step}</p>
          ))}
        </div>
      </div>

      {/* Link to Amalan Jiwa */}
      <button className="w-full flex items-center justify-between px-4 py-3.5 bg-[#0d1821] border border-[#1e2d40] rounded-2xl text-sm hover:bg-[#c9a96e08] hover:border-[#c9a96e30] transition-all">
        <span className="text-[#8a7a65]">{t('ajv2.wt_amalan_link', 'Sudah ada panduan Para Pembimbing? Lihat Amalan Jiwa')}</span>
        <ChevronRight size={14} className="text-[#8a7a65]" />
      </button>

      {/* Reset — buat audit baru */}
      <button
        onClick={onReset}
        className="w-full py-3 rounded-2xl text-sm text-[#8a7a65] border border-[#1e2d40] hover:text-[#e8dcc8] hover:border-[#c9a96e30] transition-all"
      >
        {t('ajv2.audit_semula', '↺ Audit Semula')}
      </button>
    </div>
  )
}

// ─── Phase: Done (already completed today) ────────────────────────────────────

function DoneScreen({ session, onReset }: { session: SavedSession; onReset: () => void }) {
  const { t } = useTranslation()
  const [showRec, setShowRec] = useState(false)

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <p className="font-serif text-3xl text-[#c9a96e] leading-none" dir="rtl">مُحاسَبَة</p>
        <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">{t('ajv2.tajuk', 'Audit Jiwa')}</h1>
      </div>

      {/* Done badge */}
      <div className="flex items-center justify-center gap-3 py-5 bg-[#0d1821] border border-[#c9a96e30] rounded-2xl">
        <CheckCircle2 size={22} className="text-[#c9a96e]" />
        <div>
          <p className="text-[#c9a96e] font-medium font-serif">
            {t('ajv2.hari_ini_selesai', 'Audit Jiwa Hari Ini Selesai')}
          </p>
          <p className="text-[#8a7a65] text-xs">
            {new Date(session.completed_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Today's scores */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider px-1">
          {t('ajv2.nilai_anda', 'Nilai Anda Hari Ini')}
        </p>
        {PILLARS.map(p => <ScoreBar key={p} pillar={p} score={session.scores[p]} />)}
      </div>

      {/* Para Pembimbing CTA */}
      <a
        href={WA_TANYA}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-gradient-to-br from-[#c9a96e18] to-[#a0784010] border border-[#c9a96e30] rounded-2xl px-4 py-3.5 flex items-center justify-between hover:border-[#c9a96e50] transition-all"
      >
        <div className="space-y-0.5">
          <p className="text-[#c9a96e] text-sm font-medium">{t('ajv2.wt_cta_title', 'Hubungi Para Pembimbing')}</p>
          <p className="text-[#8a7a65] text-xs">{t('ajv2.wt_done_sub', 'Teruskan perjalanan rohani bersama pembimbing')}</p>
        </div>
        <ChevronRight size={16} className="text-[#c9a96e]" />
      </a>

      {/* View AI diagnosis */}
      {session.recommendation_text && (
        <div className="space-y-2">
          <button
            onClick={() => setShowRec(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-[#0d1821] border border-[#c9a96e20] rounded-2xl text-sm text-[#c9a96e] hover:bg-[#c9a96e08] transition-colors"
          >
            <span>✦ {t('ajv2.lihat_diagnosis', 'Lihat Diagnosis Jiwa Anda')}</span>
            <ChevronDown size={16} className={cn('transition-transform', showRec && 'rotate-180')} />
          </button>
          {showRec && (
            <div className="markdown-content bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 text-[#e8dcc8] text-sm leading-relaxed">
              <ReactMarkdown>{session.recommendation_text}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full py-3 rounded-2xl text-sm text-[#8a7a65] border border-[#1e2d40] hover:text-[#e8dcc8] hover:border-[#c9a96e30] transition-all"
      >
        {t('ajv2.audit_semula', '↺ Audit Semula')}
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function AuditUpgradeModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [loadingPkg, setLoadingPkg] = useState<'pro' | 'pro_plus' | null>(null)
  const [error, setError] = useState('')

  async function handleUpgrade(pkg: 'pro' | 'pro_plus') {
    if (!user) return
    setError('')
    setLoadingPkg(pkg)
    try {
      const res = await fetch('/api/create-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, email: user.email, nama: user.name ?? user.email, package: pkg }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data?.error?.message ?? t('ajv2.upgrade.ralat_bil'))
      window.location.href = data.url
    } catch {
      setError(t('ajv2.upgrade.ralat_bayar'))
      setLoadingPkg(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onClose}>
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-[#c9a96e]" />
          <p className="text-[#c9a96e] font-medium text-sm">{t('ajv2.upgrade.tajuk')}</p>
        </div>
        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          {t('ajv2.upgrade.desc')}
        </p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="space-y-2">
          <button onClick={() => handleUpgrade('pro')} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loadingPkg === 'pro' && <Loader2 size={14} className="animate-spin" />}
            {t('ajv2.upgrade.pro')}
          </button>
          <button onClick={() => handleUpgrade('pro_plus')} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loadingPkg === 'pro_plus' && <Loader2 size={14} className="animate-spin" />}
            {t('ajv2.upgrade.pro_plus')}
          </button>
          <button onClick={onClose} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl border border-[#1e2d40] text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors disabled:opacity-60">
            {t('umum.tutup')}
          </button>
        </div>
      </div>
    </div>
  )
}

const FREE_AUDIT_LIMIT = 2
const DAILY_AUDIT_KEY = (uid: string) => `madrasah_free_audit_${uid}`

function getDailyAuditCount(userId: string): number {
  try {
    const raw = localStorage.getItem(DAILY_AUDIT_KEY(userId))
    if (!raw) return 0
    const { date, count } = JSON.parse(raw) as { date: string; count: number }
    return date === format(new Date(), 'yyyy-MM-dd') ? count : 0
  } catch { return 0 }
}

function incrementDailyAuditCount(userId: string): number {
  try {
    const today = format(new Date(), 'yyyy-MM-dd')
    const next = getDailyAuditCount(userId) + 1
    localStorage.setItem(DAILY_AUDIT_KEY(userId), JSON.stringify({ date: today, count: next }))
    return next
  } catch { return 0 }
}

export default function AuditJiwaPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { data: todayEntry } = useTodayAuditJiwa()
  const { mutate: saveAuditToSupabase } = useSaveAuditJiwa()

  const isPro = user?.tier === 'pro' || user?.tier === 'family'
  const userTier = isPro ? 'pro' : 'free'

  const [dailyAuditCount, setDailyAuditCount] = useState(() =>
    user ? getDailyAuditCount(user.id) : 0
  )
  const isFreeLimitReached = !isPro && dailyAuditCount >= FREE_AUDIT_LIMIT

  const [phase, setPhase] = useState<Phase>('opening')
  const [pillarIndex, setPillarIndex] = useState(0)
  const [responses, setResponses] = useState<Responses>({})
  const [scores, setScores] = useState<PillarScores | null>(null)
  const [recommendation, setRecommendation] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [loadingSeconds, setLoadingSeconds] = useState(0)
  const [aiError, setAiError] = useState('')
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null)
  // Mencegah Supabase fallback-effect daripada membatalkan "Audit Semula"
  const [didReset, setDidReset] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const pendingScores = useRef<PillarScores | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastSessionRef = useRef<SavedSession | null>(null)

  // On mount: check if already completed today, restore draft
  useEffect(() => {
    if (!user?.id) return
    const session = loadSession(user.id)
    if (session) {
      setSavedSession(session)
      setPhase('done')
    } else {
      const draft = loadDraft(user.id)
      if (Object.keys(draft).length > 0) setResponses(draft)
    }
  }, [user?.id])

  // Fallback: jika tiada di localStorage (cth. tukar device) tapi sudah selesai di Supabase.
  // Jangan jalankan jika user baru klik "Audit Semula" (didReset=true) supaya
  // cache Supabase yang masih ada tidak membatalkan reset.
  useEffect(() => {
    if (!user?.id || savedSession || !todayEntry?.selesai || didReset) return
    const session: SavedSession = {
      scores: {
        raga: todayEntry.pillar_raga,
        hati: todayEntry.pillar_hati,
        akal: todayEntry.pillar_akal,
        ruh: todayEntry.pillar_ruh,
      },
      responses: {},
      recommendation_text: todayEntry.cadangan_ai,
      completed_at: todayEntry.created_at,
    }
    saveSession(user.id, session)
    setSavedSession(session)
    setPhase('done')
  }, [user?.id, todayEntry, savedSession, didReset])

  // Loading timer
  useEffect(() => {
    if (!aiLoading) { setLoadingSeconds(0); return }
    const timer = setInterval(() => setLoadingSeconds(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [aiLoading])

  // Cleanup abort on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  function handleAnswer(qId: string, val: number) {
    const updated = { ...responses, [qId]: val }
    setResponses(updated)
    if (user?.id) saveDraft(user.id, updated)
  }

  function handleAssessmentNext() {
    if (pillarIndex < PILLARS.length - 1) {
      setPillarIndex(p => p + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const s = calculateScores(responses, isPro)
      setScores(s)
      pendingScores.current = s
      setPhase('results')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleAssessmentPrev() {
    setPillarIndex(p => Math.max(0, p - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const generateRecommendation = useCallback(async (s: PillarScores) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setAiLoading(true)
    setAiError('')

    const lang = user?.language ?? (localStorage.getItem('madrasah_language') ?? 'bm')
    const weakest = getWeakestPillar(s)
    const userMsg = [
      'Hasil Audit Jiwa saya:',
      `- RAGA (Fizikal): ${s.raga.toFixed(1)}/10`,
      `- HATI (Emosi): ${s.hati.toFixed(1)}/10`,
      `- AKAL (Mental): ${s.akal.toFixed(1)}/10`,
      `- RUH (Rohani): ${s.ruh.toFixed(1)}/10`,
      '',
      `Pillar paling lemah: ${weakest.toUpperCase()} (${s[weakest].toFixed(1)}/10)`,
      `user_tier: ${userTier}`,
      `Audit: ${isPro ? 'penuh (30 soalan)' : 'snapshot ringkas (12 soalan)'}`,
      `Bahasa respons: ${lang}`,
      '',
      'Sila jana preskripsi rohani yang peribadi untuk saya.',
    ].join('\n')

    try {
      const text = await sendAuditRecommendation(userMsg, userTier, abortRef.current.signal)
      setRecommendation(text)
      setAiLoading(false)

      if (user?.id && pendingScores.current) {
        const session: SavedSession = {
          scores: pendingScores.current,
          responses,
          recommendation_text: text,
          completed_at: new Date().toISOString(),
        }
        saveSession(user.id, session)
        clearDraft(user.id)

        const ps = pendingScores.current
        saveAuditToSupabase({
          pillar_raga: ps.raga,
          pillar_hati: ps.hati,
          pillar_akal: ps.akal,
          pillar_ruh: ps.ruh,
          jumlah_skor: Math.round(((ps.raga + ps.hati + ps.akal + ps.ruh) / 4) * 10),
          cadangan_ai: text,
          soalan_dijawab: Object.keys(responses).length,
        })
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      console.error('[AuditJiwa] AI error:', err)
      setAiError(t('auditJiwa.aiRehat', 'I AM sedang berehat sebentar. Sila cuba lagi dalam beberapa minit. 🌙'))
      setAiLoading(false)
    }
  }, [userTier, user?.language, user?.id, responses, t, saveAuditToSupabase])

  function handleJanaPreskripsi() {
    if (!scores) return
    pendingScores.current = scores
    setPhase('recommendation')
    setAiLoading(true)
    generateRecommendation(scores)
  }

  function handleRetry() {
    if (pendingScores.current) {
      setAiLoading(true)
      setAiError('')
      generateRecommendation(pendingScores.current)
    }
  }

  async function handleViewLastAudit() {
    if (!user?.id) return
    // Fast path: in-session ref (no Supabase call needed)
    if (lastSessionRef.current) {
      setSavedSession(lastSessionRef.current)
      setPhase('done')
      return
    }
    // Fallback: fetch from Supabase (covers page refresh scenario)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('audit_jiwa_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('tarikh', today)
        .eq('selesai', true)
        .maybeSingle() as { data: AuditJiwaEntry | null, error: unknown }
      if (data) {
        const session: SavedSession = {
          scores: { raga: data.pillar_raga, hati: data.pillar_hati, akal: data.pillar_akal, ruh: data.pillar_ruh },
          responses: {},
          recommendation_text: data.cadangan_ai,
          completed_at: data.created_at,
        }
        setSavedSession(session)
        setPhase('done')
      }
    } catch { /* ignore */ }
  }

  function handleReset() {
    setDidReset(true)
    if (!isPro && user?.id) {
      const newCount = incrementDailyAuditCount(user.id)
      setDailyAuditCount(newCount)
      if (newCount >= FREE_AUDIT_LIMIT) {
        lastSessionRef.current = savedSession
      }
    }
    if (user?.id) {
      try {
        localStorage.removeItem(getTodayKey(user.id))
        clearDraft(user.id)
        // Null-kan cache Supabase dengan segera supaya Fallback-effect tak mencetus 'done'
        const today = new Date().toISOString().split('T')[0]
        queryClient.setQueryData(['audit-jiwa', user.id, today], null)
      } catch { /* ignore */ }
    }
    setPhase('opening')
    setResponses({})
    setPillarIndex(0)
    setScores(null)
    setRecommendation('')
    setSavedSession(null)
    setAiError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showMiniHeader = phase !== 'opening' && phase !== 'done'

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">
      {/* Mini header for non-opening phases */}
      {showMiniHeader && (
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-serif text-3xl text-[#c9a96e] leading-none" dir="rtl">مُحاسَبَة</p>
            <h1 className="font-serif text-xl text-[#e8dcc8] mt-0.5">{t('ajv2.tajuk', 'Audit Jiwa')}</h1>
          </div>
          <span
            className={cn(
              'text-xs px-2.5 py-1 rounded-lg border mt-1',
              isPro
                ? 'bg-[#c9a96e15] text-[#c9a96e] border-[#c9a96e30]'
                : 'bg-[#1e2d40] text-[#8a7a65] border-[#1e2d40]'
            )}
          >
            {isPro ? '✦ Pro' : t('iam.percuma', 'Percuma')}
          </span>
        </div>
      )}

      {/* Phase: Opening — Free limit gate */}
      {phase === 'opening' && user && isFreeLimitReached && (
        <div className="space-y-5 py-4">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center mx-auto">
              <span className="font-serif text-[#c9a96e] text-2xl">✦</span>
            </div>
            <p className="font-serif text-3xl text-[#c9a96e] leading-none" dir="rtl">مُحاسَبَة</p>
            <h2 className="font-serif text-xl text-[#e8dcc8]">{t('ajv2.tajuk', 'Audit Jiwa')}</h2>
          </div>
          <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 space-y-3 text-center">
            <p className="text-[#c9a96e] text-sm font-medium">
              {t('ajv2.had_percuma_tajuk', 'Had Audit Harian Dicapai')}
            </p>
            <p className="text-[#8a7a65] text-sm leading-relaxed">
              {t('ajv2.had_percuma_desc', `Anda telah mencapai had ${FREE_AUDIT_LIMIT} audit percuma hari ini. Esok anda boleh audit semula — atau naik taraf ke Pro untuk audit lebih mendalam (30 soalan) tanpa had.`)}
            </p>
            <div className="bg-[#060d16] rounded-xl p-3">
              <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
                أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
              </p>
              <p className="text-[#8a7a65] text-xs italic mt-1">"Ketahuilah, dengan mengingati Allah hati-hati akan menjadi tenteram." — Ar-Ra'd: 28</p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}
            >
              {t('ajv2.upsell_cta', 'Audit Lebih Mendalam (30 Soalan) — Naik Taraf ke Pro')}
            </button>
            <button
              onClick={handleViewLastAudit}
              className="w-full py-2.5 rounded-xl border border-[#1e2d40] text-[#8a7a65] text-sm hover:text-[#e8dcc8] hover:border-[#c9a96e30] transition-all"
            >
              ← {t('ajv2.lihat_audit_terakhir', 'Lihat Semula Audit Terakhir')}
            </button>
          </div>
          <p className="text-center text-[#8a7a65] text-xs">
            {t('ajv2.had_percuma_nota', `${dailyAuditCount} daripada ${FREE_AUDIT_LIMIT} audit percuma digunakan hari ini`)}
          </p>
        </div>
      )}

      {/* Phase: Opening */}
      {phase === 'opening' && user && !isFreeLimitReached && (
        <OpeningScreen
          user={user}
          isPro={isPro}
          onStart={() => { setPhase('assessment'); window.scrollTo({ top: 0 }) }}
          onLearnMore={() => { setPhase('foundation'); window.scrollTo({ top: 0 }) }}
        />
      )}

      {/* Phase: Foundation */}
      {phase === 'foundation' && (
        <FoundationScreen
          userTier={userTier}
          onContinue={() => { setPhase('assessment'); window.scrollTo({ top: 0 }) }}
        />
      )}

      {/* Phase: Assessment */}
      {phase === 'assessment' && (
        <AssessmentScreen
          pillarIndex={pillarIndex}
          responses={responses}
          onAnswer={handleAnswer}
          onNext={handleAssessmentNext}
          onPrev={handleAssessmentPrev}
          userTier={userTier}
          isLast={pillarIndex === PILLARS.length - 1}
        />
      )}

      {/* Phase: Results */}
      {phase === 'results' && scores && (
        <ResultsScreen scores={scores} userTier={userTier} onJana={handleJanaPreskripsi} onUpgrade={() => setShowUpgradeModal(true)} />
      )}

      {/* Phase: Recommendation */}
      {phase === 'recommendation' && (
        <>
          {aiLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
                <span className="font-serif text-[#c9a96e] text-2xl">✦</span>
              </div>
              <div className="text-center space-y-3">
                <p className="text-[#c9a96e] text-sm font-medium">
                  {t('ajv2.loading', 'Menyediakan preskripsi anda...')}
                </p>
                <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
                  أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
                </p>
                <div className="flex gap-1.5 justify-center">
                  {[0, 150, 300].map(d => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 bg-[#8a7a65] rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
              {loadingSeconds >= 4 && (
                <p className="text-[#8a7a65] text-xs text-center leading-relaxed">
                  {t('ajv2.loading_sabar', 'Mengambil masa sedikit. Terima kasih atas kesabaran anda.')}
                </p>
              )}
              {aiError && (
                <div className="w-full space-y-2">
                  <p className="text-red-400 text-xs text-center">{aiError}</p>
                  <button
                    onClick={handleRetry}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#c9a96e40] text-[#c9a96e] text-sm hover:bg-[#c9a96e10] transition-colors"
                  >
                    <RotateCcw size={14} /> {t('umum.cuba_semula', 'Cuba Semula')}
                  </button>
                </div>
              )}
            </div>
          ) : recommendation ? (
            <RecommendationScreen text={recommendation} isPro={isPro} onUpgrade={() => setShowUpgradeModal(true)} onReset={handleReset} />
          ) : (
            /* API error or empty state — show error + retry */
            <div className="flex flex-col items-center py-16 gap-4">
              {aiError ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-red-50010 border border-red-40030 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <p className="text-red-400 text-sm text-center leading-relaxed max-w-xs">{aiError}</p>
                  <button
                    onClick={handleRetry}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#c9a96e40] text-[#c9a96e] text-sm hover:bg-[#c9a96e10] transition-colors"
                  >
                    <RotateCcw size={14} /> {t('umum.cuba_semula', 'Cuba Semula')}
                  </button>
                </>
              ) : (
                <>
                  <Loader2 size={24} className="text-[#c9a96e] animate-spin" />
                  <p className="text-[#8a7a65] text-sm">{t('ajv2.loading', 'Menyediakan preskripsi...')}</p>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Phase: Done */}
      {phase === 'done' && savedSession && (
        <DoneScreen session={savedSession} onReset={handleReset} />
      )}

      {showUpgradeModal && <AuditUpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  )
}
