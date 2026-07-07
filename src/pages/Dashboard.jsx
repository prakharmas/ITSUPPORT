import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  PlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  TicketIcon,
  UserIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { user } = useAuth()
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [allItems, setAllItems] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [stats, setStats] = useState({
    totalItems: 0,
    myItems: 0,
    pendingItems: 0,
    pendingByClient: 0,
    pendingByRequester: 0,
    overdueItems: 0,
    totalDone: 0,
    withinTatPending: 0,
    openTickets: 0,
    last3DaysItems: 0,
    doneLast3Days: 0
  })
  const [recentItems, setRecentItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailModal, setDetailModal] = useState({
    open: false,
    title: '',
    items: []
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [user?.role, selectedBranch, fromDate, toDate])

  useEffect(() => {
    fetchBranches()
    fetchUsers()
  }, [user?.role])

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches')
      setBranches(response.data)
    } catch (error) {
      console.error('Failed to fetch branches:', error)
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

  const fetchDashboardData = async () => {
    try {
      const params = new URLSearchParams()
      params.append('limit', '10000')

      if (user?.role === 'dev') {
        params.append('assignee_id', 'me')
      }

      // PM can filter dashboard by branch. Empty selection means all tickets.
      if (user?.role === 'pm' && selectedBranch) {
        params.append('branch_id', selectedBranch)
      }

      if (fromDate) {
        params.append('from_date', fromDate)
      }

      if (toDate) {
        params.append('to_date', toDate)
      }

      const itemsResponse = await api.get(`/items?${params.toString()}`)
      
      const items = [...itemsResponse.data].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )
      setAllItems(items)
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000))
      
      const myItems = user?.role === 'requester' 
        ? items.filter(item => item.status === 'in_progress' || item.status === 'review')
        : items.filter(item => item.assignee_id === user?.id)
      const pendingItems = items.filter(item => item.status !== 'done')
      const pendingByClient = items.filter(item => item.status === 'pending_client')
      const openTickets = items.filter(
        item => item.status === 'backlog'
      )

      const withinTatPending = items.filter(item => {
        const deadline = item.end_date || item.due_at

        return (
          item.status !== 'done' &&
          deadline &&
          new Date(deadline) >= now
        )
      })
      const pendingByRequester = items.filter(item => item.status === 'pending_requester')
      const overdueItems = items.filter(item => {
        const deadline = item.end_date || item.due_at
        return deadline && new Date(deadline) < now && item.status !== 'done'
      })
      const totalDone = items.filter(item => item.status === 'done')
      const last3DaysItems = items.filter(item => 
        new Date(item.created_at) >= threeDaysAgo
      )
      const doneLast3Days = items.filter(item => 
        item.status === 'done' && item.completed_at && new Date(item.completed_at) >= threeDaysAgo
      )

      setStats({
        totalItems: items.length,
        myItems: myItems.length,
        pendingItems: pendingItems.length,
        pendingByClient: pendingByClient.length,
        pendingByRequester: pendingByRequester.length,
        overdueItems: overdueItems.length,
        withinTatPending: withinTatPending.length,
        openTickets: openTickets.length,
        totalDone: totalDone.length,
        last3DaysItems: last3DaysItems.length,
        doneLast3Days: doneLast3Days.length
      })

      let displayItems
      if (user?.role === 'pm') {
        displayItems = items.slice(0, 5)
      } else if (user?.role === 'requester') {
        displayItems = items.slice(0, 5)
      } else {
        displayItems = myItems.slice(0, 5)
      }
      setRecentItems(displayItems)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusStyle = (status) => {
    const styles = {
      backlog: 'bg-slate-100 text-slate-700 border-slate-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      review: 'bg-amber-100 text-amber-700 border-amber-200',
      pending_client: 'bg-orange-100 text-orange-700 border-orange-200',
      pending_requester: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      done: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    }
    return styles[status] || styles.backlog
  }

  const getPriorityStyle = (priority) => {
    const styles = {
      critical: 'text-red-600 bg-red-50',
      high: 'text-orange-600 bg-orange-50',
      normal: 'text-blue-600 bg-blue-50',
      low: 'text-slate-600 bg-slate-50'
    }
    return styles[priority] || styles.normal
  }

  const formatDate = (dateValue) => {
    if (!dateValue) return '-'
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return '-'
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}.${month}.${year}`
  }

  const getStatusLabel = (status) => {
    const labels = {
      backlog: 'Backlog',
      in_progress: 'In Progress',
      review: 'Review',
      pending_client: 'Pending by Client',
      pending_requester: 'Pending by Requester',
      done: 'Closed'
    }
    return labels[status] || status
  }

  const getPendingBy = (status) => {
    if (status === 'pending_client') return 'Client'
    if (status === 'pending_requester') return 'Requester'
    return '-'
  }

  const getBranchName = (branchId) => {
    if (!branchId) return '-'
    const branch = branches.find((b) => b.id === branchId)
    return branch?.name || `Branch ${branchId}`
  }

  const getAssigneeName = (assigneeId) => {
    if (!assigneeId) return '-'
    const assignee = users.find((u) => u.id === assigneeId)
    return assignee?.name || `User ${assigneeId}`
  }

  const getReporterName = (reporterId) => {
    if (!reporterId) return '-'
    const reporter = users.find((u) => u.id === reporterId)
    return reporter?.name || `User ${reporterId}`
  }

  const exportModalTickets = () => {
    if (!detailModal.items.length) return

    const headers = [
      'S.No',
      'Client',
      'Topic',
      'Ticket Number',
      'Ticket Create Date',
      'Ticket Created By',
      'Ticket Assigned To',
      'Pending By',
      'Target Date',
      'Status',
      'Remarks'
    ]

    const rows = detailModal.items.map((item, index) => [
      index + 1,
      getBranchName(item.branch_id),
      item.title || '',
      `#${item.id}`,
      formatDate(item.created_at),
      getReporterName(item.reporter_id),
      getAssigneeName(item.assignee_id),
      getPendingBy(item.status),
      formatDate(item.end_date || item.due_at),
      getStatusLabel(item.status),
      item.description || '-'
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const dateStr = new Date().toISOString().split('T')[0]
    const fileName = `${detailModal.title.toLowerCase().replace(/\s+/g, '_')}_tickets_${dateStr}.csv`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const openDetailModal = (cardKey, cardLabel) => {
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000))

    let filteredItems = allItems

    if (cardKey === 'myItems') {
      filteredItems = user?.role === 'requester'
        ? allItems.filter((item) => item.status === 'in_progress' || item.status === 'review')
        : allItems.filter((item) => item.assignee_id === user?.id)
    } else if (cardKey === 'overdueItems') {
      filteredItems = allItems.filter((item) => {
        const deadline = item.end_date || item.due_at
        return deadline && new Date(deadline) < now && item.status !== 'done'
      })
    } else if (cardKey === 'pendingItems') {
      filteredItems = allItems.filter((item) => item.status !== 'done')
    } else if (cardKey === 'pendingByClient') {
      filteredItems = allItems.filter((item) => item.status === 'pending_client')
    } else if (cardKey === 'pendingByRequester') {
      filteredItems = allItems.filter((item) => item.status === 'pending_requester')
    } else if (cardKey === 'withinTatPending') {
      filteredItems = allItems.filter(item => {
        const deadline = item.end_date || item.due_at

        return (
          item.status !== 'done' &&
          deadline &&
          new Date(deadline) >= now
        )
      })
    }

    else if (cardKey === 'openTickets') {
      filteredItems = allItems.filter(
        item => item.status === 'backlog'
      )
    } else if (cardKey === 'totalDone') {
      filteredItems = allItems.filter((item) => item.status === 'done')
    } else if (cardKey === 'last3DaysItems') {
      filteredItems = allItems.filter((item) => new Date(item.created_at) >= threeDaysAgo)
    } else if (cardKey === 'doneLast3Days') {
      filteredItems = allItems.filter(
        (item) => item.status === 'done' && item.completed_at && new Date(item.completed_at) >= threeDaysAgo
      )
    }

    setSearchTerm('')
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()

      filteredItems = filteredItems.filter(
        (item) =>
          item.title?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          String(item.id).includes(search)
      )
    }

    setDetailModal({
      open: true,
      title: cardLabel,
      items: filteredItems
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="spinner h-12 w-12"></div>
          <SparklesIcon className="h-5 w-5 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    )
  }

  const mainStats = [
    {
      key: 'totalItems',
      label: user?.role === 'pm' ? 'All Tickets' : user?.role === 'requester' ? 'My Tickets' : 'Total Items',
      value: stats.totalItems,
      icon: TicketIcon,
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/25'
    },
    {
      key: 'myItems',
      label: user?.role === 'pm' ? 'Assigned to Me' : user?.role === 'requester' ? 'In Progress' : 'My Items',
      value: stats.myItems,
      icon: UserIcon,
      gradient: 'bg-gradient-to-br from-violet-500 to-purple-600',
      shadow: 'shadow-violet-500/25'
    },
    {
      key: 'overdueItems',
      label: 'Overdue',
      value: stats.overdueItems,
      icon: ExclamationTriangleIcon,
      gradient: 'bg-gradient-to-br from-rose-500 to-red-600',
      shadow: 'shadow-rose-500/25'
    },
    {
      key: 'pendingItems',
      label: 'Pending Tickets',
      value: stats.pendingItems,
      icon: ClockIcon,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/25'
    },
    {
      key: 'totalDone',
      label: 'Completed',
      value: stats.totalDone,
      icon: CheckCircleIcon,
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/25'
    },
    {
      key: 'withinTatPending',
      label: 'Within TAT',
      value: stats.withinTatPending,
      icon: ClockIcon,
      gradient: 'bg-gradient-to-br from-green-500 to-green-700'
    },
    {
      key: 'openTickets',
      label: 'Open Tickets',
      value: stats.openTickets,
      icon: TicketIcon,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-700'
    }
  ]

  const secondaryStats = [
    {
      key: 'last3DaysItems',
      label: 'Last 3 Days',
      value: stats.last3DaysItems,
      icon: CalendarDaysIcon,
      description: 'New tickets',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200'
    },
    {
      key: 'doneLast3Days',
      label: 'Done (3 Days)',
      value: stats.doneLast3Days,
      icon: ArrowTrendingUpIcon,
      description: 'Completed',
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200'
    },
    {
      key: 'pendingByClient',
      label: 'Pending by Client',
      value: stats.pendingByClient,
      icon: ClockIcon,
      description: 'Waiting',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200'
    },
    {
      key: 'pendingByRequester',
      label: 'Pending by Requester',
      value: stats.pendingByRequester,
      icon: UserIcon,
      description: 'Waiting',
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200'
    }
  ]

  const filteredModalItems = detailModal.items.filter((item) => {
    const search = searchTerm.toLowerCase()

    return (
      item.title?.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search) ||
      String(item.id).includes(search) ||
      getBranchName(item.branch_id).toLowerCase().includes(search) ||
      getAssigneeName(item.assignee_id).toLowerCase().includes(search) ||
      getReporterName(item.reporter_id).toLowerCase().includes(search) ||
      getStatusLabel(item.status).toLowerCase().includes(search)
    )
  })

  const searchSource =
    searchTerm.trim()
      ? allItems
      : recentItems

  const filteredRecentItems = searchSource.filter(
    (item) =>
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.id).includes(searchTerm)
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Welcome Header */}
      <div className="page-header">
        <div className="page-header-content flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-5 w-5 text-yellow-400" />
            <div>
              <h1 className="page-header-title">Welcome, {user?.name}!</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="page-header-subtitle">Workspace overview</span>
                {user?.role !== 'pm' && user?.branch && (
                  <span className="px-2 py-0.5 bg-white/10 text-white text-xs rounded">
                    {user.branch.name}
                  </span>
                )}
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
              className="h-9 w-64 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
  type="date"
  value={fromDate}
  onChange={(e) => setFromDate(e.target.value)}
  className="h-9 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
/>

<input
  type="date"
  value={toDate}
  onChange={(e) => setToDate(e.target.value)}
  className="h-9 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
/>
            {user?.role === 'pm' && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-9 min-w-[180px] rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="" className="text-slate-900">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id} className="text-slate-900">
                    {branch.name}
                  </option>
                ))}
              </select>
            )}
            <Link to="/create" className="btn btn-primary">
              <PlusIcon className="h-4 w-4" />
              New Ticket
            </Link>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {mainStats.map((stat, index) => (
          <button
            key={index}
            type="button"
            onClick={() => openDetailModal(stat.key, stat.label)}
            className={`stat-card ${stat.gradient} shadow-md ${stat.shadow} text-left`}
          >
            <div className="stat-card-content flex items-center justify-between">
              <div>
                <p className="stat-card-label">{stat.label}</p>
                <p className="stat-card-value">{stat.value}</p>
              </div>
              <div className="stat-card-icon">
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {secondaryStats.map((stat, index) => (
          <button
            key={index}
            type="button"
            onClick={() => openDetailModal(stat.key, stat.label)}
            className={`card-flat flex items-center gap-3 border ${stat.border} ${stat.bg} text-left`}
          >
            <div className={`p-2 rounded-lg ${stat.bg} border ${stat.border}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-600">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                <span className="text-xs text-slate-500">{stat.description}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Items */}
      <div className="card">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <ClockIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="section-title">
                {user?.role === 'pm' ? 'Recent Tickets' : user?.role === 'requester' ? 'My Recent Tickets' : 'Recent Items'}
              </h2>
            </div>
          </div>
          <Link to="/board" className="btn-ghost text-xs">
            View all <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>
        
        {recentItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <TicketIcon className="h-6 w-6 text-slate-400" />
            </div>
            <p className="empty-state-title">No tickets yet</p>
            <p className="empty-state-description">Create your first ticket to get started</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredRecentItems.map((item) => (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                className="list-item-bordered group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                    #{item.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-slate-400 capitalize">{item.type}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getPriorityStyle(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge border ${getStatusStyle(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {item.due_at ? new Date(item.due_at).toLocaleDateString() : '-'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {detailModal.open && (
        <div className="modal-overlay" onClick={() => setDetailModal((prev) => ({ ...prev, open: false }))}>
          <div
            className="modal-content max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="modal-header mb-0">{detailModal.title} Tickets</h3>
                <p className="text-xs text-slate-500 mt-0.5">Showing: {filteredModalItems.length} / {detailModal.items.length}</p>
              </div>
              <div className="flex items-center gap-2">
                {filteredModalItems.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={exportModalTickets}
                  >
                    Export
                  </button>
                )}
                <button
                  type="button"
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                  onClick={() => setDetailModal((prev) => ({ ...prev, open: false }))}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {filteredModalItems.length === 0 ? (
              <div className="empty-state py-6">
                <p className="empty-state-title">No tickets found</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Client</th>
                      <th>Topic</th>
                      <th>Ticket Number</th>
                      <th>Ticket Create Date</th>
                      <th>Ticket Created By</th>
                      <th>Ticket Assigned To</th>
                      <th>Pending By</th>
                      <th>Target Date</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModalItems.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>{getBranchName(item.branch_id)}</td>
                        <td className="max-w-[280px] truncate" title={item.title}>{item.title}</td>
                        <td>#{item.id}</td>
                        <td>{formatDate(item.created_at)}</td>
                        <td>{getReporterName(item.reporter_id)}</td>
                        <td>{getAssigneeName(item.assignee_id)}</td>
                        <td>{getPendingBy(item.status)}</td>
                        <td>{formatDate(item.end_date || item.due_at)}</td>
                        <td>{getStatusLabel(item.status)}</td>
                        <td className="max-w-[320px] truncate" title={item.description || ''}>
                          {item.description || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
