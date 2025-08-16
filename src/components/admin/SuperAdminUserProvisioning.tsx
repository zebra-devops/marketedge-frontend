'use client'

import { useState, useEffect } from 'react'
import { useAuthContext } from '@/hooks/useAuth'
import { useOrganisationContext } from '@/components/providers/OrganisationProvider'
import { apiService } from '@/services/api'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { 
  UserPlusIcon, 
  EnvelopeIcon, 
  UserGroupIcon, 
  DocumentDuplicateIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface ApplicationAccess {
  application: 'market_edge' | 'causal_edge' | 'value_edge'
  has_access: boolean
}

interface UserCreate {
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'analyst' | 'viewer'
  organisation_id?: string
  application_access: ApplicationAccess[]
  send_invitation: boolean
}

interface BulkUserData {
  users: UserCreate[]
  send_invitations: boolean
}

interface CreatedUser {
  id: string
  email: string
  first_name: string
  last_name: string
  organisation_name: string
  invitation_status: string
}

export default function SuperAdminUserProvisioning() {
  const { user: currentUser } = useAuthContext()
  const { allOrganisations, isSuperAdmin } = useOrganisationContext()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([])
  
  // Single user form
  const [formData, setFormData] = useState<UserCreate>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'viewer',
    organisation_id: '',
    application_access: [
      { application: 'market_edge', has_access: false },
      { application: 'causal_edge', has_access: false },
      { application: 'value_edge', has_access: false }
    ],
    send_invitation: true
  })
  
  // Bulk user form
  const [bulkData, setBulkData] = useState('')
  const [bulkSendInvitations, setBulkSendInvitations] = useState(true)
  const [parsedBulkUsers, setParsedBulkUsers] = useState<UserCreate[]>([])
  
  if (!isSuperAdmin) {
    return (
      <div className="text-center py-8">
        <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Super Admin access required for user provisioning</p>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const handleApplicationAccessChange = (application: string, hasAccess: boolean) => {
    setFormData(prev => ({
      ...prev,
      application_access: prev.application_access.map(access =>
        access.application === application
          ? { ...access, has_access: hasAccess }
          : access
      )
    }))
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.organisation_id) {
      toast.error('Please select an organization')
      return
    }

    try {
      setIsCreating(true)
      const response = await apiService.post<CreatedUser>('/admin/users', formData)
      
      setCreatedUsers(prev => [...prev, response])
      toast.success(`User ${formData.email} created successfully`)
      
      // Reset form
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'viewer',
        organisation_id: '',
        application_access: [
          { application: 'market_edge', has_access: false },
          { application: 'causal_edge', has_access: false },
          { application: 'value_edge', has_access: false }
        ],
        send_invitation: true
      })
      
      setIsModalOpen(false)
    } catch (error: any) {
      console.error('Failed to create user:', error)
      toast.error(error?.response?.data?.detail || 'Failed to create user')
    } finally {
      setIsCreating(false)
    }
  }

  const parseBulkData = () => {
    try {
      const lines = bulkData.trim().split('\n').filter(line => line.trim())
      const users: UserCreate[] = []
      
      for (const line of lines) {
        const parts = line.split(',').map(part => part.trim())
        
        if (parts.length < 4) {
          throw new Error(`Invalid line: ${line}. Expected format: email,first_name,last_name,role,org_id`)
        }
        
        const [email, first_name, last_name, role, organisation_id = ''] = parts
        
        if (!email || !first_name || !last_name || !role) {
          throw new Error(`Missing required fields in line: ${line}`)
        }
        
        if (!['admin', 'analyst', 'viewer'].includes(role)) {
          throw new Error(`Invalid role "${role}" in line: ${line}. Must be admin, analyst, or viewer`)
        }
        
        users.push({
          email,
          first_name,
          last_name,
          role: role as 'admin' | 'analyst' | 'viewer',
          organisation_id: organisation_id || formData.organisation_id || '',
          application_access: [
            { application: 'market_edge', has_access: true },
            { application: 'causal_edge', has_access: false },
            { application: 'value_edge', has_access: false }
          ],
          send_invitation: bulkSendInvitations
        })
      }
      
      setParsedBulkUsers(users)
      return users
    } catch (error: any) {
      toast.error(error.message)
      return []
    }
  }

  const handleBulkCreate = async () => {
    const users = parseBulkData()
    if (users.length === 0) return
    
    try {
      setIsCreating(true)
      const response = await apiService.post<CreatedUser[]>('/admin/users/bulk', {
        users,
        send_invitations: bulkSendInvitations
      })
      
      setCreatedUsers(prev => [...prev, ...response])
      toast.success(`Successfully created ${response.length} users`)
      
      setBulkData('')
      setParsedBulkUsers([])
      setIsBulkModalOpen(false)
    } catch (error: any) {
      console.error('Failed to bulk create users:', error)
      toast.error(error?.response?.data?.detail || 'Failed to bulk create users')
    } finally {
      setIsCreating(false)
    }
  }

  const getApplicationName = (app: string) => {
    switch (app) {
      case 'market_edge': return 'Market Edge'
      case 'causal_edge': return 'Causal Edge'
      case 'value_edge': return 'Value Edge'
      default: return app
    }
  }

  const copyBulkTemplate = () => {
    const template = `email@example.com,John,Doe,analyst,org-id
user2@example.com,Jane,Smith,viewer,org-id
admin@example.com,Admin,User,admin,org-id`
    
    navigator.clipboard.writeText(template)
    toast.success('Bulk template copied to clipboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Provisioning</h2>
          <p className="text-gray-600 mt-1">Create users across any organization</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsBulkModalOpen(true)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <UserGroupIcon className="h-5 w-5" />
            Bulk Create
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            <UserPlusIcon className="h-5 w-5" />
            Create User
          </Button>
        </div>
      </div>

      {/* Recent Created Users */}
      {createdUsers.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recently Created Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invitation Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {createdUsers.slice(-10).map((user, index) => (
                  <tr key={user.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.organisation_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.invitation_status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : user.invitation_status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.invitation_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single User Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New User"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateUser} className="space-y-6">
          {/* Organization Selection */}
          <div>
            <label htmlFor="organisation_id" className="block text-sm font-medium text-gray-700">
              Organization *
            </label>
            <select
              id="organisation_id"
              name="organisation_id"
              value={formData.organisation_id}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Organization</option>
              {allOrganisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.industry})
                </option>
              ))}
            </select>
          </div>

          {/* User Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                First Name *
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Last Name *
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="viewer">Viewer</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Application Access */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Application Access
            </label>
            <div className="space-y-2">
              {formData.application_access.map((access) => (
                <div key={access.application} className="flex items-center">
                  <input
                    type="checkbox"
                    id={access.application}
                    checked={access.has_access}
                    onChange={(e) => handleApplicationAccessChange(access.application, e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor={access.application} className="ml-2 text-sm text-gray-700">
                    {getApplicationName(access.application)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Send Invitation */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="send_invitation"
              name="send_invitation"
              checked={formData.send_invitation}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="send_invitation" className="ml-2 text-sm text-gray-700 flex items-center gap-2">
              <EnvelopeIcon className="h-4 w-4 text-gray-500" />
              Send invitation email to user
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isCreating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk User Creation Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Create Users"
        maxWidth="3xl"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Bulk Format</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Enter one user per line in CSV format:</p>
                  <code className="mt-1 block bg-blue-100 p-2 rounded text-xs">
                    email,first_name,last_name,role,organisation_id (optional)
                  </code>
                  <p className="mt-1">Roles: admin, analyst, viewer</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button
              onClick={copyBulkTemplate}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              Copy Template
            </Button>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="bulk_send_invitations"
                checked={bulkSendInvitations}
                onChange={(e) => setBulkSendInvitations(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="bulk_send_invitations" className="ml-2 text-sm text-gray-700">
                Send invitation emails
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="bulk_data" className="block text-sm font-medium text-gray-700">
              User Data
            </label>
            <textarea
              id="bulk_data"
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              rows={10}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="email@example.com,John,Doe,analyst,org-id&#10;user2@example.com,Jane,Smith,viewer,org-id"
            />
          </div>

          {parsedBulkUsers.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Preview: {parsedBulkUsers.length} users parsed successfully
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsBulkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={parseBulkData}
              variant="secondary"
              disabled={!bulkData.trim()}
            >
              Parse & Validate
            </Button>
            <Button
              onClick={handleBulkCreate}
              isLoading={isCreating}
              disabled={parsedBulkUsers.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Create {parsedBulkUsers.length} Users
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}