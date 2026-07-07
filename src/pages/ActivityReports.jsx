import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { ChartBarIcon, CalendarIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function ActivityReports() {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    user_id: '',
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchUsers()
    fetchReports()
    fetchSummary()
  }, [filters])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data.filter(u => u.role === 'dev' || u.role === 'pm'))
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchReports = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      
      const response = await api.get(`/activity-reports?${params.toString()}`)
      setReports(response.data)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      
      const response = await api.get(`/activity-reports/summary?${params.toString()}`)
      setSummary(response.data)
    } catch (error) {
      console.error('Failed to fetch summary:', error)
    }
  }

  const calculateDuration = (start, end) => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  }

  const getActivityIcon = (type) => {
    const icons = {
      coding: '💻',
      testing: '🧪',
      code_review: '👀',
      meeting: '🤝',
      documentation: '📝',
      debugging: '🐛',
      deployment: '🚀',
      planning: '📋',
      support: '💬',
      other: '📌'
    }
    return icons[type] || '📌'
  }

  const exportToExcel = () => {
    try {
      // Create CSV content
      const headers = ['Date', 'User', 'Activity Type', 'Start Time', 'End Time', 'Duration', 'Feature', 'Description', 'Accomplishments', 'Blockers']
      const rows = reports.map(report => {
        const duration = calculateDuration(report.start_time, report.end_time)
        return [
          report.date,
          `User ${report.user_id}`,
          report.activity_type.replace('_', ' '),
          report.start_time,
          report.end_time,
          duration,
          report.feature_worked || 'N/A',
          report.description,
          report.accomplishments || 'N/A',
          report.blockers || 'N/A'
        ]
      })
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('✅ Activity logs exported to CSV!')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export activity logs')
    }
  }

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📊</span>
            <div>
              <h1 className="page-header-title">Activity Reports</h1>
              <p className="page-header-subtitle">
                {user?.role === 'pm' ? 'Team activity tracking' : 'Your activity stats'}
              </p>
            </div>
          </div>
          {reports.length > 0 && (
            <button onClick={exportToExcel} className="btn btn-primary">
              📥 Export
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-700">Total Reports</p>
                <p className="text-2xl font-bold text-blue-900">{summary.total_reports}</p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-700">Total Hours</p>
                <p className="text-2xl font-bold text-green-900">{summary.total_hours}h</p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-purple-700">Days Logged</p>
                <p className="text-2xl font-bold text-purple-900">{summary.reports_by_date}</p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-base">~</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-orange-700">Avg/Day</p>
                <p className="text-2xl font-bold text-orange-900">
                  {summary.reports_by_date > 0 ? (summary.total_hours / summary.reports_by_date).toFixed(1) : 0}h
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {user?.role === 'pm' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by User
              </label>
              <select
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                className="input"
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Activity Breakdown */}
      {summary && summary.activity_breakdown && Object.keys(summary.activity_breakdown).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time by Activity Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(summary.activity_breakdown).map(([type, hours]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">{getActivityIcon(type)}</div>
                <p className="text-xs text-gray-600 capitalize mb-1">{type.replace('_', ' ')}</p>
                <p className="text-lg font-bold text-gray-900">{hours}h</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Logs</h3>
        
        {reports.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No activity reports found for the selected period</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getActivityIcon(report.activity_type)}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{report.date}</span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded capitalize">
                          {report.activity_type.replace('_', ' ')}
                        </span>
                      </div>
                      {user?.role === 'pm' && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          User #{report.user_id}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {report.start_time} - {report.end_time}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {calculateDuration(report.start_time, report.end_time)}
                    </p>
                  </div>
                </div>

                {report.feature_worked && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-600">Feature: </span>
                    <span className="text-xs text-gray-700">{report.feature_worked}</span>
                  </div>
                )}

                <p className="text-sm text-gray-700 mb-2">{report.description}</p>

                {report.accomplishments && (
                  <div className="bg-green-50 border-l-4 border-green-400 p-2 mb-2">
                    <p className="text-xs font-medium text-green-800">✅ Accomplishments:</p>
                    <p className="text-xs text-green-700">{report.accomplishments}</p>
                  </div>
                )}

                {report.blockers && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-2">
                    <p className="text-xs font-medium text-red-800">⚠️ Blockers:</p>
                    <p className="text-xs text-red-700">{report.blockers}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


