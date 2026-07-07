import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  PaperClipIcon,
  UserCircleIcon,
  CalendarIcon,
  ClockIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import TimeTracker from '../components/TimeTracker'
import TimeEntriesList from '../components/TimeEntriesList'

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
  const assignableUsers = users.filter(u => u.role === 'dev' || u.role === 'pm')

  useEffect(() => {
    fetchItemDetails()
    fetchComments()
    fetchUsers()
    fetchAttachments()
  }, [id])

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
      const response = await api.get('/users')
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
      e.target.value = '' // Reset input
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
      // Change status back to backlog
      await api.patch(`/items/${id}`, { status: 'backlog' })
      
      // Add comment with reason
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
      // Assign ticket
      await api.patch(`/items/${id}/assign`, { assignee_id: parseInt(assignData.assignee_id) })
      
      // Update dates if provided
      const dateUpdates = {}
      if (assignData.start_date) {
        dateUpdates.start_date = new Date(assignData.start_date).toISOString()
      }
      if (assignData.end_date) {
        dateUpdates.end_date = new Date(assignData.end_date).toISOString()
      }
      
      if (Object.keys(dateUpdates).length > 0) {
        await api.patch(`/items/${id}`, dateUpdates)
      }
      
      // Add comment about assignment
      const newAssignee = users.find(u => u.id === parseInt(assignData.assignee_id))
      let commentText = `👤 Ticket assigned to ${newAssignee?.name || 'developer'} by ${user.name}`
      if (assignData.start_date) commentText += `\n📅 Start: ${new Date(assignData.start_date).toLocaleDateString()}`
      if (assignData.end_date) commentText += `\n🏁 Target: ${new Date(assignData.end_date).toLocaleDateString()}`
      
      await api.post(`/items/${id}/comments`, { body: commentText })
      
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
      fetchItemDetails() // Refresh to update timestamp
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      await api.patch(`/items/${id}`, { status: newStatus })
      toast.success('Status updated!')
      
      // Add automatic comment about status change
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
    if (!window.confirm('Are you sure you want to reject this ticket?')) {
      return
    }

    setUpdatingStatus(true)

    try {
      await api.patch(`/items/${id}`, {
        status: 'rejected'
      })

      await api.post(`/items/${id}/comments`, {
        body: `❌ Ticket rejected by ${user.name}`
      })

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

  const canChangeStatus = (user?.role === 'dev' || user?.role === 'pm') && item.assignee_id === user.id

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
            
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-1 text-xs font-medium rounded-full border capitalize ${getPriorityColor(item.priority)}`}>
                {item.priority}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">
                {item.type}
              </span>
            </div>

            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {item.description || 'No description provided'}
            </p>
          </div>

          {/* Status Management for Developers and PMs when assigned */}
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
                      item.status === 'backlog'
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    📋 BACKLOG
                  </button>
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={updatingStatus || item.status === 'in_progress'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'in_progress'
                        ? 'bg-blue-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    ▶️ IN PROGRESS
                  </button>
                  <button
                    onClick={() => handleStatusChange('review')}
                    disabled={updatingStatus || item.status === 'review'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'review'
                        ? 'bg-yellow-400 text-white cursor-not-allowed'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    👀 REVIEW
                  </button>
                  <button
                    onClick={() => handleStatusChange('pending_client')}
                    disabled={updatingStatus || item.status === 'pending_client'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'pending_client'
                        ? 'bg-orange-400 text-white cursor-not-allowed'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    ⏸️ PENDING CLIENT
                  </button>
                  <button
                    onClick={() => handleStatusChange('pending_requester')}
                    disabled={updatingStatus || item.status === 'pending_requester'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'pending_requester'
                        ? 'bg-amber-400 text-white cursor-not-allowed'
                        : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                  >
                    ⏸️ PENDING REQUESTER
                  </button>
                  <button
                    onClick={() => handleStatusChange('done')}
                    disabled={updatingStatus || item.status === 'done'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'done'
                        ? 'bg-green-400 text-white cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    ✅ DONE
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Current: <span className="font-bold capitalize">{item.status.replace('_', ' ')}</span>
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

          {/* Reopen Ticket for Requester */}
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

          {/* Assign/Reassign Section for PM */}
          {user?.role === 'pm' && (
            <div className="card bg-purple-50 border-2 border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 mb-3">
                {item.assignee_id ? '🔄 Reassign Ticket' : '👤 Assign Ticket'}
              </h3>
              <p className="text-xs text-purple-700 mb-3">
                {item.assignee_id 
                  ? `Currently assigned to: ${getUserName(item.assignee_id)}`
                  : 'This ticket is unassigned'}
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
              <p className="text-xs text-purple-700 mt-2">
                Assign developer and set start/end dates for better planning
              </p>
            </div>
          )}

          {user?.role === 'pm' && (
            <div className="card bg-red-50 border-2 border-red-200">
              <h3 className="text-sm font-semibold text-red-900 mb-3">
                ❌ Reject Ticket
              </h3>

              <button
                onClick={handleRejectTicket}
                disabled={updatingStatus || item.status === 'rejected'}
                className="btn bg-red-600 text-white hover:bg-red-700 w-full"
              >
                Reject Ticket
              </button>
            </div>
          )}

          {/* Attachments Section */}
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
            <p className="text-xs text-gray-500 mt-2">
              💡 Max 10MB per file. Supported: Images, PDF, Documents, Logs
            </p>
          </div>

          {/* Time Tracking Section - Developers and PMs only */}
          {(user.role === 'dev' || user.role === 'pm') && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Time Tracking
                </h2>
              </div>

              {/* Time Tracker Component */}
              {(user.role === 'pm' || item?.assignee_id === user.id) && (
                <div className="mb-4">
                  <TimeTracker 
                    ticketId={parseInt(id)} 
                    onTimeLogged={() => setTimeLoggedTrigger(prev => prev + 1)}
                  />
                </div>
              )}

              {/* Time Entries List */}
              <TimeEntriesList 
                ticketId={parseInt(id)} 
                onUpdate={timeLoggedTrigger}
              />
            </div>
          )}

          {/* Comments Section */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <ChatBubbleLeftIcon className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">
                Comments ({comments.length})
              </h2>
            </div>

            {/* Add Comment Form */}
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

            {/* Comments List */}
            <div className="space-y-2">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No comments yet</p>
              ) : (
                comments.map((comment) => {
                  const isSystemComment = comment.body.includes('Status changed') || comment.body.includes('REOPENED') || comment.body.includes('reassigned')
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
          {/* Details Card */}
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

              {item.branch_id && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Branch</label>
                  <p className="text-sm text-gray-900 mt-1">Branch #{item.branch_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Card */}
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
                    new Date(item.end_date) < new Date() && item.status !== 'done'
                      ? 'text-red-600'
                      : 'text-gray-900'
                  }`}>
                    {formatDate(item.end_date)}
                    {new Date(item.end_date) < new Date() && item.status !== 'done' && (
                      <span className="block text-xs text-red-600">⚠️ Overdue!</span>
                    )}
                  </p>
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

              {item.sla_hours && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">⚡ SLA</label>
                  <p className="text-sm text-gray-900 mt-1">{item.sla_hours} hours</p>
                </div>
              )}
            </div>
          </div>

          {/* Duration Stats (if completed) */}
          {item.completed_at && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-300">
              <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                📊 Stats
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-700">Time to Complete:</span>
                  <span className="text-sm font-bold text-green-900">
                    {Math.floor((new Date(item.completed_at) - new Date(item.created_at)) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
                {item.start_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700">Work Duration:</span>
                    <span className="text-sm font-bold text-green-900">
                      {Math.floor((new Date(item.completed_at) - new Date(item.start_date)) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                )}
                {item.end_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700">vs Target:</span>
                    <span className={`text-sm font-bold ${
                      new Date(item.completed_at) <= new Date(item.end_date) 
                        ? 'text-green-900' 
                        : 'text-orange-900'
                    }`}>
                      {new Date(item.completed_at) <= new Date(item.end_date) ? '✅ On Time' : '⚠️ Delayed'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
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

      {/* Assign/Reassign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {item.assignee_id ? '🔄 Reassign Ticket' : '👤 Assign Ticket'}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Assign developer and optionally set start/end dates for project planning.
            </p>
            
            <div className="space-y-4">
              {/* Developer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Developer *
                </label>
                <select
                  value={assignData.assignee_id}
                  onChange={(e) => setAssignData({ ...assignData, assignee_id: e.target.value })}
                  className="input"
                  autoFocus
                >
                  <option value="">Select assignee...</option>
                  {assignableUsers.map(assignable => (
                    <option key={assignable.id} value={assignable.id}>
                      {assignable.name} {assignable.role === 'pm' ? '(PM)' : ''}
                      {assignable.branch ? ` (${assignable.branch.name})` : ''}
                      {assignable.id === item.assignee_id && ' - Current'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
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
                <p className="text-xs text-gray-500 mt-1">When should work begin?</p>
              </div>

              {/* Due Date */}
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
                <p className="text-xs text-gray-500 mt-1">When should this be completed?</p>
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

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🔄 Reopen Ticket</h2>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for reopening this ticket. This will help the development team understand what needs to be fixed.
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
    </div>
  )
}

