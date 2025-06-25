import React from 'react'

const Header = ({ employee, onLogout }) => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-bold text-gray-800">POS Toko</h1>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {employee?.name} ({employee?.role})
            </span>
            <button
              onClick={onLogout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header