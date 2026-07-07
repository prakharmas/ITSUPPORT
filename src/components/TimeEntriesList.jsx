import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const ACTIVITY_ICONS = {
  coding: '💻',
  testing: '🧪',
  code_review: '👀',
  meeting: '👥',
  documentation: '📝',
  debugging: '🐛',
  deployment: '🚀',
  planning: '📋',
  support: '🎧',
  other: '📦'
}

export default function TimeEntriesList({ ticketId, onUpdate }) {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    fetchTimeEntries()
    fetchStats()
  }, [ticketId])

  useEffect(() => {
    if (onUpdate) {
      fetchTimeEntries()
      fetchStats()
    }
  }, [onUpdate])

  const fetchTimeEntries = async () => {
    try {
      const response = await api.get(`/time-tracking/ticket/${ticketId}`)
      setEntries(response.data)
    } catch (error) {
      console.error('Failed to fetch time entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get(`/time-tracking/stats/ticket/${ticketId}`)
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch time stats:', error)
    }
  }

  const deleteEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return
    
    try {
      await api.delete(`/time-tracking/${entryId}`)
      toast.success('Time entry deleted')
      fetchTimeEntries()
      fetchStats()
    } catch (error) {
      console.error('Failed to delete entry:', error)
      toast.error('Failed to delete entry')
    }
  }

  const startEdit = (entry) => {
    setEditingId(entry.id)
    setEditData({
      hours: entry.hours,
      description: entry.description || '',
      is_billable: entry.is_billable
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const saveEdit = async (entryId) => {
    try {
      await api.patch(`/time-tracking/${entryId}`, editData)
      toast.success('Time entry updated')
      setEditingId(null)
      setEditData({})
      fetchTimeEntries()
      fetchStats()
    } catch (error) {
      console.error('Failed to update entry:', error)
      toast.error('Failed to update entry')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatHours = (hours) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  if (loading) {
    return <div className="text-center text-sm text-gray-500">Loading time entries...</div>
  }

  return (
    <div className="space-y-3">
      {/* Time Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="card bg-blue-50 border-blue-200 p-2">
            <div className="text-xs text-blue-600 font-medium">Total Time</div>
            <div className="text-lg font-bold text-blue-900">
              {formatHours(parseFloat(stats.total_hours))}
            </div>
          </div>
          
          <div className="card bg-green-50 border-green-200 p-2">
            <div className="text-xs text-green-600 font-medium">Billable</div>
            <div className="text-lg font-bold text-green-900">
              {formatHours(parseFloat(stats.billable_hours))}
            </div>
          </div>
          
          {stats.estimated_hours && (
            <>
              <div className="card bg-purple-50 border-purple-200 p-2">
                <div className="text-xs text-purple-600 font-medium">Remaining</div>
                <div className="text-lg font-bold text-purple-900">
                  {formatHours(parseFloat(stats.remaining_hours || 0))}
                </div>
              </div>
              
              <div className="card bg-orange-50 border-orange-200 p-2">
                <div className="text-xs text-orange-600 font-medium">Progress</div>
                <div className="text-lg font-bold text-orange-900">
                  {stats.percent_complete?.toFixed(0) || 0}%
                </div>
              </div>
            </>
          )}
          
          {!stats.estimated_hours && (
            <div className="card bg-gray-50 border-gray-200 p-2">
              <div className="text-xs text-gray-600 font-medium">Entries</div>
              <div className="text-lg font-bold text-gray-900">
                {stats.entry_count}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {stats && stats.estimated_hours && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Estimated: {formatHours(parseFloat(stats.estimated_hours))}</span>
            <span>{stats.percent_complete?.toFixed(0) || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                stats.percent_complete > 100 ? 'bg-red-500' : 
                stats.percent_complete > 80 ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, stats.percent_complete || 0)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Time Entries List */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-gray-900">Time Log ({entries.length})</h4>
        
        {entries.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500 border-2 border-dashed rounded-lg">
            No time logged yet. Start a timer or log time manually above.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {entries.map(entry => (
              <div key={entry.id} className="border rounded-lg p-2 hover:bg-gray-50">
                {editingId === entry.id ? (
                  /* Edit Mode */
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.25"
                        value={editData.hours}
                        onChange={(e) => setEditData({ ...editData, hours: e.target.value })}
                        className="input text-sm"
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={editData.is_billable}
                          onChange={(e) => setEditData({ ...editData, is_billable: e.target.checked })}
                        />
                        Billable
                      </label>
                    </div>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="input text-sm"
                      rows={2}
                      placeholder="Description"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(entry.id)}
                        className="btn btn-primary text-xs flex-1"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="btn btn-secondary text-xs flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg">
                            {ACTIVITY_ICONS[entry.activity_type] || '📦'}
                          </span>
                          <span className="font-bold text-blue-900">
                            {formatHours(parseFloat(entry.hours))}
                          </span>
                          {entry.is_billable && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              💰 Billable
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            by {entry.user_name}
                          </span>
                        </div>
                        
                        {entry.description && (
                          <p className="text-sm text-gray-700 mt-1">{entry.description}</p>
                        )}
                        
                        <div className="text-xs text-gray-500 mt-1">
                          📅 {formatDate(entry.logged_at)}
                        </div>
                      </div>
                      
                      {(user.role === 'pm' || entry.user_id === user.id) && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(entry)}
                            className="text-blue-600 hover:text-blue-700 text-xs px-2 py-1"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-red-600 hover:text-red-700 text-xs px-2 py-1"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
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









