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
  ArrowPathIcon as RecurringIcon
} from '@heroicons/react/24/outline'
import TimeTracker from '../components/TimeTracker'
import TimeEntriesList from '../components/TimeEntriesList'

const MIN_WORDS = 20

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

  // ---- Close Ticket Modal state ----
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeLoading, setCloseLoading] = useState(false)
  const [rcaNotes, setRcaNotes] = useState('')
  const [solutionNotes, setSolutionNotes] = useState('')
  const [timeSpentHours, setTimeSpentHours] = useState('')
  const [timeSpentMinutes, setTimeSpentMinutes] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)

  // ---- Time entries ----
  const [timeEntries, setTimeEntries] = useState([])

  // ---- Recurring tickets modal ----
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [recurringTickets, setRecurringTickets] = useState([])
  const [recurringLoading, setRecurringLoading] = useState(false)

  // ---- Close summary toggle ----
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

  // ✅ FIXED: Correct endpoint /time-tracking/ticket/{id}
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

  // ---- Word counting (UNIQUE WORDS) ----
  const countWords = (text) => {
    if (!text) return 0
    return text.trim().split(/\s+/).filter(w => w.length > 0).length
  }

  const countUniqueWords = (text) => {
    if (!text) return 0
    const words = text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 2)
    return new Set(words).size
  }

  const rcaWordCount = countUniqueWords(rcaNotes)
  const solutionWordCount = countUniqueWords(solutionNotes)
  const rcaValid = rcaWordCount >= MIN_WORDS
  const solutionValid = solutionWordCount >= MIN_WORDS
  const totalMinutes = (parseInt(timeSpentHours || 0) * 60) + parseInt(timeSpentMinutes || 0)
  const timeValid = totalMinutes > 0
  const allCloseValid = rcaValid && solutionValid && timeValid

  // ✅ FIXED: Correct time-tracking endpoint + payload
  const handleCloseTicket = async () => {
    if (!timeValid) {
      toast.error('⏱️ Time duration is mandatory.')
      return
    }
    if (!rcaValid) {
      toast.error(`📋 RCA needs ${MIN_WORDS} unique words (currently ${rcaWordCount})`)
      return
    }
    if (!solutionValid) {
      toast.error(`💡 Solution needs ${MIN_WORDS} unique words (currently ${solutionWordCount})`)
      return
    }

    setCloseLoading(true)
    try {
      // 1. Update item (NO completed_at — backend sets it in UTC)
      await api.patch(`/items/${id}`, {
        status: 'done',
        rca_status: 'completed',
        rca_notes: rcaNotes,
        solution_status: 'completed',
        solution_notes: solutionNotes,
        is_recurring: isRecurring
      })

      // 2. Log time entry — /time-tracking/ endpoint with work_item_id
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
        toast.error('⚠️ Time entry could not be saved. Check backend.')
      }

      // 3. Summary comment
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

  const getRCAStatusLabel = (status) => {
    const labels = {
      pending: '⏳ Pending', in_progress: '🔄 In Progress',
      completed: '✅ Completed', not_applicable: '➖ N/A'
    }
    return labels[status] || status
  }

  const getRCAStatusColor = (status) => {
    const colors = {
      pending: 'bg-red-100 text-red-800', in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800', not_applicable: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || colors.pending
  }

  const getSolutionStatusLabel = (status) => {
    const labels = {
      pending: '⏳ Pending', in_progress: '🔄 In Progress',
      completed: '✅ Completed', not_applicable: '➖ N/A'
    }
    return labels[status] || status
  }

  const getSolutionStatusColor = (status) => {
    const colors = {
      pending: 'bg-red-100 text-red-800', in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800', not_applicable: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || colors.pending
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleString()
  }

  const formatRelativeTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const getResolutionTime = (ticket) => {
    if (!ticket?.completed_at || !ticket?.created_at) return null
    const ms = new Date(ticket.completed_at) - new Date(ticket.created_at)
    if (ms < 0) return 'N/A'
    const hours = ms / (1000 * 60 * 60)
    if (hours < 1) return `${(hours * 60).toFixed(0)} min`
    if (hours < 24) return `${hours.toFixed(1)} hrs`
    const days = Math.floor(hours / 24)
    const remHours = Math.floor(hours % 24)
    return `${days}d ${remHours}h`
  }

  const getClientExpectedStatus = (ticket) => {
    if (!ticket?.client_expected_date) return null
    if (!ticket?.completed_at) {
      if (new Date(ticket.client_expected_date) < new Date()) {
        return { label: '⚠️ Past Expected', color: 'bg-red-100 text-red-800' }
      }
      return { label: '⏳ Pending', color: 'bg-gray-100 text-gray-800' }
    }
    const completed = new Date(ticket.completed_at)
    const expected = new Date(ticket.client_expected_date)
    if (completed <= expected) {
      return { label: '✅ On Time', color: 'bg-green-100 text-green-800' }
    }
    return { label: '⚠️ Delayed', color: 'bg-red-100 text-red-800' }
  }

  const getTotalLoggedTime = () => {
    if (!timeEntries || timeEntries.length === 0) return null
    const totalHours = timeEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0)
    if (totalHours < 1) return `${(totalHours * 60).toFixed(0)} min`
    const h = Math.floor(totalHours)
    const m = Math.round((totalHours - h) * 60)
    return `${h}h ${m}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Item not found</h2>
        <button onClick={() => navigate('/board')} className="btn btn-primary">
          Back to Board
        </button>
      </div>
    )
  }

  const isClosed = item.status === 'done'
  const canViewSummary = user?.role === 'pm' || user?.role === 'dev' || user?.role === 'admin'

  return (
    <div className="w-full max-w-none space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content flex items-center justify-between">
          <button
            onClick={() => navigate('/board')}
            className="flex items-center gap-1.5 text-purple-200 hover:text-white transition-colors text-sm"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-white/10 text-white text-sm font-bold rounded-lg">
              #{item.id}
            </span>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg uppercase ${
              item.status === 'done' ? 'bg-emerald-500 text-white' :
              item.status === 'in_progress' ? 'bg-blue-500 text-white' :
              item.status === 'review' ? 'bg-amber-500 text-white' :
              item.status === 'pending_client' ? 'bg-orange-500 text-white' :
              item.status === 'pending_requester' ? 'bg-yellow-600 text-white' :
              item.status === 'rejected' ? 'bg-red-600 text-white' :
              'bg-slate-500 text-white'
            }`}>
              {item.status.replace('_', ' ')}
            </span>
            {item.is_recurring && (
              <button
                onClick={handleOpenRecurringModal}
                className="px-2.5 py-1 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 transition-colors"
                title="View all recurring tickets"
              >
                🔄 Recurring
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-3">
          {/* Title and Description */}
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(item.status)}`}>
                {item.status.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`px-2 py-1 text-xs font-medium rounded-full border capitalize ${getPriorityColor(item.priority)}`}>
                {item.priority}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">
                {item.type}
              </span>
              {item.client_name && (
                <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                  🏢 {item.client_name}
                </span>
              )}
              {item.client_expected_date && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                  📅 Client Expected: {new Date(item.client_expected_date).toLocaleDateString()}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {item.description || 'No description provided'}
            </p>
          </div>

          {/* FULL CLOSE SUMMARY */}
          {isClosed && canViewSummary && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-green-900 flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ✅ Complete Close Summary
                </h3>
                <button
                  onClick={() => setShowFullSummary(!showFullSummary)}
                  className="text-xs text-green-700 hover:text-green-900 font-medium"
                >
                  {showFullSummary ? '▲ Hide' : '▼ Show'}
                </button>
              </div>

              {showFullSummary && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <div className="p-2 bg-white rounded-lg border border-green-200">
                      <p className="text-xs text-gray-500">⏱️ Time to Close</p>
                      <p className="text-sm font-bold text-indigo-700">
                        {getResolutionTime(item) || 'N/A'}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-green-200">
                      <p className="text-xs text-gray-500">🕐 Logged Time</p>
                      <p className="text-sm font-bold text-blue-700">
                        {getTotalLoggedTime() || 'Not logged'}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-green-200">
                      <p className="text-xs text-gray-500">📅 Closed On</p>
                      <p className="text-sm font-bold text-green-700">
                        {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-green-200">
                      <p className="text-xs text-gray-500">🎯 vs Client Expected</p>
                      {(() => {
                        const s = getClientExpectedStatus(item)
                        return s ? (
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-bold ${s.color}`}>
                            {s.label}
                          </span>
                        ) : <p className="text-sm text-gray-400">-</p>
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="bg-white rounded-lg p-3 border-2 border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                          <DocumentMagnifyingGlassIcon className="h-3.5 w-3.5" />
                          📋 ROOT CAUSE ANALYSIS
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRCAStatusColor(item.rca_status)}`}>
                          {getRCAStatusLabel(item.rca_status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                        {item.rca_notes || 'No RCA notes provided'}
                      </p>
                      {item.rca_notes && (
                        <p className="text-xs text-gray-400 mt-2">
                          Unique Words: {countUniqueWords(item.rca_notes)}
                        </p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                          <LightBulbIcon className="h-3.5 w-3.5" />
                          💡 SOLUTION
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getSolutionStatusColor(item.solution_status)}`}>
                          {getSolutionStatusLabel(item.solution_status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                        {item.solution_notes || 'No solution notes provided'}
                      </p>
                      {item.solution_notes && (
                        <p className="text-xs text-gray-400 mt-2">
                          Unique Words: {countUniqueWords(item.solution_notes)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <RecurringIcon className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900">
                        {item.is_recurring ? '🔄 This is a recurring ticket' : 'This is not marked as recurring'}
                      </p>
                    </div>
                    {item.is_recurring && (
                      <button
                        onClick={handleOpenRecurringModal}
                        className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium whitespace-nowrap"
                      >
                        View All Recurring
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Status Management */}
          {(user?.role === 'dev' || user?.role === 'pm') && (
            item.assignee_id === user.id ? (
              <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎯</span>
                  <h3 className="text-sm font-bold text-blue-900">Quick Status Update</h3>
                  {user?.role === 'pm' && (
                    <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full font-medium">
                      PM Mode
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleStatusChange('backlog')}
                    disabled={updatingStatus || item.status === 'backlog'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'backlog' ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    📋 BACKLOG
                  </button>
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={updatingStatus || item.status === 'in_progress'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'in_progress' ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    ▶️ IN PROGRESS
                  </button>
                  <button
                    onClick={() => handleStatusChange('review')}
                    disabled={updatingStatus || item.status === 'review'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'review' ? 'bg-yellow-400 text-white cursor-not-allowed' : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    👀 REVIEW
                  </button>
                  <button
                    onClick={() => handleStatusChange('pending_client')}
                    disabled={updatingStatus || item.status === 'pending_client'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'pending_client' ? 'bg-orange-400 text-white cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    ⏸️ PENDING CLIENT
                  </button>
                  <button
                    onClick={() => handleStatusChange('pending_requester')}
                    disabled={updatingStatus || item.status === 'pending_requester'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'pending_requester' ? 'bg-amber-400 text-white cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                  >
                    ⏸️ PENDING REQUESTER
                  </button>
                  <button
                    onClick={() => handleStatusChange('done')}
                    disabled={updatingStatus || item.status === 'done'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'done' ? 'bg-green-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    ✅ DONE (Close)
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Current: <span className="font-bold capitalize">{item.status.replace('_', ' ')}</span>
                  {item.status !== 'done' && (
                    <span className="ml-2 text-green-700">
                      • Closing requires Time, RCA &amp; Solution (min {MIN_WORDS} unique words each)
                    </span>
                  )}
                </p>
              </div>
            ) : item.assignee_id ? (
              <div className="card bg-gray-50 border border-gray-300">
                <p className="text-xs text-gray-600">
                  ℹ️ Assigned to {getUserName(item.assignee_id)}. Only they can update status.
                </p>
              </div>
            ) : (
              <div className="card bg-yellow-50 border border-yellow-300">
                <p className="text-xs text-yellow-800">
                  ⚠️ Unassigned. Status can be updated once assigned.
                </p>
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
                <button
                  onClick={() => setShowReopenModal(true)}
                  className="btn bg-red-600 text-white hover:bg-red-700"
                >
                  🔄 Reopen Ticket
                </button>
              </div>
            </div>
          )}

          {/* Assign/Reassign for PM */}
          {user?.role === 'pm' && (
            <div className="card bg-purple-50 border-2 border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 mb-3">
                {item.assignee_id ? '🔄 Reassign Ticket' : '👤 Assign Ticket'}
              </h3>
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
              >
                {item.assignee_id ? '🔄 Reassign & Set Timeline' : '👤 Assign & Set Timeline'}
              </button>
            </div>
          )}

          {user?.role === 'pm' && (
            <div className="card bg-red-50 border-2 border-red-200">
              <h3 className="text-sm font-semibold text-red-900 mb-3">❌ Reject Ticket</h3>
              <button
                onClick={handleRejectTicket}
                disabled={updatingStatus || item.status === 'rejected'}
                className="btn bg-red-600 text-white hover:bg-red-700 w-full"
              >
                Reject Ticket
              </button>
            </div>
          )}

          {/* Attachments */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PaperClipIcon className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Attachments ({attachments.length})
                </h2>
              </div>
              <label className="btn btn-primary text-xs py-1 px-3 cursor-pointer">
                {uploadingFile ? '⏳ Uploading...' : '📎 Upload File'}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                  accept="image/*,.pdf,.doc,.docx,.txt,.log,.zip"
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-xs">No attachments yet</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">📎</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{att.original_filename}</p>
                        <p className="text-xs text-gray-500">
                          {(att.file_size / 1024).toFixed(1)} KB • {new Date(att.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadAttachment(att)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Download"
                      >
                        <span className="text-sm">⬇️</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <span className="text-sm">🗑️</span>
                      </button>
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
                {getTotalLoggedTime() && (
                  <span className="ml-auto text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">
                    Total: {getTotalLoggedTime()}
                  </span>
                )}
              </div>

              {(user.role === 'pm' || item?.assignee_id === user.id) && (
                <div className="mb-4">
                  <TimeTracker
                    ticketId={parseInt(id)}
                    onTimeLogged={() => {
                      setTimeLoggedTrigger(prev => prev + 1)
                      fetchTimeEntries()
                    }}
                  />
                </div>
              )}

              <TimeEntriesList
                ticketId={parseInt(id)}
                onUpdate={timeLoggedTrigger}
              />
            </div>
          )}

          {/* Comments */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <ChatBubbleLeftIcon className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">
                Comments ({comments.length})
              </h2>
            </div>

            <form onSubmit={handleAddComment} className="mb-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment or update..."
                rows={2}
                className="input mb-2 text-sm"
                disabled={submittingComment}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="btn btn-primary text-sm py-1.5"
                >
                  {submittingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No comments yet</p>
              ) : (
                comments.map((comment) => {
                  const isSystemComment = comment.body.includes('Status changed') || comment.body.includes('REOPENED') || comment.body.includes('reassigned') || comment.body.includes('TICKET CLOSED') || comment.body.includes('Ticket rejected')
                  return (
                    <div key={comment.id} className={`rounded-lg p-3 ${
                      isSystemComment ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-gray-50 border-l-4 border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <UserCircleIcon className="h-5 w-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">{getUserName(comment.user_id)}</span>
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                        {isSystemComment && (
                          <span className="text-xs px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full font-medium">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap text-sm">{comment.body}</p>
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
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Reporter</label>
                <p className="text-sm text-gray-900 mt-1">{getUserName(item.reporter_id)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Assignee</label>
                <p className="text-sm text-gray-900 mt-1">
                  {item.assignee_id ? getUserName(item.assignee_id) : (
                    <span className="text-red-600 font-medium">⚠️ Unassigned</span>
                  )}
                </p>
              </div>
              {item.client_name && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Client</label>
                  <p className="text-sm text-gray-900 mt-1">🏢 {item.client_name}</p>
                </div>
              )}
              {item.branch_id && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Branch</label>
                  <p className="text-sm text-gray-900 mt-1">Branch #{item.branch_id}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              Timeline
            </h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Created</label>
                <p className="text-sm text-gray-900 mt-1">{formatDate(item.created_at)}</p>
                <p className="text-xs text-gray-500">{formatRelativeTime(item.created_at)}</p>
              </div>

              {item.start_date && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                    📅 Start Date
                  </label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">{formatDate(item.start_date)}</p>
                </div>
              )}

              {item.end_date && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                    🏁 Due Date
                  </label>
                  <p className={`text-sm mt-1 font-medium ${
                    new Date(item.end_date) < new Date() && item.status !== 'done' ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {formatDate(item.end_date)}
                    {new Date(item.end_date) < new Date() && item.status !== 'done' && (
                      <span className="block text-xs text-red-600">⚠️ Overdue!</span>
                    )}
                  </p>
                </div>
              )}

              {item.client_expected_date && (
                <div className="p-2 bg-purple-100 border border-purple-300 rounded-lg">
                  <label className="text-xs font-medium text-purple-800 uppercase flex items-center gap-1">
                    📅 Client Expected
                  </label>
                  <p className="text-sm text-purple-900 mt-1 font-bold">
                    {new Date(item.client_expected_date).toLocaleDateString()}
                  </p>
                  {(() => {
                    const s = getClientExpectedStatus(item)
                    return s ? (
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    ) : null
                  })()}
                </div>
              )}

              {item.completed_at && (
                <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                  <label className="text-xs font-medium text-green-800 uppercase flex items-center gap-1">
                    ✅ Completed On
                  </label>
                  <p className="text-sm text-green-900 mt-1 font-bold">{formatDate(item.completed_at)}</p>
                  <p className="text-xs text-green-700">{formatRelativeTime(item.completed_at)}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  Last Updated
                </label>
                <p className="text-sm text-gray-900 mt-1">{formatDate(item.updated_at)}</p>
              </div>
            </div>
          </div>

          {item.completed_at && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-300">
              <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                📊 Stats
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-700">Time to Complete:</span>
                  <span className="text-sm font-bold text-green-900">{getResolutionTime(item)}</span>
                </div>
                {getTotalLoggedTime() && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700">Logged Time:</span>
                    <span className="text-sm font-bold text-blue-900">{getTotalLoggedTime()}</span>
                  </div>
                )}
                {item.end_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700">vs Target:</span>
                    <span className={`text-sm font-bold ${
                      new Date(item.completed_at) <= new Date(item.end_date) ? 'text-green-900' : 'text-orange-900'
                    }`}>
                      {new Date(item.completed_at) <= new Date(item.end_date) ? '✅ On Time' : '⚠️ Delayed'}
                    </span>
                  </div>
                )}
                {item.client_expected_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700">vs Client Expected:</span>
                    <span className={`text-sm font-bold ${
                      new Date(item.completed_at) <= new Date(item.client_expected_date) ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {new Date(item.completed_at) <= new Date(item.client_expected_date) ? '✅ On Time' : '⚠️ Delayed'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {item.is_recurring && (
            <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300">
              <h3 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <RecurringIcon className="h-4 w-4 text-purple-600" />
                🔄 Recurring Issue
              </h3>
              <p className="text-xs text-purple-700 mb-3">
                This ticket is flagged as recurring.
              </p>
              <button
                onClick={handleOpenRecurringModal}
                className="btn bg-purple-600 text-white hover:bg-purple-700 w-full text-sm"
              >
                View All Recurring Tickets →
              </button>
            </div>
          )}

          {user?.role === 'pm' && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">PM Actions</h3>
              <button
                onClick={() => {
                  navigate('/board')
                  toast('Use the board to reassign tickets', { icon: 'ℹ️' })
                }}
                className="btn btn-secondary w-full text-sm"
              >
                Manage on Board
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RECURRING TICKETS MODAL */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <RecurringIcon className="h-6 w-6 text-purple-600" />
                  🔄 Recurring Tickets
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {item.client_name ? `Client: ${item.client_name}` : 'Same client recurring issues'}
                  {' • '}{recurringTickets.length} found
                </p>
              </div>
              <button
                onClick={() => setShowRecurringModal(false)}
                className="p-1.5 hover:bg-white rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {recurringLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : recurringTickets.length === 0 ? (
                <div className="text-center py-12">
                  <RecurringIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No other recurring tickets found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    This is the only recurring ticket for this client
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-sm font-bold text-gray-900">#{t.id}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(t.status)}`}>
                              {t.status.replace('_', ' ')}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getPriorityColor(t.priority)}`}>
                              {t.priority}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full font-medium">
                              🔄 Recurring
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                          {t.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                            <span>📅 Created: {new Date(t.created_at).toLocaleDateString()}</span>
                            {t.completed_at && (
                              <span className="text-green-700">
                                ✅ Closed: {new Date(t.completed_at).toLocaleDateString()}
                              </span>
                            )}
                            {t.client_expected_date && (
                              <span className="text-purple-700">
                                🎯 Expected: {new Date(t.client_expected_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {t.rca_notes && (
                            <div className="mt-2 p-2 bg-white rounded border border-amber-200">
                              <p className="text-xs font-semibold text-amber-800 mb-0.5">📋 RCA:</p>
                              <p className="text-xs text-gray-700 line-clamp-3">{t.rca_notes}</p>
                            </div>
                          )}
                          {t.solution_notes && (
                            <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                              <p className="text-xs font-semibold text-blue-800 mb-0.5">💡 Solution:</p>
                              <p className="text-xs text-gray-700 line-clamp-3">{t.solution_notes}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <Link
                            to={`/items/${t.id}`}
                            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium whitespace-nowrap text-center"
                          >
                            View →
                          </Link>
                          <span className="text-xs text-center text-gray-400">#{t.id}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowRecurringModal(false)}
                className="btn btn-secondary text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {item.assignee_id ? '🔄 Reassign Ticket' : '👤 Assign Ticket'}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Assign developer and optionally set start/end dates.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Developer *</label>
                <select
                  value={assignData.assignee_id}
                  onChange={(e) => setAssignData({ ...assignData, assignee_id: e.target.value })}
                  className="input"
                  autoFocus
                >
                  <option value="">Select assignee...</option>
                  {assignableUsers.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.role === 'pm' ? '(PM)' : ''}
                      {a.id === item.assignee_id && ' - Current'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📅 Start Date <span className="text-gray-500">(Optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={assignData.start_date}
                  onChange={(e) => setAssignData({ ...assignData, start_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🏁 Due Date <span className="text-gray-500">(Optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={assignData.end_date}
                  onChange={(e) => setAssignData({ ...assignData, end_date: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setAssignData({ assignee_id: '', start_date: '', end_date: '' })
                }}
                className="btn btn-secondary"
                disabled={updatingStatus}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignWithDates}
                className="btn bg-purple-600 text-white hover:bg-purple-700"
                disabled={updatingStatus || !assignData.assignee_id}
              >
                {updatingStatus ? 'Assigning...' : item.assignee_id ? 'Reassign Ticket' : 'Assign Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN MODAL */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🔄 Reopen Ticket</h2>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for reopening this ticket.
            </p>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Explain why you're reopening this ticket..."
              rows={4}
              className="input mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReopenModal(false)
                  setReopenReason('')
                }}
                className="btn btn-secondary"
                disabled={updatingStatus}
              >
                Cancel
              </button>
              <button
                onClick={handleReopenTicket}
                className="btn bg-red-600 text-white hover:bg-red-700"
                disabled={updatingStatus || !reopenReason.trim()}
              >
                {updatingStatus ? 'Reopening...' : 'Reopen Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSE TICKET MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  ✅ Close Ticket #{item.id}
                </h2>
                <p className="text-sm text-gray-500 truncate">{item.title}</p>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                disabled={closeLoading}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Time Spent */}
              <div className="border-2 border-indigo-300 rounded-lg p-3 bg-indigo-50">
                <label className="flex items-center gap-2 text-sm font-bold text-indigo-900 mb-2">
                  <ClockIcon className="h-4 w-4" />
                  ⏱️ Time Spent * <span className="text-red-600">(Mandatory)</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-600">Hours</label>
                    <input
                      type="number"
                      min="0"
                      value={timeSpentHours}
                      onChange={(e) => setTimeSpentHours(e.target.value)}
                      className="input"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-600">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timeSpentMinutes}
                      onChange={(e) => setTimeSpentMinutes(e.target.value)}
                      className="input"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-shrink-0 pt-4">
                    <span className={`text-sm font-bold ${timeValid ? 'text-green-700' : 'text-red-600'}`}>
                      {totalMinutes > 0 ? `${totalMinutes} min` : 'Required'}
                    </span>
                  </div>
                </div>
              </div>

              {/* RCA */}
              <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
                <label className="flex items-center gap-2 text-sm font-semibold text-amber-900 mb-2">
                  <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                  📋 RCA (Root Cause Analysis) *
                </label>
                <textarea
                  value={rcaNotes}
                  onChange={(e) => setRcaNotes(e.target.value)}
                  rows={4}
                  className="input text-sm"
                  placeholder={`Describe the root cause (min ${MIN_WORDS} unique words). Repeating same word won't count.`}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs font-medium ${rcaValid ? 'text-green-600' : 'text-red-600'}`}>
                    {rcaWordCount} / {MIN_WORDS} unique words {rcaValid ? '✓' : `(need ${MIN_WORDS - rcaWordCount} more)`}
                  </p>
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${rcaValid ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min((rcaWordCount / MIN_WORDS) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Repeating same word (e.g., "Closed Closed") will not count.
                </p>
              </div>

              {/* Solution */}
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2">
                  <LightBulbIcon className="h-4 w-4" />
                  💡 Solution Provided *
                </label>
                <textarea
                  value={solutionNotes}
                  onChange={(e) => setSolutionNotes(e.target.value)}
                  rows={4}
                  className="input text-sm"
                  placeholder={`Describe the solution (min ${MIN_WORDS} unique words). Repeating same word won't count.`}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs font-medium ${solutionValid ? 'text-green-600' : 'text-red-600'}`}>
                    {solutionWordCount} / {MIN_WORDS} unique words {solutionValid ? '✓' : `(need ${MIN_WORDS - solutionWordCount} more)`}
                  </p>
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${solutionValid ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min((solutionWordCount / MIN_WORDS) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Recurring */}
              <div className="border border-purple-200 rounded-lg p-3 bg-purple-50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm font-semibold text-purple-900">
                    🔄 Mark as Recurring Issue
                  </span>
                </label>
                <p className="text-xs text-purple-700 mt-1 ml-6">
                  Check if this issue has happened before or is likely to repeat.
                </p>
              </div>

              {/* Validation Summary */}
              <div className={`p-3 rounded-lg border-2 ${
                allCloseValid ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
              }`}>
                <p className="text-xs font-bold mb-1 flex items-center gap-1">
                  {allCloseValid ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <span className="text-green-800">All requirements met</span>
                    </>
                  ) : (
                    <span className="text-red-800">⚠️ Please complete all required fields:</span>
                  )}
                </p>
                <ul className="text-xs space-y-0.5">
                  <li className={timeValid ? 'text-green-700' : 'text-red-700'}>
                    {timeValid ? '✓' : '✗'} Time spent entered ({totalMinutes} min)
                  </li>
                  <li className={rcaValid ? 'text-green-700' : 'text-red-700'}>
                    {rcaValid ? '✓' : '✗'} RCA notes ({rcaWordCount}/{MIN_WORDS} unique words)
                  </li>
                  <li className={solutionValid ? 'text-green-700' : 'text-red-700'}>
                    {solutionValid ? '✓' : '✗'} Solution notes ({solutionWordCount}/{MIN_WORDS} unique words)
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowCloseModal(false)}
                disabled={closeLoading}
                className="btn btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseTicket}
                disabled={closeLoading || !allCloseValid}
                className="btn bg-green-600 text-white hover:bg-green-700 text-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {closeLoading ? '⏳ Closing...' : '✅ Close Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}