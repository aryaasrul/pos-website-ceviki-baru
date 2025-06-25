import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/auth'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
    
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          checkUser()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setEmployee(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      setLoading(true)
      const data = await authService.getCurrentUser()
      if (data) {
        setUser(data.user)
        setEmployee(data.employee)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password)
      setUser(data.user)
      setEmployee(data.employee)
      toast.success('Login berhasil!')
      return data
    } catch (error) {
      toast.error(error.message || 'Login gagal')
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      setEmployee(null)
      toast.success('Logout berhasil')
    } catch (error) {
      toast.error('Logout gagal')
      throw error
    }
  }

  const value = {
    user,
    employee,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
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