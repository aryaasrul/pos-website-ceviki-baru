import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { employeeService } from '../services/employees'
import { formatDate } from '../utils/formatters'
import Header from '../components/layout/Header'
import toast from 'react-hot-toast'

export default function Employees() {
  const { employee, logout } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const data = await employeeService.getEmployees()
      setEmployees(data)
    } catch (error) {
      toast.error('Gagal memuat data karyawan')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = () => {
    setEditingEmployee(null)
    setShowModal(true)
  }

  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp)
    setShowModal(true)
  }

  const handleToggleStatus = async (employeeId, currentStatus) => {
    try {
      await employeeService.updateEmployeeStatus(employeeId, !currentStatus)
      toast.success('Status karyawan berhasil diubah')
      loadEmployees()
    } catch (error) {
      toast.error('Gagal mengubah status karyawan')
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.phone?.includes(searchTerm)
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading karyawan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header employee={employee} onLogout={logout} />
      
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Kelola Karyawan</h1>
          <button
            onClick={handleAddEmployee}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            + Tambah Karyawan
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari nama, email, atau no. HP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <div key={emp.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{emp.name}</h3>
                  <p className="text-sm text-gray-500">{emp.email}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  emp.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {emp.active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Role:</span>
                  <span className="font-medium capitalize">{emp.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">No. HP:</span>
                  <span>{emp.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bergabung:</span>
                  <span>{formatDate(emp.created_at)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex gap-2">
                <button
                  onClick={() => handleEditEmployee(emp)}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(emp.id, emp.active)}
                  className={`flex-1 px-3 py-1.5 rounded text-sm ${
                    emp.active
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {emp.active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Karyawan</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{employees.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Karyawan Aktif</h3>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {employees.filter(e => e.active).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Owner</h3>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {employees.filter(e => e.role === 'owner').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Kasir</h3>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {employees.filter(e => e.role === 'kasir').length}
            </p>
          </div>
        </div>
      </div>

      {/* Employee Modal */}
      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false)
            loadEmployees()
          }}
        />
      )}
    </div>
  )
}

// Employee Modal Component
function EmployeeModal({ employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    email: employee?.email || '',
    name: employee?.name || '',
    role: employee?.role || 'kasir',
    phone: employee?.phone || '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.email || !formData.name) {
      toast.error('Email dan Nama wajib diisi')
      return
    }

    if (!employee && (!formData.password || formData.password.length < 6)) {
      toast.error('Password minimal 6 karakter')
      return
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Password tidak cocok')
      return
    }

    try {
      setLoading(true)
      
      if (employee) {
        await employeeService.updateEmployee(employee.id, {
          name: formData.name,
          role: formData.role,
          phone: formData.phone
        })
        toast.success('Karyawan berhasil diupdate')
      } else {
        await employeeService.createEmployee(formData)
        toast.success('Karyawan berhasil ditambahkan')
      }
      
      onSave()
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan karyawan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {employee ? 'Edit Karyawan' : 'Tambah Karyawan'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              disabled={!!employee}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="kasir">Kasir</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. HP
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="08123456789"
            />
          </div>
          
          {!employee && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 6 karakter"
                  required={!employee}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konfirmasi Password *
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Ulangi password"
                  required={!employee}
                />
              </div>
            </>
          )}
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}