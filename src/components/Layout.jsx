import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ViewColumnsIcon,
  PlusIcon,
  ChartBarIcon,
  ClockIcon,
  CogIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  TicketIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, color: 'from-blue-500 to-indigo-500' },
  { name: 'Board', href: '/board', icon: ViewColumnsIcon, color: 'from-purple-500 to-pink-500' },
  { name: 'Create Ticket', href: '/create', icon: PlusIcon, color: 'from-emerald-500 to-teal-500' },
  { name: 'Activity Log', href: '/activity-log', icon: CalendarDaysIcon, color: 'from-amber-500 to-orange-500' },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, color: 'from-cyan-500 to-blue-500' },
  { name: 'Time Reports', href: '/time-reports', icon: ClockIcon, color: 'from-rose-500 to-pink-500' },
  { name: 'Settings', href: '/settings', icon: CogIcon, color: 'from-slate-500 to-gray-500' },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const { user, logout } = useAuth()
  const location = useLocation()

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'pm': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'dev': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    }
  }

  const filteredNavigation = navigation.filter((item) => {
    if (user?.role === "requester") {
      return ![
        "Time Reports",
        
        "Activity Log",
        "Reports"
      ].includes(item.name)
    }
    return true
  })

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile sidebar overlay */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-72 flex-col">
          <div className="flex grow flex-col overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 pb-4 ring-1 ring-white/10">
            {/* Mobile Logo */}
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <TicketIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-lg font-bold text-white">IT Support</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex flex-1 flex-col mt-4">
              <ul className="space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-white/10 text-white shadow-lg'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isActive ? `bg-gradient-to-br ${item.color}` : 'bg-slate-700/50 group-hover:bg-slate-700'}`}>
                          <item.icon className="h-5 w-5 text-white" />
                        </div>
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Mobile User Section */}
            <div className="mt-auto pt-4 border-t border-white/10">
              <div className="flex items-center gap-3 px-2 py-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadgeColor(user?.role)} capitalize`}>
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="flex grow flex-col overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 pb-4">
          {/* Logo */}
          <div className="flex h-12 items-center gap-2 px-2">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <TicketIcon className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-base font-bold text-white">IT Support</span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col mt-3">
            <ul className="space-y-0.5">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                      title={sidebarCollapsed ? item.name : ''}
                    >
                      <div className={`p-1.5 rounded-md transition-all duration-200 ${
                        isActive 
                          ? `bg-gradient-to-br ${item.color}` 
                          : 'bg-slate-700/50 group-hover:bg-slate-700'
                      }`}>
                        <item.icon className="h-4 w-4 text-white" />
                      </div>
                      {!sidebarCollapsed && <span className="text-sm">{item.name}</span>}
                      {isActive && !sidebarCollapsed && (
                        <div className="ml-auto w-1 h-1 rounded-full bg-white"></div>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User Section */}
          <div className="mt-auto pt-3 border-t border-white/10">
            <div className={`flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-xs">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${getRoleBadgeColor(user?.role)} capitalize`}>
                    {user?.role}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="flex items-center justify-between px-4 sm:px-6 h-12">
            {/* Left side */}
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                type="button"
                className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              
              {/* Collapse button for desktop */}
              <button
                type="button"
                className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <Bars3Icon className="h-5 w-5" />
              </button>

              {/* Breadcrumb/Title */}
              <div className="hidden sm:block">
                <h1 className="text-sm font-semibold text-slate-800">
                  {navigation.find(n => n.href === location.pathname)?.name || 'IT Support'}
                </h1>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* User Info - Desktop */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Notification Bell */}
              <NotificationBell />

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-3rem)]">
          <div className="p-3 sm:p-4">
            <div className="w-full max-w-none">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
