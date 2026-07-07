import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { ClockIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'

export default function ActivityLog() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [myReports, setMyReports] = useState([])
  const [items, setItems] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '17:00'
    }
  })

  useEffect(() => {
    fetchMyReports()
    fetchItems()
    if (user?.role === 'pm') {
      fetchBranches()
    }
  }, [])

  const fetchMyReports = async () => {
    try {
      const today = new Date()
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const response = await api.get(`/activity-reports?date_from=${weekAgo.toISOString().split('T')[0]}&date_to=${today.toISOString().split('T')[0]}`)
      setMyReports(response.data)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await api.get('/items?assignee_id=me&limit=10000')
      setItems(response.data)
    } catch (error) {
      console.error('Failed to fetch items:', error)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches')
      setBranches(response.data)
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const reportData = {
        ...data,
        work_item_id: data.work_item_id ? parseInt(data.work_item_id) : null,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null
      }

      if (editingId) {
        await api.patch(`/activity-reports/${editingId}`, reportData)
        toast.success('Activity report updated!')
        setEditingId(null)
      } else {
        await api.post('/activity-reports', reportData)
        toast.success('Activity report added!')
      }

      reset({
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00'
      })
      fetchMyReports()
    } catch (error) {
      console.error('Failed to save report:', error)
      toast.error(error.response?.data?.detail || 'Failed to save activity report')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (report) => {
    setEditingId(report.id)
    setValue('date', report.date)
    setValue('start_time', report.start_time)
    setValue('end_time', report.end_time)
    setValue('work_item_id', report.work_item_id || '')
    setValue('branch_id', report.branch_id || '')
    setValue('feature_worked', report.feature_worked || '')
    setValue('activity_type', report.activity_type)
    setValue('description', report.description)
    setValue('accomplishments', report.accomplishments || '')
    setValue('blockers', report.blockers || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this activity report?')) return

    try {
      await api.delete(`/activity-reports/${id}`)
      toast.success('Activity report deleted')
      fetchMyReports()
    } catch (error) {
      console.error('Failed to delete report:', error)
      toast.error('Failed to delete activity report')
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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⏱️</span>
            <div>
              <h1 className="page-header-title">Daily Activity Log</h1>
              <p className="page-header-subtitle">Track your work and time</p>
            </div>
          </div>
          <button onClick={() => navigate('/activity-reports')} className="btn btn-primary">
            View Reports
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <ClockIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            {editingId ? 'Edit Report' : 'Log Activity'}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                {...register('date', { required: 'Date is required' })}
                className="input"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            {/* Activity Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Type *
              </label>
              <select
                {...register('activity_type', { required: 'Activity type is required' })}
                className="input"
              >
                <option value="">Select type</option>
                <option value="coding">💻 Coding</option>
                <option value="testing">🧪 Testing</option>
                <option value="code_review">👀 Code Review</option>
                <option value="meeting">🤝 Meeting</option>
                <option value="documentation">📝 Documentation</option>
                <option value="debugging">🐛 Debugging</option>
                <option value="deployment">🚀 Deployment</option>
                <option value="planning">📋 Planning</option>
                <option value="support">💬 Support</option>
                <option value="other">📌 Other</option>
              </select>
              {errors.activity_type && (
                <p className="mt-1 text-sm text-red-600">{errors.activity_type.message}</p>
              )}
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                {...register('start_time', { required: 'Start time is required' })}
                className="input"
              />
              {errors.start_time && (
                <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time *
              </label>
              <input
                type="time"
                {...register('end_time', { required: 'End time is required' })}
                className="input"
              />
              {errors.end_time && (
                <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
              )}
            </div>

            {/* Ticket/Work Item */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Related Ticket
              </label>
              <select {...register('work_item_id')} className="input">
                <option value="">None</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    #{item.id} - {item.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch */}
            {user?.role === 'pm' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select {...register('branch_id')} className="input">
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Feature Worked */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feature/Module Worked On
              </label>
              <input
                type="text"
                {...register('feature_worked')}
                className="input"
                placeholder="e.g., User Authentication, Dashboard UI"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Work Description *
            </label>
            <textarea
              rows={3}
              {...register('description', { required: 'Description is required' })}
              className="input"
              placeholder="Describe what you worked on today..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Accomplishments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Accomplishments
            </label>
            <textarea
              rows={2}
              {...register('accomplishments')}
              className="input"
              placeholder="What did you accomplish today?"
            />
          </div>

          {/* Blockers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Blockers/Issues
            </label>
            <textarea
              rows={2}
              {...register('blockers')}
              className="input"
              placeholder="Any blockers or issues encountered?"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  reset({
                    date: new Date().toISOString().split('T')[0],
                    start_time: '09:00',
                    end_time: '17:00'
                  })
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={loading}>
              <PlusIcon className="h-5 w-5" />
              {loading ? 'Saving...' : editingId ? 'Update Report' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Reports */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports (Last 7 Days)</h3>
        
        {myReports.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No activity reports yet. Start logging your work!</p>
        ) : (
          <div className="space-y-3">
            {myReports.map((report) => (
              <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-gray-900">{report.date}</span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded capitalize">
                        {report.activity_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {report.start_time} - {report.end_time} ({calculateDuration(report.start_time, report.end_time)})
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{report.description}</p>
                    {report.accomplishments && (
                      <p className="text-xs text-green-700">✅ {report.accomplishments}</p>
                    )}
                    {report.blockers && (
                      <p className="text-xs text-red-700">⚠️ {report.blockers}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(report)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


