import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookHeart, Sparkles, Clock, MessageCircle, TrendingUp, ChevronRight, CheckCircle2, Star } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTodaySolat } from '@/hooks/useSolat'
import { useTodayMuhasabah } from '@/hooks/useMuhasabah'
import KebunRohani from '@/components/KebunRohani'
import PillarLiveStatus from '@/components/PillarLiveStatus'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ms } from 'date-fns/locale'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 6)  return { arabic: 'قِيَامُ اللَّيْل',   key: 'dashboard.selamat_malam',      emoji: '🌙' }
  if (hour < 8)  return { arabic: 'صَلَاةُ الصُّبْح',   key: 'dashboard.selamat_pagi',       emoji: '🌅' }
  if (hour < 13) return { arabic: 'صَلَاةُ الضُّحَى',   key: 'dashboard.selamat_pagi',       emoji: '☀️' }
  if (hour < 16) return { arabic: 'صَلَاةُ الظُّهْر',   key: 'dashboard.selamat_tengahari',  emoji: '🌤️' }
  if (hour < 19) return { arabic: 'صَلَاةُ الْعَصْر',   key: 'dashboard.selamat_petang',     emoji: '🌇' }
  if (hour < 21) return { arabic: 'صَلَاةُ الْمَغْرِب', key: 'dashboard.selamat_petang',     emoji: '🌆' }
  return           { arabic: 'صَلَاةُ الْعِشَاء',  key: 'dashboard.selamat_malam',      emoji: '🌙' }
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  // streak removed — KebunRohani handles this internally
  const { data: todaySolat } = useTodaySolat()
  const { data: todayMuhasabah } = useTodayMuhasabah()
  const greeting = getGreeting()

  const isPro = user?.tier === 'pro' || user?.tier === 'family'
  const hasTalqin = user?.talqin_completed === true
  const displayName = user?.nickname ?? user?.name?.split(' ')[0] ?? t('umum.sahabat')
  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: ms })

  const solatPrayers = Array.isArray((todaySolat as { prayers?: unknown })?.prayers)
    ? ((todaySolat as { prayers: Array<{ completed: boolean }> }).prayers)
    : []
  const solatDone = solatPrayers.filter((p) => p.completed).length

  const muhasabahDone = !!todayMuhasabah
  const muhasabahAnswered = Array.isArray(todayMuhasabah?.answers)
    ? todayMuhasabah.answers.filter((a: { answer: string }) => a.answer?.trim()).length
    : 0

  const QUICK_ACTIONS = [
    {
      to: '/audit-jiwa',
      icon: BookHeart,
      label: t('nav.audit_jiwa'),
      sublabel: muhasabahDone
        ? `${muhasabahAnswered} ${t('dashboard.soalan_menanti').replace('soalan ', '').replace('questions ', '').replace('pertanyaan ', '')} ✓`
        : isPro ? `6 ${t('dashboard.soalan_menanti')}` : `2 ${t('dashboard.soalan_menanti')}`,
      done: muhasabahDone,
      color: 'text-rose-400',
      bg: 'bg-rose-900/20',
    },
    {
      to: '/zikir',
      icon: Sparkles,
      label: t('nav.zikir'),
      sublabel: 'Subhanallah · Alhamdulillah · Allahu Akbar',
      done: false,
      color: 'text-amber-400',
      bg: 'bg-amber-900/20',
    },
    {
      to: '/solat',
      icon: Clock,
      label: t('nav.solat'),
      sublabel: `${solatDone}/5 ${t('dashboard.selesai_solat')}`,
      done: solatDone === 5,
      color: 'text-emerald-400',
      bg: 'bg-emerald-900/20',
    },
    {
      to: '/iam',
      icon: MessageCircle,
      label: 'I AM',
      sublabel: isPro
        ? t('dashboard.iam_sub_pro', { count: 50 })
        : t('dashboard.iam_sub_free', { count: 5 }),
      done: false,
      color: 'text-violet-400',
      bg: 'bg-violet-900/20',
    },
    ...(hasTalqin ? [{
      to: '/amalan',
      icon: Star,
      label: t('nav.amalan'),
      sublabel: 'Zikir Jahar · Zikir Khafi',
      done: false,
      color: 'text-[#c9a96e]',
      bg: 'bg-[#c9a96e15]',
    }] : []),
  ]

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6 pb-8">

      {/* Header */}
      <div>
        <p className="text-[#8a7a65] text-sm">{today}</p>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-[#e8dcc8]">
              {greeting.emoji} {t(greeting.key)},{' '}
              <span className="text-[#c9a96e]">{displayName}</span>
            </h2>
            <p className="text-[#8a7a65] text-sm mt-0.5 font-serif italic">{greeting.arabic}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#c9a96e15] text-[#c9a96e] border border-[#c9a96e30] mt-1 flex-shrink-0">
            {isPro ? (user?.tier === 'family' ? `✦ ${t('iam.keluarga')}` : `✦ ${t('iam.pro')}`) : t('iam.percuma')}
          </span>
        </div>
      </div>

      {/* Kebun Rohani — pertumbuhan amalan & status siraman */}
      <KebunRohani />

      {/* Status 4 Dimensi — ringkas, ada butang "Lihat Penuh" ke /audit-jiwa */}
      <PillarLiveStatus compact />

      {/* Solat ringkas */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 flex items-center gap-4">
        <div className="flex gap-1.5 flex-1">
          {[t('solat.subuh'), t('solat.zohor'), t('solat.asar'), t('solat.maghrib'), t('solat.isyak')].map((name, i) => {
            const done = solatPrayers[i]?.completed ?? false
            return (
              <div key={name} className="flex-1 text-center">
                <div className={cn('h-1.5 rounded-full mb-1', done ? 'bg-[#c9a96e]' : 'bg-[#1e2d40]')} />
                <p className={cn('text-[9px]', done ? 'text-[#c9a96e]' : 'text-[#8a7a65]')}>{name}</p>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TrendingUp size={14} className="text-emerald-400" />
          <p className="text-emerald-400 text-sm font-bold">{solatDone}/5</p>
        </div>
      </div>


      {/* Muhasabah summary */}
      {muhasabahDone && (
        <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-[#c9a96e] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-[#e8dcc8] font-medium">{t('audit_jiwa.selesai')}</p>
            <p className="text-xs text-[#8a7a65] mt-0.5">{muhasabahAnswered} {t('dashboard.soalan_menanti')}</p>
          </div>
          <button
            onClick={() => navigate('/muhasabah')}
            className="text-xs text-[#c9a96e] hover:underline flex-shrink-0"
          >
            {t('umum.lihat_semua')} →
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h3 className="font-serif text-[#c9a96e] text-lg mb-3">{t('dashboard.aktiviti')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(({ to, icon: Icon, label, sublabel, done, color, bg }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={cn(
                'relative bg-[#0d1821] border rounded-2xl p-5 text-left hover:scale-[1.02] transition-all duration-200 group',
                done ? 'border-[#c9a96e30]' : 'border-[#1e2d40] hover:border-[#2a3d55]'
              )}
            >
              {done && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#c9a96e]" />}
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg)}>
                <Icon size={20} className={color} />
              </div>
              <p className="font-medium text-[#e8dcc8] text-sm">{label}</p>
              <p className="text-[#8a7a65] text-xs mt-0.5 leading-snug">{sublabel}</p>
              <ChevronRight size={14} className="absolute bottom-4 right-4 text-[#8a7a65] group-hover:text-[#c9a96e] transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Hablumminallah & Hablumminannas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-[#c9a96e] text-lg">{t('dashboard.dua_tali')}</h3>
          <span className="text-[#8a7a65] text-xs">Ali Imran: 112</span>
        </div>

        {/* Hablumminallah */}
        <button onClick={() => navigate('/hablum')} className="w-full bg-[#0d1821] border border-[#c9a96e25] rounded-2xl p-5 space-y-3 text-left hover:border-[#c9a96e40] transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center flex-shrink-0 text-lg">✦</div>
            <div>
              <p className="font-serif text-[#c9a96e] text-base leading-none">حَبْلٌ مِّنَ اللَّهِ</p>
              <p className="text-[#e8dcc8] text-sm font-medium mt-1">{t('dashboard.hablumminallah')}</p>
              <p className="text-[#8a7a65] text-xs">{t('dashboard.hablumminallah_sub')}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[t('hablum.solat'), t('hablum.zikir'), t('hablum.audit'), t('hablum.taqwa')].map(label => (
              <span key={label} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#c9a96e30] text-[#c9a96e]">
                {label}
              </span>
            ))}
          </div>
        </button>

        {/* Hablumminannas */}
        <button onClick={() => navigate('/hablum')} className="w-full bg-[#0d1821] border border-[#f43f5e20] rounded-2xl p-5 space-y-3 text-left hover:border-[#f43f5e40] transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f43f5e10] border border-[#f43f5e20] flex items-center justify-center flex-shrink-0 text-lg">❤️</div>
            <div>
              <p className="font-serif text-[#f43f5e] text-base leading-none">حَبْلٌ مِّنَ النَّاسِ</p>
              <p className="text-[#e8dcc8] text-sm font-medium mt-1">{t('dashboard.hablumminannas')}</p>
              <p className="text-[#8a7a65] text-xs">{t('dashboard.hablumminannas_sub')}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[t('hablum.akhlak'), t('hablum.silaturrahim'), t('hablum.maaf'), t('hablum.khidmat')].map(label => (
              <span key={label} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#f43f5e20] text-[#f43f5e] opacity-50">
                {label}
              </span>
            ))}
          </div>
          <p className="text-[#f43f5e] text-xs opacity-60">{t('dashboard.pro_unlock')}</p>
        </button>

        {/* Ayat rujukan */}
        <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center">
          <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
            ضُرِبَتْ عَلَيْهِمُ الذِّلَّةُ أَيْنَ مَا ثُقِفُوا إِلَّا بِحَبْلٍ مِّنَ اللَّهِ وَحَبْلٍ مِّنَ النَّاسِ
          </p>
          <p className="text-[#8a7a65] text-xs mt-2 leading-relaxed italic">
            "{t('ayat.ali_imran_112')}"
          </p>
          <p className="text-[#c9a96e60] text-xs mt-1">— Ali Imran: 112</p>
        </div>
      </div>

      {/* Ayat */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-6 text-center">
        <p className="font-serif text-[#c9a96e] text-lg mb-1">
          وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ تَنفَعُ الْمُؤْمِنِينَ
        </p>
        <p className="text-[#8a7a65] text-sm leading-relaxed">
          "{t('ayat.zariyat_55')}"
        </p>
        <p className="text-[#c9a96e60] text-xs mt-2">— Surah Az-Zariyat: 55</p>
      </div>
    </div>
  )
}
