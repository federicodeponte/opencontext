'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Edit2, Plus } from 'lucide-react'
import { useContextStorage } from '@/hooks/useContextStorage'
import { SavedCompany } from '@/lib/types'

interface CompanySelectorProps {
  className?: string
  onAddNew?: () => void
}

export function CompanySelector({ className = '', onAddNew }: CompanySelectorProps) {
  const { businessContext, savedCompanies, switchToCompany } = useContextStorage()
  const [showSelector, setShowSelector] = useState(false)

  const currentCompany = savedCompanies.find(
    company => company.context.companyName === businessContext.companyName
  )

  const handleSwitchCompany = (companyId: string) => {
    switchToCompany(companyId)
    setShowSelector(false)
  }

  const handleAddNew = () => {
    setShowSelector(false)
    onAddNew?.()
  }

  return (
    <div className={className}>
      <div className="border border-border rounded-lg p-3 bg-background/30">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold text-foreground">
            Using Company Context
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSelector(!showSelector)}
            className="h-7 w-7 p-0"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">Company:</span> {businessContext.companyName || 'No company selected'}
          </div>
          {businessContext.companyWebsite && (
            <div className="text-sm">
              <span className="font-medium">URL:</span> {businessContext.companyWebsite}
            </div>
          )}
        </div>
      </div>

      {/* Company Selector Dialog */}
      {showSelector && (
        <div className="mt-3 border border-border rounded-lg p-3 bg-background space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Select Company Context</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddNew}
              className="h-7 px-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add New
            </Button>
          </div>
          
          {savedCompanies.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {savedCompanies.map(company => (
                <Button
                  key={company.id}
                  variant="outline"
                  className={`w-full justify-start text-left h-auto py-2 ${
                    company.id === currentCompany?.id ? 'bg-primary/10 border-primary/30' : ''
                  }`}
                  onClick={() => handleSwitchCompany(company.id)}
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {company.name}
                      {company.id === currentCompany?.id && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {company.context.companyWebsite || 'No website'}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No saved companies. Click &quot;Add New&quot; to analyze a website.
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSelector(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  )
}