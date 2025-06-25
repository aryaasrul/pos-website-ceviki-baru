import { useState, useEffect, createContext, useContext } from 'react'
import { authService } from '../services/auth'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check current session
    authService.getCurrentUser().then(data => {
      if (data) {
        setUser(data.user)
        setEmployee(data.employee)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setEmployee(null)
          navigate('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  const login = async (email, password) => {
    const data = await authService.login(email, password)
    setUser(data.user)
    setEmployee(data.employee)
    return data
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
    setEmployee(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      employee,
      loading,
      login,
      logout,
      isOwner: employee?.role === 'owner',
      isKasir: employee?.role === 'kasir'
    }}>
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