import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Pages
import Login from './pages/Login'
import POS from './pages/POS'
import Products from './pages/Products'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: 'green',
              },
            },
            error: {
              style: {
                background: 'red',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route path="/pos" element={
            <ProtectedRoute>
              <POS />
            </ProtectedRoute>
          } />
          
          <Route path="/products" element={
            <ProtectedRoute requireOwner>
              <Products />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute requireOwner>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/reports" element={
            <ProtectedRoute requireOwner>
              <Reports />
            </ProtectedRoute>
          } />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/pos" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App