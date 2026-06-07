import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

const loginSchema = z.object({
  email: z.string().email('E-mel tidak sah'),
  password: z.string().min(6, 'Kata laluan minimum 6 aksara'),
})

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Nama minimum 2 aksara'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Kata laluan tidak sepadan',
  path: ['confirmPassword'],
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [intention, setIntention] = useState('')
  const [welcomeMode, setWelcomeMode] = useState(false)

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const isLoading = loginForm.formState.isSubmitting || registerForm.formState.isSubmitting

  async function handleLogin(data: LoginForm) {
    setError('')
    try {
      await signIn(data.email, data.password)
      navigate('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ada gangguan, cuba semula.')
    }
  }

  async function handleRegister(data: RegisterForm) {
    setError('')
    setSuccess('')
    try {
      await signUp(data.email, data.password, data.name)
      setWelcomeMode(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ada gangguan, cuba semula.')
    }
  }

  function switchMode(newMode: 'login' | 'register') {
    setMode(newMode)
    setError('')
    setSuccess('')
    loginForm.reset()
    registerForm.reset()
  }

  return (
    <div className="min-h-screen bg-[#060d16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#c9a96e08] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#c9a96e05] rounded-full blur-3xl" />
        {/* Star dots */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-[#c9a96e] rounded-full opacity-30"
            style={{
              top: `${10 + (i * 37) % 80}%`,
              left: `${5 + (i * 53) % 90}%`,
              opacity: 0.1 + (i % 5) * 0.08,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] mb-4">
            <span className="text-2xl">🌙</span>
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#c9a96e]">Madrasah I AM</h1>
          <p className="text-[#8a7a65] text-sm mt-1">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        </div>

        {/* Welcome screen selepas daftar */}
        {welcomeMode && (
          <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-8 shadow-2xl text-center space-y-4">
            <p className="font-serif text-[#c9a96e] text-xl leading-loose" dir="rtl">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>
            <div className="space-y-1">
              <p className="font-serif text-[#c9a96e] text-2xl">Alhamdulillah.</p>
              <p className="text-[#e8dcc8] text-sm leading-relaxed">
                Pintu Madrasah I AM terbuka untuk anda.
              </p>
            </div>
            {intention.trim() && (
              <div className="bg-[#060d16] border border-[#c9a96e20] rounded-xl p-4 text-left">
                <p className="text-[#8a7a65] text-xs mb-1">Niat pertama anda:</p>
                <p className="text-[#e8dcc8] text-sm italic">"{intention}"</p>
                <p className="text-[#8a7a65] text-xs mt-2">
                  InsyaAllah perjalanan ini akan membantu. Mulakan dengan langkah pertama yang kecil.
                </p>
              </div>
            )}
            <p className="text-[#8a7a65] text-xs">Sila semak e-mel untuk pengesahan akaun.</p>
            <button onClick={() => setWelcomeMode(false)}
              className="w-full py-3 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors">
              → Mulakan Onboarding
            </button>
          </div>
        )}

        {/* Card */}
        {!welcomeMode && (
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-[#060d16] rounded-xl p-1 mb-7">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                  mode === m
                    ? 'bg-[#c9a96e] text-[#060d16]'
                    : 'text-[#8a7a65] hover:text-[#e8dcc8]'
                )}
              >
                {m === 'login' ? t('auth.kembali_madrasah') : t('auth.daftar')}
              </button>
            ))}
          </div>

          {/* Error / Success messages */}
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-900/20 border border-red-900/40 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 px-4 py-3 bg-emerald-900/20 border border-emerald-900/40 rounded-xl text-emerald-400 text-sm">
              {success}
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <AuthField
                icon={<Mail size={16} />}
                label={t('auth.email')}
                type="email"
                placeholder="nama@email.com"
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />
              <AuthField
                icon={<Lock size={16} />}
                label={t('auth.kata_laluan')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={loginForm.formState.errors.password?.message}
                suffix={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#8a7a65] hover:text-[#c9a96e] transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                {...loginForm.register('password')}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl hover:bg-[#e2c89a] active:bg-[#a07840] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {t('auth.log_masuk')}
              </button>
            </form>
          )}

          {/* Sebelum Melangkah Masuk — register only */}
          {mode === 'register' && (
            <div className="mb-6 bg-[#060d16] border border-[#c9a96e20] rounded-xl p-4 space-y-3">
              <p className="text-[#c9a96e] text-sm font-serif">Sebelum Melangkah Masuk...</p>
              <p className="text-[#e8dcc8] text-sm leading-relaxed">
                Apakah satu kelalaian yang paling anda ingin perbaiki hari ini?
              </p>
              <textarea
                value={intention}
                onChange={e => setIntention(e.target.value)}
                placeholder="Tulis dengan jujur — hanya untuk diri anda..."
                rows={2}
                className="w-full bg-[#0d1821] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"
              />
              <p className="text-[#8a7a65] text-xs">
                Jawapan ini hanya untuk diri anda. Ia adalah niat pertama anda dalam perjalanan ini.
              </p>
            </div>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <AuthField
                icon={<User size={16} />}
                label={t('auth.nama')}
                type="text"
                placeholder="Nama anda"
                error={registerForm.formState.errors.name?.message}
                {...registerForm.register('name')}
              />
              <AuthField
                icon={<Mail size={16} />}
                label={t('auth.email')}
                type="email"
                placeholder="nama@email.com"
                error={registerForm.formState.errors.email?.message}
                {...registerForm.register('email')}
              />
              <AuthField
                icon={<Lock size={16} />}
                label={t('auth.kata_laluan')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 aksara"
                error={registerForm.formState.errors.password?.message}
                suffix={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#8a7a65] hover:text-[#c9a96e] transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                {...registerForm.register('password')}
              />
              <AuthField
                icon={<Lock size={16} />}
                label={t('auth.sahkan_kata_laluan')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Taip semula kata laluan"
                error={registerForm.formState.errors.confirmPassword?.message}
                {...registerForm.register('confirmPassword')}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl hover:bg-[#e2c89a] active:bg-[#a07840] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {t('auth.mulakan_perjalanan')}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#1e2d40]" />
            <span className="text-xs text-[#8a7a65]">{t('umum.atau')}</span>
            <div className="flex-1 h-px bg-[#1e2d40]" />
          </div>

          {/* Google */}
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 bg-[#1a2535] border border-[#1e2d40] text-[#e8dcc8] text-sm font-medium rounded-xl hover:border-[#c9a96e40] hover:text-[#c9a96e] transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.google')}
          </button>

          {/* Footer */}
          <p className="text-center text-[#8a7a65] text-xs mt-6">
            Dengan memulakan perjalanan, anda bersetuju dengan{' '}
            <span className="text-[#c9a96e] cursor-pointer hover:underline">Terma Perkhidmatan</span>
          </p>
        </div>
        )}

    </div>
  </div>
  )
}

// Reusable field component
interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode
  label: string
  error?: string
  suffix?: React.ReactNode
}

const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ icon, label, error, suffix, ...props }, ref) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#8a7a65] uppercase tracking-wider">{label}</label>
      <div className={cn(
        'flex items-center gap-3 bg-[#060d16] border rounded-xl px-4 py-3 transition-colors',
        error ? 'border-red-500/50' : 'border-[#1e2d40] focus-within:border-[#c9a96e50]'
      )}>
        <span className="text-[#8a7a65] flex-shrink-0">{icon}</span>
        <input
          ref={ref}
          className="flex-1 bg-transparent text-base text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none"
          {...props}
        />
        {suffix}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
)
AuthField.displayName = 'AuthField'

import React from 'react'
