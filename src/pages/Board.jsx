import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const activeColumns = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'review', title: 'Review', color: 'bg-yellow-100' },
  { id: 'pending_client', title: 'Pending (Client)', color: 'bg-orange-100' },
  { id: 'pending_requester', title: 'Pending (Requester)', color: 'bg-amber-100' }
]

const doneColumn = { id: 'done', title: 'Done', color: 'bg-green-100' }

const getDefaultFilter = (role) => ({
  type: '',
  assignee: (role === 'dev' || role === 'pm') ? 'me' : '',
  priority: '',
  branch: ''
})

const getInitialFilter = (role) => {
  const fallback = getDefaultFilter(role)
  try {
    const saved = localStorage.getItem('boardFilter')
    if (!saved) return fallback
    const parsed = JSON.parse(saved)
    return {
      ...fallback,
      ...(parsed || {})
    }
  } catch {
    return fallback
  }
}

export default function Board() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDone, setShowDone] = useState(() => {
    try {
      return localStorage.getItem('boardShowDone') === 'true'
    } catch {
      return false
    }
  })
  const [filter, setFilter] = useState(() => getInitialFilter(user?.role))

  // Persist board filters so user does not need to reselect after navigation/refresh
  useEffect(() => {
    try {
      localStorage.setItem('boardFilter', JSON.stringify(filter))
    } catch {
      // Ignore storage errors
    }
  }, [filter])

  useEffect(() => {
    try {
      localStorage.setItem('boardShowDone', String(showDone))
    } catch {
      // Ignore storage errors
    }
  }, [showDone])

  // If role changes and saved filter has no assignee, reapply sensible default
  useEffect(() => {
    if (!user?.role) return
    setFilter((prev) => {
      if (prev.assignee) return prev
      return {
        ...prev,
        assignee: (user.role === 'dev' || user.role === 'pm') ? 'me' : ''
      }
    })
  }, [user?.role])
  const assignableUsers = users.filter(u => u.role === 'dev' || u.role === 'pm')

  useEffect(() => {
    fetchItems()
    fetchUsers()
    if (user?.role === 'pm') {
      fetchBranches()
    }
  }, [filter])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('limit', '10000')
      if (filter.type) params.append('type', filter.type)
      if (filter.assignee) params.append('assignee_id', filter.assignee)
      if (filter.branch) params.append('branch_id', filter.branch)
      
      const response = await api.get(`/items?${params.toString()}`)
      setItems(response.data)
    } catch (error) {
      console.error('Failed to fetch items:', error)
      toast.error('Failed to fetch items')
    } finally {
      setLoading(false)
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

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches')
      setBranches(response.data)
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  const assignItem = async (itemId, assigneeId) => {
    try {
      await api.patch(`/items/${itemId}/assign`, { assignee_id: parseInt(assigneeId) })
      toast.success('Item assigned successfully!')
      fetchItems()
    } catch (error) {
      console.error('Failed to assign item:', error)
      toast.error('Failed to assign item')
    }
  }

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const itemId = parseInt(draggableId)
    const newStatus = destination.droppableId

    try {
      // Optimistic update
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      )

      // Update on server
      await api.patch(`/items/${itemId}`, { status: newStatus })
      toast.success('Item status updated')
    } catch (error) {
      console.error('Failed to update item:', error)
      toast.error('Failed to update item status')
      // Revert optimistic update
      fetchItems()
    }
  }

  const getItemsByStatus = (status) => {
    return items.filter(item => {
      const matchesStatus = item.status === status

      const search = searchTerm.toLowerCase()

      const matchesSearch =
        !search ||
        item.title?.toLowerCase().includes(search) ||
        String(item.id).includes(search) 
        // item.priority?.toLowerCase().includes(search) ||
        // item.type?.toLowerCase().includes(search) ||
        // users.find(u => u.id === item.assignee_id)?.name?.toLowerCase().includes(search)

      return matchesStatus && matchesSearch
    })
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500'
      case 'high': return 'border-l-orange-500'
      case 'normal': return 'border-l-blue-500'
      case 'low': return 'border-l-gray-500'
      default: return 'border-l-gray-500'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString()
  }

  const exportToExcel = async () => {
    try {
      toast('⏳ Preparing export with comments...')
      
      // Fetch comments for all tickets
      const ticketsWithComments = await Promise.all(
        items.map(async (item) => {
          try {
            const response = await api.get(`/items/${item.id}/comments`)
            return { ...item, comments: response.data }
          } catch (error) {
            return { ...item, comments: [] }
          }
        })
      )
      
      const dateStr = new Date().toISOString().split('T')[0]
      
      // File 1: Tickets Export
      const ticketHeaders = ['ID', 'Title', 'Type', 'Priority', 'Status', 'Assignee', 'Reporter', 'Branch', 'Start Date', 'Due Date', 'Completed Date', 'Created', 'Updated', 'SLA Hours', 'Description', 'Comments']
      const ticketRows = ticketsWithComments.map(item => {
        const commentsText = (item.comments || [])
          .filter(comment => {
            const body = comment.body || ''

            // Exclude system generated comments
            return !(
              body.includes('Status changed') ||
              body.includes('REOPENED') ||
              body.includes('assigned')
            )
          })
          .map(comment => {
            const userName =
              users.find(u => u.id === comment.user_id)?.name ||
              `User ${comment.user_id}`

            const commentDate = new Date(
              comment.created_at
            ).toLocaleString()

            return `[${commentDate}] ${userName}\n${comment.body}`
          })
          .join('\n\n')

          return [
            item.id,
            item.title,
            item.type,
            item.priority,
            item.status,
            item.assignee_id
              ? (users.find(u => u.id === item.assignee_id)?.name ||
                  `User ${item.assignee_id}`)
              : 'Unassigned',
            users.find(u => u.id === item.reporter_id)?.name ||
              `User ${item.reporter_id}`,
            item.branch_id || 'N/A',
            item.start_date
              ? new Date(item.start_date).toLocaleString()
              : 'Not set',
            item.end_date
              ? new Date(item.end_date).toLocaleString()
              : 'Not set',
            item.completed_at
              ? new Date(item.completed_at).toLocaleString()
              : 'Not completed',
            new Date(item.created_at).toLocaleString(),
            new Date(item.updated_at).toLocaleString(),
            item.sla_hours || 'N/A',
            item.description || 'No description',
            commentsText || 'No comments'
          ]
        })
      
      const ticketCSV = [
        ticketHeaders.join(','),
        ...ticketRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')
      
      // Download Tickets file
      const ticketBlob = new Blob(['\uFEFF' + ticketCSV], { type: 'text/csv;charset=utf-8;' })
      const ticketLink = document.createElement('a')
      const ticketUrl = URL.createObjectURL(ticketBlob)
      ticketLink.setAttribute('href', ticketUrl)
      ticketLink.setAttribute('download', `tickets_${dateStr}.csv`)
      ticketLink.style.visibility = 'hidden'
      document.body.appendChild(ticketLink)
      ticketLink.click()
      document.body.removeChild(ticketLink)
      
      // File 2: Comment Logs Export
      const commentHeaders = ['Ticket ID', 'Ticket Title', 'Status', 'Priority', 'Comment Date', 'User', 'Comment Text', 'Comment Type']
      const commentRows = []
      ticketsWithComments.forEach(item => {
        if (item.comments && item.comments.length > 0) {
          item.comments.forEach(comment => {
            const isSystemComment = comment.body.includes('Status changed') || comment.body.includes('REOPENED') || comment.body.includes('assigned')
            commentRows.push([
              item.id,
              item.title,
              item.status,
              item.priority,
              new Date(comment.created_at).toLocaleString(),
              users.find(u => u.id === comment.user_id)?.name || `User ${comment.user_id}`,
              comment.body.replace(/"/g, '""'),
              isSystemComment ? 'System' : 'User'
            ])
          })
        }
      })
      
      const commentCSV = [
        commentHeaders.join(','),
        ...commentRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')
      
      // Download Comments file (slight delay to avoid browser blocking)
      setTimeout(() => {
        const commentBlob = new Blob([commentCSV], { type: 'text/csv;charset=utf-8;' })
        const commentLink = document.createElement('a')
        const commentUrl = URL.createObjectURL(commentBlob)
        commentLink.setAttribute('href', commentUrl)
        commentLink.setAttribute('download', `ticket_comments_${dateStr}.csv`)
        commentLink.style.visibility = 'hidden'
        document.body.appendChild(commentLink)
        commentLink.click()
        document.body.removeChild(commentLink)
        
        toast.success(`✅ Downloaded 2 files: ${items.length} tickets + ${commentRows.length} comments!`)
      }, 500)
      
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export data')
    }
  }

  if (loading) {
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
            <span>📋</span>
            <div>
              <h1 className="page-header-title">{user?.role === 'dev' ? 'My Tickets' : 'Kanban Board'}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="page-header-subtitle">
                  {user?.role === 'dev' ? 'Drag or click to update' : 'Manage tickets'}
                </span>
                <span className="px-2 py-0.5 bg-indigo-500/30 text-white text-xs font-semibold rounded uppercase">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-72 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <button
            onClick={exportToExcel}
            className="btn btn-primary"
          >
            📥 Export
          </button>
        </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <span>🔍</span>
          <h3 className="text-sm font-semibold text-slate-800">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="input"
            >
              <option value="">All Types</option>
              <option value="support">🎫 Support</option>
              <option value="feature">✨ Feature</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="input"
            >
              <option value="">All Priorities</option>
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="normal">🔵 Normal</option>
              <option value="low">⚪ Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {user?.role === 'dev' ? 'View' : 'Assignee'}
            </label>
            <select
              value={filter.assignee}
              onChange={(e) => setFilter({ ...filter, assignee: e.target.value })}
              className="input"
            >
              {(user?.role === 'dev' || user?.role === 'pm') ? (
                <>
                  <option value="me">👤 My Tickets</option>
                  <option value="">👥 All Tickets {user?.role === 'pm' ? '' : '(Branch)'}</option>
                  {user?.role === 'pm' && (
                    <>
                      <option value="unassigned">⚠️ Unassigned</option>
                      {assignableUsers.filter(u => u.id !== user.id).map(assignable => (
                        <option key={assignable.id} value={assignable.id}>
                          {assignable.name} {assignable.role === 'pm' ? '(PM)' : ''}
                        </option>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  <option value="">All Assignees</option>
                  <option value="me">My Tickets</option>
                  <option value="unassigned">⚠️ Unassigned</option>
                  {assignableUsers.map(assignable => (
                    <option key={assignable.id} value={assignable.id}>
                      {assignable.name} {assignable.role === 'pm' ? '(PM)' : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          {user?.role === 'pm' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={filter.branch}
                onChange={(e) => setFilter({ ...filter, branch: e.target.value })}
                className="input"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {(user?.role === 'dev' || user?.role === 'pm') && filter.assignee === 'me' && (
          <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded-md">
            <p className="text-xs text-blue-800">
              💡 <strong>Tip:</strong> Viewing only tickets assigned to you. Change filter to see {user?.role === 'pm' ? 'all tickets' : 'all branch tickets'}.
            </p>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Active Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {activeColumns.map((column) => (
            <div key={column.id} className="space-y-3">
              <div className={`p-3 rounded-lg ${column.color}`}>
                <h3 className="font-semibold text-gray-900 text-sm">{column.title}</h3>
                <p className="text-xs text-gray-600">{getItemsByStatus(column.id).length} items</p>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[350px] p-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                  >
                    {getItemsByStatus(column.id).map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => navigate(`/items/${item.id}`)}
                            className={`bg-white rounded-lg shadow-sm border-l-4 p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow ${
                              getPriorityColor(item.priority)
                            } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
                                {item.type}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {item.description || 'No description'}
                            </p>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className={`font-medium capitalize ${getPriorityColor(item.priority).replace('border-l-', 'text-')}`}>
                                {item.priority}
                              </span>
                              <span className={new Date(item.end_date) < new Date() && item.status !== 'done' ? 'text-red-600 font-medium' : ''}>
                                {item.end_date ? `Due: ${formatDate(item.end_date)}` : 'No due date'}
                              </span>
                            </div>
                            
                            <div className="mt-2 text-xs">
                              {item.assignee_id ? (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-600">
                                      Assigned: {users.find(u => u.id === item.assignee_id)?.name || `User #${item.assignee_id}`}
                                    </span>
                                    {user?.role === 'pm' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          navigate(`/items/${item.id}`)
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                      >
                                        Change
                                      </button>
                                    )}
                                  </div>
                                  {/* Quick Status Actions for Assigned Developer or PM */}
                                  {(user?.role === 'dev' || user?.role === 'pm') && item.assignee_id === user.id && item.status !== 'done' && (
                                    <div className="flex gap-1">
                                      {item.status === 'backlog' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDragEnd({ 
                                              destination: { droppableId: 'in_progress' },
                                              source: { droppableId: item.status },
                                              draggableId: item.id.toString()
                                            })
                                          }}
                                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                                        >
                                          ▶️ Start
                                        </button>
                                      )}
                                      {item.status === 'in_progress' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDragEnd({ 
                                              destination: { droppableId: 'review' },
                                              source: { droppableId: item.status },
                                              draggableId: item.id.toString()
                                            })
                                          }}
                                          className="text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-medium"
                                        >
                                          👀 Review
                                        </button>
                                      )}
                                      {item.status === 'review' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDragEnd({ 
                                              destination: { droppableId: 'done' },
                                              source: { droppableId: item.status },
                                              draggableId: item.id.toString()
                                            })
                                          }}
                                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                                        >
                                          ✅ Done
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <span className="text-red-600 font-medium">⚠️ Unassigned</span>
                                  {user?.role === 'pm' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        navigate(`/items/${item.id}`)
                                      }}
                                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                                    >
                                      Assign
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>

        {/* Completed Tickets Section - Collapsible */}
        <div className="mt-4">
          <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <button
              onClick={() => setShowDone(!showDone)}
              className="w-full flex items-center justify-between p-2 hover:bg-green-100 rounded transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{showDone ? '📂' : '📁'}</span>
                <div className="text-left">
                  <h3 className="font-semibold text-green-900 text-sm">✅ Completed Tickets</h3>
                  <p className="text-xs text-green-700">{getItemsByStatus('done').length} tickets completed</p>
                </div>
              </div>
              <span className="text-green-700 font-medium text-sm">
                {showDone ? '▲ Hide' : '▼ Show'}
              </span>
            </button>

            {showDone && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <Droppable droppableId="done">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-green-100' : 'bg-white'
                      }`}
                    >
                      {getItemsByStatus('done').length === 0 ? (
                        <p className="text-center text-gray-400 py-8 text-sm">No completed tickets yet</p>
                      ) : (
                        getItemsByStatus('done').map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => navigate(`/items/${item.id}`)}
                                className={`bg-white rounded-lg shadow-sm border-l-4 p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow ${
                                  getPriorityColor(item.priority)
                                } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                    ✅ Done
                                  </span>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                  {item.description || 'No description'}
                                </p>
                                
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span className={`font-medium capitalize ${getPriorityColor(item.priority).replace('border-l-', 'text-')}`}>
                                    {item.priority}
                                  </span>
                                  <span className="text-green-600 font-medium">
                                    {item.completed_at ? `✅ ${new Date(item.completed_at).toLocaleDateString()}` : 'Completed'}
                                  </span>
                                </div>
                                
                                {item.end_date && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Due: {formatDate(item.end_date)}
                                    {new Date(item.completed_at) <= new Date(item.end_date) && (
                                      <span className="text-green-600 ml-1">⚡ On time</span>
                                    )}
                                    {new Date(item.completed_at) > new Date(item.end_date) && (
                                      <span className="text-orange-600 ml-1">⚠️ Late</span>
                                    )}
                                  </div>
                                )}
                                
                                <div className="mt-2 text-xs text-gray-600">
                                  {item.assignee_id && (
                                    <span>By: {users.find(u => u.id === item.assignee_id)?.name || `User #${item.assignee_id}`}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  )
}
