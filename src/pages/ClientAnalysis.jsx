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
  ArrowPathIcon as RecurringIcon,
  FunnelIcon,
  ArrowDownTrayIcon
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

  const [activeFilter, setActiveFilter] = useState(null)
  const [activePriorityTab, setActivePriorityTab] = useState('critical')
  const [sortBy, setSortBy] = useState('newest')
  const [prioritySubFilter, setPrioritySubFilter] = useState(null)

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
    const pending = ticketData.filter(t => t.status !== 'done' && t.status !== 'rejected').length
    const backlog = ticketData.filter(t => t.status === 'backlog').length
    const inProgress = ticketData.filter(t => t.status === 'in_progress').length
    const review = ticketData.filter(t => t.status === 'review').length
    const pendingClient = ticketData.filter(t => t.status === 'pending_client').length
    const pendingRequester = ticketData.filter(t => t.status === 'pending_requester').length
    const critical = ticketData.filter(t => t.priority === 'critical').length
    const high = ticketData.filter(t => t.priority === 'high').length
    const normal = ticketData.filter(t => t.priority === 'normal').length
    const low = ticketData.filter(t => t.priority === 'low').length

    const rcaPending = ticketData.filter(t =>
      t.status !== 'done' &&
      (t.rca_status === 'pending' || t.rca_status === 'in_progress')
    ).length

    const solutionPending = ticketData.filter(t =>
      t.status !== 'done' &&
      (t.solution_status === 'pending' || t.solution_status === 'in_progress')
    ).length

    const recurringTickets = ticketData.filter(t => t.is_recurring === true).length
    const rcaCompleted = ticketData.filter(t =>
      t.rca_status === 'completed' || t.rca_status === 'not_applicable'
    ).length
    const solutionCompleted = ticketData.filter(t =>
      t.solution_status === 'completed' || t.solution_status === 'not_applicable'
    ).length

    const now = new Date()
    const overdue = ticketData.filter(t => {
      const deadline = t.end_date || t.due_at
      return deadline && new Date(deadline) < now && t.status !== 'done' && t.status !== 'rejected'
    }).length

    const withClientExpected = ticketData.filter(t => t.client_expected_date).length
    const metClientExpected = ticketData.filter(t =>
      t.client_expected_date && t.completed_at &&
      new Date(t.completed_at) <= new Date(t.client_expected_date)
    ).length
    const missedClientExpected = ticketData.filter(t =>
      t.client_expected_date && t.completed_at &&
      new Date(t.completed_at) > new Date(t.client_expected_date)
    ).length
    const pastExpected = ticketData.filter(t =>
      t.client_expected_date && !t.completed_at &&
      new Date(t.client_expected_date) < now
    ).length

    const completedTickets = ticketData.filter(t => t.status === 'done' && t.completed_at && t.created_at)
    let avgResolutionHours = 0
    if (completedTickets.length > 0) {
      const validHours = completedTickets
        .map(t => (new Date(t.completed_at) - new Date(t.created_at)) / (1000 * 60 * 60))
        .filter(h => h >= 0)
      if (validHours.length > 0) {
        avgResolutionHours = validHours.reduce((a, b) => a + b, 0) / validHours.length
      }
    }

    const withLogged = ticketData.filter(t => (t.total_logged_hours || 0) > 0)
    let avgLoggedHours = 0
    let totalLoggedHours = 0
    if (withLogged.length > 0) {
      totalLoggedHours = withLogged.reduce((sum, t) => sum + (t.total_logged_hours || 0), 0)
      avgLoggedHours = totalLoggedHours / withLogged.length
    }

    setAnalytics({
      total, completed, pending, backlog, inProgress, review,
      pendingClient, pendingRequester, critical, high, normal, low,
      overdue, rcaPending, solutionPending, recurringTickets,
      rcaCompleted, solutionCompleted,
      withClientExpected, metClientExpected, missedClientExpected, pastExpected,
      avgResolutionHours: avgResolutionHours.toFixed(1),
      avgLoggedHours: avgLoggedHours.toFixed(2),
      totalLoggedHours: totalLoggedHours.toFixed(2),
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
    })
  }

  const calculatePatterns = (ticketData) => {
    const patternMap = {}
    ticketData.forEach(ticket => {
      const key = `${ticket.type}_${ticket.priority}`
      if (!patternMap[key]) {
        patternMap[key] = {
          type: ticket.type, priority: ticket.priority, count: 0,
          statuses: {}, resolutionTimes: [], rcaStatuses: {},
          solutionStatuses: {}, recurringCount: 0
        }
      }
      patternMap[key].count++
      patternMap[key].statuses[ticket.status] = (patternMap[key].statuses[ticket.status] || 0) + 1
      const rcaKey = ticket.rca_status || 'pending'
      patternMap[key].rcaStatuses[rcaKey] = (patternMap[key].rcaStatuses[rcaKey] || 0) + 1
      const solutionKey = ticket.solution_status || 'pending'
      patternMap[key].solutionStatuses[solutionKey] = (patternMap[key].solutionStatuses[solutionKey] || 0) + 1
      if (ticket.is_recurring) patternMap[key].recurringCount++
      if (ticket.status === 'done' && ticket.completed_at && ticket.created_at) {
        const hours = (new Date(ticket.completed_at) - new Date(ticket.created_at)) / (1000 * 60 * 60)
        if (hours >= 0) patternMap[key].resolutionTimes.push(hours)
      }
    })
    const result = Object.values(patternMap).map(p => {
      const avgHours = p.resolutionTimes.length > 0
        ? p.resolutionTimes.reduce((a, b) => a + b, 0) / p.resolutionTimes.length
        : null
      return { ...p, avgResolutionHours: avgHours ? avgHours.toFixed(1) : 'N/A' }
    })
    setPatterns(result.sort((a, b) => b.count - a.count))
  }

  const findSimilarTickets = (ticket) => {
    const similar = tickets.filter(t =>
      t.id !== ticket.id &&
      (t.type === ticket.type || t.priority === ticket.priority ||
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

  const handleStatClick = (filterType) => {
    if (activeFilter === filterType) {
      setActiveFilter(null)
    } else {
      setActiveFilter(filterType)
      setSearchTerm('')
    }
  }

  const handlePriorityBoxClick = (subFilter) => {
    if (prioritySubFilter === subFilter) {
      setPrioritySubFilter(null)
    } else {
      setPrioritySubFilter(subFilter)
    }
  }

  // ============================================================
  // ✅ NEW: EXPORT CSV FUNCTION
  // ============================================================
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const handleExportCSV = () => {
    if (!filteredTickets || filteredTickets.length === 0) {
      toast.error('No tickets to export')
      return
    }

    // Build export rows
    const headers = [
      'ID',
      'Title',
      'Type',
      'Priority',
      'Status',
      'Recurring',
      'RCA Status',
      'Solution Status',
      'Created Date',
      'Closed Date',
      'Closing Time (hrs)',
      'Client Expected Date',
      'vs Expected',
      'Reporter ID',
      'Assignee ID',
      'Description',
      'RCA Notes',
      'Solution Notes'
    ]

    const rows = filteredTickets.map(ticket => {
      const expectedStatus = getClientExpectedStatus(ticket)
      const closingHours = ticket.total_logged_hours || 0
      return [
        ticket.id,
        ticket.title || '',
        ticket.type || '',
        ticket.priority || '',
        ticket.status || '',
        ticket.is_recurring ? 'Yes' : 'No',
        ticket.rca_status || '',
        ticket.solution_status || '',
        ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '',
        ticket.completed_at ? new Date(ticket.completed_at).toLocaleString() : '',
        closingHours > 0 ? closingHours.toFixed(2) : '',
        ticket.client_expected_date ? new Date(ticket.client_expected_date).toLocaleDateString() : '',
        expectedStatus ? expectedStatus.label.replace(/[✅⚠️⏳]/g, '').trim() : '',
        ticket.reporter_id || '',
        ticket.assignee_id || '',
        ticket.description || '',
        ticket.rca_notes || '',
        ticket.solution_notes || ''
      ]
    })

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')

    // Add BOM for Excel UTF-8 support
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    const clientName = selectedClient?.company_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'client'
    const timestamp = new Date().toISOString().split('T')[0]
    const filterSuffix = activeFilter ? `_${activeFilter}` : ''
    const filename = `${clientName}${filterSuffix}_analysis_${timestamp}.csv`

    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`✅ Exported ${filteredTickets.length} tickets to CSV`)
  }

  // ============================================================
  // ✅ NEW: EXPORT SUMMARY (Analytics only)
  // ============================================================
  const handleExportSummary = () => {
    if (!analytics) {
      toast.error('No analytics data to export')
      return
    }

    const lines = []
    lines.push('CLIENT ANALYSIS SUMMARY')
    lines.push(`Client,${escapeCSV(selectedClient?.company_name || 'N/A')}`)
    lines.push(`Time Range,${escapeCSV(timeRange)}`)
    lines.push(`Generated,${escapeCSV(new Date().toLocaleString())}`)
    lines.push(`Exported By,${escapeCSV(user?.name || 'N/A')}`)
    lines.push('')

    lines.push('OVERVIEW')
    lines.push('Metric,Value')
    lines.push(`Total Tickets,${analytics.total}`)
    lines.push(`Completed,${analytics.completed}`)
    lines.push(`Pending,${analytics.pending}`)
    lines.push(`Overdue,${analytics.overdue}`)
    lines.push(`Completion Rate,${analytics.completionRate}%`)
    lines.push('')

    lines.push('PRIORITY BREAKDOWN')
    lines.push('Priority,Count')
    lines.push(`Critical,${analytics.critical}`)
    lines.push(`High,${analytics.high}`)
    lines.push(`Normal,${analytics.normal}`)
    lines.push(`Low,${analytics.low}`)
    lines.push('')

    lines.push('CLIENT EXPECTED DATE PERFORMANCE')
    lines.push('Metric,Value')
    lines.push(`With Expected Date,${analytics.withClientExpected}`)
    lines.push(`Met Expected,${analytics.metClientExpected}`)
    lines.push(`Missed Expected,${analytics.missedClientExpected}`)
    lines.push(`Past Expected (open),${analytics.pastExpected}`)
    const rate = analytics.withClientExpected > 0
      ? ((analytics.metClientExpected / analytics.withClientExpected) * 100).toFixed(0)
      : 0
    lines.push(`Success Rate,${rate}%`)
    lines.push('')

    lines.push('TIME METRICS')
    lines.push('Metric,Value')
    lines.push(`Avg Time to Close (hrs),${analytics.avgResolutionHours}`)
    lines.push(`Avg Closing Time (hrs),${analytics.avgLoggedHours}`)
    lines.push(`Total Closing Time (hrs),${analytics.totalLoggedHours}`)
    lines.push('')

    lines.push('RCA & SOLUTION')
    lines.push('Metric,Value')
    lines.push(`RCA Pending,${analytics.rcaPending}`)
    lines.push(`RCA Completed,${analytics.rcaCompleted}`)
    lines.push(`Solution Pending,${analytics.solutionPending}`)
    lines.push(`Solution Completed,${analytics.solutionCompleted}`)
    lines.push(`Recurring Tickets,${analytics.recurringTickets}`)

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const clientName = selectedClient?.company_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'client'
    const timestamp = new Date().toISOString().split('T')[0]
    link.href = url
    link.setAttribute('download', `${clientName}_summary_${timestamp}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('✅ Summary exported')
  }

  const getFilteredByStat = () => {
    if (!activeFilter) return tickets
    const now = new Date()
    switch (activeFilter) {
      case 'total': return tickets
      case 'completed': return tickets.filter(t => t.status === 'done')
      case 'pending': return tickets.filter(t => t.status !== 'done' && t.status !== 'rejected')
      case 'overdue':
        return tickets.filter(t => {
          const deadline = t.end_date || t.due_at
          return deadline && new Date(deadline) < now && t.status !== 'done' && t.status !== 'rejected'
        })
      case 'critical': return tickets.filter(t => t.priority === 'critical')
      case 'high': return tickets.filter(t => t.priority === 'high')
      case 'normal': return tickets.filter(t => t.priority === 'normal')
      case 'low': return tickets.filter(t => t.priority === 'low')
      case 'rcaPending':
        return tickets.filter(t => t.status !== 'done' && (t.rca_status === 'pending' || t.rca_status === 'in_progress'))
      case 'solutionPending':
        return tickets.filter(t => t.status !== 'done' && (t.solution_status === 'pending' || t.solution_status === 'in_progress'))
      case 'recurring': return tickets.filter(t => t.is_recurring === true)
      case 'rcaCompleted':
        return tickets.filter(t => t.rca_status === 'completed' || t.rca_status === 'not_applicable')
      case 'solutionCompleted':
        return tickets.filter(t => t.solution_status === 'completed' || t.solution_status === 'not_applicable')
      case 'inProgress': return tickets.filter(t => t.status === 'in_progress')
      case 'review': return tickets.filter(t => t.status === 'review')
      case 'pendingClient': return tickets.filter(t => t.status === 'pending_client')
      case 'pendingRequester': return tickets.filter(t => t.status === 'pending_requester')
      case 'backlog': return tickets.filter(t => t.status === 'backlog')
      case 'withExpected': return tickets.filter(t => t.client_expected_date)
      case 'metExpected':
        return tickets.filter(t => t.client_expected_date && t.completed_at &&
          new Date(t.completed_at) <= new Date(t.client_expected_date))
      case 'missedExpected':
        return tickets.filter(t => t.client_expected_date && t.completed_at &&
          new Date(t.completed_at) > new Date(t.client_expected_date))
      default: return tickets
    }
  }

  const applySort = (list) => {
    const sorted = [...list]
    switch (sortBy) {
      case 'newest': return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      case 'oldest': return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      case 'priority': {
        const order = { critical: 0, high: 1, normal: 2, low: 3 }
        return sorted.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9))
      }
      case 'expected':
        return sorted.sort((a, b) => {
          if (!a.client_expected_date && !b.client_expected_date) return 0
          if (!a.client_expected_date) return 1
          if (!b.client_expected_date) return -1
          return new Date(a.client_expected_date) - new Date(b.client_expected_date)
        })
      case 'closed':
        return sorted.sort((a, b) => {
          if (!a.completed_at && !b.completed_at) return 0
          if (!a.completed_at) return 1
          if (!b.completed_at) return -1
          return new Date(b.completed_at) - new Date(a.completed_at)
        })
      default: return sorted
    }
  }

  const getPriorityTickets = () => {
    let list = tickets.filter(t => t.priority === activePriorityTab)
    if (prioritySubFilter) {
      switch (prioritySubFilter) {
        case 'total': break
        case 'closed': list = list.filter(t => t.status === 'done'); break
        case 'open': list = list.filter(t => t.status !== 'done' && t.status !== 'rejected'); break
        case 'withExpected': list = list.filter(t => t.client_expected_date); break
        case 'metExpected':
          list = list.filter(t => t.client_expected_date && t.completed_at &&
            new Date(t.completed_at) <= new Date(t.client_expected_date))
          break
        case 'missedExpected':
          list = list.filter(t => t.client_expected_date && t.completed_at &&
            new Date(t.completed_at) > new Date(t.client_expected_date))
          break
        default: break
      }
    }
    return list
  }

  const getPriorityAnalysis = () => {
    const priorityTickets = tickets.filter(t => t.priority === activePriorityTab)
    const closedTickets = priorityTickets.filter(t => t.status === 'done' && t.completed_at && t.created_at)

    let avgCloseTimeHours = 0
    let avgCloseTimeDays = 0
    if (closedTickets.length > 0) {
      const validHours = closedTickets
        .map(t => (new Date(t.completed_at) - new Date(t.created_at)) / (1000 * 60 * 60))
        .filter(h => h >= 0)
      if (validHours.length > 0) {
        avgCloseTimeHours = validHours.reduce((a, b) => a + b, 0) / validHours.length
        avgCloseTimeDays = avgCloseTimeHours / 24
      }
    }

    const withLogged = priorityTickets.filter(t => (t.total_logged_hours || 0) > 0)
    let avgLoggedHours = 0
    let totalLoggedHours = 0
    if (withLogged.length > 0) {
      totalLoggedHours = withLogged.reduce((sum, t) => sum + (t.total_logged_hours || 0), 0)
      avgLoggedHours = totalLoggedHours / withLogged.length
    }

    const withExpected = priorityTickets.filter(t => t.client_expected_date).length
    const metExpected = priorityTickets.filter(t =>
      t.client_expected_date && t.completed_at &&
      new Date(t.completed_at) <= new Date(t.client_expected_date)
    ).length
    const missedExpected = priorityTickets.filter(t =>
      t.client_expected_date && t.completed_at &&
      new Date(t.completed_at) > new Date(t.client_expected_date)
    ).length

    return {
      total: priorityTickets.length,
      closed: closedTickets.length,
      open: priorityTickets.length - closedTickets.length,
      avgCloseTimeHours: avgCloseTimeHours.toFixed(1),
      avgCloseTimeDays: avgCloseTimeDays.toFixed(1),
      avgLoggedHours: avgLoggedHours.toFixed(2),
      totalLoggedHours: totalLoggedHours.toFixed(2),
      withExpected, metExpected, missedExpected,
      tickets: applySort(getPriorityTickets()),
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
      backlog: 'Backlog', in_progress: 'In Progress', review: 'Review',
      pending_client: 'Pending Client', pending_requester: 'Pending Requester',
      done: 'Completed', rejected: 'Rejected'
    }
    return labels[status] || status
  }

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800', low: 'bg-gray-100 text-gray-800'
    }
    return colors[priority] || colors.normal
  }

  const getRCAStatusLabel = (status) => {
    const labels = { pending: '⏳ Pending', in_progress: '🔄 In Progress', completed: '✅ Completed', not_applicable: '➖ N/A' }
    return labels[status] || status
  }

  const getRCAStatusColor = (status) => {
    const colors = { pending: 'bg-red-100 text-red-800', in_progress: 'bg-yellow-100 text-yellow-800', completed: 'bg-green-100 text-green-800', not_applicable: 'bg-gray-100 text-gray-800' }
    return colors[status] || colors.pending
  }

  const getSolutionStatusLabel = (status) => {
    const labels = { pending: '⏳ Pending', in_progress: '🔄 In Progress', completed: '✅ Completed', not_applicable: '➖ N/A' }
    return labels[status] || status
  }

  const getSolutionStatusColor = (status) => {
    const colors = { pending: 'bg-red-100 text-red-800', in_progress: 'bg-yellow-100 text-yellow-800', completed: 'bg-green-100 text-green-800', not_applicable: 'bg-gray-100 text-gray-800' }
    return colors[status] || colors.pending
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  const getClosingTime = (ticket) => {
    const hours = ticket?.total_logged_hours || 0
    if (hours <= 0) return null
    if (hours < 1) return `${Math.round(hours * 60)} min`
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`
    return `${h} hr${h > 1 ? 's' : ''} ${m} min`
  }

  const getClientExpectedStatus = (ticket) => {
    if (!ticket.client_expected_date) return null
    if (!ticket.completed_at) {
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

  const statFilteredTickets = getFilteredByStat()
  const filteredTickets = applySort(
    statFilteredTickets.filter(ticket =>
      ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(ticket.id).includes(searchTerm)
    )
  )

  const priorityAnalysis = getPriorityAnalysis()

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

      {/* Client Selector + Export Button */}
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
              setActiveFilter(null)
              setPrioritySubFilter(null)
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

          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="input w-40">
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

          {/* ✅ NEW: Export Buttons */}
          {analytics && filteredTickets.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleExportCSV}
                className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                title="Export current filtered tickets as CSV"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export Tickets ({filteredTickets.length})
              </button>
              <button
                onClick={handleExportSummary}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                title="Export summary analytics as CSV"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export Summary
              </button>
            </div>
          )}

          {analytics && (
            <span className="text-sm text-gray-500 ml-2">
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
          {/* Active Filter Banner */}
          {activeFilter && (
            <div className="card bg-indigo-50 border-2 border-indigo-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">
                  Filtering by: <strong className="capitalize">{activeFilter.replace(/([A-Z])/g, ' $1').trim()}</strong>
                  {' '}— {filteredTickets.length} ticket(s)
                  {' '}<span className="text-xs text-indigo-600">(Export will include these only)</span>
                </span>
              </div>
              <button
                onClick={() => setActiveFilter(null)}
                className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                ✕ Clear Filter
              </button>
            </div>
          )}

          {/* Client Expected Stats Banner */}
          <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📅</span>
              <h3 className="text-sm font-bold text-purple-900">Client Expected Date Performance</h3>
              <span className="text-xs text-purple-600 ml-auto">Click to filter</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={() => handleStatClick('withExpected')}
                className={`p-3 rounded-lg border bg-white text-left transition-all hover:scale-105 ${
                  activeFilter === 'withExpected' ? 'ring-4 ring-purple-300 border-purple-400' : 'border-purple-200'
                }`}
              >
                <p className="text-xs font-medium text-gray-600">With Expected Date</p>
                <p className="text-2xl font-bold text-purple-700">{analytics.withClientExpected}</p>
              </button>
              <button
                onClick={() => handleStatClick('metExpected')}
                className={`p-3 rounded-lg border bg-white text-left transition-all hover:scale-105 ${
                  activeFilter === 'metExpected' ? 'ring-4 ring-green-300 border-green-400' : 'border-green-200'
                }`}
              >
                <p className="text-xs font-medium text-gray-600">✅ Met Expected</p>
                <p className="text-2xl font-bold text-green-700">{analytics.metClientExpected}</p>
              </button>
              <button
                onClick={() => handleStatClick('missedExpected')}
                className={`p-3 rounded-lg border bg-white text-left transition-all hover:scale-105 ${
                  activeFilter === 'missedExpected' ? 'ring-4 ring-red-300 border-red-400' : 'border-red-200'
                }`}
              >
                <p className="text-xs font-medium text-gray-600">⚠️ Missed Expected</p>
                <p className="text-2xl font-bold text-red-700">{analytics.missedClientExpected}</p>
              </button>
              <div className="p-3 rounded-lg border bg-white border-indigo-200">
                <p className="text-xs font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {analytics.withClientExpected > 0
                    ? ((analytics.metClientExpected / analytics.withClientExpected) * 100).toFixed(0)
                    : 0}%
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-white border-blue-200">
                <p className="text-xs font-medium text-gray-600">🕐 Total Closing Time</p>
                <p className="text-2xl font-bold text-blue-700">
                  {analytics.totalLoggedHours > 0 ? `${analytics.totalLoggedHours} hrs` : '0'}
                </p>
              </div>
            </div>
            {analytics.pastExpected > 0 && (
              <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-xs font-semibold text-red-800">
                  ⚠️ {analytics.pastExpected} ticket(s) are past their client expected date but not yet closed!
                </p>
              </div>
            )}
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              onClick={() => handleStatClick('total')}
              className={`stat-card bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/25 text-left transition-all hover:scale-105 ${
                activeFilter === 'total' ? 'ring-4 ring-blue-300 scale-105' : ''
              }`}
            >
              <div className="stat-card-content">
                <p className="stat-card-label">Total</p>
                <p className="stat-card-value">{analytics.total}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('completed')}
              className={`stat-card bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 text-left transition-all hover:scale-105 ${
                activeFilter === 'completed' ? 'ring-4 ring-emerald-300 scale-105' : ''
              }`}
            >
              <div className="stat-card-content">
                <p className="stat-card-label">Completed</p>
                <p className="stat-card-value">{analytics.completed}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('pending')}
              className={`stat-card bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/25 text-left transition-all hover:scale-105 ${
                activeFilter === 'pending' ? 'ring-4 ring-amber-300 scale-105' : ''
              }`}
            >
              <div className="stat-card-content">
                <p className="stat-card-label">Pending</p>
                <p className="stat-card-value">{analytics.pending}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('overdue')}
              className={`stat-card bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/25 text-left transition-all hover:scale-105 ${
                activeFilter === 'overdue' ? 'ring-4 ring-red-300 scale-105' : ''
              }`}
            >
              <div className="stat-card-content">
                <p className="stat-card-label">Overdue</p>
                <p className="stat-card-value">{analytics.overdue}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('critical')}
              className={`stat-card bg-gradient-to-br from-purple-500 to-violet-600 shadow-md shadow-purple-500/25 text-left transition-all hover:scale-105 ${
                activeFilter === 'critical' ? 'ring-4 ring-purple-300 scale-105' : ''
              }`}
            >
              <div className="stat-card-content">
                <p className="stat-card-label">Critical</p>
                <p className="stat-card-value">{analytics.critical}</p>
              </div>
            </button>
            <div className="stat-card bg-gradient-to-br from-cyan-500 to-sky-600 shadow-md shadow-cyan-500/25">
              <div className="stat-card-content">
                <p className="stat-card-label">Completion</p>
                <p className="stat-card-value">{analytics.completionRate}%</p>
              </div>
            </div>
          </div>

          {/* RCA, Solution, Recurring Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              onClick={() => handleStatClick('rcaPending')}
              className={`stat-card bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/25 text-left transition-all hover:scale-105 ${
                activeFilter === 'rcaPending' ? 'ring-4 ring-amber-300 scale-105' : ''
              }`}
            >
              <div className="stat-card-content">
                <p className="stat-card-label flex items-center gap-1">
                  <DocumentMagnifyingGlassIcon className="h-3 w-3" />
                  RCA Pending
                </p>
                <p className="stat-card-value">{analytics.rcaPending}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('solutionPending')}
              className={`stat-card bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/25 text-left transition-all hover:scale-105 ${
                activeFilter === 'solutionPending' ? 'ring-4 ring-blue-300 scale-105' : ''
              }`}
            >
              <div className="stat-card-content">
                <p className="stat-card-label flex items-center gap-1">
                  <LightBulbIcon className="h-3 w-3" />
                  Solution Pending
                </p>
                <p className="stat-card-value">{analytics.solutionPending}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('recurring')}
              className={`stat-card bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 text-left transition-all hover:scale-105 ${
                activeFilter === 'recurring' ? 'ring-4 ring-emerald-300 scale-105' : ''
              }`}
            >
              <div className="stat-card-content">
                <p className="stat-card-label flex items-center gap-1">
                  <RecurringIcon className="h-3 w-3" />
                  Recurring
                </p>
                <p className="stat-card-value">{analytics.recurringTickets}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('rcaCompleted')}
              className={`stat-card bg-gradient-to-br from-green-500 to-green-700 shadow-md shadow-green-500/25 text-left transition-all hover:scale-105 ${
                activeFilter === 'rcaCompleted' ? 'ring-4 ring-green-300 scale-105' : ''
              }`}
            >
              <div className="stat-card-content">
                <p className="stat-card-label">RCA Done</p>
                <p className="stat-card-value">{analytics.rcaCompleted}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('solutionCompleted')}
              className={`stat-card bg-gradient-to-br from-teal-500 to-cyan-600 shadow-md shadow-teal-500/25 text-left transition-all hover:scale-105 ${
                activeFilter === 'solutionCompleted' ? 'ring-4 ring-teal-300 scale-105' : ''
              }`}
            >
              <div className="stat-card-content">
                <p className="stat-card-label">Solution Done</p>
                <p className="stat-card-value">{analytics.solutionCompleted}</p>
              </div>
            </button>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => handleStatClick('inProgress')}
              className={`card-flat flex items-center gap-3 border border-blue-200 bg-blue-50 text-left transition-all hover:scale-105 ${
                activeFilter === 'inProgress' ? 'ring-4 ring-blue-300' : ''
              }`}
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">In Progress</p>
                <p className="text-xl font-bold text-gray-900">{analytics.inProgress}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('review')}
              className={`card-flat flex items-center gap-3 border border-yellow-200 bg-yellow-50 text-left transition-all hover:scale-105 ${
                activeFilter === 'review' ? 'ring-4 ring-yellow-300' : ''
              }`}
            >
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Review</p>
                <p className="text-xl font-bold text-gray-900">{analytics.review}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('pendingClient')}
              className={`card-flat flex items-center gap-3 border border-orange-200 bg-orange-50 text-left transition-all hover:scale-105 ${
                activeFilter === 'pendingClient' ? 'ring-4 ring-orange-300' : ''
              }`}
            >
              <div className="p-2 bg-orange-100 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Pending Client</p>
                <p className="text-xl font-bold text-gray-900">{analytics.pendingClient}</p>
              </div>
            </button>
            <button
              onClick={() => handleStatClick('pendingRequester')}
              className={`card-flat flex items-center gap-3 border border-amber-200 bg-amber-50 text-left transition-all hover:scale-105 ${
                activeFilter === 'pendingRequester' ? 'ring-4 ring-amber-300' : ''
              }`}
            >
              <div className="p-2 bg-amber-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Pending Requester</p>
                <p className="text-xl font-bold text-gray-900">{analytics.pendingRequester}</p>
              </div>
            </button>
          </div>

          {/* PRIORITY ANALYSIS SECTION */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <ChartBarIcon className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Priority Analysis</h3>
              <span className="text-xs text-gray-500 ml-auto">
                Click a tab or a box to filter tickets
              </span>
            </div>

            {/* Priority Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {['critical', 'high', 'normal', 'low'].map((priority) => {
                const count = tickets.filter(t => t.priority === priority).length
                const tabColors = {
                  critical: 'bg-red-600 text-white',
                  high: 'bg-orange-600 text-white',
                  normal: 'bg-blue-600 text-white',
                  low: 'bg-gray-600 text-white'
                }
                const inactiveColors = {
                  critical: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
                  high: 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100',
                  normal: 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100',
                  low: 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }
                return (
                  <button
                    key={priority}
                    onClick={() => {
                      setActivePriorityTab(priority)
                      setPrioritySubFilter(null)
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                      activePriorityTab === priority ? tabColors[priority] : inactiveColors[priority]
                    }`}
                  >
                    {priority === 'critical' ? '🔴' : priority === 'high' ? '🟠' : priority === 'normal' ? '🔵' : '⚪'}{' '}
                    {priority} ({count})
                  </button>
                )
              })}
            </div>

            {/* Priority Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
              <button
                onClick={() => handlePriorityBoxClick('total')}
                className={`p-3 rounded-lg border bg-gray-50 text-left transition-all hover:scale-105 ${
                  prioritySubFilter === 'total' ? 'ring-4 ring-gray-300 border-gray-400' : 'border-gray-300'
                }`}
              >
                <p className="text-xs font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{priorityAnalysis.total}</p>
              </button>
              <button
                onClick={() => handlePriorityBoxClick('closed')}
                className={`p-3 rounded-lg border bg-green-50 text-left transition-all hover:scale-105 ${
                  prioritySubFilter === 'closed' ? 'ring-4 ring-green-300 border-green-400' : 'border-green-300'
                }`}
              >
                <p className="text-xs font-medium text-gray-600">Closed</p>
                <p className="text-2xl font-bold text-green-700">{priorityAnalysis.closed}</p>
              </button>
              <button
                onClick={() => handlePriorityBoxClick('open')}
                className={`p-3 rounded-lg border bg-amber-50 text-left transition-all hover:scale-105 ${
                  prioritySubFilter === 'open' ? 'ring-4 ring-amber-300 border-amber-400' : 'border-amber-300'
                }`}
              >
                <p className="text-xs font-medium text-gray-600">Open</p>
                <p className="text-2xl font-bold text-amber-700">{priorityAnalysis.open}</p>
              </button>
              <div className="p-3 rounded-lg border bg-blue-50 border-blue-300">
                <p className="text-xs font-medium text-gray-600">Avg Closing Time</p>
                <p className="text-lg font-bold text-blue-700">
                  {priorityAnalysis.avgLoggedHours > 0 ? `${priorityAnalysis.avgLoggedHours} hrs` : 'N/A'}
                </p>
                <p className="text-xs text-blue-500">Total: {priorityAnalysis.totalLoggedHours} hrs</p>
              </div>
              <button
                onClick={() => handlePriorityBoxClick('withExpected')}
                className={`p-3 rounded-lg border bg-purple-50 text-left transition-all hover:scale-105 ${
                  prioritySubFilter === 'withExpected' ? 'ring-4 ring-purple-300 border-purple-400' : 'border-purple-300'
                }`}
              >
                <p className="text-xs font-medium text-gray-600">With Expected</p>
                <p className="text-2xl font-bold text-purple-700">{priorityAnalysis.withExpected}</p>
              </button>
              <button
                onClick={() => handlePriorityBoxClick('metExpected')}
                className={`p-3 rounded-lg border bg-green-50 text-left transition-all hover:scale-105 ${
                  prioritySubFilter === 'metExpected' ? 'ring-4 ring-green-300 border-green-400' : 'border-green-300'
                }`}
              >
                <p className="text-xs font-medium text-gray-600">✅ Met</p>
                <p className="text-2xl font-bold text-green-700">{priorityAnalysis.metExpected}</p>
              </button>
            </div>

            {/* Priority Filter Active Banner */}
            {prioritySubFilter && (
              <div className="mb-3 p-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <span className="text-xs text-indigo-800">
                  Showing <strong>{priorityAnalysis.tickets.length}</strong> {prioritySubFilter.replace(/([A-Z])/g, ' $1').trim()} tickets
                </span>
                <button
                  onClick={() => setPrioritySubFilter(null)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  ✕ Clear
                </button>
              </div>
            )}

            {/* Priority Tickets Table */}
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Closed</th>
                    <th>Closing Time</th>
                    <th>Client Expected</th>
                    <th>vs Expected</th>
                    <th>RCA</th>
                    <th>Solution</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityAnalysis.tickets.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center py-6 text-gray-500">
                        No {activePriorityTab} priority tickets found
                      </td>
                    </tr>
                  ) : (
                    priorityAnalysis.tickets.map((ticket) => {
                      const expectedStatus = getClientExpectedStatus(ticket)
                      const closingTime = getClosingTime(ticket)
                      return (
                        <tr key={ticket.id} className="hover:bg-gray-50">
                          <td className="font-medium text-sm">#{ticket.id}</td>
                          <td className="max-w-[180px] truncate text-sm" title={ticket.title}>
                            {ticket.title}
                          </td>
                          <td>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                              {getStatusLabel(ticket.status)}
                            </span>
                          </td>
                          <td className="text-xs">{formatDate(ticket.created_at)}</td>
                          <td className="text-xs">
                            {ticket.completed_at ? (
                              <span className="text-green-700 font-medium">{formatDate(ticket.completed_at)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="text-xs">
                            {closingTime ? (
                              <span className="font-bold text-blue-700 whitespace-nowrap bg-blue-50 px-2 py-0.5 rounded">
                                ⏱️ {closingTime}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="text-xs">
                            {ticket.client_expected_date ? (
                              <span className="font-bold text-purple-700 whitespace-nowrap bg-purple-50 px-2 py-0.5 rounded">
                                📅 {formatDate(ticket.client_expected_date)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="text-xs">
                            {expectedStatus ? (
                              <span className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${expectedStatus.color}`}>
                                {expectedStatus.label}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
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
                            <button
                              onClick={() => viewTicketDetail(ticket)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              title="View Details"
                            >
                              👁️
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Issue Patterns */}
          {patterns.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <ChartBarIcon className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Issue Patterns</h3>
                <span className="text-xs text-gray-500 ml-auto">Patterns by type and priority</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {patterns.slice(0, 8).map((pattern, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">{pattern.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(pattern.priority)}`}>
                        {pattern.priority}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{pattern.count}</p>
                    <p className="text-xs text-gray-500">Avg: {pattern.avgResolutionHours} hrs</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(pattern.statuses).slice(0, 3).map(([status, count]) => (
                        <span key={status} className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tickets List */}
          <div className="card">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TicketIcon className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Tickets ({filteredTickets.length})
                  {activeFilter && <span className="ml-2 text-xs font-normal text-indigo-600">(filtered)</span>}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                  <FunnelIcon className="h-3.5 w-3.5 text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs bg-transparent border-none outline-none text-gray-700 font-medium cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="priority">By Priority</option>
                    <option value="expected">By Client Expected</option>
                    <option value="closed">Recently Closed</option>
                  </select>
                </div>
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
                  <button onClick={() => setSearchTerm('')} className="p-1.5 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={handleExportCSV}
                  className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Export current tickets as CSV"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="text-center py-8">
                <TicketIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">
                  {activeFilter ? 'No tickets match this filter' : 'No tickets found for this client'}
                </p>
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
                      <th>Closed</th>
                      <th>Closing Time</th>
                      <th>Client Expected</th>
                      <th>vs Expected</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket) => {
                      const expectedStatus = getClientExpectedStatus(ticket)
                      const closingTime = getClosingTime(ticket)
                      return (
                        <tr key={ticket.id} className="hover:bg-gray-50">
                          <td className="font-medium text-sm">#{ticket.id}</td>
                          <td className="max-w-[150px] truncate text-sm" title={ticket.title}>
                            {ticket.title}
                          </td>
                          <td>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full capitalize">{ticket.type}</span>
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
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">🔄 Yes</span>
                            ) : (
                              <span className="text-xs text-gray-400">No</span>
                            )}
                          </td>
                          <td className="text-sm">{formatDate(ticket.created_at)}</td>
                          <td className="text-sm">
                            {ticket.completed_at ? (
                              <span className="text-green-700 font-medium">{formatDate(ticket.completed_at)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="text-xs">
                            {closingTime ? (
                              <span className="font-bold text-blue-700 whitespace-nowrap bg-blue-50 px-2 py-0.5 rounded">
                                ⏱️ {closingTime}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="text-xs">
                            {ticket.client_expected_date ? (
                              <span className="font-bold text-purple-700 whitespace-nowrap bg-purple-50 px-2 py-0.5 rounded">
                                📅 {formatDate(ticket.client_expected_date)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="text-xs">
                            {expectedStatus ? (
                              <span className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${expectedStatus.color}`}>
                                {expectedStatus.label}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
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
                      )
                    })}
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
                      <p className="text-sm">{formatDateTime(selectedTicketDetail.created_at)}</p>
                    </div>
                    {selectedTicketDetail.completed_at && (
                      <div>
                        <p className="text-xs text-gray-500">Closed On</p>
                        <p className="text-sm font-medium text-green-700">{formatDateTime(selectedTicketDetail.completed_at)}</p>
                      </div>
                    )}
                    {selectedTicketDetail.total_logged_hours > 0 && (
                      <div>
                        <p className="text-xs text-gray-500">Closing Time</p>
                        <p className="text-sm font-bold text-blue-700">⏱️ {getClosingTime(selectedTicketDetail)}</p>
                      </div>
                    )}
                    {selectedTicketDetail.client_expected_date && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Client Expected Date</p>
                          <p className="text-sm font-bold text-purple-700">
                            📅 {formatDateTime(selectedTicketDetail.client_expected_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">vs Client Expected</p>
                          {(() => {
                            const status = getClientExpectedStatus(selectedTicketDetail)
                            return status ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            ) : null
                          })()}
                        </div>
                      </>
                    )}
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
                      <p className="text-sm bg-white p-2 rounded border border-amber-200 mt-1 max-h-32 overflow-y-auto">
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
                      <p className="text-sm bg-white p-2 rounded border border-blue-200 mt-1 max-h-32 overflow-y-auto">
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
                    <p className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
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
                            {ticket.is_recurring && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">🔄</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{ticket.title}</p>
                          <div className="flex gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                            <span>📅 {formatDate(ticket.created_at)}</span>
                            {ticket.completed_at && <span>✅ {formatDate(ticket.completed_at)}</span>}
                            {ticket.client_expected_date && (
                              <span className="text-purple-600 font-medium">
                                🎯 Expected: {formatDate(ticket.client_expected_date)}
                              </span>
                            )}
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