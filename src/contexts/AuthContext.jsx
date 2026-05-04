import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/auth'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const data = await authService.getCurrentUser()
        if (!mounted) return
        if (data?.user && data?.employee) {
          setUser(data.user)
          setEmployee(data.employee)
        }
      } catch {
        // unauthenticated is a valid state
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Safety net in case Supabase hangs
    const timeoutId = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    initializeAuth()

    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (!session || event === 'SIGNED_OUT') {
        setUser(null)
        setEmployee(null)
        return
      }

      if (['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED'].includes(event)) {
        try {
          const data = await authService.getCurrentUser()
          if (!mounted) return
          if (data?.user && data?.employee) {
            setUser(data.user)
            setEmployee(data.employee)
          } else {
            setUser(null)
            setEmployee(null)
          }
        } catch {
          // keep existing state on transient errors
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
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
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setEmployee(null)
    }
  }, [])

  const value = {
    user,
    employee,
    loading,
    login,
    logout,
    isAuthenticated: !!user && !!employee,
    isOwner: employee?.role === 'owner',
    isKasir: employee?.role === 'kasir',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
