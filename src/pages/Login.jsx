import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { SparklesIcon, TicketIcon, ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        toast.success('Login successful!')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500/30 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg mb-3">
            <TicketIcon className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            IT Support Tool
          </h1>
          <p className="text-purple-200 text-sm">
            Manage support tickets and features
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 p-6">
          <div className="flex items-center gap-2 mb-5">
            <SparklesIcon className="h-5 w-5 text-yellow-400" />
            <h2 className="text-base font-semibold text-white">Welcome Back</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-purple-200 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-purple-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-2.5 pr-11 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Features */}
          <div className="mt-5 pt-5 border-t border-white/10">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xl mb-1">🎫</div>
                <p className="text-xs text-purple-300">Tickets</p>
              </div>
              <div>
                <div className="text-xl mb-1">📊</div>
                <p className="text-xs text-purple-300">Analytics</p>
              </div>
              <div>
                <div className="text-xl mb-1">👥</div>
                <p className="text-xs text-purple-300">Team</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
