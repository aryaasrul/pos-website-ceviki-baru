import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/auth'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        const data = await authService.getCurrentUser()
        
        if (mounted) {
          if (data?.user && data?.employee) {
            setUser(data.user)
            setEmployee(data.employee)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Force stop loading after 3 seconds
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 3000)

    initializeAuth()

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password)
      setUser(data.user)
      setEmployee(data.employee)
      toast.success('Login berhasil')
      return data
    } catch (error) {
      toast.error(error.message || 'Login gagal')
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setEmployee(null)
    }
  }

  const value = {
    user,
    employee,
    loading,
    login,
    logout,
    isAuthenticated: !!user && !!employee,
    isOwner: employee?.role === 'owner',
    isKasir: employee?.role === 'kasir'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}