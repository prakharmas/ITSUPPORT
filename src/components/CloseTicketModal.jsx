import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api } from '../services/api'

export default function CloseTicketModal({ isOpen, onClose, ticket, onSuccess }) {
  const [rcaStatus, setRcaStatus] = useState('completed')
  const [solutionStatus, setSolutionStatus] = useState('completed')
  const [rcaNotes, setRcaNotes] = useState('')
  const [solutionNotes, setSolutionNotes] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!isOpen || !ticket) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!rcaNotes.trim()) {
      toast.error('Please provide RCA notes')
      return
    }
    
    if (!solutionNotes.trim()) {
      toast.error('Please provide solution notes')
      return
    }

    setLoading(true)
    try {
      await api.patch(`/items/${ticket.id}`, {
        status: 'done',
        rca_status: rcaStatus,
        solution_status: solutionStatus,
        rca_notes: rcaNotes,
        solution_notes: solutionNotes,
        is_recurring: isRecurring
      })

      const commentBody = `✅ Ticket Closed\n\n` +
        `🔍 RCA Status: ${rcaStatus.replace('_', ' ').toUpperCase()}\n` +
        `📝 RCA Notes: ${rcaNotes}\n\n` +
        `💡 Solution Status: ${solutionStatus.replace('_', ' ').toUpperCase()}\n` +
        `📝 Solution Notes: ${solutionNotes}\n\n` +
        `🔄 Recurring: ${isRecurring ? 'Yes' : 'No'}`

      await api.post(`/items/${ticket.id}/comments`, {
        body: commentBody
      })

      toast.success('✅ Ticket closed successfully with RCA and Solution details!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to close ticket:', error)
      toast.error(error.response?.data?.detail || 'Failed to close ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="px-6 pt-6 pb-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  Close Ticket #{ticket.id}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Please provide RCA and Solution details before closing this ticket
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
                disabled={loading}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">{ticket.title}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full">{ticket.type}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full capitalize">{ticket.priority}</span>
                  </div>
                </div>

                {/* RCA Section */}
                <div className="p-4 border-2 border-amber-200 rounded-lg bg-amber-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-amber-500 rounded-lg">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-amber-800">Root Cause Analysis (RCA)</h4>
                    <span className="ml-auto text-xs text-red-500 font-medium">*Required</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">RCA Status</label>
                      <select
                        value={rcaStatus}
                        onChange={(e) => setRcaStatus(e.target.value)}
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        disabled={loading}
                      >
                        <option value="completed">✅ Completed</option>
                        <option value="not_applicable">➖ Not Applicable</option>
                        <option value="pending">⏳ Pending</option>
                        <option value="in_progress">🔄 In Progress</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">RCA Notes <span className="text-red-500">*</span></label>
                      <textarea
                        value={rcaNotes}
                        onChange={(e) => setRcaNotes(e.target.value)}
                        rows="3"
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Describe the root cause analysis..."
                        disabled={loading}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">💡 Explain what caused the issue and how it was identified</p>
                    </div>
                  </div>
                </div>

                {/* Solution Section */}
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-blue-800">Solution Details</h4>
                    <span className="ml-auto text-xs text-red-500 font-medium">*Required</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Solution Status</label>
                      <select
                        value={solutionStatus}
                        onChange={(e) => setSolutionStatus(e.target.value)}
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                      >
                        <option value="completed">✅ Completed</option>
                        <option value="not_applicable">➖ Not Applicable</option>
                        <option value="pending">⏳ Pending</option>
                        <option value="in_progress">🔄 In Progress</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Solution Notes <span className="text-red-500">*</span></label>
                      <textarea
                        value={solutionNotes}
                        onChange={(e) => setSolutionNotes(e.target.value)}
                        rows="3"
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe the solution provided..."
                        disabled={loading}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">💡 Explain what was done to resolve the issue</p>
                    </div>
                  </div>
                </div>

                {/* Recurring Section */}
                <div className="p-4 border-2 border-emerald-200 rounded-lg bg-emerald-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-emerald-500 rounded-lg">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-emerald-800">Recurring Ticket?</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={isRecurring === false}
                        onChange={() => setIsRecurring(false)}
                        className="w-4 h-4 text-emerald-600"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-700">No</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={isRecurring === true}
                        onChange={() => setIsRecurring(true)}
                        className="w-4 h-4 text-emerald-600"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-700">Yes</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-2">Is this a recurring issue that may happen again?</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Closing...
                    </>
                  ) : (
                    '✅ Close Ticket'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}