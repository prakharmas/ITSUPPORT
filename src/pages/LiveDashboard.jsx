import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import LiveTopList from '../components/LiveTopList'
import {
  BoltIcon,
  ArrowPathIcon,
  PlusCircleIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  FireIcon,
  SparklesIcon,
  ArrowPathRoundedSquareIcon,
  PauseIcon,
  PlayIcon,
  ChartBarSquareIcon,
  InboxIcon,
} from '@heroicons/react/24/outline'

const REFRESH_INTERVAL_MS = 30000

export default function LiveDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/dashboard/live')
      setData(res.data)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      console.error('Dashboard fetch failed:', e)
      setError(e.response?.data?.detail || 'Failed to load dashboard')
      if (!silent) toast.error('Failed to load live dashboard')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(true), REFRESH_INTERVAL_MS)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchData])

  const canAccess = user?.role === 'pm' || user?.role === 'dev' || user?.role === 'admin'

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BoltIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500">Only PM, Dev and Admin can access Live Dashboard</p>
        </div>
      </div>
    )
  }

  const getPriorityColor = (p) => ({
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    normal: 'bg-blue-100 text-blue-800 border-blue-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200',
  }[p] || 'bg-gray-100 text-gray-800')

  const formatTime = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateShort = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }

  const today = data?.today || {}
  const trend = data?.trend_7days || []
  const team = data?.team_workload || []

  const maxTrend = Math.max(1, ...trend.map(t => Math.max(t.created, t.assigned, t.closed)))
  const maxTeamActive = Math.max(1, ...team.map(t => t.total_active))

  const hasTrendData = trend.some(t => t.created > 0 || t.assigned > 0 || t.closed > 0)
  const hasTeamActivity = team.some(t => t.total_active > 0 || t.closed_today > 0)

  return (
    <div className="w-full max-w-none space-y-4 animate-fade-in">
      {/* ============ HEADER ============ */}
      <div className="page-header">
        <div className="page-header-content flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-50 animate-pulse"></div>
              <BoltIcon className="relative h-6 w-6 text-yellow-300" />
            </div>
            <div>
              <h1 className="page-header-title flex items-center gap-2">
                Live Tracker
                <span className="text-xs font-bold px-2.5 py-1 bg-red-500 text-white rounded-full flex items-center gap-1.5 shadow-lg shadow-red-500/50">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  LIVE
                </span>
              </h1>
              <p className="page-header-subtitle">
                Real-time ticket tracking •{' '}
                <span className="text-white/80">
                  {lastUpdated ? `Updated ${formatTime(lastUpdated)}` : 'Loading...'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`btn text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-md ${
                autoRefresh
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/30'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              {autoRefresh ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
              {autoRefresh ? 'Auto ON' : 'Auto OFF'}
            </button>
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20 text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link to="/board" className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20 text-xs py-1.5 px-3">
              ← Board
            </Link>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              <BoltIcon className="absolute inset-0 m-auto h-6 w-6 text-indigo-600" />
            </div>
            <p className="text-sm text-gray-600 font-medium">Loading live data...</p>
          </div>
        </div>
      ) : error && !data ? (
        <div className="card bg-red-50 border-2 border-red-300 text-center py-12">
          <ExclamationTriangleIcon className="h-14 w-14 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-900 mb-1">Failed to load dashboard</h3>
          <p className="text-red-800 text-sm mb-4">{error}</p>
          <button onClick={() => fetchData()} className="btn btn-primary text-sm">
            Try Again
          </button>
        </div>
      ) : data ? (
        <>
          {/* ============ HERO KPI CARDS ============ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Created Today"
              value={today.created}
              icon={<PlusCircleIcon className="h-6 w-6" />}
              gradient="from-blue-500 to-indigo-600"
              shadow="shadow-blue-500/30"
              subtext="new tickets"
            />
            <KpiCard
              label="Assigned Today"
              value={today.assigned}
              icon={<UserPlusIcon className="h-6 w-6" />}
              gradient="from-purple-500 to-violet-600"
              shadow="shadow-purple-500/30"
              subtext="to team"
            />
            <KpiCard
              label="Closed Today"
              value={today.closed}
              icon={<CheckCircleIcon className="h-6 w-6" />}
              gradient="from-emerald-500 to-teal-600"
              shadow="shadow-emerald-500/30"
              subtext="resolved"
            />
            <KpiCard
              label="On-Time Rate"
              value={`${today.on_time_rate}%`}
              icon={<SparklesIcon className="h-6 w-6" />}
              gradient="from-green-500 to-emerald-600"
              shadow="shadow-green-500/30"
              subtext={`${today.closed_on_time} met / ${today.closed_delayed} late`}
            />
            <KpiCard
              label="Overdue Open"
              value={today.overdue_open}
              icon={<ExclamationTriangleIcon className="h-6 w-6" />}
              gradient="from-red-500 to-rose-600"
              shadow="shadow-red-500/30"
              subtext={`${today.critical_open} critical`}
              pulse={today.overdue_open > 0}
            />
          </div>

          {/* ============ SECONDARY STATS ============ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SmallStatCard
              label="Rescheduled Today"
              value={today.rescheduled}
              icon={<ArrowPathRoundedSquareIcon className="h-5 w-5" />}
              color="amber"
            />
            <SmallStatCard
              label="Reopened Today"
              value={today.reopened}
              icon={<ArrowPathIcon className="h-5 w-5" />}
              color="rose"
            />
            <SmallStatCard
              label="Critical Open"
              value={today.critical_open}
              icon={<FireIcon className="h-5 w-5" />}
              color="indigo"
            />
          </div>

          {/* ============ TREND + TEAM ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Trend — 3/5 width */}
            <div className="lg:col-span-3 card">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
                  <ChartBarSquareIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">7-Day Activity Trend</h3>
                  <p className="text-xs text-gray-500">Created • Assigned • Closed</p>
                </div>
                <div className="ml-auto flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-blue-500 rounded"></span>
                    <span className="text-gray-600">Created</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-purple-500 rounded"></span>
                    <span className="text-gray-600">Assigned</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-green-500 rounded"></span>
                    <span className="text-gray-600">Closed</span>
                  </span>
                </div>
              </div>

              {!hasTrendData ? (
                <EmptyState
                  icon={<ChartBarSquareIcon className="h-12 w-12" />}
                  title="No activity in the last 7 days"
                  subtitle="Create or close tickets to see trend"
                  small
                />
              ) : (
                <div className="flex items-end justify-between gap-2 h-48 pt-4">
                  {trend.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="flex items-end gap-1 h-36 w-full justify-center">
                        <Bar value={d.created} max={maxTrend} color="bg-gradient-to-t from-blue-600 to-blue-400" label={`Created: ${d.created}`} />
                        <Bar value={d.assigned} max={maxTrend} color="bg-gradient-to-t from-purple-600 to-purple-400" label={`Assigned: ${d.assigned}`} />
                        <Bar value={d.closed} max={maxTrend} color="bg-gradient-to-t from-green-600 to-green-400" label={`Closed: ${d.closed}`} />
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Workload — 2/5 width */}
            <div className="lg:col-span-2 card">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
                  <UserGroupIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Team Workload</h3>
                  <p className="text-xs text-gray-500">{team.length} members</p>
                </div>
              </div>

              {!hasTeamActivity ? (
                <EmptyState
                  icon={<UserGroupIcon className="h-12 w-12" />}
                  title="Team is idle"
                  subtitle="No active assignments yet"
                  small
                />
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {team.map((m) => (
                    <div key={m.user_id} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {m.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-gray-800 truncate" title={m.name}>
                            {m.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {m.closed_today > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-800 rounded font-bold">
                              ✓{m.closed_today}
                            </span>
                          )}
                          {m.total_today - m.closed_today > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">
                              +{m.total_today - m.closed_today}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-bold">
                            {m.total_active}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
                          style={{ width: `${(m.total_active / maxTeamActive) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Closed today
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> Assigned today
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Total active
                </span>
              </div>
            </div>
          </div>

          {/* ============ TOP 10 LISTS ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <LiveTopList
              title="Just Created Today"
              icon={<PlusCircleIcon className="h-4 w-4" />}
              items={data.top_created_today}
              accentColor="blue"
              emptyText="No tickets created today"
              renderRow={(t) => (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-gray-500 flex-shrink-0">#{t.id}</span>
                  <span className="text-sm text-gray-800 truncate flex-1" title={t.title}>
                    {t.title}
                  </span>
                  {t.priority && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase flex-shrink-0 ${getPriorityColor(t.priority)}`}>
                      {t.priority}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    {formatTime(t.created_at)}
                  </span>
                </div>
              )}
            />

            <LiveTopList
              title="Just Assigned Today"
              icon={<UserPlusIcon className="h-4 w-4" />}
              items={data.top_assigned_today}
              accentColor="purple"
              emptyText="No assignments today"
              renderRow={(t) => (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-gray-500 flex-shrink-0">#{t.id}</span>
                  <span className="text-sm text-gray-800 truncate flex-1" title={t.title}>
                    {t.title}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-medium flex-shrink-0">
                    → {t.assignee_name}
                  </span>
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    {formatTime(t.assigned_at)}
                  </span>
                </div>
              )}
            />

            <LiveTopList
              title="Closed Today"
              icon={<CheckCircleIcon className="h-4 w-4" />}
              items={data.top_closed_today}
              accentColor="emerald"
              emptyText="No tickets closed today"
              renderRow={(t) => (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-gray-500 flex-shrink-0">#{t.id}</span>
                  <span className="text-sm text-gray-800 truncate flex-1" title={t.title}>
                    {t.title}
                  </span>
                  {t.on_time === true && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full font-bold flex-shrink-0">
                      ✅ On Time
                    </span>
                  )}
                  {t.on_time === false && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-800 rounded-full font-bold flex-shrink-0">
                      ⚠️ Late
                    </span>
                  )}
                  {t.closing_time_hours > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold flex-shrink-0">
                      ⏱️ {t.closing_time_hours.toFixed(1)}h
                    </span>
                  )}
                </div>
              )}
            />

            <LiveTopList
              title="Overdue & Open"
              icon={<ExclamationTriangleIcon className="h-4 w-4" />}
              items={data.top_overdue}
              accentColor="red"
              emptyText="No overdue tickets 🎉"
              renderRow={(t) => (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-gray-500 flex-shrink-0">#{t.id}</span>
                  <span className="text-sm text-gray-800 truncate flex-1" title={t.title}>
                    {t.title}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-800 rounded-full font-bold flex-shrink-0">
                    ⏰ {t.days_late}d late
                  </span>
                  <span className="text-[10px] text-gray-500 flex-shrink-0 truncate max-w-[80px]" title={t.assignee_name}>
                    {t.assignee_name}
                  </span>
                </div>
              )}
            />

            <LiveTopList
              title="Rescheduled Today"
              icon={<ArrowPathRoundedSquareIcon className="h-4 w-4" />}
              items={data.top_rescheduled}
              accentColor="amber"
              emptyText="No reschedules today"
              renderRow={(t) => (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-gray-500 flex-shrink-0">#{t.id}</span>
                  <span className="text-sm text-gray-800 truncate flex-1" title={t.title}>
                    {t.title}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold flex-shrink-0">
                    {formatDateShort(t.original_date)} → {formatDateShort(t.new_date)}
                  </span>
                </div>
              )}
            />
          </div>

          {/* ============ FOOTER ============ */}
          <div className="flex items-center justify-center gap-3 py-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-200">
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              <span className="text-xs text-gray-600 font-medium">
                {autoRefresh ? `Auto-refreshing every ${REFRESH_INTERVAL_MS / 1000}s` : 'Auto-refresh is OFF'}
              </span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

// ============ SUB-COMPONENTS ============

function KpiCard({ label, value, icon, gradient, shadow, subtext, pulse = false }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-xl ${shadow} hover:scale-[1.02] transition-transform cursor-default`}>
      {pulse && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{label}</p>
          <div className="opacity-80">{icon}</div>
        </div>
        <p className="text-4xl font-bold leading-none mb-1">{value}</p>
        <p className="text-xs opacity-80">{subtext}</p>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full"></div>
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full"></div>
    </div>
  )
}

function SmallStatCard({ label, value, icon, color }) {
  const colorMap = {
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', iconText: 'text-amber-600', value: 'text-amber-900' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', iconBg: 'bg-rose-100', iconText: 'text-rose-600', value: 'text-rose-900' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', value: 'text-indigo-900' },
  }
  const c = colorMap[color] || colorMap.indigo
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${c.bg} ${c.border}`}>
      <div className={`p-2.5 rounded-lg ${c.iconBg}`}>
        <span className={c.iconText}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-600 truncate">{label}</p>
        <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
      </div>
    </div>
  )
}

function Bar({ value, max, color, label }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div
      className={`w-3 rounded-t-md ${color} transition-all duration-500 hover:opacity-80 cursor-pointer relative group`}
      style={{ height: `${Math.max(pct, value > 0 ? 8 : 0)}%`, minHeight: value > 0 ? '6px' : '2px' }}
      title={label}
    >
      {value > 0 && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {value}
        </span>
      )}
    </div>
  )
}

function EmptyState({ icon, title, subtitle, small = false }) {
  return (
    <div className={`text-center ${small ? 'py-6' : 'py-10'}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-3 text-gray-300">
        {icon}
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  )
}