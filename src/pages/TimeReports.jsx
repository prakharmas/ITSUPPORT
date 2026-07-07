import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import toast from 'react-hot-toast'

export default function TimeReports() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    end_date: new Date().toISOString().split('T')[0]
  })
  const [myStats, setMyStats] = useState(null)
  const [myEntries, setMyEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')

  useEffect(() => {
    fetchData()
  }, [dateRange, selectedUser])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch my stats
      const statsResponse = await api.get('/time-tracking/stats/user/' + user.id, {
        params: dateRange
      })
      setMyStats(statsResponse.data)

      // Fetch my entries
      const entriesResponse = await api.get('/time-tracking/my-entries', {
        params: dateRange
      })
      setMyEntries(entriesResponse.data)

      // PM: Fetch summary and users
      if (user.role === 'pm') {
        const summaryResponse = await api.get('/time-tracking/summary', {
          params: {
            ...dateRange,
            user_id: selectedUser || undefined
          }
        })
        setSummary(summaryResponse.data)

        const usersResponse = await api.get('/users')
        setUsers(usersResponse.data.filter(u => u.role === 'dev'))
      }
    } catch (error) {
      console.error('Failed to fetch time reports:', error)
      toast.error('Failed to load time reports')
    } finally {
      setLoading(false)
    }
  }

  const formatHours = (hours) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportToCSV = () => {
    try {
      const headers = ['Date', 'Ticket ID', 'Hours', 'Activity Type', 'Billable', 'Description', 'User']
      const rows = myEntries.map(entry => [
        new Date(entry.logged_at).toLocaleDateString(),
        entry.work_item_id,
        entry.hours,
        entry.activity_type || 'N/A',
        entry.is_billable ? 'Yes' : 'No',
        entry.description || '',
        entry.user_name
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `time_report_${dateRange.start_date}_to_${dateRange.end_date}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success('📊 Report exported successfully!')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export report')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading time reports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⏱️</span>
            <div>
              <h1 className="page-header-title">Time Reports</h1>
              <p className="page-header-subtitle">Track and export time entries</p>
            </div>
          </div>
          <button onClick={exportToCSV} className="btn btn-primary">
            📊 Export
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="input"
            />
          </div>
          {user.role === 'pm' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="input"
              >
                <option value="">All Developers</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* My Statistics */}
      {myStats && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {user.role === 'pm' ? '📊 My Time Statistics' : '📊 Your Time Statistics'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-blue-50 border-blue-200">
              <div className="text-sm text-blue-600 font-medium mb-1">Total Hours</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatHours(parseFloat(myStats.total_hours))}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {myStats.entry_count} entries
              </div>
            </div>

            <div className="card bg-green-50 border-green-200">
              <div className="text-sm text-green-600 font-medium mb-1">Billable Hours</div>
              <div className="text-2xl font-bold text-green-900">
                {formatHours(parseFloat(myStats.billable_hours))}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {myStats.total_hours > 0 ? ((parseFloat(myStats.billable_hours) / parseFloat(myStats.total_hours)) * 100).toFixed(0) : 0}% of total
              </div>
            </div>

            <div className="card bg-purple-50 border-purple-200">
              <div className="text-sm text-purple-600 font-medium mb-1">Non-Billable</div>
              <div className="text-2xl font-bold text-purple-900">
                {formatHours(parseFloat(myStats.non_billable_hours))}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {myStats.total_hours > 0 ? ((parseFloat(myStats.non_billable_hours) / parseFloat(myStats.total_hours)) * 100).toFixed(0) : 0}% of total
              </div>
            </div>

            <div className="card bg-orange-50 border-orange-200">
              <div className="text-sm text-orange-600 font-medium mb-1">Avg. Hours/Day</div>
              <div className="text-2xl font-bold text-orange-900">
                {myStats.entry_count > 0 ? formatHours(parseFloat(myStats.total_hours) / Math.max(1, myStats.entry_count)) : '0h'}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Based on entries
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PM: Team Summary */}
      {user.role === 'pm' && summary && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            📈 {selectedUser ? `${users.find(u => u.id === parseInt(selectedUser))?.name}'s` : 'Team'} Summary
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activity Breakdown */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">By Activity Type</h3>
              <div className="space-y-2">
                {Object.entries(summary.by_activity_type).length === 0 ? (
                  <p className="text-sm text-gray-500">No activity data</p>
                ) : (
                  Object.entries(summary.by_activity_type).map(([activity, hours]) => (
                    <div key={activity} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 capitalize">{activity.replace('_', ' ')}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatHours(hours)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* User Breakdown */}
            {!selectedUser && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">By Developer</h3>
                <div className="space-y-2">
                  {Object.entries(summary.by_user).length === 0 ? (
                    <p className="text-sm text-gray-500">No user data</p>
                  ) : (
                    Object.entries(summary.by_user)
                      .sort(([, a], [, b]) => b - a)
                      .map(([userName, hours]) => (
                        <div key={userName} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{userName}</span>
                          <span className="text-sm font-semibold text-gray-900">{formatHours(hours)}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Entries */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          📝 {user.role === 'pm' && selectedUser ? `${users.find(u => u.id === parseInt(selectedUser))?.name}'s ` : 'Your '}Recent Entries
        </h2>
        
        {myEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No time entries found for the selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ticket</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Hours</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Activity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myEntries.slice(0, 50).map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {new Date(entry.logged_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className="text-blue-600 hover:underline cursor-pointer">
                        #{entry.work_item_id}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                      {formatHours(parseFloat(entry.hours))}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 capitalize">
                      {entry.activity_type?.replace('_', ' ') || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {entry.is_billable ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          💰 Billable
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          Non-billable
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                      {entry.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}









