import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
      <span className="font-semibold text-gray-800 mr-4">MealPlan</span>
      <Link
        to="/parent"
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          pathname === '/parent'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Parent View
      </Link>
      <Link
        to="/clinician"
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          pathname === '/clinician'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Clinician View
      </Link>
    </nav>
  )
}
