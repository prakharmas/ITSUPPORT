import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { BellIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()


  useEffect(() => {
    fetchUnreadCount()
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount()
      if (showDropdown) {
        fetchNotifications()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [showDropdown])

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count')
      setUnreadCount(response.data.count)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await api.get('/notifications?limit=10')
      setNotifications(response.data)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`)
      fetchUnreadCount()
      fetchNotifications()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read')
      fetchUnreadCount()
      fetchNotifications()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id)
    if (notification.ticket_id) {
      navigate(`/items/${notification.ticket_id}`)
      setShowDropdown(false)
    }
  }

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getNotificationIcon = (type) => {
    const icons = {
      ticket_assigned: '🎯',
      ticket_updated: '✏️',
      ticket_commented: '💬',
      ticket_reopened: '🔄',
      ticket_status_changed: '📊',
      ticket_reassigned: '👤',
      mention: '@',
      due_date_reminder: '⏰',
      sla_alert: '⚠️',
      ticket_reminder: '🔔'
    }
    return icons[type] || '📢'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <BellIconSolid className="h-5 w-5 text-indigo-600" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading && notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                      notification.is_read 
                        ? 'hover:bg-gray-50' 
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          notification.is_read ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {user?.role !== 'requester' && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    navigate('/settings')
                    setShowDropdown(false)
                  }}
                  className="text-xs text-gray-600 hover:text-gray-900 w-full text-center"
                >
                  Notification Settings →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

