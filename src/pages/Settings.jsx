import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { BellIcon, CogIcon } from '@heroicons/react/24/outline'

export default function Settings() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [oncallRoster, setOncallRoster] = useState([])
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showCreateBranch, setShowCreateBranch] = useState(false)
  const [activeTab, setActiveTab] = useState(
    user?.role === 'requester'
      ? 'requesters'
      : 'notifications'
  )
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'requester',
    branch_id: ''
  })
  const [newBranch, setNewBranch] = useState({ name: '' })

  useEffect(() => {
    fetchPreferences()

    if (user?.role === 'pm') {
      fetchUsers()
      fetchBranches()
      fetchOncallRoster()
    }

    if (user?.role === 'requester') {
      fetchUsers()
    }
  }, [user])

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/notifications/preferences')
      setPreferences(response.data)
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    }
  }

  const updatePreferences = async (prefs) => {
    try {
      await api.put('/notifications/preferences', prefs)
      toast.success('Preferences updated!')
      fetchPreferences()
    } catch (error) {
      console.error('Failed to update preferences:', error)
      toast.error('Failed to update preferences')
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to fetch users')
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches')
      setBranches(response.data)
    } catch (error) {
      console.error('Failed to fetch branches:', error)
      toast.error('Failed to fetch branches')
    }
  }

  const fetchOncallRoster = async () => {
    try {
      const response = await api.get('/oncall/roster')
      setOncallRoster(response.data)
    } catch (error) {
      console.error('Failed to fetch on-call roster:', error)
    }
  }

  const handleSeedRoster = async () => {
    if (users.length < 2) {
      toast.error('Need at least 2 users to create on-call roster')
      return
    }

    setSeedLoading(true)
    try {
      const devUsers = users.filter(u => u.role === 'dev')
      if (devUsers.length === 0) {
        toast.error('No developers found to create on-call roster')
        return
      }

      const userIds = devUsers.map(u => u.id)
      await api.post('/oncall/seed', { user_ids: userIds })
      
      toast.success('On-call roster seeded successfully!')
      fetchOncallRoster()
    } catch (error) {
      console.error('Failed to seed roster:', error)
      toast.error('Failed to seed on-call roster')
    } finally {
      setSeedLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      // Convert branch_id to integer or null
      const userData = {
        ...newUser,
        branch_id: newUser.branch_id ? parseInt(newUser.branch_id) : null
      }
      
      await api.post('/users', userData)
      toast.success('✅ User created successfully!')
      setNewUser({ name: '', email: '', password: '', role: 'requester', branch_id: '' })
      setShowCreateUser(false)
      fetchUsers()
    } catch (error) {
      console.error('Failed to create user:', error)
      const errorMsg = error.response?.data?.detail || 'Failed to create user'
      toast.error(errorMsg)
    }
  }

  const handleCreateBranch = async (e) => {
    e.preventDefault()
    try {
      await api.post('/branches', newBranch)
      toast.success('Branch created successfully!')
      setNewBranch({ name: '' })
      setShowCreateBranch(false)
      fetchBranches()
    } catch (error) {
      console.error('Failed to create branch:', error)
      toast.error('Failed to create branch')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="w-full max-w-none space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content flex items-center gap-3">
          <CogIcon className="h-5 w-5 text-white" />
          <div>
            <h1 className="page-header-title">Settings</h1>
            <p className="page-header-subtitle">Manage preferences and configuration</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card-flat p-1">
        <nav className="flex gap-1">
          {['pm', 'dev'].includes(user?.role) && (
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'notifications'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <BellIcon className="h-4 w-4" />
              Notifications
            </div>
          </button>
          )}
          {user?.role === 'pm' && (
            <button
              onClick={() => setActiveTab('system')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'system'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <CogIcon className="h-4 w-4" />
                System
              </div>
            </button>
          )}
          {user?.role === 'requester' && (
    <button
      onClick={() => setActiveTab('requesters')}
      className={`flex-1 py-2 px-3 rounded-lg ${
        activeTab === 'requesters'
          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      Requesters
    </button>
  )}
        </nav>
      </div>

      {/* Notification Preferences Tab */}
      {activeTab === 'notifications' && preferences && ['pm', 'dev'].includes(user?.role) && (
        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📧 Email Notifications</h2>
            <div className="space-y-3">
              {[
                { key: 'email_ticket_assigned', label: 'When a ticket is assigned to me' },
                { key: 'email_ticket_updated', label: 'When my ticket is updated' },
                { key: 'email_ticket_commented', label: 'When someone comments on my ticket' },
                { key: 'email_ticket_reopened', label: 'When my ticket is reopened' },
                { key: 'email_due_date_reminder', label: 'Due date reminders' },
                { key: 'email_sla_alert', label: 'SLA breach alerts' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(e) => {
                      const updated = { ...preferences, [key]: e.target.checked }
                      setPreferences(updated)
                      updatePreferences(updated)
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* In-App Notifications */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🔔 In-App Notifications</h2>
            <div className="space-y-3">
              {[
                { key: 'app_ticket_assigned', label: 'When a ticket is assigned to me' },
                { key: 'app_ticket_updated', label: 'When my ticket is updated' },
                { key: 'app_ticket_commented', label: 'When someone comments on my ticket' },
                { key: 'app_ticket_reopened', label: 'When my ticket is reopened' },
                { key: 'app_due_date_reminder', label: 'Due date reminders' },
                { key: 'app_sla_alert', label: 'SLA breach alerts' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(e) => {
                      const updated = { ...preferences, [key]: e.target.checked }
                      setPreferences(updated)
                      updatePreferences(updated)
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Digest Settings */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📬 Email Digest</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-2 block">Send me a digest email</span>
                <select
                  value={preferences.digest_frequency}
                  onChange={(e) => {
                    const updated = { ...preferences, digest_frequency: e.target.value }
                    setPreferences(updated)
                    updatePreferences(updated)
                  }}
                  className="input"
                >
                  <option value="none">Never</option>
                  <option value="daily">Daily (8:00 AM)</option>
                  <option value="weekly">Weekly (Monday 8:00 AM)</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requesters' && user?.role === 'requester' && (
        <div className="space-y-4">

          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Requester Management
                </h2>
                <p className="text-sm text-gray-500">
                  Create requesters for your branch
                </p>
              </div>

              <button
                onClick={() => setShowCreateUser(true)}
                className="btn btn-primary"
              >
                Add Requester
              </button>
            </div>

            {showCreateUser && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-4">
                  Create Requester
                </h3>

                <form onSubmit={handleCreateUser} className="space-y-4">

                  <input
                    type="text"
                    placeholder="Name"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    className="input"
                    required
                  />

                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="input"
                    required
                  />

                  <input
                    type="password"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="input"
                    required
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      Create Requester
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateUser(false)
                        setNewUser({
                          name: '',
                          email: '',
                          password: '',
                          role: 'requester',
                          branch_id: ''
                        })
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {users
                    .filter(
                      u =>
                        u.role === 'requester' &&
                        u.branch_id === user.branch_id
                    )
                    .map(u => (
                      <tr key={u.id}>
                        <td className="px-4 py-2">{u.name}</td>
                        <td className="px-4 py-2">{u.email}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            u.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* System Settings Tab (PM Only) */}
      {activeTab === 'system' && user?.role === 'pm' && (
        <div className="space-y-4">

      {/* On-Call Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">On-Call Rotation</h2>
            <p className="text-sm text-gray-500">
              Manage the weekly on-call rotation for support tickets
            </p>
          </div>
          <button
            onClick={handleSeedRoster}
            disabled={seedLoading}
            className="btn btn-primary"
          >
            {seedLoading ? 'Seeding...' : 'Seed Roster'}
          </button>
        </div>

        {oncallRoster.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Current rotation:</strong> The roster is automatically rotated every Monday at 9:00 AM.
                New support tickets are auto-assigned to the current week's on-call person.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week Starting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      On-Call Person
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {oncallRoster.slice(0, 8).map((roster, index) => {
                    const isCurrent = index === 0
                    const isPast = new Date(roster.starts_on) < new Date()
                    return (
                      <tr key={roster.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(roster.starts_on)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {roster.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isCurrent ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Current
                            </span>
                          ) : isPast ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Past
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              Upcoming
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No on-call roster configured</p>
            <p className="text-sm text-gray-400">
              Click "Seed Roster" to create a rotating schedule using all available developers.
            </p>
          </div>
        )}
      </div>

      {/* Branch Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Branch Management</h2>
            <p className="text-sm text-gray-500">Manage branches for ticket organization</p>
          </div>
          <button
            onClick={() => setShowCreateBranch(true)}
            className="btn btn-primary"
          >
            Create Branch
          </button>
        </div>

        {showCreateBranch && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-medium text-gray-900 mb-4">Create New Branch</h3>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ name: e.target.value })}
                  className="input"
                  placeholder="Enter branch name"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Create Branch
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCreateBranch(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {branch.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {branch.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {users.filter(u => u.branch_id === branch.id).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-500">Manage users and their roles</p>
          </div>
          <button
            onClick={() => setShowCreateUser(true)}
            className="btn btn-primary"
          >
            Create User
          </button>
        </div>

        {showCreateUser && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-medium text-gray-900 mb-4">Create New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="input"
                    placeholder="Enter user name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="input"
                    placeholder="Enter email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="input"
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="input"
                  >
                    <option value="requester">Requester</option>
                    <option value="dev">Developer</option>
                    <option value="pm">Product Manager</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  value={newUser.branch_id}
                  onChange={(e) => setNewUser({...newUser, branch_id: e.target.value})}
                  className="input"
                >
                  <option value="">Select Branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCreateUser(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                      user.role === 'pm' 
                        ? 'bg-purple-100 text-purple-800' 
                        : user.role === 'dev'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {branches.find(b => b.id === user.branch_id)?.name || 'No branch'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Autopilot Features</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Daily standup digest (9:00 AM)</li>
              <li>• SLA reminders (hourly)</li>
              <li>• On-call rotation (Monday 9:00 AM)</li>
              <li>• Notification system enabled</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Notifications</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• In-app notifications</li>
              <li>• Email notifications</li>
              <li>• Slack webhook support</li>
              <li>• SLA alerts and reminders</li>
            </ul>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  )
}
