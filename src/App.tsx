import { useState } from 'react'
import CollectionUploadPage from './pages/CollectionUploadPage'
import DashboardPage from './pages/DashboardPage'
import LogsPage from './pages/LogsPage'
import ReportsPage from './pages/ReportsPage'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'logs' | 'reports' | 'upload'>('dashboard')

  if (currentView === 'upload') {
    return (
      <ErrorBoundary>
        <div>
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-8">
                  <h1 className="text-xl font-semibold text-gray-900">AUOB Health Dashboard</h1>
                  <div className="hidden md:flex space-x-8">
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentView('logs')}
                      className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Logs & Monitoring
                    </button>
                    <button
                      onClick={() => setCurrentView('reports')}
                      className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Reports
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('upload')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upload Collection
                </button>
              </div>
            </div>
          </nav>
          <CollectionUploadPage />
        </div>
      </ErrorBoundary>
    )
  }

  if (currentView === 'logs') {
    return (
      <ErrorBoundary>
        <div>
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-8">
                  <h1 className="text-xl font-semibold text-gray-900">AUOB Health Dashboard</h1>
                  <div className="hidden md:flex space-x-8">
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentView('logs')}
                      className="text-gray-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-blue-500"
                    >
                      Logs & Monitoring
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('upload')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upload Collection
                </button>
              </div>
            </div>
          </nav>
          <LogsPage />
        </div>
      </ErrorBoundary>
    )
  }

  if (currentView === 'reports') {
    return (
      <ErrorBoundary>
        <div>
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-8">
                  <h1 className="text-xl font-semibold text-gray-900">AUOB Health Dashboard</h1>
                  <div className="hidden md:flex space-x-8">
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentView('logs')}
                      className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Logs & Monitoring
                    </button>
                    <button
                      onClick={() => setCurrentView('reports')}
                      className="text-gray-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-blue-500"
                    >
                      Reports
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('upload')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upload Collection
                </button>
              </div>
            </div>
          </nav>
          <ReportsPage />
        </div>
      </ErrorBoundary>
    )
  }

  if (currentView === 'dashboard') {
    return (
      <ErrorBoundary>
        <div>
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-8">
                  <h1 className="text-xl font-semibold text-gray-900">AUOB Health Dashboard</h1>
                  <div className="hidden md:flex space-x-8">
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="text-gray-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-blue-500"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentView('logs')}
                      className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Logs & Monitoring
                    </button>
                    <button
                      onClick={() => setCurrentView('reports')}
                      className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Reports
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('upload')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Collection
                </button>
              </div>
            </div>
          </nav>
          <DashboardPage />
        </div>
      </ErrorBoundary>
    )
  }

  return null
}

export default App
