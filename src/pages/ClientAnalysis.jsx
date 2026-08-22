import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  BuildingOfficeIcon,
  TicketIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  SparklesIcon,
  DocumentMagnifyingGlassIcon,
  LightBulbIcon,
  ArrowPathIcon as RecurringIcon
} from '@heroicons/react/24/outline'

export default function ClientAnalysis() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [timeRange, setTimeRange] = useState('all')
  const [analytics, setAnalytics] = useState(null)
  const [patterns, setPatterns] = useState([])
  const [showSimilarModal, setShowSimilarModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [similarTickets, setSimilarTickets] = useState([])
  const [showTicketDetailModal, setShowTicketDetailModal] = useState(false)
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null)

  // Check if user can access (Admin, PM, Dev - not requester)
  // AND branch should be Dialdesk, Ispark, or HQ
  const isAllowedBranch = () => {
    if (!user) return false
    const allowedBranches = ['dialdesk', 'ispark', 'hq', 'Dialdesk', 'Ispark', 'HQ', 'DIALDESK', 'ISPARK']
    const branchName = user.branch?.name || ''
    return allowedBranches.includes(branchName) || allowedBranches.includes(branchName.toLowerCase())
  }

  const canAccess = user?.role !== 'requester' && isAllowedBranch()

  useEffect(() => {
    if (canAccess) {
      fetchClients()
    }
  }, [canAccess])

  useEffect(() => {
    if (selectedClient) {
      fetchClientTickets()
    }
  }, [selectedClient, timeRange])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const response = await api.get('/crm/clients')
      const data = (response.data || []).sort((a, b) =>
        String(a.company_name).localeCompare(String(b.company_name))
      )

      if (data && data.length > 0) {
        setClients(data)
        setSelectedClient(data[0])
      } else {
        toast.error('No clients found.')
        setClients([])
      }
    } catch (error) {
      console.error('❌ Failed to fetch clients:', error)
      toast.error('Failed to load clients')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const fetchClientTickets = async () => {
    if (!selectedClient) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('client_id', selectedClient.company_id)
      params.append('limit', '10000')

      if (timeRange === '7days') {
        const date = new Date()
        date.setDate(date.getDate() - 7)
        params.append('from_date', date.toISOString().split('T')[0])
      } else if (timeRange === '30days') {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        params.append('from_date', date.toISOString().split('T')[0])
      } else if (timeRange === '90days') {
        const date = new Date()
        date.setDate(date.getDate() - 90)
        params.append('from_date', date.toISOString().split('T')[0])
      }

      const response = await api.get(`/items?${params.toString()}`)
      console.log('✅ Tickets for client:', response.data)
      setTickets(response.data)
      calculateAnalytics(response.data)
      calculatePatterns(response.data)
    } catch (error) {
      console.error('❌ Failed to fetch tickets:', error)
      toast.error('Failed to fetch tickets')
      setTickets([])
      setAnalytics(null)
      setPatterns([])
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (ticketData) => {
    const total = ticketData.length
    const completed = ticketData.filter(t => t.status === 'done').length
    const pending = ticketData.filter(t => t.status !== 'done').length
    const backlog = ticketData.filter(t => t.status === 'backlog').length
    const inProgress = ticketData.filter(t => t.status === 'in_progress').length
    const review = ticketData.filter(t => t.status === 'review').length
    const pendingClient = ticketData.filter(t => t.status === 'pending_client').length
    const pendingRequester = ticketData.filter(t => t.status === 'pending_requester').length
    const critical = ticketData.filter(t => t.priority === 'critical').length
    const high = ticketData.filter(t => t.priority === 'high').length
    const normal = ticketData.filter(t => t.priority === 'normal').length
    const support = ticketData.filter(t => t.type === 'support').length
    const features = ticketData.filter(t => t.type === 'feature').length

    const rcaPending = ticketData.filter(t => 
      t.status !== 'done' && 
      (t.rca_status === 'pending' || t.rca_status === 'in_progress')
    ).length
    
    const solutionPending = ticketData.filter(t => 
      t.status !== 'done' && 
      (t.solution_status === 'pending' || t.solution_status === 'in_progress')
    ).length
    
    const recurringTickets = ticketData.filter(t => 
      t.is_recurring === true
    ).length

    const rcaCompleted = ticketData.filter(t => 
      t.rca_status === 'completed' || t.rca_status === 'not_applicable'
    ).length

    const solutionCompleted = ticketData.filter(t => 
      t.solution_status === 'completed' || t.solution_status === 'not_applicable'
    ).length

    const now = new Date()
    const overdue = ticketData.filter(t => {
      const deadline = t.end_date || t.due_at
      return deadline && new Date(deadline) < now && t.status !== 'done'
    }).length

    const completedTickets = ticketData.filter(t => t.status === 'done' && t.completed_at && t.created_at)
    let avgResolutionHours = 0
    if (completedTickets.length > 0) {
      const totalHours = completedTickets.reduce((sum, t) => {
        const hours = (new Date(t.completed_at) - new Date(t.created_at)) / (1000 * 60 * 60)
        return sum + hours
      }, 0)
      avgResolutionHours = totalHours / completedTickets.length
    }

    setAnalytics({
      total,
      completed,
      pending,
      backlog,
      inProgress,
      review,
      pendingClient,
      pendingRequester,
      critical,
      high,
      normal,
      support,
      features,
      overdue,
      rcaPending,
      solutionPending,
      recurringTickets,
      rcaCompleted,
      solutionCompleted,
      avgResolutionHours: avgResolutionHours.toFixed(1),
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
    })
  }

  const calculatePatterns = (ticketData) => {
    const patternMap = {}

    ticketData.forEach(ticket => {
      const key = `${ticket.type}_${ticket.priority}`
      if (!patternMap[key]) {
        patternMap[key] = {
          type: ticket.type,
          priority: ticket.priority,
          count: 0,
          statuses: {},
          resolutionTimes: [],
          rcaStatuses: {},
          solutionStatuses: {},
          recurringCount: 0
        }
      }
      patternMap[key].count++
      
      if (!patternMap[key].statuses[ticket.status]) {
        patternMap[key].statuses[ticket.status] = 0
      }
      patternMap[key].statuses[ticket.status]++

      const rcaKey = ticket.rca_status || 'pending'
      if (!patternMap[key].rcaStatuses[rcaKey]) {
        patternMap[key].rcaStatuses[rcaKey] = 0
      }
      patternMap[key].rcaStatuses[rcaKey]++

      const solutionKey = ticket.solution_status || 'pending'
      if (!patternMap[key].solutionStatuses[solutionKey]) {
        patternMap[key].solutionStatuses[solutionKey] = 0
      }
      patternMap[key].solutionStatuses[solutionKey]++

      if (ticket.is_recurring) {
        patternMap[key].recurringCount++
      }

      if (ticket.status === 'done' && ticket.completed_at && ticket.created_at) {
        const hours = (new Date(ticket.completed_at) - new Date(ticket.created_at)) / (1000 * 60 * 60)
        patternMap[key].resolutionTimes.push(hours)
      }
    })

    const result = Object.values(patternMap).map(p => {
      const avgHours = p.resolutionTimes.length > 0
        ? p.resolutionTimes.reduce((a, b) => a + b, 0) / p.resolutionTimes.length
        : null
      return {
        ...p,
        avgResolutionHours: avgHours ? avgHours.toFixed(1) : 'N/A'
      }
    })

    setPatterns(result.sort((a, b) => b.count - a.count))
  }

  const findSimilarTickets = (ticket) => {
    const similar = tickets.filter(t =>
      t.id !== ticket.id &&
      (t.type === ticket.type ||
       t.priority === ticket.priority ||
       (t.title && ticket.title &&
        t.title.toLowerCase().includes(ticket.title.toLowerCase().substring(0, 30))))
    )
    setSelectedTicket(ticket)
    setSimilarTickets(similar.slice(0, 20))
    setShowSimilarModal(true)
  }

  const viewTicketDetail = (ticket) => {
    setSelectedTicketDetail(ticket)
    setShowTicketDetailModal(true)
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

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500">
            Only users from <strong>Dialdesk</strong>, <strong>Ispark</strong>, or <strong>HQ</strong> branches can access Client Analysis
          </p>
          <p className="text-sm text-gray-400 mt-2">Your branch: {user?.branch?.name || 'Not assigned'}</p>
        </div>
      </div>
    )
  }

  const filteredTickets = tickets.filter(ticket =>
    ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(ticket.id).includes(searchTerm)
  )

  return (
    <div className="w-full max-w-none space-y-4 animate-fade-in">
      <div className="page-header">
        <div className="page-header-content flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BuildingOfficeIcon className="h-5 w-5 text-yellow-400" />
            <div>
              <h1 className="page-header-title">Client Analysis</h1>
              <p className="page-header-subtitle">Client-wise ticket analysis and patterns</p>
            </div>
          </div>
          <Link to="/board" className="btn btn-secondary text-sm">
            ← Back to Board
          </Link>
        </div>
      </div>

      {/* Client Selector */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
            Select Client:
          </label>
          <select
            value={selectedClient?.company_id || ''}
            onChange={(e) => {
              const client = clients.find(c => String(c.company_id) === e.target.value)
              setSelectedClient(client)
            }}
            className="input flex-1 min-w-[200px] max-w-md"
          >
            {clients.length === 0 ? (
              <option value="">No clients available</option>
            ) : (
              clients.map((client) => (
                <option key={client.company_id} value={client.company_id}>
                  {client.company_name}
                </option>
              ))
            )}
          </select>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input w-40"
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>

          <button
            onClick={() => fetchClientTickets()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>

          {analytics && (
            <span className="text-sm text-gray-500 ml-auto">
              Total: <strong>{analytics.total}</strong> tickets
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : selectedClient && analytics ? (
        <>
          {/* Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="stat-card bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label">Total</p>
                <p className="stat-card-value">{analytics.total}</p>
              </div>
            </div>
            <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label">Completed</p>
                <p className="stat-card-value">{analytics.completed}</p>
              </div>
            </div>
            <div className="stat-card bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label">Pending</p>
                <p className="stat-card-value">{analytics.pending}</p>
              </div>
            </div>
            <div className="stat-card bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label">Overdue</p>
                <p className="stat-card-value">{analytics.overdue}</p>
              </div>
            </div>
            <div className="stat-card bg-gradient-to-br from-purple-500 to-violet-600 shadow-md shadow-purple-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label">Critical</p>
                <p className="stat-card-value">{analytics.critical}</p>
              </div>
            </div>
            <div className="stat-card bg-gradient-to-br from-cyan-500 to-sky-600 shadow-md shadow-cyan-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label">Completion</p>
                <p className="stat-card-value">{analytics.completionRate}%</p>
              </div>
            </div>
          </div>

          {/* RCA, Solution, Recurring Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="stat-card bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label flex items-center gap-1">
                  <DocumentMagnifyingGlassIcon className="h-3 w-3" />
                  RCA Pending
                </p>
                <p className="stat-card-value">{analytics.rcaPending}</p>
              </div>
            </div>
            <div className="stat-card bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label flex items-center gap-1">
                  <LightBulbIcon className="h-3 w-3" />
                  Solution Pending
                </p>
                <p className="stat-card-value">{analytics.solutionPending}</p>
              </div>
            </div>
            <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label flex items-center gap-1">
                  <RecurringIcon className="h-3 w-3" />
                  Recurring
                </p>
                <p className="stat-card-value">{analytics.recurringTickets}</p>
              </div>
            </div>
            <div className="stat-card bg-gradient-to-br from-green-500 to-green-700 shadow-md shadow-green-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label">RCA Done</p>
                <p className="stat-card-value">{analytics.rcaCompleted}</p>
              </div>
            </div>
            <div className="stat-card bg-gradient-to-br from-teal-500 to-cyan-600 shadow-md shadow-teal-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label">Solution Done</p>
                <p className="stat-card-value">{analytics.solutionCompleted}</p>
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card-flat flex items-center gap-3 border border-blue-200 bg-blue-50">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">In Progress</p>
                <p className="text-xl font-bold text-gray-900">{analytics.inProgress}</p>
              </div>
            </div>
            <div className="card-flat flex items-center gap-3 border border-yellow-200 bg-yellow-50">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Review</p>
                <p className="text-xl font-bold text-gray-900">{analytics.review}</p>
              </div>
            </div>
            <div className="card-flat flex items-center gap-3 border border-orange-200 bg-orange-50">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Pending Client</p>
                <p className="text-xl font-bold text-gray-900">{analytics.pendingClient}</p>
              </div>
            </div>
            <div className="card-flat flex items-center gap-3 border border-amber-200 bg-amber-50">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Pending Requester</p>
                <p className="text-xl font-bold text-gray-900">{analytics.pendingRequester}</p>
              </div>
            </div>
          </div>

          {/* Issue Patterns */}
          {patterns.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <ChartBarIcon className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Issue Patterns</h3>
                <span className="text-xs text-gray-500 ml-auto">
                  Patterns by type and priority
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {patterns.slice(0, 8).map((pattern, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {pattern.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(pattern.priority)}`}>
                        {pattern.priority}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {pattern.count}
                    </p>
                    <p className="text-xs text-gray-500">
                      Avg: {pattern.avgResolutionHours} hrs
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(pattern.statuses).slice(0, 3).map(([status, count]) => (
                        <span key={status} className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}: {count}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600">RCA:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(pattern.rcaStatuses).map(([status, count]) => (
                          <span key={status} className={`text-xs px-1.5 py-0.5 rounded ${getRCAStatusColor(status)}`}>
                            {getRCAStatusLabel(status)}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600">Solution:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(pattern.solutionStatuses).map(([status, count]) => (
                          <span key={status} className={`text-xs px-1.5 py-0.5 rounded ${getSolutionStatusColor(status)}`}>
                            {getSolutionStatusLabel(status)}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                    {pattern.recurringCount > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                          🔄 Recurring: {pattern.recurringCount}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tickets List */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TicketIcon className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Tickets ({filteredTickets.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 md:w-64"
                  />
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="p-1.5 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="text-center py-8">
                <TicketIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No tickets found for this client</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>RCA</th>
                      <th>Solution</th>
                      <th>Recurring</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="font-medium text-sm">#{ticket.id}</td>
                        <td className="max-w-[150px] truncate text-sm" title={ticket.title}>
                          {ticket.title}
                        </td>
                        <td>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full capitalize">
                            {ticket.type}
                          </span>
                        </td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                            {getStatusLabel(ticket.status)}
                          </span>
                        </td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRCAStatusColor(ticket.rca_status)}`}>
                            {getRCAStatusLabel(ticket.rca_status)}
                          </span>
                        </td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getSolutionStatusColor(ticket.solution_status)}`}>
                            {getSolutionStatusLabel(ticket.solution_status)}
                          </span>
                        </td>
                        <td>
                          {ticket.is_recurring ? (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                              🔄 Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="text-sm">{formatDate(ticket.created_at)}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => viewTicketDetail(ticket)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              title="View Details"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => findSimilarTickets(ticket)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              title="Find Similar"
                            >
                              🔍
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading clients...</p>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {showTicketDetailModal && selectedTicketDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <TicketIcon className="h-5 w-5 text-blue-600" />
                  Ticket #{selectedTicketDetail.id}
                </h2>
                <p className="text-sm text-gray-500">{selectedTicketDetail.title}</p>
              </div>
              <button
                onClick={() => setShowTicketDetailModal(false)}
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
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="text-sm font-medium capitalize">{selectedTicketDetail.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Priority</p>
                      <p className="text-sm font-medium capitalize">{selectedTicketDetail.priority}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedTicketDetail.status)}`}>
                        {getStatusLabel(selectedTicketDetail.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm">{formatDate(selectedTicketDetail.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 border border-amber-200 rounded-lg p-3 bg-amber-50">
                  <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                    <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                    RCA Details
                  </h3>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRCAStatusColor(selectedTicketDetail.rca_status)}`}>
                      {getRCAStatusLabel(selectedTicketDetail.rca_status)}
                    </span>
                  </div>
                  {selectedTicketDetail.rca_notes && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Notes</p>
                      <p className="text-sm bg-white p-2 rounded border border-amber-200 mt-1">
                        {selectedTicketDetail.rca_notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="col-span-1 border border-blue-200 rounded-lg p-3 bg-blue-50">
                  <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-2">
                    <LightBulbIcon className="h-4 w-4" />
                    Solution Details
                  </h3>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSolutionStatusColor(selectedTicketDetail.solution_status)}`}>
                      {getSolutionStatusLabel(selectedTicketDetail.solution_status)}
                    </span>
                  </div>
                  {selectedTicketDetail.solution_notes && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Notes</p>
                      <p className="text-sm bg-white p-2 rounded border border-blue-200 mt-1">
                        {selectedTicketDetail.solution_notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <RecurringIcon className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">
                      {selectedTicketDetail.is_recurring ? '🔄 This is a recurring ticket' : 'This is not a recurring ticket'}
                    </span>
                  </div>
                </div>

                {selectedTicketDetail.description && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                      {selectedTicketDetail.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Link
                to={`/items/${selectedTicketDetail.id}`}
                className="btn btn-primary text-sm"
                target="_blank"
              >
                View Full Ticket →
              </Link>
              <button
                onClick={() => setShowTicketDetailModal(false)}
                className="btn btn-secondary text-sm ml-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Similar Issues Modal */}
      {showSimilarModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Similar Issues
                </h2>
                <p className="text-sm text-gray-500">
                  Found {similarTickets.length} similar tickets
                </p>
              </div>
              <button
                onClick={() => setShowSimilarModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 border-b border-blue-200">
              <p className="text-sm font-medium text-blue-900">Selected Ticket:</p>
              <p className="text-sm text-blue-700">#{selectedTicket.id} - {selectedTicket.title}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedTicket.status)}`}>
                  {getStatusLabel(selectedTicket.status)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getPriorityColor(selectedTicket.priority)}`}>
                  {selectedTicket.priority}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRCAStatusColor(selectedTicket.rca_status)}`}>
                  RCA: {getRCAStatusLabel(selectedTicket.rca_status)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getSolutionStatusColor(selectedTicket.solution_status)}`}>
                  Solution: {getSolutionStatusLabel(selectedTicket.solution_status)}
                </span>
                {selectedTicket.is_recurring && (
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                    🔄 Recurring
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {similarTickets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No similar issues found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {similarTickets.map((ticket) => (
                    <div key={ticket.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">#{ticket.id}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                              {getStatusLabel(ticket.status)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRCAStatusColor(ticket.rca_status)}`}>
                              {getRCAStatusLabel(ticket.rca_status)}
                            </span>
                            {ticket.is_recurring && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                                🔄
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{ticket.title}</p>
                          <div className="flex gap-2 mt-1 text-xs text-gray-400">
                            <span>📅 {formatDate(ticket.created_at)}</span>
                            {ticket.completed_at && <span>✅ {formatDate(ticket.completed_at)}</span>}
                          </div>
                        </div>
                        <Link
                          to={`/items/${ticket.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 ml-4 whitespace-nowrap"
                          target="_blank"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowSimilarModal(false)}
                className="btn btn-secondary text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}