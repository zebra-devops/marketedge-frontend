'use client'

import { useState } from 'react'
import { PlusIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import { OrganisationsList } from './OrganisationsList'
import { OrganisationCreateForm } from './OrganisationCreateForm'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useOrganisationContext } from '@/components/providers/OrganisationProvider'

export function OrganisationManager() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { isSuperAdmin, allOrganisations, isLoadingAll } = useOrganisationContext()

  const handleCreateSuccess = (organisation: any) => {
    setShowCreateForm(false)
    setRefreshTrigger(prev => prev + 1)
    
    // Show success message (you could use a toast notification here)
    console.log('Organisation created successfully:', organisation)
  }

  const handleCreateCancel = () => {
    setShowCreateForm(false)
  }

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You need Super Administrator privileges to manage organisations.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <BuildingOffice2Icon className="h-8 w-8 text-blue-600 mr-3" />
              Organisation Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Create new organisations and manage existing ones. Perfect for setting up clients like Odeon Cinema.
            </p>
          </div>
          
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="primary"
            className="flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Organisation
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">
              {isLoadingAll ? '...' : allOrganisations.length}
            </div>
            <div className="text-sm text-blue-600">Total Organisations</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              {isLoadingAll ? '...' : allOrganisations.filter(org => org.is_active).length}
            </div>
            <div className="text-sm text-green-600">Active Organisations</div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">
              {isLoadingAll ? '...' : allOrganisations.filter(org => org.industry_type === 'cinema').length}
            </div>
            <div className="text-sm text-purple-600">Cinema Organisations</div>
          </div>
        </div>
      </div>

      {/* Organisation List */}
      <OrganisationsList
        refreshTrigger={refreshTrigger}
        onCreateNew={() => setShowCreateForm(true)}
      />

      {/* Create Organisation Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={handleCreateCancel}
        title="Create New Organisation"
        size="xl"
      >
        <OrganisationCreateForm
          onSuccess={handleCreateSuccess}
          onCancel={handleCreateCancel}
        />
      </Modal>
    </div>
  )
}