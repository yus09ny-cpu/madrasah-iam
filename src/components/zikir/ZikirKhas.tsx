import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, Lock, ArrowLeft, Play, Square } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSaveZikir } from '@/hooks/useZikir'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// ─── Penerangan Screen ────────────────────────────────────────────────────────

const TALQIN_MSG = encodeURIComponent(
  'Assalamualaikum, saya dari app Madrasah I AM.\n\nSaya ingin mengetahui lebih lanjut tentang Zikir Jahar dan Zikir Khafi.\n\nMohon bimbingan. Terima kasih.'
)
const WA_LINK = `https://wa.me/60182119135?text=${TALQIN_MSG}`
const TG_LINK = 'https://t.me/+7Bisf3e1cd4xYTA9'

function PeneranganScreen({
  onYa,
  onKembali,
}: {
  onYa: () => void
  onKembali: () => void
}) {

  return (
    <div className="space-y-6">

      {/* ── SKRIN 1 — HERO ─────────────────────────────────────────────── */}
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center mx-auto">
          <span className="font-serif text-[#c9a96e] text-2xl">✦</span>
        </div>
        <div className="space-y-2">
          <p className="font-serif text-[#c9a96e] text-2xl leading-loose" dir="rtl">
            وَلَذِكْرُ اللَّهِ أَكْبَرُ
          </p>
          <p className="text-[#e8dcc8] text-sm italic leading-relaxed">
            "Dan sesungguhnya zikir kepada Allah adalah pekerjaan yang paling agung"
          </p>
          <p className="text-[#c9a96e60] text-xs">— Al-Ankabut: 45</p>
        </div>
        <p className="text-[#8a7a65] text-sm leading-relaxed max-w-sm mx-auto">
          Zikir Khas bukan sekadar amalan. Ia adalah sistem perlindungan jiwa yang direka oleh para Arif Billah berdasarkan Al-Quran dan Sunnah.
        </p>
      </div>

      {/* ── SKRIN 2 — JIWA DAN RAGA ────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-[#e8dcc8] font-serif text-lg">Jiwa Yang Sakit — Raga Yang Rugi</p>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-2">
          <p className="text-[#e8dcc8] text-sm leading-relaxed">
            Manusia zaman ini mengenal raga tapi melupakan jiwa.
          </p>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            Mereka pergi ke doktor apabila badan sakit — tapi tidak sedar bahawa punca sebenar kebanyakan masalah hidup adalah <span className="text-[#c9a96e] font-medium">JIWA yang tidak terjaga.</span>
          </p>
        </div>

        {/* Kad Kewangan */}
        <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <p className="text-[#c9a96e] font-medium text-sm">Jiwa → Kewangan</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            Jiwa yang dikuasai nafsu membuat keputusan kewangan yang buruk —
          </p>
          <div className="space-y-1.5">
            {[
              'Boros kerana nafsu inginkan kepuasan segera.',
              'Tamak kerana syaitan bisik "tidak pernah cukup."',
              'Rugi kerana hati tidak tenang semasa membuat keputusan.',
            ].map((t, i) => (
              <p key={i} className="text-[#8a7a65] text-xs leading-relaxed flex gap-2">
                <span className="text-[#c9a96e] flex-shrink-0">·</span>{t}
              </p>
            ))}
          </div>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-3 text-center space-y-1">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">إِنَّ النَّفْسَ لَأَمَّارَةٌ بِالسُّوءِ</p>
            <p className="text-[#8a7a65] text-xs italic">"Nafsu sentiasa mengajak kepada kejahatan" — Yusuf: 53</p>
          </div>
        </div>

        {/* Kad Masa */}
        <div className="bg-[#0d1821] border border-[#60a5fa30] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <p className="text-[#60a5fa] font-medium text-sm">Jiwa → Masa</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            Jiwa yang lalai membuang masa yang tidak dapat dikembalikan —
          </p>
          <div className="space-y-1.5">
            {[
              'Bertangguh kerana nafsu malas bergerak.',
              'Terganggu kerana syaitan mengalih perhatian.',
              'Sedar setelah masa berlalu tanpa makna.',
            ].map((t, i) => (
              <p key={i} className="text-[#8a7a65] text-xs leading-relaxed flex gap-2">
                <span className="text-[#60a5fa] flex-shrink-0">·</span>{t}
              </p>
            ))}
          </div>
          <div className="bg-[#060d16] border border-[#60a5fa15] rounded-xl p-3 text-center space-y-1">
            <p className="font-serif text-[#60a5fa] text-sm leading-loose" dir="rtl">وَالْعَصْرِ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ</p>
            <p className="text-[#8a7a65] text-xs italic">"Demi masa — sesungguhnya manusia dalam kerugian" — Al-Asr: 1-2</p>
          </div>
        </div>

        {/* Kad Tenaga */}
        <div className="bg-[#0d1821] border border-[#4ade8030] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <p className="text-[#4ade80] font-medium text-sm">Jiwa → Tenaga</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            Jiwa yang tidak tenang menghabiskan tenaga untuk perkara yang tidak bermakna —
          </p>
          <div className="space-y-1.5">
            {[
              'Penat kerana menanggung bebanan yang bukan milik kita.',
              'Lesu kerana jiwa tidak mendapat makanannya.',
              'Habis tenaga untuk bimbang tentang perkara yang tidak dapat dikawal.',
            ].map((t, i) => (
              <p key={i} className="text-[#8a7a65] text-xs leading-relaxed flex gap-2">
                <span className="text-[#4ade80] flex-shrink-0">·</span>{t}
              </p>
            ))}
          </div>
          <div className="bg-[#060d16] border border-[#4ade8015] rounded-xl p-3 text-center space-y-1">
            <p className="font-serif text-[#4ade80] text-sm leading-loose" dir="rtl">أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ</p>
            <p className="text-[#8a7a65] text-xs italic">"Hanya dengan mengingati Allah hati menjadi tenang" — Ar-Ra'd: 28</p>
          </div>
        </div>

        {/* Kad Orang Tersayang */}
        <div className="bg-[#0d1821] border border-[#f43f5e30] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">❤️</span>
            <p className="text-[#f43f5e] font-medium text-sm">Jiwa → Orang Yang Kita Cintai</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            Jiwa yang tidak terjaga menyakiti orang di sekeliling —
          </p>
          <div className="space-y-1.5">
            {[
              'Marah tanpa sebab kepada pasangan dan anak-anak.',
              'Tidak hadir sepenuhnya walaupun fizikal ada.',
              'Menyebarkan kegelisahan kepada orang yang kita cintai.',
            ].map((t, i) => (
              <p key={i} className="text-[#8a7a65] text-xs leading-relaxed flex gap-2">
                <span className="text-[#f43f5e] flex-shrink-0">·</span>{t}
              </p>
            ))}
          </div>
          <div className="bg-[#060d16] border border-[#f43f5e15] rounded-xl p-3 space-y-1.5">
            <p className="text-[#8a7a65] text-xs leading-relaxed text-center">
              Jiwa yang sakit tidak boleh memberi ketenangan kepada orang lain.
            </p>
            <p className="text-[#f43f5e] text-xs text-center font-medium">
              Hanya jiwa yang terjaga boleh menjadi tempat orang lain berehat.
            </p>
          </div>
        </div>
      </div>

      {/* ── SKRIN 3 — 2 PENGHALANG UTAMA ──────────────────────────────── */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-[#e8dcc8] font-serif text-lg">Mengapa Jiwa Tidak Terjaga?</p>
          <p className="text-[#8a7a65] text-sm">Allah telah mendedahkan 2 penghalang utama manusia:</p>
        </div>

        {/* Syaitan */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(127,29,29,0.5)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-700 flex-shrink-0" />
            <p className="text-red-400 text-xs font-medium uppercase tracking-wider">Penghalang 1 — Syaitan dari Luar</p>
          </div>
          <p className="font-serif text-red-300 text-sm leading-loose text-right" dir="rtl">
            ثُمَّ لَآتِيَنَّهُم مِّن بَيْنِ أَيْدِيهِمْ وَمِنْ خَلْفِهِمْ وَعَنْ أَيْمَانِهِمْ وَعَن شَمَائِلِهِمْ
          </p>
          <p className="text-red-300/60 text-xs italic leading-relaxed">
            "Aku akan datangi mereka dari depan, belakang, kanan dan kiri" — Al-A'raf: 17
          </p>
          <p className="text-[#e8dcc8] text-sm leading-relaxed">
            Syaitan menyerang dari <strong className="text-red-400">LUAR</strong> — mengganggu fikiran, mencuri masa, memporak-perandakan hubungan, membisik keputusan yang salah.
          </p>
        </div>

        {/* Nafsu */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(124,45,18,0.15)', border: '1px solid rgba(124,45,18,0.5)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-700 flex-shrink-0" />
            <p className="text-orange-400 text-xs font-medium uppercase tracking-wider">Penghalang 2 — Nafsu dari Dalam</p>
          </div>
          <p className="font-serif text-orange-300 text-sm leading-loose text-right" dir="rtl">
            إِنَّ النَّفْسَ لَأَمَّارَةٌ بِالسُّوءِ إِلَّا مَا رَحِمَ رَبِّي
          </p>
          <p className="text-orange-300/60 text-xs italic leading-relaxed">
            "Nafsu sentiasa mengajak kepada kejahatan" — Yusuf: 53
          </p>
          <p className="text-[#e8dcc8] text-sm leading-relaxed">
            Nafsu menyerang dari <strong className="text-orange-400">DALAM</strong> — mendorong kepada pembaziran, kemalasan, tamak, dan keputusan yang merugikan diri sendiri.
          </p>
        </div>
      </div>

      {/* ── SKRIN 4 — PREVENTION IS BETTER THAN CURE ──────────────────── */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-6 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-[#c9a96e] font-medium text-base">Prevention Is Better Than Cure</p>
          <p className="text-[#8a7a65] text-xs italic">Pepatah manusia — tapi hikmahnya dari Allah</p>
        </div>
        <div className="space-y-3 text-sm text-[#8a7a65] leading-relaxed">
          <p>Doktor boleh rawat badan yang sakit. Ubat boleh hilangkan demam. Wang boleh bayar bil hospital.</p>
          <p className="text-[#e8dcc8]">Tapi —</p>
          <div className="space-y-2 border-l-2 border-[#c9a96e30] pl-4">
            <p>Siapa yang boleh <span className="text-[#c9a96e]">kembalikan masa</span> yang terbuang kerana keputusan buruk akibat jiwa yang tidak tenang?</p>
            <p>Siapa yang boleh <span className="text-[#c9a96e]">pulihkan hubungan</span> yang rosak kerana kemarahan yang tidak terkawal?</p>
            <p>Siapa yang boleh <span className="text-[#c9a96e]">gantikan tenaga</span> yang habis kerana bimbang tentang perkara yang tidak dapat dikawal?</p>
          </div>
          <p className="text-[#e8dcc8]">Para Arif Billah yang mengenal Allah telah memahami ini sejak berabad-abad.</p>
          <p>Mereka menyusun sistem perlindungan jiwa yang lengkap — bukan selepas jiwa sakit, tapi <span className="text-[#c9a96e] font-medium">SEBELUM ia sakit.</span></p>
        </div>
      </div>

      {/* ── SKRIN 5 — SOLUSI: ZIKIR KHAS ──────────────────────────────── */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.1) 0%, rgba(201,169,110,0.05) 100%)', border: '1px solid rgba(201,169,110,0.3)' }}>
        <div className="text-center space-y-1">
          <p className="font-serif text-[#c9a96e] text-lg">Sistem Perlindungan Jiwa</p>
          <p className="text-[#8a7a65] text-xs">Zikir Jahar & Zikir Khafi</p>
        </div>
        <p className="text-[#c9a96e] text-sm font-medium text-center">Bukan rawatan. Ini adalah PENCEGAHAN.</p>
        <div className="space-y-3">
          <div className="bg-[#060d16] border border-[#60a5fa20] rounded-xl p-4 space-y-2">
            <p className="text-[#60a5fa] text-xs font-medium">Zikir Jahar — benteng dari serangan syaitan luar</p>
            <p className="font-serif text-[#60a5fa] text-base leading-loose text-center" dir="rtl">لَا إِلَٰهَ إِلَّا اللَّهُ</p>
            <p className="text-[#8a7a65] text-xs leading-relaxed">Setiap lafaz La ilaha illallah menutup pintu masuk syaitan dari semua penjuru.</p>
          </div>
          <div className="bg-[#060d16] border border-[#a78bfa20] rounded-xl p-4 space-y-2">
            <p className="text-[#a78bfa] text-xs font-medium">Zikir Khafi — benteng dari pujukan nafsu dalam</p>
            <p className="font-serif text-[#a78bfa] text-xl leading-loose text-center" dir="rtl">اَللَّه</p>
            <p className="text-[#8a7a65] text-xs leading-relaxed">Setiap degupan jantung yang menyebut Allah memadamkan api nafsu yang membakar dari dalam.</p>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            Bersama — mereka membina perisai yang tidak boleh ditembusi oleh mana-mana serangan luar mahupun dalam.
          </p>
          <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">وَلَذِكْرُ اللَّهِ أَكْبَرُ</p>
          <p className="text-[#8a7a65] text-xs leading-relaxed">
            Inilah mengapa Allah menyebut zikir sebagai pekerjaan yang <strong className="text-[#c9a96e]">PALING AGUNG</strong> — kerana kesannya bukan hanya untuk akhirat, tapi untuk setiap aspek kehidupan anda hari ini.
          </p>
        </div>
      </div>

      {/* ── SKRIN 6 — CTA ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-[#e8dcc8] font-serif text-lg">Anda Sudah Tahu Mengapa.</p>
          <p className="text-[#c9a96e] text-sm font-medium">Sekarang Ambil Langkah.</p>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
          <p className="text-[#e8dcc8] text-sm leading-relaxed">
            Zikir Jahar dan Zikir Khafi tidak boleh dipelajari sendiri. Ia perlu ditalkin secara langsung oleh guru yang bersanad — seperti yang Nabi s.a.w. ajarkan kepada Sayyidina Ali k.w.
          </p>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-3 text-center space-y-1">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ</p>
            <p className="text-[#8a7a65] text-xs italic">"Bertanyalah kepada ahli zikir jika kamu tidak mengetahuinya" — An-Nahl: 43</p>
          </div>
        </div>
        <button
          onClick={onYa}
          className="w-full py-4 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}
        >
          ✦ Ya — Saya Ingin Ambil Langkah
        </button>
        <button
          onClick={onKembali}
          className="w-full py-3 rounded-2xl text-sm text-[#8a7a65] border border-[#1e2d40] hover:text-[#e8dcc8] hover:border-[#c9a96e30] transition-all"
        >
          Kembali ke Zikir Am
        </button>
      </div>
    </div>
  )
}

// ─── Hubungi Screen ───────────────────────────────────────────────────────────

function HubungiScreen({
  onBorang,
  onKembali,
}: {
  onBorang: () => void
  onKembali: () => void
}) {
  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onKembali}
        className="flex items-center gap-2 text-[#8a7a65] hover:text-[#e8dcc8] transition-colors text-sm"
      >
        <ArrowLeft size={15} /> Kembali
      </button>

      {/* Header */}
      <div className="text-center space-y-1">
        <p className="font-serif text-[#c9a96e] text-xl font-medium">Langkah Seterusnya</p>
      </div>

      {/* Penerangan */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-4">
        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          Zikir Jahar dan Zikir Khafi tidak boleh dipelajari sendiri. Ia perlu ditalkin secara langsung oleh guru yang bersanad — seperti yang Nabi ajarkan kepada Sayyidina Ali r.a.
        </p>
        <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center space-y-1.5">
          <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
            فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ
          </p>
          <p className="text-[#8a7a65] text-xs italic">
            "Bertanyalah kepada ahli zikir jika kamu tidak mengetahuinya"
          </p>
          <p className="text-[#c9a96e60] text-xs">— An-Nahl: 43</p>
        </div>
        <p className="text-[#8a7a65] text-sm text-center">
          Hubungi Madrasah I AM untuk maklumat lanjut:
        </p>
      </div>

      {/* WhatsApp */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ backgroundColor: '#25D366' }}
      >
        <span className="text-xl">📱</span>
        WhatsApp Madrasah I AM
      </a>

      {/* Telegram */}
      <a
        href={TG_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ backgroundColor: '#0088CC' }}
      >
        <span className="text-xl">💬</span>
        Telegram Madrasah I AM
      </a>

      {/* Borang talqin */}
      <div className="text-center space-y-3">
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          Atau isi borang dalam app — kami akan hubungi anda dalam masa 24–48 jam.
        </p>
        <button
          onClick={onBorang}
          className="w-full py-3.5 rounded-2xl text-sm font-medium border border-[#c9a96e40] text-[#c9a96e] bg-[#c9a96e10] hover:bg-[#c9a96e20] transition-colors"
        >
          📋 Isi Borang Talkin
        </button>
      </div>

      {/* Penutup */}
      <div className="text-center space-y-2 pt-2">
        <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
          إِلَٰهِي أَنْتَ مَقْصُودِي وَرِضَاكَ مَطْلُوبِي
        </p>
        <p className="text-[#8a7a65] text-xs italic">
          "Engkaulah Tujuanku dan keredhaan-Mu yang aku cari."
        </p>
      </div>
    </div>
  )
}

// ─── Talqin Request Form ───────────────────────────────────────────────────────

interface TalqinFormProps {
  zikirType: 'jahar' | 'khafi'
  userId: string
  onSuccess: () => void
}

function TalqinForm({ zikirType, userId, onSuccess }: TalqinFormProps) {
  const [form, setForm] = useState({
    full_name: '', phone: '', location: '',
    preferred_time: 'Pagi', language: 'bm', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function update(key: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.phone || !form.location) return
    setSubmitting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('talqin_requests') as any).insert({
        user_id: userId,
        zikir_type: zikirType,
        full_name: form.full_name,
        phone: form.phone,
        location: form.location,
        preferred_time: form.preferred_time,
        language: form.language,
        notes: form.notes || null,
      })
    } catch { /* table may not exist yet — continue */ }
    setDone(true)
    onSuccess()
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="bg-[#0d1821] border border-[#60a5fa30] rounded-2xl p-6 text-center space-y-3">
        <CheckCircle2 size={36} className="text-[#60a5fa] mx-auto" />
        <p className="font-serif text-[#60a5fa] text-lg">Alhamdulillah</p>
        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          Permohonan anda telah diterima. Pihak Madrasah I AM akan menghubungi anda dalam masa 24–48 jam. InsyaAllah.
        </p>
      </div>
    )
  }

  const inputClass = "w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#60a5fa40] rounded-xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none transition-colors"
  const labelClass = "block text-xs font-medium text-[#8a7a65] uppercase tracking-wider mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Nama Penuh *</label>
        <input
          type="text"
          value={form.full_name}
          onChange={e => update('full_name', e.target.value)}
          placeholder="Nama penuh anda"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>No. Telefon *</label>
        <input
          type="tel"
          value={form.phone}
          onChange={e => update('phone', e.target.value)}
          placeholder="+60 12-345 6789"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Negeri / Negara *</label>
        <input
          type="text"
          value={form.location}
          onChange={e => update('location', e.target.value)}
          placeholder="Contoh: Selangor, Malaysia"
          required
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Masa Sesuai</label>
          <select
            value={form.preferred_time}
            onChange={e => update('preferred_time', e.target.value)}
            className={inputClass}
          >
            {['Pagi', 'Tengahari', 'Petang', 'Malam'].map(t => (
              <option key={t} value={t} className="bg-[#0d1821]">{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Bahasa</label>
          <select
            value={form.language}
            onChange={e => update('language', e.target.value)}
            className={inputClass}
          >
            <option value="bm" className="bg-[#0d1821]">Bahasa Melayu</option>
            <option value="en" className="bg-[#0d1821]">English</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Catatan (Pilihan)</label>
        <textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder="Sebarang pertanyaan atau maklumat tambahan..."
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !form.full_name || !form.phone || !form.location}
        className="w-full py-3.5 bg-[#60a5fa] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#93c5fd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 size={15} className="animate-spin" />}
        Daftar Sesi Talqin
      </button>
    </form>
  )
}

// ─── Zikir Jahar Section ───────────────────────────────────────────────────────

function ZikirJahar() {
  const { user } = useAuthStore()
  const { mutateAsync: saveZikir, isPending } = useSaveZikir()
  const today = format(new Date(), 'yyyy-MM-dd')
  const isTalqin = user?.talqin_jahar === true

  const [jaharSaved, setJaharSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSave() {
    try {
      await saveZikir({
        type: 'jahar',
        zikir_name: 'La ilaha illallah',
        count: 1,
        target: 1,
        completed: true,
        date: today,
      })
      setJaharSaved(true)
    } catch { /* table not yet created */ }
  }

  // Talqin users — tunjuk hanya teks zikir + catat sesi
  if (isTalqin) {
    return (
      <div className="space-y-4">
        <div className="bg-[#0d1821] border border-[#60a5fa20] rounded-2xl p-6 text-center space-y-5">
          <p className="font-serif text-[#60a5fa] leading-loose" style={{ fontSize: 'clamp(2rem, 8vw, 3rem)' }} dir="rtl">
            لَا إِلَٰهَ إِلَّا اللَّهُ
          </p>
          <div className="space-y-1">
            <p className="text-[#e8dcc8] text-sm">La ilaha illallah</p>
            <p className="text-[#8a7a65] text-xs">Tiada tuhan melainkan Allah</p>
          </div>
          <div className="h-px bg-[#1e2d40]" />
          {jaharSaved ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 size={18} className="text-[#60a5fa]" />
              <p className="text-[#60a5fa] text-sm">Sesi dicatat. Alhamdulillah.</p>
            </div>
          ) : (
            <button onClick={handleSave} disabled={isPending}
              className="w-full py-3 bg-[#60a5fa15] border border-[#60a5fa40] text-[#60a5fa] rounded-xl text-sm font-medium hover:bg-[#60a5fa25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              ✓ Catat Sesi Hari Ini
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Tajuk */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#60a5fa15] border border-[#60a5fa30] flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🌊</span>
        </div>
        <div>
          <p className="text-[#60a5fa] font-serif text-base">Zikir Jahar</p>
          <p className="font-serif text-[#8a7a65] text-xs" dir="rtl">لَا إِلَٰهَ إِلَّا اللَّهُ</p>
        </div>
      </div>

      {/* Kad 1 — Ancaman Iblis */}
      <div className="bg-[#0d1821] border border-red-900/40 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          <p className="text-red-400 text-xs font-medium uppercase tracking-wider">Ancaman Iblis</p>
        </div>
        <p className="font-serif text-red-300 text-sm leading-loose text-right" dir="rtl">
          ثُمَّ لَآتِيَنَّهُم مِّن بَيْنِ أَيْدِيهِمْ وَمِنْ خَلْفِهِمْ وَعَنْ أَيْمَانِهِمْ وَعَن شَمَائِلِهِمْ ۖ وَلَا تَجِدُ أَكْثَرَهُمْ شَاكِرِينَ
        </p>
        <p className="text-[#8a7a65] text-xs leading-relaxed italic">
          "Kemudian aku akan mendatangi mereka dari depan, belakang, kanan dan kiri."
        </p>
        <p className="text-red-500/50 text-xs">— Al-A'raf: 17</p>
      </div>

      {/* Kad 2 — Benteng Perlindungan */}
      <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#c9a96e] flex-shrink-0" />
          <p className="text-[#c9a96e] text-xs font-medium uppercase tracking-wider">Benteng Perlindungan Allah</p>
        </div>
        <p className="font-serif text-[#c9a96e] text-base leading-loose text-right" dir="rtl">
          لَا إِلَهَ إِلَّا اللَّهُ حِصْنِي فَمَنْ دَخَلَ حِصْنِي أَمِنَ مِنْ عَذَابِي
        </p>
        <p className="text-[#8a7a65] text-xs leading-relaxed italic">
          "La ilaha illallah adalah benteng-Ku — barang siapa masuk ke dalam benteng-Ku, dia aman dari azab-Ku."
        </p>
        <p className="text-[#c9a96e60] text-xs">— Hadith Qudsi · Al-Khatib</p>
      </div>

      {/* Kad 3 — Kesimpulan */}
      <div className="bg-[#060d16] border border-[#60a5fa20] rounded-2xl p-5 text-center space-y-2">
        <p className="text-[#60a5fa] font-medium text-sm">Memahami Zikir Jahar</p>
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          Iblis mengancam dari semua penjuru. Allah memberikan benteng:
        </p>
        <p className="font-serif text-[#60a5fa] text-lg" dir="rtl">لَا إِلَٰهَ إِلَّا اللَّهُ</p>
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          Zikir ini perlu <strong className="text-[#60a5fa]">ditalqin</strong> (diajar secara langsung) oleh guru sebelum diamalkan dengan betul.
        </p>
      </div>

      {/* State: Belum talqin */}
      {!submitted && (
        <div className="space-y-4">
          <div className="bg-[#0d1821] border border-[#60a5fa20] rounded-2xl p-5">
            <p className="text-[#60a5fa] font-medium text-sm mb-1">Daftar Sesi Talqin</p>
            <p className="text-[#8a7a65] text-xs mb-4 leading-relaxed">
              Isi borang berikut untuk mendaftar sesi talqin bersama guru. Kami akan menghubungi anda dalam masa 24–48 jam.
            </p>
            <TalqinForm zikirType="jahar" userId={user?.id ?? ''} onSuccess={() => setSubmitted(true)} />
          </div>
        </div>
      )}

      {/* State: Sudah hantar borang */}
      {submitted && (
        <div className="bg-[#0d1821] border border-[#60a5fa30] rounded-2xl p-5 text-center space-y-2">
          <p className="text-[#60a5fa] text-sm font-medium">⏳ Menunggu Talqin</p>
          <p className="text-[#8a7a65] text-xs leading-relaxed">
            Permohonan anda sedang diproses. Guru akan menghubungi anda tidak lama lagi.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Khafi Timer — timer sesi tanpa animasi nafas ────────────────────────────

const KHAFI_DURATIONS = [5, 10, 15, 20] as const

function KhafiTimer() {
  const { user } = useAuthStore()
  const { mutateAsync: saveZikir } = useSaveZikir()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [selectedMins, setSelectedMins] = useState<typeof KHAFI_DURATIONS[number]>(10)
  const [isRunning, setIsRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(10 * 60)
  const [sessionSaved, setSessionSaved] = useState(false)

  useEffect(() => {
    if (!isRunning) return
    const iv = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          setIsRunning(false)
          handleSessionEnd(selectedMins * 60)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [isRunning])

  async function handleSessionEnd(totalSeconds: number) {
    if (!user) return
    try {
      await saveZikir({
        type: 'khafi', zikir_name: 'Zikir Khafi',
        count: totalSeconds, target: selectedMins * 60,
        completed: true, date: today,
      })
      setSessionSaved(true)
    } catch { /* table not yet created */ }
  }

  function startSession() {
    setSecondsLeft(selectedMins * 60)
    setSessionSaved(false)
    setIsRunning(true)
  }

  function stopSession() {
    const elapsed = selectedMins * 60 - secondsLeft
    setIsRunning(false)
    if (elapsed > 30) handleSessionEnd(elapsed)
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timeDisplay = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <div className="space-y-4">
      {/* Hadith */}
      <div className="bg-[#060d16] border border-[#a78bfa15] rounded-xl p-4 text-center space-y-1.5">
        <p className="font-serif text-[#a78bfa] text-base leading-loose" dir="rtl">أَفْضَلُ الذِّكْرِ مَا خَفِيَ</p>
        <p className="text-[#8a7a65] text-xs italic">"Zikir yang paling utama adalah yang tersembunyi" — HR. Ahmad</p>
      </div>

      {/* Duration selector */}
      {!isRunning && (
        <div className="flex gap-2">
          {KHAFI_DURATIONS.map(d => (
            <button key={d}
              onClick={() => { setSelectedMins(d); setSecondsLeft(d * 60) }}
              className={cn('flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all',
                selectedMins === d ? 'border-[#a78bfa50] bg-[#a78bfa15] text-[#a78bfa]' : 'border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8]')}>
              {d} min
            </button>
          ))}
        </div>
      )}

      {/* Timer + Teks Zikir */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-6 text-center space-y-4">
        <p className="font-serif text-[#a78bfa] leading-loose"
          style={{ fontSize: isRunning ? 'clamp(1.8rem, 8vw, 2.8rem)' : '1.5rem' }}
          dir="rtl">
          اَللَّه
        </p>
        <p className="text-[#8a7a65] font-mono text-3xl tracking-widest">{timeDisplay}</p>
        {secondsLeft === 0 && sessionSaved && (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 size={18} className="text-[#a78bfa]" />
            <p className="text-[#a78bfa] text-sm">Sesi dicatat. Alhamdulillah.</p>
          </div>
        )}
      </div>

      {/* Buttons */}
      {secondsLeft === 0 ? (
        <button onClick={startSession}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#a78bfa20] border border-[#a78bfa40] text-[#a78bfa] rounded-2xl text-sm font-medium hover:bg-[#a78bfa30] transition-colors">
          <Play size={15} />
          Mulakan Semula
        </button>
      ) : isRunning ? (
        <button onClick={stopSession}
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-[#1e2d40] rounded-2xl text-sm text-[#8a7a65] hover:text-red-400 hover:border-red-900/40 transition-colors">
          <Square size={14} />
          Tamatkan Sesi
        </button>
      ) : (
        <button onClick={startSession}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: '#a78bfa' }}>
          <Play size={16} />
          Mulakan Sesi {selectedMins} Minit
        </button>
      )}
    </div>
  )
}

// ─── Zikir Khafi Section ───────────────────────────────────────────────────────

function ZikirKhafi({ hasJaharRequest }: { hasJaharRequest: boolean }) {
  const { user } = useAuthStore()
  const isTalqin = user?.talqin_khafi === true

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#a78bfa15] border border-[#a78bfa30] flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💜</span>
          </div>
          <div>
            <p className="text-[#a78bfa] font-serif text-base">Zikir Khafi</p>
            <p className="text-[#8a7a65] text-xs">Zikir Hati</p>
          </div>
        </div>

        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          Zikir Khafi adalah zikir yang tidak bersuara, dilakukan mengikut degupan jantung. Ia adalah zikir paling tinggi darjatnya — zikir hati yang tidak pernah berhenti.
        </p>

        <div className="bg-[#060d16] border border-[#a78bfa15] rounded-xl p-4 text-center">
          <p className="font-serif text-[#a78bfa] text-base leading-loose" dir="rtl">أَفْضَلُ الذِّكْرِ مَا خَفِيَ</p>
          <p className="text-[#8a7a65] text-xs mt-2 italic">
            "Zikir yang paling utama adalah yang tersembunyi (dalam hati)"
          </p>
          <p className="text-[#a78bfa60] text-xs mt-1">— Hadith Riwayat Ahmad</p>
        </div>

        <p className="text-[#8a7a65] text-xs text-center">
          Zikir ini <strong className="text-[#a78bfa]">MESTI</strong> diajar secara langsung oleh guru sebelum boleh diamalkan dengan betul.
        </p>
      </div>

      {/* State: Belum talqin */}
      {!isTalqin && (
        <div className="bg-[#0d1821] border border-[#a78bfa20] rounded-2xl p-5 text-center space-y-3">
          {hasJaharRequest ? (
            <>
              <p className="text-[#a78bfa] font-medium text-sm">⏳ Menunggu Talqin Jahar</p>
              <p className="text-[#8a7a65] text-xs leading-relaxed">
                Zikir Khafi diajar selepas peserta menguasai Zikir Jahar. Sila selesaikan sesi talqin Zikir Jahar terlebih dahulu.
              </p>
            </>
          ) : (
            <>
              <p className="text-[#a78bfa] font-medium text-sm">Talqin Diperlukan</p>
              <p className="text-[#8a7a65] text-xs leading-relaxed">
                Sila daftar sesi talqin untuk Zikir Jahar terlebih dahulu. Zikir Khafi akan diajar selepas anda menguasai Zikir Jahar.
              </p>
              <p className="text-[#8a7a65] text-xs">↑ Daftar melalui bahagian Zikir Jahar di atas</p>
            </>
          )}
        </div>
      )}

      {/* State: Sudah talqin — timer sesi */}
      {isTalqin && <KhafiTimer />}
    </div>
  )
}

// ─── Pro Analytics ────────────────────────────────────────────────────────────

interface AnalyticsData {
  lifetimeTotal: number
  streak: number
  bestDay: number
  favoriteZikir: string
  favoriteTime: string
  sevenDays: { label: string; count: number; max: number }[]
  breakdown: { name: string; count: number; pct: number; hex: string }[]
}

const ZIKIR_COLORS: Record<string, string> = {
  'Subhanallah': '#34d399', 'Alhamdulillah': '#fbbf24', 'Allahu Akbar': '#f87171',
  'La ilaha illallah': '#60a5fa', "Allahumma Solli 'ala Muhammad": '#c9a96e',
  "Astaghfirullahal 'Azim": '#a78bfa', 'La ilaha illallah (Jahar)': '#60a5fa',
  'Zikir Khafi': '#a78bfa',
}

function processAnalytics(sessions: { count: number; date: string; zikir_name: string; completed: boolean; created_at: string }[]): AnalyticsData {
  const lifetimeTotal = sessions.reduce((s, r) => s + r.count, 0)

  // By date
  const byDate = new Map<string, number>()
  sessions.forEach(r => byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.count))

  // Streak
  const dates = [...byDate.keys()].sort((a, b) => a > b ? -1 : 1)
  let streak = 0
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i])
    const expected = new Date()
    expected.setDate(expected.getDate() - i)
    if (d.toDateString() === expected.toDateString()) streak++
    else break
  }

  const bestDay = Math.max(...Array.from(byDate.values()), 0)

  // Favorite zikir
  const byZikir = new Map<string, number>()
  sessions.forEach(r => byZikir.set(r.zikir_name, (byZikir.get(r.zikir_name) ?? 0) + r.count))
  const favZikirEntry = [...byZikir.entries()].sort((a, b) => b[1] - a[1])[0]
  const favoriteZikir = favZikirEntry ? favZikirEntry[0] : '—'

  // Favorite time
  const periods = { pagi: 0, tengahari: 0, petang: 0, malam: 0 }
  sessions.forEach(r => {
    const h = new Date(r.created_at).getHours()
    if (h >= 4 && h < 12) periods.pagi += r.count
    else if (h >= 12 && h < 16) periods.tengahari += r.count
    else if (h >= 16 && h < 20) periods.petang += r.count
    else periods.malam += r.count
  })
  const maxP = Math.max(...Object.values(periods))
  const favoriteTime = maxP === 0 ? '—' :
    maxP === periods.pagi ? 'Pagi (selepas Subuh)' :
    maxP === periods.tengahari ? 'Tengahari' :
    maxP === periods.petang ? 'Petang / Maghrib' : 'Malam'

  // 7-day chart
  const today = new Date()
  const sevenDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    const label = `${d.getDate()}/${d.getMonth() + 1}`
    return { label, count: byDate.get(key) ?? 0, max: 0 }
  })
  const maxCount = Math.max(...sevenDays.map(d => d.count), 1)
  sevenDays.forEach(d => { d.max = maxCount })

  // Breakdown
  const total = Array.from(byZikir.values()).reduce((s, v) => s + v, 0) || 1
  const breakdown = [...byZikir.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({
      name, count,
      pct: Math.round((count / total) * 100),
      hex: ZIKIR_COLORS[name] ?? '#c9a96e',
    }))

  return { lifetimeTotal, streak, bestDay, favoriteZikir, favoriteTime, sevenDays, breakdown }
}

function ZikirProAnalytics() {
  const { user } = useAuthStore()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    const query = supabase
      .from('zikir_sessions')
      .select('count, date, zikir_name, completed, created_at')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(500)

    Promise.resolve(query).then(({ data }) => {
      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAnalytics(processAnalytics(data as any))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={24} className="text-[#c9a96e] animate-spin" />
      </div>
    )
  }

  if (!analytics || analytics.lifetimeTotal === 0) {
    return (
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-6 text-center space-y-2">
        <p className="text-[#c9a96e] font-serif text-lg">بِسْمِ اللَّهِ</p>
        <p className="text-[#e8dcc8] text-sm">Analitik akan muncul selepas anda mula berzikir.</p>
        <p className="text-[#8a7a65] text-xs">Setiap ketuk dicatat. Setiap zikir dikira.</p>
      </div>
    )
  }

  const maxBar = Math.max(...analytics.sevenDays.map(d => d.count), 1)

  return (
    <div className="space-y-4">

      {/* Headline message */}
      <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 text-center space-y-1">
        <p className="font-serif text-[#c9a96e] text-2xl">{analytics.lifetimeTotal.toLocaleString()}</p>
        <p className="text-[#e8dcc8] text-sm">zikir sejak anda bergabung</p>
        <p className="text-[#8a7a65] text-xs italic">Setiap satu dicatat di sisi Allah.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Streak', value: `${analytics.streak} hari`, icon: '🔥', color: '#f87171' },
          { label: 'Rekod Terbaik', value: `${analytics.bestDay.toLocaleString()}/hari`, icon: '🏆', color: '#fbbf24' },
          { label: 'Zikir Kegemaran', value: analytics.favoriteZikir.split(' ').slice(0, 2).join(' '), icon: '⭐', color: '#c9a96e' },
          { label: 'Waktu Aktif', value: analytics.favoriteTime, icon: '⏰', color: '#60a5fa' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-1">
            <p className="text-lg">{icon}</p>
            <p className="font-semibold text-sm" style={{ color }}>{value}</p>
            <p className="text-[#8a7a65] text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* 7-day bar chart */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
        <p className="text-xs font-medium text-[#e8dcc8]">📈 7 Hari Terakhir</p>
        <div className="flex items-end gap-1.5 h-20">
          {analytics.sevenDays.map(({ label, count }) => {
            const pct = maxBar > 0 ? (count / maxBar) * 100 : 0
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-sm transition-all duration-500" style={{
                  height: `${Math.max(pct, count > 0 ? 8 : 2)}%`,
                  backgroundColor: count > 0 ? '#c9a96e' : '#1e2d40',
                  minHeight: '4px'
                }} />
                <p className="text-[#8a7a65] text-[9px]">{label}</p>
              </div>
            )
          })}
        </div>
        <p className="text-[#8a7a65] text-xs text-center">Jumlah zikir harian</p>
      </div>

      {/* Pecahan zikir */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
        <p className="text-xs font-medium text-[#e8dcc8]">🥧 Pecahan Zikir</p>
        <div className="space-y-2">
          {analytics.breakdown.map(({ name, count, pct, hex }) => (
            <div key={name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#8a7a65] truncate pr-2">{name}</span>
                <span style={{ color: hex }}>{count.toLocaleString()} ({pct}%)</span>
              </div>
              <div className="h-1.5 bg-[#1e2d40] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: hex }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

type KhasScreen = 'penerangan' | 'hubungi' | 'content'

export default function ZikirKhas({ onBackToAmm }: { onBackToAmm?: () => void }) {
  const { user } = useAuthStore()
  const isPro = user?.tier === 'pro' || user?.tier === 'family'
  const hasTalqin = user?.talqin_jahar === true || user?.talqin_khafi === true

  const [screen, setScreen] = useState<KhasScreen>(hasTalqin ? 'content' : 'penerangan')
  const [hasJaharRequest, setHasJaharRequest] = useState(false)
  const [khasTab, setKhasTab] = useState<'jahar' | 'khafi' | 'analitik'>('jahar')

  // Check if user has submitted a talqin request (Pro only)
  useEffect(() => {
    if (!user?.id || !isPro) return
    const query = supabase
      .from('talqin_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('zikir_type', 'jahar')
      .limit(1)

    Promise.resolve(query)
      .then(({ data }) => { if (data && data.length > 0) setHasJaharRequest(true) })
      .catch(() => {})
  }, [user?.id, isPro])

  // Penerangan — semua pengguna (Free & Pro) tanpa talqin
  if (screen === 'penerangan') {
    return (
      <PeneranganScreen
        onYa={() => setScreen('hubungi')}
        onKembali={() => onBackToAmm?.()}
      />
    )
  }

  // Hubungi — selepas klik "Ya"
  if (screen === 'hubungi') {
    return (
      <HubungiScreen
        onBorang={() => setScreen('content')}
        onKembali={() => setScreen('penerangan')}
      />
    )
  }

  // Content — pengguna sudah talqin atau akses terus dari borang
  // Free user tanpa talqin yang akses via borang: tunjuk penerangan lembut
  if (!isPro && !hasTalqin) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setScreen('penerangan')}
          className="flex items-center gap-2 text-[#8a7a65] hover:text-[#e8dcc8] transition-colors text-sm"
        >
          <ArrowLeft size={15} /> Kembali
        </button>
        <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-6 text-center space-y-4">
          <Lock size={32} className="text-[#c9a96e] mx-auto" />
          <div>
            <p className="text-[#c9a96e] font-serif text-xl mb-2">Zikir Khas</p>
            <p className="text-[#e8dcc8] text-sm leading-relaxed">
              Zikir Khas perlu ditalkin (diajar secara langsung) oleh guru yang bersanad sebelum boleh diamalkan dengan betul.
            </p>
          </div>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4">
            <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
              وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">
              "Dan orang-orang yang berjuang untuk Kami, nescaya Kami tunjukkan jalan-jalan Kami" — Al-Ankabut: 69
            </p>
          </div>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#25D366' }}
          >
            📱 Hubungi Madrasah I AM
          </a>
        </div>
      </div>
    )
  }

  // Pro content: sub-tab Jahar / Khafi / Analitik
  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-1">
        {([
          { id: 'jahar',    label: '🌊 Zikir Jahar' },
          { id: 'khafi',    label: '💜 Zikir Khafi' },
          { id: 'analitik', label: '📊 Analitik' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setKhasTab(t.id)}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-medium transition-all',
              khasTab === t.id ? 'bg-[#c9a96e] text-[#060d16]' : 'text-[#8a7a65] hover:text-[#e8dcc8]'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {khasTab === 'jahar' && <ZikirJahar />}
      {khasTab === 'khafi' && <ZikirKhafi hasJaharRequest={hasJaharRequest} />}
      {khasTab === 'analitik' && <ZikirProAnalytics />}
    </div>
  )
}
