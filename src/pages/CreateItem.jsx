import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { ExclamationTriangleIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function CreateItem() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  
  const [similarTickets, setSimilarTickets] = useState([])
  const [showSimilarAlert, setShowSimilarAlert] = useState(false)
  const [checkingSimilar, setCheckingSimilar] = useState(false)
  const [selectedSimilarTicket, setSelectedSimilarTicket] = useState(null)
  const [showSimilarDetailModal, setShowSimilarDetailModal] = useState(false)

  const navigate = useNavigate()
  const assignableUsers = users.filter(u => u.role === 'dev' || u.role === 'pm')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm()

  const title = watch('title')
  const description = watch('description')

  // Check if user's branch is Dialdesk, Ispark, or HQ
  const isAllowedBranch = () => {
    if (!user) return false
    const allowedBranches = ['dialdesk', 'ispark', 'hq', 'Dialdesk', 'Ispark', 'HQ', 'DIALDESK', 'ISPARK']
    const branchName = user.branch?.name || ''
    return allowedBranches.includes(branchName) || allowedBranches.includes(branchName.toLowerCase())
  }

  // Check if user can manage clients (Admin/PM with allowed branch)
  const canManageClients = () => {
    if (!user) return false
    if (user.role !== 'admin' && user.role !== 'pm') return false
    return isAllowedBranch()
  }

  // Check if user can see client dropdown
  const canSeeClientDropdown = () => {
    if (!user) return false
    return isAllowedBranch()
  }

  useEffect(() => {
    fetchUsers()
    fetchBranches()
    if (canSeeClientDropdown()) {
      fetchClients()
    }
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (title && title.length > 3) {
        checkSimilarTickets()
      } else {
        setSimilarTickets([])
        setShowSimilarAlert(false)
      }
    }, 600)

    return () => clearTimeout(delayDebounceFn)
  }, [title, description])

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

  // const fetchClients = async () => {
  //   try {
  //     setLoadingClients(true)
  //     const response = await api.get('/clients/clients')
  //     console.log('✅ Clients fetched:', response.data)
  //     setClients(response.data || [])
  //   } catch (error) {
  //     console.error('❌ Failed to fetch clients:', error)
  //     setClients([])
  //   } finally {
  //     setLoadingClients(false)
  //   }
  // }


  const CRM_API = 'https://crmapi.dialdesk.in'

  const fetchClients = async () => {
    try {
      setLoadingClients(true)

      // 1. Login
      const loginResponse = await fetch(`${CRM_API}/auth/login`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'krishna.kumar@teammas.in',
          password: '5678'
        })
      })

      if (!loginResponse.ok) {
        throw new Error('CRM login failed')
      }

      const loginData = await loginResponse.json()

      const token = loginData.access_token

      if (!token) {
        throw new Error('Access token not received')
      }

      // 2. Get clients using token
      const clientsResponse = await fetch(
        `${CRM_API}/agents/clients-rights`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
          
        }
      )

      if (!clientsResponse.ok) {
        throw new Error('Failed to fetch clients')
      }

      const clientsData = await clientsResponse.json()

      console.log('✅ CRM Clients:', clientsData)

      setClients(clientsData || [])

    } catch (error) {
      console.error('❌ Failed to fetch CRM clients:', error)
      setClients([])
      toast.error('Failed to load clients')
    } finally {
      setLoadingClients(false)
    }
  }

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      toast.error('Please enter client name')
      return
    }

    if (!canManageClients()) {
      toast.error('Only Admin/PM with Dialdesk, Ispark, or HQ branch can add clients')
      return
    }

    setAddingClient(true)
    try {
      const response = await api.post('/clients/clients', { 
        name: newClientName.trim()
      })
      
      setClients([...clients, response.data])
      setNewClientName('')
      setShowAddClientModal(false)
      toast.success(`✅ Client "${newClientName.trim()}" added successfully!`)
      setValue('client_id', response.data.id)
    } catch (error) {
      console.error('Failed to add client:', error)
      toast.error(error.response?.data?.detail || 'Failed to add client')
    } finally {
      setAddingClient(false)
    }
  }

  const checkSimilarTickets = async () => {
    if (!title || title.length < 3) return

    setCheckingSimilar(true)
    try {
      const params = new URLSearchParams()
      params.append('title', title)
      
      if (description && description.length > 5) {
        params.append('description', description)
      }

      if (user?.branch_id) {
        params.append('branch_id', user.branch_id)
      }

      const response = await api.get(`/items/similar/find?${params.toString()}`)
      console.log('✅ Similar tickets found:', response.data)
      setSimilarTickets(response.data)
      setShowSimilarAlert(response.data.length > 0)
    } catch (error) {
      console.error('❌ Failed to check similar tickets:', error)
    } finally {
      setCheckingSimilar(false)
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
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
      const itemData = {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        assignee_id: data.assignee_id ? parseInt(data.assignee_id) : null,
        branch_id: user?.branch_id || null,
        client_id: data.client_id ? parseInt(data.client_id) : null,
      }

      console.log('Creating ticket with data:', itemData)

      const response = await api.post('/items', itemData)
      const ticketId = response.data.id
      
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
      
      if (similarTickets.length > 0) {
        const similarIds = similarTickets.map(t => `#${t.id}`).join(', ')
        await api.post(`/items/${ticketId}/comments`, {
          body: `🔍 Similar tickets found: ${similarIds}\nPlease check if this is a recurring issue.`
        })
      }
      
      toast.success(`✅ Ticket created${selectedFiles.length > 0 ? ` with ${selectedFiles.length} attachment(s)` : ''}!`)
      navigate('/board')
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast.error(error.response?.data?.detail || 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      backlog: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      review: 'bg-yellow-100 text-yellow-800',
      pending_client: 'bg-orange-100 text-orange-800',
      pending_requester: 'bg-amber-100 text-amber-800',
      done: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.backlog
  }

  const getStatusLabel = (status) => {
    const labels = {
      backlog: 'Backlog',
      in_progress: 'In Progress',
      review: 'Review',
      pending_client: 'Pending Client',
      pending_requester: 'Pending Requester',
      done: 'Completed',
      rejected: 'Rejected'
    }
    return labels[status] || status
  }

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    }
    return colors[priority] || colors.normal
  }

  const getRCAStatusLabel = (status) => {
    const labels = {
      pending: '⏳ Pending',
      in_progress: '🔄 In Progress',
      completed: '✅ Completed',
      not_applicable: '➖ N/A'
    }
    return labels[status] || status
  }

  const getRCAStatusColor = (status) => {
    const colors = {
      pending: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      not_applicable: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || colors.pending
  }

  const getSolutionStatusLabel = (status) => {
    const labels = {
      pending: '⏳ Pending',
      in_progress: '🔄 In Progress',
      completed: '✅ Completed',
      not_applicable: '➖ N/A'
    }
    return labels[status] || status
  }

  const getSolutionStatusColor = (status) => {
    const colors = {
      pending: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      not_applicable: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || colors.pending
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  const viewSimilarTicketDetail = (ticket) => {
    setSelectedSimilarTicket(ticket)
    setShowSimilarDetailModal(true)
  }

  return (
    <div className="w-full max-w-none space-y-4 animate-fade-in">
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
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📝</span>
            <h2 className="text-sm font-semibold text-gray-900">Ticket Information</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Ticket Title *
              </label>
              <input
                type="text"
                id="title"
                {...register('title', { required: 'Title is required' })}
                className="input text-base"
                placeholder="Brief summary of the issue or request"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className="input text-sm"
                placeholder="What is the issue? Steps to reproduce?"
              />
              <p className="mt-1 text-xs text-gray-500">💡 More details help resolve faster</p>
            </div>

            {/* Client Selection - ONLY for users with Dialdesk, Ispark, or HQ branch */}
            {canSeeClientDropdown() && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
                    🏢 Select Client <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  {canManageClients() && (
                    <button
                      type="button"
                      onClick={() => setShowAddClientModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Add Client
                    </button>
                  )}
                </div>
                
                {loadingClients ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 p-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    Loading clients...
                  </div>
                ) : (
                  <select
                    id="client_id"
                    {...register('client_id')}
                    className="input"
                  >
                    <option value="">Select client (optional)...</option>

                    {clients.map((client) => (
                      <option
                        key={client.company_id}
                        value={client.company_id}
                      >
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                )}
                
                <p className="mt-1 text-xs text-gray-500">
                  {clients.length > 0 
                    ? `${clients.length} clients available.`
                    : loadingClients ? 'Loading clients...' : 'No clients available.'}
                </p>
              </div>
            )}

            {/* Similar Tickets Alert */}
            {checkingSimilar && (
              <div className="flex items-center gap-2 text-sm text-gray-500 p-3 bg-blue-50 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>🔍 Checking for similar tickets...</span>
              </div>
            )}

            {showSimilarAlert && !checkingSimilar && similarTickets.length > 0 && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      {similarTickets.length} Similar Ticket{similarTickets.length > 1 ? 's' : ''} Found!
                    </h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      These tickets have similar titles. Please review before creating a new ticket.
                    </p>
                    <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
                      {similarTickets.map((ticket) => (
                        <div key={ticket.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-yellow-200 hover:shadow-md transition-shadow">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">#{ticket.id}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                                {getStatusLabel(ticket.status)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                              {ticket.is_recurring && (
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                                  🔄 Recurring
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 truncate">{ticket.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span>📅 {formatDate(ticket.created_at)}</span>
                              {ticket.rca_status && ticket.rca_status !== 'pending' && (
                                <span className="text-green-600">✅ RCA: {ticket.rca_status}</span>
                              )}
                              {ticket.solution_status && ticket.solution_status !== 'pending' && (
                                <span className="text-blue-600">✅ Solution: {ticket.solution_status}</span>
                              )}
                            </div>
                            {ticket.rca_notes && (
                              <div className="mt-1 text-xs text-gray-500 truncate">
                                💡 RCA: {ticket.rca_notes.substring(0, 80)}...
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => viewSimilarTicketDetail(ticket)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-50 rounded"
                          >
                            View Details →
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-700 mt-2 flex items-center gap-1">
                      <span>💡</span>
                      <strong>Tip:</strong> If this is a recurring issue, mark it as "Recurring" when closing the ticket.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                  <option value="support">🎫 Support Ticket</option>
                  <option value="feature">✨ Feature Request</option>
                </select>
                {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
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
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="normal">🔵 Normal</option>
                  <option value="low">⚪ Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">👥</span>
            <h2 className="text-sm font-semibold text-gray-900">Assignment</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 mb-1">
                {user?.role === 'pm' || user?.role === 'admin' ? '👤 Assign Developer' : '👤 Assignee'}
              </label>
              <select
                id="assignee_id"
                {...register('assignee_id')}
                className="input"
                disabled={user?.role === 'requester'}
              >
                <option value="">⏳ Unassigned</option>
                {assignableUsers.map(assignable => (
                  <option key={assignable.id} value={assignable.id}>
                    {assignable.name} {assignable.role === 'pm' ? '(PM)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📎</span>
            <h2 className="text-sm font-semibold text-gray-900">Attachments (Optional)</h2>
          </div>
          <div className="space-y-3">
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
                    <p className="text-xs text-gray-400">Max 10MB each</p>
                  </div>
                </div>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
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
                    >
                      ✖️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
            {loading ? '⏳ Creating...' : '✅ Create Ticket'}
          </button>
        </div>
      </form>

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">🏢</span>
                Add New Client
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddClientModal(false)
                  setNewClientName('')
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={addingClient}
              >
                ✖️
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Add a new client. This will be available in the client dropdown for all users.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Enter client name..."
                  className="input"
                  autoFocus
                  disabled={addingClient}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddClient()
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddClientModal(false)
                  setNewClientName('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={addingClient}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddClient}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                disabled={addingClient || !newClientName.trim()}
              >
                {addingClient ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  '✅ Add Client'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Similar Ticket Detail Modal */}
      {showSimilarDetailModal && selectedSimilarTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Similar Ticket #{selectedSimilarTicket.id}
                </h2>
                <p className="text-sm text-gray-500">{selectedSimilarTicket.title}</p>
              </div>
              <button
                onClick={() => setShowSimilarDetailModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedSimilarTicket.status)}`}>
                        {getStatusLabel(selectedSimilarTicket.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Priority</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(selectedSimilarTicket.priority)}`}>
                        {selectedSimilarTicket.priority}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="text-sm font-medium capitalize">{selectedSimilarTicket.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm">{formatDate(selectedSimilarTicket.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* RCA Details */}
                <div className="col-span-1 border border-amber-200 rounded-lg p-3 bg-amber-50">
                  <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                    <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                    RCA Details
                  </h3>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRCAStatusColor(selectedSimilarTicket.rca_status)}`}>
                      {getRCAStatusLabel(selectedSimilarTicket.rca_status)}
                    </span>
                  </div>
                  {selectedSimilarTicket.rca_notes && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Notes</p>
                      <p className="text-sm bg-white p-2 rounded border border-amber-200 mt-1 max-h-24 overflow-y-auto">
                        {selectedSimilarTicket.rca_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Solution Details */}
                <div className="col-span-1 border border-blue-200 rounded-lg p-3 bg-blue-50">
                  <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-2">
                    <LightBulbIcon className="h-4 w-4" />
                    Solution Details
                  </h3>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSolutionStatusColor(selectedSimilarTicket.solution_status)}`}>
                      {getSolutionStatusLabel(selectedSimilarTicket.solution_status)}
                    </span>
                  </div>
                  {selectedSimilarTicket.solution_notes && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Notes</p>
                      <p className="text-sm bg-white p-2 rounded border border-blue-200 mt-1 max-h-24 overflow-y-auto">
                        {selectedSimilarTicket.solution_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Recurring */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <RecurringIcon className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">
                      {selectedSimilarTicket.is_recurring ? '🔄 This is a recurring ticket' : 'This is not a recurring ticket'}
                    </span>
                    {selectedSimilarTicket.completed_at && (
                      <span className="ml-auto text-sm text-green-600">
                        ✅ Completed: {formatDate(selectedSimilarTicket.completed_at)}
                      </span>
                    )}
                  </div>
                </div>

                {selectedSimilarTicket.description && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                      {selectedSimilarTicket.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Link to={`/items/${selectedSimilarTicket.id}`} className="btn btn-primary text-sm" target="_blank">
                View Full Ticket →
              </Link>
              <button onClick={() => setShowSimilarDetailModal(false)} className="btn btn-secondary text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}