import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function CreateItem() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const navigate = useNavigate()
  const assignableUsers = users.filter(u => u.role === 'dev' || u.role === 'pm')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm()

  const itemType = watch('type')

  useEffect(() => {
    fetchUsers()
    if (user?.role === 'pm') {
      fetchBranches()
    }
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    
    // Validate file sizes
    const oversized = files.filter(f => f.size > 10 * 1024 * 1024)
    if (oversized.length > 0) {
      toast.error(`Files too large (max 10MB): ${oversized.map(f => f.name).join(', ')}`)
      return
    }
    
    setSelectedFiles([...selectedFiles, ...files])
  }

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      // Convert form data
      const itemData = {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        assignee_id: data.assignee_id ? parseInt(data.assignee_id) : null,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null
      }

      // Create ticket
      const response = await api.post('/items', itemData)
      const ticketId = response.data.id
      
      // Upload attachments if any
      if (selectedFiles.length > 0) {
        toast(`📎 Uploading ${selectedFiles.length} file(s)...`)
        
        for (const file of selectedFiles) {
          const formData = new FormData()
          formData.append('file', file)
          
          try {
            await api.post(`/attachments/upload/${ticketId}`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error)
          }
        }
      }
      
      toast.success(`✅ Ticket created${selectedFiles.length > 0 ? ` with ${selectedFiles.length} attachment(s)` : ''}!`)
      navigate('/board')
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast.error('Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-none space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎫</span>
            <div>
              <h1 className="page-header-title">Create New Ticket</h1>
              <p className="page-header-subtitle">Submit a support ticket or request</p>
            </div>
          </div>
          <Link to="/board" className="btn btn-primary text-sm">
            ← Back to Board
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Main Information */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📝</span>
            <h2 className="text-sm font-semibold text-gray-900">Ticket Information</h2>
          </div>
          <div className="space-y-3">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Ticket Title *
              </label>
              <input
                type="text"
                id="title"
                {...register('title', { required: 'Title is required' })}
                className="input text-base"
                placeholder="Brief summary of the issue or request (e.g., 'Login page not responding')"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className="input text-sm"
                placeholder="What is the issue? Steps to reproduce? Expected vs actual behavior?"
              />
              <p className="mt-1 text-xs text-gray-500">
                💡 More details help resolve faster
              </p>
            </div>

            {/* Type and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Ticket Type *
                </label>
                <select
                  id="type"
                  {...register('type', { required: 'Type is required' })}
                  className="input"
                >
                  <option value="">Select ticket type</option>
                  <option value="support">🎫 Support Ticket - Issues, bugs, help needed</option>
                  <option value="feature">✨ Feature Request - New functionality or improvements</option>
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority Level *
                </label>
                <select
                  id="priority"
                  {...register('priority')}
                  className="input"
                  defaultValue="normal"
                >
                  <option value="critical">🔴 Critical - System down, blocking work</option>
                  <option value="high">🟠 High - Major impact, needs quick fix</option>
                  <option value="normal">🔵 Normal - Standard priority</option>
                  <option value="low">⚪ Low - Minor issue, can wait</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Choose based on urgency and business impact
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">👥</span>
            <h2 className="text-sm font-semibold text-gray-900">Assignment</h2>
          </div>
          <div className="space-y-3">

            {/* Branch (PM only) */}
            {user?.role === 'pm' && (
              <div>
                <label htmlFor="branch_id" className="block text-sm font-medium text-gray-700 mb-1">
                  📍 Branch/Location
                </label>
                <select
                  id="branch_id"
                  {...register('branch_id')}
                  className="input"
                >
                  <option value="">Auto-detect from your profile</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Specify branch if different from yours
                </p>
              </div>
            )}

            {/* Assignee */}
            <div>
              <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 mb-1">
                {user?.role === 'pm' ? '👤 Assign Developer' : '👤 Assignee'}
              </label>
              <select
                id="assignee_id"
                {...register('assignee_id')}
                className="input"
                disabled={user?.role === 'requester'}
              >
                <option value="">⏳ Unassigned - PM will assign</option>
                {assignableUsers.map(assignable => (
                  <option key={assignable.id} value={assignable.id}>
                    {assignable.name} {assignable.role === 'pm' ? '(PM)' : ''}
                    {assignable.branch ? ` (${assignable.branch.name} Branch)` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {user?.role === 'pm' 
                  ? '✅ You can assign now or leave unassigned to assign later'
                  : '⚠️ Your PM will assign this ticket to a developer'}
              </p>
            </div>

          </div>
        </div>

        {/* File Attachments */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📎</span>
            <h2 className="text-sm font-semibold text-gray-900">Attachments (Optional)</h2>
          </div>
          
          <div className="space-y-3">
            {/* File Upload */}
            <div>
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.log,.zip"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">📎</span>
                    <p className="text-sm font-medium text-gray-700">Click to upload files</p>
                    <p className="text-xs text-gray-500">or drag and drop</p>
                    <p className="text-xs text-gray-400">Images, PDF, Documents, Logs (Max 10MB each)</p>
                  </div>
                </div>
              </label>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Selected Files ({selectedFiles.length}):</p>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">📄</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Remove"
                    >
                      <span className="text-sm">✖️</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Helpful Tips */}
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div>
              <h3 className="text-xs font-semibold text-blue-900 mb-1">Quick Tips</h3>
              <p className="text-xs text-blue-800">
                Use clear titles • Add detailed description • Attach screenshots/logs • Set appropriate priority • PM will assign timeline
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => navigate('/board')}
            className="btn btn-secondary text-sm"
            disabled={loading}
          >
            ← Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary text-sm px-6"
            disabled={loading}
          >
            {loading 
              ? (selectedFiles.length > 0 ? `⏳ Creating & uploading ${selectedFiles.length} file(s)...` : '⏳ Creating...') 
              : (selectedFiles.length > 0 ? `✅ Create Ticket (${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''})` : '✅ Create Ticket')}
          </button>
        </div>
      </form>
    </div>
  )
}

