import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, DollarSign, Cpu, Users, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type UsageLog = {
  id: string
  user_id: string
  user_type: string
  feature: string
  tokens_used: number
  model: string
  cost_usd: number
  created_at: string
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

function formatTokens(tokens: number): string {
  return tokens.toLocaleString('en-US')
}

export default function ApiUsageDashboard() {
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.from('api_usage_logs') as any)
        .select('id, user_id, user_type, feature, tokens_used, model, cost_usd, created_at')
        .gte('created_at', monthStart.toISOString())
        .order('created_at', { ascending: false })
      if (err) throw err
      setLogs(data ?? [])
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Gagal memuatkan data penggunaan API')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const now = new Date()

    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const weekStart = new Date(todayStart)
    const dayOfWeek = (weekStart.getDay() + 6) % 7 // Isnin = 0
    weekStart.setDate(weekStart.getDate() - dayOfWeek)

    let costToday = 0
    let costWeek = 0
    let costMonth = 0
    let totalTokens = 0
    const byUserType = new Map<string, number>()
    const byFeature = new Map<string, { cost: number; tokens: number }>()

    for (const log of logs) {
      const createdAt = new Date(log.created_at)
      costMonth += log.cost_usd
      totalTokens += log.tokens_used
      if (createdAt >= weekStart) costWeek += log.cost_usd
      if (createdAt >= todayStart) costToday += log.cost_usd

      byUserType.set(log.user_type, (byUserType.get(log.user_type) ?? 0) + log.cost_usd)

      const feature = byFeature.get(log.feature) ?? { cost: 0, tokens: 0 }
      feature.cost += log.cost_usd
      feature.tokens += log.tokens_used
      byFeature.set(log.feature, feature)
    }

    return {
      costToday,
      costWeek,
      costMonth,
      totalTokens,
      byUserType: [...byUserType.entries()].sort((a, b) => b[1] - a[1]),
      byFeature: [...byFeature.entries()].sort((a, b) => b[1].cost - a[1].cost),
    }
  }, [logs])

  return (
    <div className="space-y-4">
      {/* Cost summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-xl p-3 text-center">
          <p className="text-[#c9a96e] text-base font-semibold">{formatCost(stats.costToday)}</p>
          <p className="text-[#8a7a65] text-xs mt-0.5">Hari Ini</p>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-xl p-3 text-center">
          <p className="text-[#c9a96e] text-base font-semibold">{formatCost(stats.costWeek)}</p>
          <p className="text-[#8a7a65] text-xs mt-0.5">Minggu Ini</p>
        </div>
        <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-xl p-3 text-center">
          <p className="text-[#c9a96e] text-base font-semibold">{formatCost(stats.costMonth)}</p>
          <p className="text-[#8a7a65] text-xs mt-0.5">Bulan Ini</p>
        </div>
      </div>

      {/* Total tokens */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center flex-shrink-0">
          <Cpu size={16} className="text-[#c9a96e]" />
        </div>
        <div>
          <p className="text-[#e8dcc8] text-base font-semibold">{formatTokens(stats.totalTokens)}</p>
          <p className="text-[#8a7a65] text-xs">Jumlah Token (Bulan Ini)</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-[#8a7a65] text-xs">{logs.length} rekod bulan ini</p>
        <button onClick={load} className="p-2 text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <p className="text-center py-8 text-[#8a7a65] text-sm">Memuatkan...</p>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      ) : (
        <>
          {/* Breakdown by user type */}
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[#c9a96e]" />
              <h3 className="text-[#e8dcc8] text-sm font-medium">Kos Mengikut Jenis Pengguna</h3>
            </div>
            {stats.byUserType.length === 0 ? (
              <p className="text-[#8a7a65] text-xs">Tiada data lagi.</p>
            ) : (
              <div className="space-y-2">
                {stats.byUserType.map(([userType, cost]) => (
                  <div key={userType} className="flex items-center justify-between">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-md border',
                      userType === 'pro'
                        ? 'text-[#c9a96e] bg-[#c9a96e15] border-[#c9a96e30]'
                        : userType === 'family'
                        ? 'text-violet-400 bg-violet-900/20 border-violet-600/40'
                        : 'text-[#8a7a65] bg-[#1e2d40] border-[#2a3d55]'
                    )}>
                      {userType}
                    </span>
                    <span className="text-[#e8dcc8] text-sm font-medium">{formatCost(cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Breakdown by feature */}
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-[#c9a96e]" />
              <h3 className="text-[#e8dcc8] text-sm font-medium">Kos Mengikut Ciri-ciri</h3>
            </div>
            {stats.byFeature.length === 0 ? (
              <p className="text-[#8a7a65] text-xs">Tiada data lagi.</p>
            ) : (
              <div className="space-y-2">
                {stats.byFeature.map(([feature, { cost, tokens }]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <div>
                      <p className="text-[#e8dcc8] text-sm">{feature}</p>
                      <p className="text-[#8a7a65] text-xs">{formatTokens(tokens)} token</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#c9a96e] text-sm font-medium">
                      <DollarSign size={12} />
                      {cost.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
