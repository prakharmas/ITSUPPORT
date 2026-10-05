import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  PaperClipIcon,
  UserCircleIcon,
  CalendarIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
  DocumentMagnifyingGlassIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ArrowPathIcon as RecurringIcon,
  ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline'
import TimeTracker from '../components/TimeTracker'
import TimeEntriesList from '../components/TimeEntriesList'

const MIN_WORDS = 10

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [item, setItem] = useState(null)
  const [comments, setComments] = useState([])
  const [users, setUsers] = useState([])
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignData, setAssignData] = useState({
    assignee_id: '',
    start_date: '',
    end_date: ''
  })
  const [timeLoggedTrigger, setTimeLoggedTrigger] = useState(0)

  // Close ticket modal
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeLoading, setCloseLoading] = useState(false)
  const [rcaNotes, setRcaNotes] = useState('')
  const [solutionNotes, setSolutionNotes] = useState('')
  const [timeSpentHours, setTimeSpentHours] = useState('')
  const [timeSpentMinutes, setTimeSpentMinutes] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)

  // ✅ NEW: Reschedule modal
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [newExpectedDate, setNewExpectedDate] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')

  const [timeEntries, setTimeEntries] = useState([])
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [recurringTickets, setRecurringTickets] = useState([])
  const [recurringLoading, setRecurringLoading] = useState(false)
  const [showFullSummary, setShowFullSummary] = useState(true)

  const assignableUsers = users.filter(u => u.role === 'dev' || u.role === 'pm')

  useEffect(() => {
    fetchItemDetails()
    fetchComments()
    fetchUsers()
    fetchAttachments()
    fetchTimeEntries()
  }, [id])

  useEffect(() => {
    if (showCloseModal && item) {
      setRcaNotes(item.rca_notes || '')
      setSolutionNotes(item.solution_notes || '')
      setIsRecurring(item.is_recurring || false)
      setTimeSpentHours('')
      setTimeSpentMinutes('')
    }
  }, [showCloseModal, item])

  // Pre-fill reschedule modal
  useEffect(() => {
    if (showRescheduleModal && item) {
      setNewExpectedDate(item.client_expected_date ? item.client_expected_date.slice(0, 10) : '')
      setRescheduleReason('')
    }
  }, [showRescheduleModal, item])

  const fetchItemDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/items/${id}`)
      setItem(response.data)
    } catch (error) {
      console.error('Failed to fetch item:', error)
      toast.error('Failed to load item details')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await api.get(`/items/${id}/comments`)
      setComments(response.data)
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/all-users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchAttachments = async () => {
    try {
      const response = await api.get(`/attachments/ticket/${id}`)
      setAttachments(response.data)
    } catch (error) {
      console.error('Failed to fetch attachments:', error)
    }
  }

  const fetchTimeEntries = async () => {
    try {
      const response = await api.get(`/time-tracking/ticket/${id}`)
      setTimeEntries(response.data || [])
    } catch (error) {
      console.error('Failed to fetch time entries:', error?.response?.data || error)
      setTimeEntries([])
    }
  }

  const fetchRecurringTickets = async () => {
    setRecurringLoading(true)
    try {
      const params = new URLSearchParams()
      if (item?.client_id) params.append('client_id', item.client_id)
      params.append('is_recurring', 'true')
      params.append('limit', '100')
      const response = await api.get(`/items?${params.toString()}`)
      const filtered = (response.data || [])
        .filter(t => t.id !== item.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setRecurringTickets(filtered)
    } catch (error) {
      console.error('Failed to fetch recurring tickets:', error)
      setRecurringTickets([])
    } finally {
      setRecurringLoading(false)
    }
  }

  const handleOpenRecurringModal = () => {
    setShowRecurringModal(true)
    fetchRecurringTickets()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setUploadingFile(true)
    try {
      await api.post(`/attachments/upload/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('📎 File uploaded successfully!')
      fetchAttachments()
      e.target.value = ''
    } catch (error) {
      console.error('Failed to upload file:', error)
      toast.error(error.response?.data?.detail || 'Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Delete this attachment?')) return
    try {
      await api.delete(`/attachments/${attachmentId}`)
      toast.success('Attachment deleted')
      fetchAttachments()
    } catch (error) {
      console.error('Failed to delete attachment:', error)
      toast.error('Failed to delete attachment')
    }
  }

  const handleDownloadAttachment = async (attachment) => {
    try {
      const response = await api.get(`/attachments/download/${attachment.id}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: attachment.mime_type }))
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.original_filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download attachment:', error)
      toast.error(error.response?.data?.detail || 'Failed to download attachment')
    }
  }

  const getUserName = (userId) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser ? foundUser.name : `User #${userId}`
  }

  const handleReopenTicket = async () => {
    if (!reopenReason.trim()) {
      toast.error('Please provide a reason for reopening')
      return
    }
    setUpdatingStatus(true)
    try {
      await api.patch(`/items/${id}`, { status: 'backlog' })
      await api.post(`/items/${id}/comments`, {
        body: `🔄 TICKET REOPENED by ${user.name}\nReason: ${reopenReason}`
      })
      toast.success('Ticket reopened successfully!')
      setShowReopenModal(false)
      setReopenReason('')
      fetchItemDetails()
      fetchComments()
    } catch (error) {
      console.error('Failed to reopen ticket:', error)
      toast.error('Failed to reopen ticket')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAssignWithDates = async () => {
    if (!assignData.assignee_id) {
      toast.error('Please select a developer')
      return
    }
    setUpdatingStatus(true)
    try {
      await api.patch(`/items/${id}/assign`, { assignee_id: parseInt(assignData.assignee_id) })
      const dateUpdates = {}
      if (assignData.start_date) dateUpdates.start_date = new Date(assignData.start_date).toISOString()
      if (assignData.end_date) dateUpdates.end_date = new Date(assignData.end_date).toISOString()
      if (Object.keys(dateUpdates).length > 0) {
        await api.patch(`/items/${id}`, dateUpdates)
      }
      const newAssignee = users.find(u => u.id === parseInt(assignData.assignee_id))
      let commentBody = `👤 Ticket assigned to ${newAssignee?.name || 'developer'} by ${user.name}`
      if (assignData.start_date) commentBody += `\n📅 Start: ${new Date(assignData.start_date).toLocaleDateString()}`
      if (assignData.end_date) commentBody += `\n🏁 Target: ${new Date(assignData.end_date).toLocaleDateString()}`
      await api.post(`/items/${id}/comments`, { body: commentBody })
      toast.success('✅ Ticket assigned with timeline!')
      setShowAssignModal(false)
      setAssignData({ assignee_id: '', start_date: '', end_date: '' })
      fetchItemDetails()
      fetchComments()
    } catch (error) {
      console.error('Failed to assign:', error)
      toast.error('Failed to assign ticket')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      await api.post(`/items/${id}/comments`, { body: commentText })
      toast.success('Comment added!')
      setCommentText('')
      fetchComments()
      fetchItemDetails()
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'done') {
      setShowCloseModal(true)
      return
    }
    setUpdatingStatus(true)
    try {
      await api.patch(`/items/${id}`, { status: newStatus })
      toast.success('Status updated!')
      await api.post(`/items/${id}/comments`, {
        body: `Status changed to: ${newStatus.replace('_', ' ').toUpperCase()}`
      })
      fetchItemDetails()
      fetchComments()
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleRejectTicket = async () => {
    if (!window.confirm('Are you sure you want to reject this ticket?')) return
    setUpdatingStatus(true)
    try {
      await api.patch(`/items/${id}`, { status: 'rejected' })
      await api.post(`/items/${id}/comments`, { body: `❌ Ticket rejected by ${user.name}` })
      toast.success('Ticket rejected successfully')
      fetchItemDetails()
      fetchComments()
    } catch (error) {
      console.error('Failed to reject ticket:', error)
      toast.error('Failed to reject ticket')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ✅ NEW: Reschedule handler
  const handleReschedule = async () => {
    if (!newExpectedDate) {
      toast.error('Please select new expected date')
      return
    }
    if (!rescheduleReason.trim() || rescheduleReason.trim().length < 5) {
      toast.error('Please provide a reason (min 5 characters)')
      return
    }
    setRescheduleLoading(true)
    try {
      await api.patch(`/items/${id}/reschedule`, {
        new_expected_date: newExpectedDate,
        reason: rescheduleReason.trim()
      })
      toast.success('✅ Ticket rescheduled!')
      setShowRescheduleModal(false)
      setNewExpectedDate('')
      setRescheduleReason('')
      fetchItemDetails()
      fetchComments()
    } catch (error) {
      console.error('Failed to reschedule:', error)
      toast.error(error.response?.data?.detail || 'Failed to reschedule')
    } finally {
      setRescheduleLoading(false)
    }
  }

  const countUniqueWords = (text) => {
    if (!text) return 0
    const words = text.trim().toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length >= 2)
    return new Set(words).size
  }

  const rcaWordCount = countUniqueWords(rcaNotes)
  const solutionWordCount = countUniqueWords(solutionNotes)
  const rcaValid = rcaWordCount >= MIN_WORDS
  const solutionValid = solutionWordCount >= MIN_WORDS
  const totalMinutes = (parseInt(timeSpentHours || 0) * 60) + parseInt(timeSpentMinutes || 0)
  const timeValid = totalMinutes > 0
  const allCloseValid = rcaValid && solutionValid && timeValid

  const handleCloseTicket = async () => {
    if (!timeValid) { toast.error('⏱️ Time duration is mandatory.'); return }
    if (!rcaValid) { toast.error(`📋 RCA needs ${MIN_WORDS} unique words`); return }
    if (!solutionValid) { toast.error(`💡 Solution needs ${MIN_WORDS} unique words`); return }

    setCloseLoading(true)
    try {
      await api.patch(`/items/${id}`, {
        status: 'done',
        rca_status: 'completed',
        rca_notes: rcaNotes,
        solution_status: 'completed',
        solution_notes: solutionNotes,
        is_recurring: isRecurring
      })

      const hoursFloat = parseFloat((totalMinutes / 60).toFixed(2))
      try {
        await api.post('/time-tracking/', {
          work_item_id: parseInt(id),
          hours: hoursFloat,
          description: `Time spent closing ticket #${id}`,
          is_billable: true,
          activity_type: 'support',
          logged_at: new Date().toISOString()
        })
      } catch (timeErr) {
        console.error('Time entry failed:', timeErr?.response?.data || timeErr)
        toast.error('⚠️ Time entry could not be saved.')
      }

      const hh = Math.floor(totalMinutes / 60)
      const mm = totalMinutes % 60
      await api.post(`/items/${id}/comments`, {
        body: `✅ TICKET CLOSED by ${user.name}\n\n⏱️ Time Spent: ${hh}h ${mm}m\n\n📋 RCA:\n${rcaNotes}\n\n💡 Solution:\n${solutionNotes}${isRecurring ? '\n\n🔄 RECURRING' : ''}`
      })

      toast.success('✅ Ticket closed!')
      setShowCloseModal(false)
      setRcaNotes('')
      setSolutionNotes('')
      setTimeSpentHours('')
      setTimeSpentMinutes('')
      setIsRecurring(false)
      fetchItemDetails()
      fetchComments()
      fetchTimeEntries()
    } catch (error) {
      console.error('Failed to close ticket:', error)
      toast.error(error.response?.data?.detail || 'Failed to close ticket')
    } finally {
      setCloseLoading(false)
    }
  }

  // helpers
  const getStatusColor = (status) => {
    switch (status) {
      case 'backlog': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'pending_client': return 'bg-orange-100 text-orange-800'
      case 'pending_requester': return 'bg-amber-100 text-amber-800'
      case 'done': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRCAStatusLabel = (s) => ({pending:'⏳ Pending',in_progress:'🔄 In Progress',completed:'✅ Completed',not_applicable:'➖ N/A'}[s] || s)
  const getRCAStatusColor = (s) => ({pending:'bg-red-100 text-red-800',in_progress:'bg-yellow-100 text-yellow-800',completed:'bg-green-100 text-green-800',not_applicable:'bg-gray-100 text-gray-800'}[s] || 'bg-red-100 text-red-800')
  const getSolutionStatusLabel = (s) => ({pending:'⏳ Pending',in_progress:'🔄 In Progress',completed:'✅ Completed',not_applicable:'➖ N/A'}[s] || s)
  const getSolutionStatusColor = (s) => ({pending:'bg-red-100 text-red-800',in_progress:'bg-yellow-100 text-yellow-800',completed:'bg-green-100 text-green-800',not_applicable:'bg-gray-100 text-gray-800'}[s] || 'bg-red-100 text-red-800')

  const formatDate = (d) => d ? new Date(d).toLocaleString() : 'Not set'
  const formatRelativeTime = (d) => {
    if (!d) return ''
    const date = new Date(d)
    const now = new Date()
    const ms = now - date
    const mins = Math.floor(ms/60000)
    const hrs = Math.floor(ms/3600000)
    const days = Math.floor(ms/86400000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    if (hrs < 24) return `${hrs} hr ago`
    return `${days} day${days>1?'s':''} ago`
  }

  const getResolutionTime = (t) => {
    if (!t?.completed_at || !t?.created_at) return null
    const ms = new Date(t.completed_at) - new Date(t.created_at)
    if (ms < 0) return 'N/A'
    const hours = ms / 3600000
    if (hours < 1) return `${(hours*60).toFixed(0)} min`
    if (hours < 24) return `${hours.toFixed(1)} hrs`
    return `${(hours/24).toFixed(1)} days`
  }

  const getClientExpectedStatus = (t) => {
    if (!t?.client_expected_date) return null
    if (!t?.completed_at) {
      if (new Date(t.client_expected_date) < new Date()) return { label: '⚠️ Past Expected', color: 'bg-red-100 text-red-800' }
      return { label: '⏳ Pending', color: 'bg-gray-100 text-gray-800' }
    }
    const c = new Date(t.completed_at), e = new Date(t.client_expected_date)
    if (c <= e) return { label: '✅ On Time', color: 'bg-green-100 text-green-800' }
    return { label: '⚠️ Delayed', color: 'bg-red-100 text-red-800' }
  }

  const getTotalLoggedTime = () => {
    if (!timeEntries || timeEntries.length === 0) return null
    const total = timeEntries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0)
    if (total < 1) return `${(total*60).toFixed(0)} min`
    const h = Math.floor(total), m = Math.round((total-h)*60)
    return `${h}h ${m}m`
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Item not found</h2>
        <button onClick={() => navigate('/board')} className="btn btn-primary">Back to Board</button>
      </div>
    )
  }

  const isClosed = item.status === 'done'
  const canViewSummary = user?.role === 'pm' || user?.role === 'dev' || user?.role === 'admin'
  const canReschedule = !isClosed && item.status !== 'rejected' && (user?.role === 'pm' || user?.role === 'dev' || user?.role === 'admin')

  return (
    <div className="w-full max-w-none space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content flex items-center justify-between">
          <button onClick={() => navigate('/board')} className="flex items-center gap-1.5 text-purple-200 hover:text-white transition-colors text-sm">
            <ArrowLeftIcon className="h-4 w-4" />Back
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-white/10 text-white text-sm font-bold rounded-lg">#{item.id}</span>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg uppercase ${
              item.status === 'done' ? 'bg-emerald-500 text-white' :
              item.status === 'in_progress' ? 'bg-blue-500 text-white' :
              item.status === 'review' ? 'bg-amber-500 text-white' :
              item.status === 'pending_client' ? 'bg-orange-500 text-white' :
              item.status === 'pending_requester' ? 'bg-yellow-600 text-white' :
              item.status === 'rejected' ? 'bg-red-600 text-white' :
              'bg-slate-500 text-white'
            }`}>{item.status.replace('_', ' ')}</span>
            {item.is_rescheduled && (
              <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg">
                🔄 Rescheduled{item.reschedule_count > 1 ? ` (${item.reschedule_count}x)` : ''}
              </span>
            )}
            {item.is_recurring && (
              <button onClick={handleOpenRecurringModal} className="px-2.5 py-1 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600">🔄 Recurring</button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {/* Title + Badges */}
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(item.status)}`}>{item.status.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`px-2 py-1 text-xs font-medium rounded-full border capitalize ${getPriorityColor(item.priority)}`}>{item.priority}</span>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">{item.type}</span>
              {item.client_name && <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">🏢 {item.client_name}</span>}
              {item.client_expected_date && <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">📅 Client Expected: {new Date(item.client_expected_date).toLocaleDateString()}</span>}
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.description || 'No description provided'}</p>
          </div>

          {/* ✅ NEW: Reschedule Info Banner */}
          {item.is_rescheduled && (
            <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300">
              <div className="flex items-center gap-2 mb-3">
                <ArrowPathRoundedSquareIcon className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-900">🔄 Rescheduled Ticket</h3>
                <span className="ml-auto text-xs px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full font-bold">
                  Count: {item.reschedule_count || 1}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-2 bg-white rounded-lg border border-amber-200">
                  <p className="text-xs text-gray-500">Original Date</p>
                  <p className="text-sm font-bold text-gray-700">
                    {item.original_expected_date ? new Date(item.original_expected_date).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-amber-200">
                  <p className="text-xs text-gray-500">New Date</p>
                  <p className="text-sm font-bold text-amber-700">
                    {item.client_expected_date ? new Date(item.client_expected_date).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-amber-200">
                  <p className="text-xs text-gray-500">Rescheduled On</p>
                  <p className="text-sm font-bold text-gray-700">
                    {item.rescheduled_at ? new Date(item.rescheduled_at).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>
              {item.reschedule_reason && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200">
                  <p className="text-xs font-bold text-amber-800 mb-1">📝 Reason:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.reschedule_reason}</p>
                </div>
              )}
            </div>
          )}

          {/* Close Summary */}
          {isClosed && canViewSummary && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-green-900 flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ✅ Complete Close Summary
                </h3>
                <button onClick={() => setShowFullSummary(!showFullSummary)} className="text-xs text-green-700 hover:text-green-900 font-medium">
                  {showFullSummary ? '▲ Hide' : '▼ Show'}
                </button>
              </div>
              {showFullSummary && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <div className="p-2 bg-white rounded-lg border border-green-200">
                      <p className="text-xs text-gray-500">⏱️ Time to Close</p>
                      <p className="text-sm font-bold text-indigo-700">{getResolutionTime(item) || 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-green-200">
                      <p className="text-xs text-gray-500">🕐 Logged Time</p>
                      <p className="text-sm font-bold text-blue-700">{getTotalLoggedTime() || 'Not logged'}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-green-200">
                      <p className="text-xs text-gray-500">📅 Closed On</p>
                      <p className="text-sm font-bold text-green-700">{item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '-'}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-green-200">
                      <p className="text-xs text-gray-500">🎯 vs Client Expected</p>
                      {(() => {
                        const s = getClientExpectedStatus(item)
                        return s ? <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-bold ${s.color}`}>{s.label}</span> : <p className="text-sm text-gray-400">-</p>
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="bg-white rounded-lg p-3 border-2 border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                          <DocumentMagnifyingGlassIcon className="h-3.5 w-3.5" />📋 RCA
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRCAStatusColor(item.rca_status)}`}>{getRCAStatusLabel(item.rca_status)}</span>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">{item.rca_notes || 'No RCA notes'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                          <LightBulbIcon className="h-3.5 w-3.5" />💡 Solution
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getSolutionStatusColor(item.solution_status)}`}>{getSolutionStatusLabel(item.solution_status)}</span>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">{item.solution_notes || 'No solution notes'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ✅ NEW: Reschedule Button */}
          {canReschedule && (
            <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <ArrowPathRoundedSquareIcon className="h-5 w-5 text-amber-600" />
                    Reschedule This Ticket
                  </h3>
                  <p className="text-xs text-amber-700 mt-1">
                    {item.client_expected_date
                      ? `Current expected date: ${new Date(item.client_expected_date).toLocaleDateString()}`
                      : 'No expected date set yet'}
                  </p>
                </div>
                <button onClick={() => setShowRescheduleModal(true)} className="btn bg-amber-600 text-white hover:bg-amber-700 text-sm">
                  🔄 Reschedule
                </button>
              </div>
            </div>
          )}

          {/* Quick Status Update */}
          {(user?.role === 'dev' || user?.role === 'pm') && (
            item.assignee_id === user.id ? (
              <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎯</span>
                  <h3 className="text-sm font-bold text-blue-900">Quick Status Update</h3>
                  {user?.role === 'pm' && <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full font-medium">PM Mode</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {s:'backlog', label:'📋 BACKLOG', color:'gray'},
                    {s:'in_progress', label:'▶️ IN PROGRESS', color:'blue'},
                    {s:'review', label:'👀 REVIEW', color:'yellow'},
                    {s:'pending_client', label:'⏸️ PENDING CLIENT', color:'orange'},
                    {s:'pending_requester', label:'⏸️ PENDING REQUESTER', color:'amber'},
                    {s:'done', label:'✅ DONE (Close)', color:'green'},
                  ].map(({s,label,color}) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={updatingStatus || item.status === s}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        item.status === s
                          ? `bg-${color}-400 text-white cursor-not-allowed`
                          : `bg-${color}-600 text-white hover:bg-${color}-700`
                      }`}
                    >{label}</button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Current: <span className="font-bold capitalize">{item.status.replace('_', ' ')}</span>
                  {item.status !== 'done' && <span className="ml-2 text-green-700">• Closing requires Time, RCA &amp; Solution (min {MIN_WORDS} unique words each)</span>}
                </p>
              </div>
            ) : item.assignee_id ? (
              <div className="card bg-gray-50 border border-gray-300">
                <p className="text-xs text-gray-600">ℹ️ Assigned to {getUserName(item.assignee_id)}. Only they can update status.</p>
              </div>
            ) : (
              <div className="card bg-yellow-50 border border-yellow-300">
                <p className="text-xs text-yellow-800">⚠️ Unassigned. Status can be updated once assigned.</p>
              </div>
            )
          )}

          {/* Reopen for Requester */}
          {user?.role === 'requester' && item.reporter_id === user.id && (item.status === 'done' || item.status === 'rejected') && (
            <div className="card bg-red-50 border-2 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-red-900 mb-1">Not Satisfied?</h3>
                  <p className="text-xs text-red-700">Reopen this ticket if the issue is not resolved</p>
                </div>
                <button onClick={() => setShowReopenModal(true)} className="btn bg-red-600 text-white hover:bg-red-700">🔄 Reopen Ticket</button>
              </div>
            </div>
          )}

          {/* Assign/Reassign */}
          {user?.role === 'pm' && (
            <div className="card bg-purple-50 border-2 border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 mb-3">{item.assignee_id ? '🔄 Reassign Ticket' : '👤 Assign Ticket'}</h3>
              <p className="text-xs text-purple-700 mb-3">
                {item.assignee_id ? `Currently assigned to: ${getUserName(item.assignee_id)}` : 'This ticket is unassigned'}
              </p>
              <button
                onClick={() => {
                  setAssignData({
                    assignee_id: item.assignee_id || '',
                    start_date: item.start_date ? item.start_date.slice(0, 16) : '',
                    end_date: item.end_date ? item.end_date.slice(0, 16) : ''
                  })
                  setShowAssignModal(true)
                }}
                className="btn bg-purple-600 text-white hover:bg-purple-700 w-full"
              >{item.assignee_id ? '🔄 Reassign & Set Timeline' : '👤 Assign & Set Timeline'}</button>
            </div>
          )}

          {user?.role === 'pm' && (
            <div className="card bg-red-50 border-2 border-red-200">
              <h3 className="text-sm font-semibold text-red-900 mb-3">❌ Reject Ticket</h3>
              <button onClick={handleRejectTicket} disabled={updatingStatus || item.status === 'rejected'} className="btn bg-red-600 text-white hover:bg-red-700 w-full">Reject Ticket</button>
            </div>
          )}

          {/* Attachments */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PaperClipIcon className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">Attachments ({attachments.length})</h2>
              </div>
              <label className="btn btn-primary text-xs py-1 px-3 cursor-pointer">
                {uploadingFile ? '⏳ Uploading...' : '📎 Upload File'}
                <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploadingFile} accept="image/*,.pdf,.doc,.docx,.txt,.log,.zip" />
              </label>
            </div>
            {attachments.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-xs">No attachments yet</p>
            ) : (
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">📎</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{att.original_filename}</p>
                        <p className="text-xs text-gray-500">{(att.file_size/1024).toFixed(1)} KB • {new Date(att.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDownloadAttachment(att)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">⬇️</button>
                      <button onClick={() => handleDeleteAttachment(att.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time Tracking */}
          {(user.role === 'dev' || user.role === 'pm') && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">Time Tracking</h2>
                {getTotalLoggedTime() && <span className="ml-auto text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">Total: {getTotalLoggedTime()}</span>}
              </div>
              {(user.role === 'pm' || item?.assignee_id === user.id) && (
                <div className="mb-4">
                  <TimeTracker ticketId={parseInt(id)} onTimeLogged={() => { setTimeLoggedTrigger(p => p+1); fetchTimeEntries() }} />
                </div>
              )}
              <TimeEntriesList ticketId={parseInt(id)} onUpdate={timeLoggedTrigger} />
            </div>
          )}

          {/* Comments */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <ChatBubbleLeftIcon className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Comments ({comments.length})</h2>
            </div>
            <form onSubmit={handleAddComment} className="mb-4">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..." rows={2} className="input mb-2 text-sm" disabled={submittingComment} />
              <div className="flex justify-end">
                <button type="submit" disabled={submittingComment || !commentText.trim()} className="btn btn-primary text-sm py-1.5">
                  {submittingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </form>
            <div className="space-y-2">
              {comments.length === 0 ? <p className="text-gray-500 text-center py-4">No comments yet</p> : (
                comments.map(c => {
                  const sys = c.body.includes('Status changed') || c.body.includes('REOPENED') || c.body.includes('RESCHEDULED') || c.body.includes('reassigned') || c.body.includes('TICKET CLOSED')
                  return (
                    <div key={c.id} className={`rounded-lg p-3 ${sys ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-gray-50 border-l-4 border-gray-300'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <UserCircleIcon className="h-5 w-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">{getUserName(c.user_id)}</span>
                        <span className="text-xs text-gray-500">{formatRelativeTime(c.created_at)}</span>
                        {sys && <span className="text-xs px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full font-medium">System</span>}
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap text-sm">{c.body}</p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Details</h3>
            <div className="space-y-2">
              <div><label className="text-xs font-medium text-gray-500 uppercase">Reporter</label><p className="text-sm text-gray-900 mt-1">{getUserName(item.reporter_id)}</p></div>
              <div><label className="text-xs font-medium text-gray-500 uppercase">Assignee</label><p className="text-sm text-gray-900 mt-1">{item.assignee_id ? getUserName(item.assignee_id) : <span className="text-red-600 font-medium">⚠️ Unassigned</span>}</p></div>
              {item.client_name && <div><label className="text-xs font-medium text-gray-500 uppercase">Client</label><p className="text-sm text-gray-900 mt-1">🏢 {item.client_name}</p></div>}
              {item.branch_id && <div><label className="text-xs font-medium text-gray-500 uppercase">Branch</label><p className="text-sm text-gray-900 mt-1">Branch #{item.branch_id}</p></div>}
            </div>
          </div>

          <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />Timeline
            </h3>
            <div className="space-y-2">
              <div><label className="text-xs font-medium text-gray-500 uppercase">Created</label><p className="text-sm text-gray-900 mt-1">{formatDate(item.created_at)}</p></div>
              {item.client_expected_date && (
                <div className={`p-2 rounded-lg border ${item.is_rescheduled ? 'bg-amber-100 border-amber-300' : 'bg-purple-100 border-purple-300'}`}>
                  <label className={`text-xs font-medium uppercase flex items-center gap-1 ${item.is_rescheduled ? 'text-amber-800' : 'text-purple-800'}`}>
                    📅 Client Expected {item.is_rescheduled && '🔄'}
                  </label>
                  <p className={`text-sm mt-1 font-bold ${item.is_rescheduled ? 'text-amber-900' : 'text-purple-900'}`}>
                    {new Date(item.client_expected_date).toLocaleDateString()}
                  </p>
                  {item.is_rescheduled && item.original_expected_date && (
                    <p className="text-xs text-amber-700 mt-0.5 line-through">
                      Was: {new Date(item.original_expected_date).toLocaleDateString()}
                    </p>
                  )}
                  {(() => { const s = getClientExpectedStatus(item); return s ? <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span> : null })()}
                </div>
              )}
              {item.rescheduled_at && (
                <div><label className="text-xs font-medium text-gray-500 uppercase">🔄 Rescheduled At</label><p className="text-sm text-gray-900 mt-1">{formatDate(item.rescheduled_at)}</p></div>
              )}
              {item.completed_at && (
                <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                  <label className="text-xs font-medium text-green-800 uppercase">✅ Completed On</label>
                  <p className="text-sm text-green-900 mt-1 font-bold">{formatDate(item.completed_at)}</p>
                </div>
              )}
              <div><label className="text-xs font-medium text-gray-500 uppercase">Last Updated</label><p className="text-sm text-gray-900 mt-1">{formatDate(item.updated_at)}</p></div>
            </div>
          </div>

          {item.completed_at && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-300">
              <h3 className="text-sm font-semibold text-green-900 mb-2">📊 Stats</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center"><span className="text-xs text-green-700">Time to Complete:</span><span className="text-sm font-bold text-green-900">{getResolutionTime(item)}</span></div>
                {getTotalLoggedTime() && <div className="flex justify-between items-center"><span className="text-xs text-green-700">Logged Time:</span><span className="text-sm font-bold text-blue-900">{getTotalLoggedTime()}</span></div>}
              </div>
            </div>
          )}

          {item.is_recurring && (
            <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300">
              <h3 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2"><RecurringIcon className="h-4 w-4 text-purple-600" />🔄 Recurring Issue</h3>
              <button onClick={handleOpenRecurringModal} className="btn bg-purple-600 text-white hover:bg-purple-700 w-full text-sm">View All Recurring →</button>
            </div>
          )}

          {user?.role === 'pm' && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">PM Actions</h3>
              <button onClick={() => { navigate('/board'); toast('Use the board to reassign', { icon: 'ℹ️' }) }} className="btn btn-secondary w-full text-sm">Manage on Board</button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ NEW: RESCHEDULE MODAL */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowPathRoundedSquareIcon className="h-6 w-6 text-amber-600" />
              <h2 className="text-xl font-bold text-gray-900">🔄 Reschedule Ticket</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Change the client's expected date and provide a reason. This will be logged.
            </p>

            {item.client_expected_date && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-xs text-amber-800">
                  📅 <strong>Current:</strong> {new Date(item.client_expected_date).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📅 New Expected Date *
                </label>
                <input
                  type="date"
                  value={newExpectedDate}
                  onChange={e => setNewExpectedDate(e.target.value)}
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📝 Reason for Rescheduling *
                </label>
                <textarea
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  rows={4}
                  className="input"
                  placeholder="Explain why this ticket needs to be rescheduled (min 5 characters)..."
                />
                <p className={`text-xs mt-1 ${rescheduleReason.trim().length >= 5 ? 'text-green-600' : 'text-red-600'}`}>
                  {rescheduleReason.trim().length} / 5 characters minimum
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowRescheduleModal(false)
                  setNewExpectedDate('')
                  setRescheduleReason('')
                }}
                className="btn btn-secondary"
                disabled={rescheduleLoading}
              >Cancel</button>
              <button
                onClick={handleReschedule}
                disabled={rescheduleLoading || !newExpectedDate || rescheduleReason.trim().length < 5}
                className="btn bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >{rescheduleLoading ? '⏳ Rescheduling...' : '🔄 Reschedule Ticket'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Modal */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><RecurringIcon className="h-6 w-6 text-purple-600" />🔄 Recurring Tickets</h2>
                <p className="text-sm text-gray-600 mt-0.5">{item.client_name ? `Client: ${item.client_name}` : ''} • {recurringTickets.length} found</p>
              </div>
              <button onClick={() => setShowRecurringModal(false)} className="p-1.5 hover:bg-white rounded-lg"><XMarkIcon className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {recurringLoading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
              ) : recurringTickets.length === 0 ? (
                <div className="text-center py-12"><RecurringIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No other recurring tickets found</p></div>
              ) : (
                <div className="space-y-3">
                  {recurringTickets.map(t => (
                    <div key={t.id} className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-sm font-bold text-gray-900">#{t.id}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(t.status)}`}>{t.status.replace('_', ' ')}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                            <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full font-medium">🔄</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                            <span>📅 {new Date(t.created_at).toLocaleDateString()}</span>
                            {t.completed_at && <span className="text-green-700">✅ {new Date(t.completed_at).toLocaleDateString()}</span>}
                            {t.client_expected_date && <span className="text-purple-700">🎯 {new Date(t.client_expected_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <Link to={`/items/${t.id}`} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap">View →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowRecurringModal(false)} className="btn btn-secondary text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{item.assignee_id ? '🔄 Reassign Ticket' : '👤 Assign Ticket'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Developer *</label>
                <select value={assignData.assignee_id} onChange={e => setAssignData({...assignData, assignee_id: e.target.value})} className="input" autoFocus>
                  <option value="">Select assignee...</option>
                  {assignableUsers.map(a => <option key={a.id} value={a.id}>{a.name} {a.role === 'pm' ? '(PM)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📅 Start Date</label>
                <input type="datetime-local" value={assignData.start_date} onChange={e => setAssignData({...assignData, start_date: e.target.value})} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🏁 Due Date</label>
                <input type="datetime-local" value={assignData.end_date} onChange={e => setAssignData({...assignData, end_date: e.target.value})} className="input" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setShowAssignModal(false); setAssignData({assignee_id:'',start_date:'',end_date:''}) }} className="btn btn-secondary" disabled={updatingStatus}>Cancel</button>
              <button onClick={handleAssignWithDates} className="btn bg-purple-600 text-white hover:bg-purple-700" disabled={updatingStatus || !assignData.assignee_id}>
                {updatingStatus ? 'Assigning...' : item.assignee_id ? 'Reassign' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🔄 Reopen Ticket</h2>
            <textarea value={reopenReason} onChange={e => setReopenReason(e.target.value)} placeholder="Reason for reopening..." rows={4} className="input mb-4" autoFocus />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowReopenModal(false); setReopenReason('') }} className="btn btn-secondary" disabled={updatingStatus}>Cancel</button>
              <button onClick={handleReopenTicket} className="btn bg-red-600 text-white hover:bg-red-700" disabled={updatingStatus || !reopenReason.trim()}>Reopen</button>
            </div>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">✅ Close Ticket #{item.id}</h2>
                <p className="text-sm text-gray-500 truncate">{item.title}</p>
              </div>
              <button onClick={() => setShowCloseModal(false)} disabled={closeLoading} className="p-1.5 hover:bg-gray-100 rounded-lg"><XMarkIcon className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="border-2 border-indigo-300 rounded-lg p-3 bg-indigo-50">
                <label className="flex items-center gap-2 text-sm font-bold text-indigo-900 mb-2"><ClockIcon className="h-4 w-4" />⏱️ Time Spent * <span className="text-red-600">(Mandatory)</span></label>
                <div className="flex items-center gap-2">
                  <div className="flex-1"><label className="text-xs text-gray-600">Hours</label><input type="number" min="0" value={timeSpentHours} onChange={e => setTimeSpentHours(e.target.value)} className="input" placeholder="0" /></div>
                  <div className="flex-1"><label className="text-xs text-gray-600">Minutes</label><input type="number" min="0" max="59" value={timeSpentMinutes} onChange={e => setTimeSpentMinutes(e.target.value)} className="input" placeholder="0" /></div>
                  <div className="flex-shrink-0 pt-4"><span className={`text-sm font-bold ${timeValid ? 'text-green-700' : 'text-red-600'}`}>{totalMinutes > 0 ? `${totalMinutes} min` : 'Required'}</span></div>
                </div>
              </div>
              <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
                <label className="flex items-center gap-2 text-sm font-semibold text-amber-900 mb-2"><DocumentMagnifyingGlassIcon className="h-4 w-4" />📋 RCA *</label>
                <textarea value={rcaNotes} onChange={e => setRcaNotes(e.target.value)} rows={4} className="input text-sm" placeholder={`Min ${MIN_WORDS} unique words...`} />
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs font-medium ${rcaValid ? 'text-green-600' : 'text-red-600'}`}>{rcaWordCount} / {MIN_WORDS} unique words {rcaValid ? '✓' : ''}</p>
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${rcaValid ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((rcaWordCount/MIN_WORDS)*100,100)}%` }} /></div>
                </div>
              </div>
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2"><LightBulbIcon className="h-4 w-4" />💡 Solution *</label>
                <textarea value={solutionNotes} onChange={e => setSolutionNotes(e.target.value)} rows={4} className="input text-sm" placeholder={`Min ${MIN_WORDS} unique words...`} />
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs font-medium ${solutionValid ? 'text-green-600' : 'text-red-600'}`}>{solutionWordCount} / {MIN_WORDS} unique words {solutionValid ? '✓' : ''}</p>
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${solutionValid ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min((solutionWordCount/MIN_WORDS)*100,100)}%` }} /></div>
                </div>
              </div>
              <div className="border border-purple-200 rounded-lg p-3 bg-purple-50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
                  <span className="text-sm font-semibold text-purple-900">🔄 Mark as Recurring</span>
                </label>
              </div>
              <div className={`p-3 rounded-lg border-2 ${allCloseValid ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <p className="text-xs font-bold mb-1">
                  {allCloseValid ? '✅ All requirements met' : '⚠️ Complete required fields:'}
                </p>
                <ul className="text-xs space-y-0.5">
                  <li className={timeValid ? 'text-green-700' : 'text-red-700'}>{timeValid ? '✓' : '✗'} Time spent ({totalMinutes} min)</li>
                  <li className={rcaValid ? 'text-green-700' : 'text-red-700'}>{rcaValid ? '✓' : '✗'} RCA ({rcaWordCount}/{MIN_WORDS})</li>
                  <li className={solutionValid ? 'text-green-700' : 'text-red-700'}>{solutionValid ? '✓' : '✗'} Solution ({solutionWordCount}/{MIN_WORDS})</li>
                </ul>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowCloseModal(false)} disabled={closeLoading} className="btn btn-secondary text-sm">Cancel</button>
              <button onClick={handleCloseTicket} disabled={closeLoading || !allCloseValid} className="btn bg-green-600 text-white hover:bg-green-700 text-sm px-6 disabled:opacity-50">{closeLoading ? '⏳ Closing...' : '✅ Close Ticket'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}