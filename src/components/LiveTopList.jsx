import { Link } from 'react-router-dom'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

export default function LiveTopList({
  title,
  icon,
  items,
  emptyText = 'No items',
  accentColor = 'indigo',
  renderRow,
}) {
  const accent = {
    indigo: 'from-indigo-500 to-blue-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-teal-600',
    red: 'from-red-500 to-rose-600',
    purple: 'from-purple-500 to-violet-600',
    blue: 'from-blue-500 to-cyan-600',
  }[accentColor] || 'from-indigo-500 to-blue-600'

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${accent} text-white`}>
          {icon}
        </div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500 ml-auto">{items.length} items</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-xs">{emptyText}</div>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <div className="flex-1 min-w-0">{renderRow(item)}</div>
              <Link
                to={`/items/${item.id}`}
                className="flex-shrink-0 text-blue-600 hover:text-blue-800"
                title="Open ticket"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}