'use client'

import { useState, useEffect } from 'react'
import { UserRole } from '@prisma/client'

type Employee = {
  id: string
  email: string
  name: string | null
  firstName?: string
  lastName?: string
  role: UserRole
  employeeId: string | null
  position: string | null
  hireDate: string | null
  profile?: {
    phoneNumber?: string
    address?: string
    hourlyRate?: number
    emergencyContact?: string
  }
  _count: {
    timeEntries: number
  }
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isNewEmployee, setIsNewEmployee] = useState(false)
  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateEmployeeId = () => {
    return Math.floor(100 + Math.random() * 900).toString()
  }

  const handleAddEmployee = () => {
    setIsNewEmployee(true)
    setSelectedEmployee({
      id: '',
      email: '',
      name: '',
      firstName: '',
      lastName: '',
      role: 'employee',
      employeeId: generateEmployeeId(),
      position: '',
      hireDate: new Date().toISOString().split('T')[0],
      profile: {
        phoneNumber: '',
        address: '',
        hourlyRate: 0
      },
      _count: { timeEntries: 0 }
    })
    setShowModal(true)
  }

  const handleEditEmployee = (employee: Employee) => {
    setIsNewEmployee(false)
    // Split name into first and last if exists
    const nameParts = employee.name?.split(' ') || []
    setSelectedEmployee({
      ...employee,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || ''
    })
    setShowModal(true)
  }

  const handleSaveEmployee = async () => {
    if (!selectedEmployee) return

    // Combine first and last name
    const fullName = `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim()
    
    const dataToSave = {
      ...selectedEmployee,
      name: fullName,
      hashedPassword: isNewEmployee ? 'temp123' : undefined, // Temporary password for new employees
      phoneNumber: selectedEmployee.profile?.phoneNumber,
      address: selectedEmployee.profile?.address,
      hourlyRate: selectedEmployee.profile?.hourlyRate
    }

    try {
      const url = isNewEmployee 
        ? '/api/admin/employees'
        : `/api/admin/employees/${selectedEmployee.id}`
      
      const response = await fetch(url, {
        method: isNewEmployee ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      })

      if (response.ok) {
        await fetchEmployees()
        setShowModal(false)
        setSelectedEmployee(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save employee')
      }
    } catch (error) {
      console.error('Error saving employee:', error)
      alert('Failed to save employee')
    }
  }

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to delete ${employee.name || employee.email}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/employees/${employee.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchEmployees()
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
    }
  }

  const roles: UserRole[] = ['admin', 'manager', 'employee']

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading employees...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Employee Management</h1>
        <p className="text-gray-600 mt-2">Manage staff accounts and roles</p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">

          <button
            onClick={handleAddEmployee}
            className="ml-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Employee
          </button>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hourly Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Entries
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {employee.name || 'No name'}
                    </div>
                    <div className="text-sm text-gray-500">{employee.email}</div>
                    {employee.profile?.phoneNumber && (
                      <div className="text-xs text-gray-400">{employee.profile.phoneNumber}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {employee.employeeId || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {employee.position || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${
                    employee.role === 'admin' ? 'bg-red-100 text-red-800' :
                    employee.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {employee.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {employee.profile?.hourlyRate ? `¥${employee.profile.hourlyRate}/hr` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {employee._count.timeEntries}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleEditEmployee(employee)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(employee)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {employees.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No employees found
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-900/80 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">
              {isNewEmployee ? 'Add New Employee' : 'Edit Employee'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={selectedEmployee.firstName || ''}
                  onChange={(e) => setSelectedEmployee({
                    ...selectedEmployee,
                    firstName: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={selectedEmployee.lastName || ''}
                  onChange={(e) => setSelectedEmployee({
                    ...selectedEmployee,
                    lastName: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={selectedEmployee.email}
                  onChange={(e) => setSelectedEmployee({
                    ...selectedEmployee,
                    email: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded"
                  disabled={!isNewEmployee}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={selectedEmployee.profile?.phoneNumber || ''}
                  onChange={(e) => setSelectedEmployee({
                    ...selectedEmployee,
                    profile: {
                      ...selectedEmployee.profile,
                      phoneNumber: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={selectedEmployee.profile?.address || ''}
                  onChange={(e) => setSelectedEmployee({
                    ...selectedEmployee,
                    profile: {
                      ...selectedEmployee.profile,
                      address: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={selectedEmployee.employeeId || ''}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedEmployee.role}
                  onChange={(e) => setSelectedEmployee({
                    ...selectedEmployee,
                    role: e.target.value as UserRole
                  })}
                  className="w-full px-3 py-2 border rounded"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={selectedEmployee.position || ''}
                  onChange={(e) => setSelectedEmployee({
                    ...selectedEmployee,
                    position: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g. Server, Cook, Cashier"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Wage (¥)
                </label>
                <input
                  type="number"
                  value={selectedEmployee.profile?.hourlyRate || 0}
                  onChange={(e) => setSelectedEmployee({
                    ...selectedEmployee,
                    profile: {
                      ...selectedEmployee.profile,
                      hourlyRate: parseFloat(e.target.value) || 0
                    }
                  })}
                  className="w-full px-3 py-2 border rounded"
                  step="50"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hire Date
                </label>
                <input
                  type="date"
                  value={selectedEmployee.hireDate ? selectedEmployee.hireDate.split('T')[0] : ''}
                  onChange={(e) => setSelectedEmployee({
                    ...selectedEmployee,
                    hireDate: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedEmployee(null)
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmployee}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {isNewEmployee ? 'Add Employee' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}