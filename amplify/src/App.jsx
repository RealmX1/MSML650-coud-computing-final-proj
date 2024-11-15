import React from 'react'
import { Route, Routes, Link } from 'react-router-dom'
import Registration from './components/Registration'
import HostView from './components/HostView'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex space-x-4 items-center">
              <Link to="/" className="text-xl font-bold text-gray-800">
                Zoom Face Recognition
              </Link>
              <Link to="/" className="text-gray-600 hover:text-gray-900">
                Registration
              </Link>
              <Link to="/host" className="text-gray-600 hover:text-gray-900">
                Host View
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Registration />} />
          <Route path="/host" element={<HostView />} />
        </Routes>
      </div>
    </div>
  )
}

export default App