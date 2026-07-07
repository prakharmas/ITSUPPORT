import { useState, useEffect } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const ACTIVITY_TYPES = [
  { value: 'coding', label: '💻 Coding', color: 'blue' },
  { value: 'testing', label: '🧪 Testing', color: 'purple' },
  { value: 'code_review', label: '👀 Code Review', color: 'indigo' },
  { value: 'meeting', label: '👥 Meeting', color: 'yellow' },
  { value: 'documentation', label: '📝 Documentation', color: 'green' },
  { value: 'debugging', label: '🐛 Debugging', color: 'red' },
  { value: 'deployment', label: '🚀 Deployment', color: 'pink' },
  { value: 'planning', label: '📋 Planning', color: 'gray' },
  { value: 'support', label: '🎧 Support', color: 'orange' },
  { value: 'other', label: '📦 Other', color: 'gray' }
]

export default function TimeTracker({ ticketId, onTimeLogged }) {
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [activeTimer, setActiveTimer] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  
  // Manual entry state
  const [manualEntry, setManualEntry] = useState({
    hours: '',
    description: '',
    activity_type: 'coding',
    is_billable: true,
    logged_at: new Date().toISOString().slice(0, 16)
  })
  
  // Timer state
  const [timerData, setTimerData] = useState({
    description: '',
    activity_type: 'coding'
  })

  useEffect(() => {
    checkActiveTimer()
  }, [])

  useEffect(() => {
    let interval
    if (activeTimer) {
      interval = setInterval(() => {
        const started = new Date(activeTimer.started_at)
        const now = new Date()
        setElapsedSeconds(Math.floor((now - started) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [activeTimer])

  const checkActiveTimer = async () => {
    try {
      const response = await api.get('/time-tracking/timer/active')
      if (response.data && response.data.work_item_id === ticketId) {
        setActiveTimer(response.data)
      }
    } catch (error) {
      console.error('Failed to check active timer:', error)
    }
  }

  const startTimer = async () => {
    try {
      const response = await api.post('/time-tracking/timer/start', {
        work_item_id: ticketId,
        description: timerData.description,
        activity_type: timerData.activity_type
      })
      setActiveTimer(response.data)
      toast.success('⏱️ Timer started!')
    } catch (error) {
      console.error('Failed to start timer:', error)
      toast.error(error.response?.data?.detail || 'Failed to start timer')
    }
  }

  const stopTimer = async () => {
    if (!activeTimer) return
    
    try {
      await api.post(`/time-tracking/timer/${activeTimer.id}/stop`, {
        description: timerData.description,
        is_billable: true
      })
      setActiveTimer(null)
      setElapsedSeconds(0)
      setTimerData({ description: '', activity_type: 'coding' })
      toast.success('✅ Time logged successfully!')
      if (onTimeLogged) onTimeLogged()
    } catch (error) {
      console.error('Failed to stop timer:', error)
      toast.error('Failed to stop timer')
    }
  }

  const logManualTime = async (e) => {
    e.preventDefault()
    
    if (!manualEntry.hours || parseFloat(manualEntry.hours) <= 0) {
      toast.error('Please enter valid hours')
      return
    }
    
    try {
      await api.post('/time-tracking', {
        work_item_id: ticketId,
        hours: parseFloat(manualEntry.hours),
        description: manualEntry.description,
        activity_type: manualEntry.activity_type,
        is_billable: manualEntry.is_billable,
        logged_at: new Date(manualEntry.logged_at).toISOString()
      })
      
      toast.success('✅ Time logged successfully!')
      setShowManualEntry(false)
      setManualEntry({
        hours: '',
        description: '',
        activity_type: 'coding',
        is_billable: true,
        logged_at: new Date().toISOString().slice(0, 16)
      })
      if (onTimeLogged) onTimeLogged()
    } catch (error) {
      console.error('Failed to log time:', error)
      toast.error(error.response?.data?.detail || 'Failed to log time')
    }
  }

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-3">
      {/* Timer Section */}
      {!activeTimer ? (
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">⏱️ Start Timer</h4>
          </div>
          
          <div className="space-y-2">
            <select
              value={timerData.activity_type}
              onChange={(e) => setTimerData({ ...timerData, activity_type: e.target.value })}
              className="input text-sm"
            >
              {ACTIVITY_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="What are you working on? (optional)"
              value={timerData.description}
              onChange={(e) => setTimerData({ ...timerData, description: e.target.value })}
              className="input text-sm"
            />
            
            <button
              onClick={startTimer}
              className="btn btn-primary text-sm w-full"
            >
              ▶️ Start Timer
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-green-300 bg-green-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm text-green-900">⏱️ Timer Running</h4>
            <span className="animate-pulse text-red-600">●</span>
          </div>
          
          <div className="text-center my-3">
            <div className="text-3xl font-mono font-bold text-green-900">
              {formatElapsedTime(elapsedSeconds)}
            </div>
            <div className="text-xs text-green-700 mt-1">
              {ACTIVITY_TYPES.find(t => t.value === activeTimer.activity_type)?.label || 'Working'}
            </div>
          </div>
          
          <textarea
            placeholder="Update description (optional)"
            value={timerData.description}
            onChange={(e) => setTimerData({ ...timerData, description: e.target.value })}
            className="input text-sm mb-2"
            rows={2}
          />
          
          <button
            onClick={stopTimer}
            className="btn bg-green-600 hover:bg-green-700 text-white text-sm w-full"
          >
            ⏹️ Stop & Log Time
          </button>
        </div>
      )}

      {/* Manual Entry Toggle */}
      {!activeTimer && (
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="text-sm text-blue-600 hover:text-blue-700 w-full text-center py-1"
        >
          {showManualEntry ? '▼ Hide Manual Entry' : '+ Log Time Manually'}
        </button>
      )}

      {/* Manual Entry Form */}
      {showManualEntry && !activeTimer && (
        <form onSubmit={logManualTime} className="border rounded-lg p-3 space-y-2">
          <h4 className="font-medium text-sm mb-2">📝 Manual Time Entry</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-700 mb-1">Hours *</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                placeholder="2.5"
                value={manualEntry.hours}
                onChange={(e) => setManualEntry({ ...manualEntry, hours: e.target.value })}
                className="input text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-0.5">e.g., 2.5 = 2h 30m</p>
            </div>
            
            <div>
              <label className="block text-xs text-gray-700 mb-1">Activity Type</label>
              <select
                value={manualEntry.activity_type}
                onChange={(e) => setManualEntry({ ...manualEntry, activity_type: e.target.value })}
                className="input text-sm"
              >
                {ACTIVITY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-gray-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={manualEntry.logged_at}
              onChange={(e) => setManualEntry({ ...manualEntry, logged_at: e.target.value })}
              className="input text-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-700 mb-1">Description (optional)</label>
            <textarea
              placeholder="What did you work on?"
              value={manualEntry.description}
              onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
              className="input text-sm"
              rows={2}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="billable"
              checked={manualEntry.is_billable}
              onChange={(e) => setManualEntry({ ...manualEntry, is_billable: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="billable" className="text-sm text-gray-700">
              💰 Billable
            </label>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowManualEntry(false)}
              className="btn btn-secondary text-sm flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-sm flex-1"
            >
              ✅ Log Time
            </button>
          </div>
        </form>
      )}
    </div>
  )
}









