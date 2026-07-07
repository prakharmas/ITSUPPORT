import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Board from './pages/Board'
import CreateItem from './pages/CreateItem'
import ItemDetail from './pages/ItemDetail'
import ActivityLog from './pages/ActivityLog'
import ActivityReports from './pages/ActivityReports'
import Reports from './pages/Reports'
import TimeReports from './pages/TimeReports'
import Settings from './pages/Settings'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/board" element={<Board />} />
        <Route path="/create" element={<CreateItem />} />
        <Route path="/items/:id" element={<ItemDetail />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/activity-reports" element={<ActivityReports />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/time-reports" element={<TimeReports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
