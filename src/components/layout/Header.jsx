import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const Header = ({ employee, onLogout }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
  const isOwner = employee?.role === 'owner'
  
  // Debug log
  console.log('Employee:', employee)
  console.log('Is Owner:', isOwner)
  console.log('Current Path:', location.pathname)
  
  const ownerMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/products', label: 'Kelola Produk', icon: '📦' },
    { path: '/reports', label: 'Laporan', icon: '📈' },
    { path: '/statistics', label: 'Statistik', icon: '📉' },
    { path: '/employees', label: 'Kelola Karyawan', icon: '👥' }
  ]
  
  const isActive = (path) => location.pathname === path
  
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-3 md:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold text-gray-800">POS Toko</h1>
            {isOwner && location.pathname !== '/pos' && (
              <span className="hidden md:inline-block text-sm text-gray-500">Owner Panel</span>
            )}
          </div>
          
          {/* Desktop Navigation - Show for owner */}
          {isOwner && (
            <nav className="hidden lg:flex items-center gap-1">
              {ownerMenuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          )}
          
          {/* User Info & Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* POS Button - Show for owner when not in POS page */}
            {isOwner && location.pathname !== '/pos' && (
              <button
                onClick={() => navigate('/pos')}
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                POS
              </button>
            )}
            
            {/* User Info */}
            <div className="text-right">
              <span className="block text-xs md:text-sm text-gray-600">
                {employee?.name}
              </span>
              <span className="block text-xs text-gray-500 capitalize">
                {employee?.role}
              </span>
            </div>
            
            {/* Mobile Menu Button - Only for owner */}
            {isOwner && (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showMobileMenu ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
            
            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="text-sm text-red-600 hover:text-red-800 p-2"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation - Only for owner */}
        {isOwner && showMobileMenu && (
          <div className="lg:hidden py-3 border-t">
            <nav className="flex flex-col gap-1">
              {ownerMenuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path)
                    setShowMobileMenu(false)
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              
              {location.pathname !== '/pos' && (
                <div className="flex gap-2 mt-2 pt-2 border-t">
                  <button
                    onClick={() => navigate('/pos')}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                  >
                    Ke POS
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header