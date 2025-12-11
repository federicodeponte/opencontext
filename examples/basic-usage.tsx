/**
 * Basic usage example for OpenContext
 * Shows how to integrate the ContextForm component into your app
 */

import { ContextForm } from '../src/components/ContextForm'
import { useContextStorage } from '../src/hooks/useContextStorage'
import { useState } from 'react'

export default function BasicUsageExample() {
  const { 
    businessContext, 
    analyzeWebsite, 
    savedCompanies,
    hasContext 
  } = useContextStorage()
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalysisComplete = (context: any) => {
    console.log('Analysis completed:', context)
    // You can now use the extracted company context
  }

  const handleManualAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      await analyzeWebsite('https://example.com')
      console.log('Manual analysis complete:', businessContext)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Basic OpenContext Usage</h1>
        <p className="text-muted-foreground mt-2">
          Extract company information from any website
        </p>
      </div>

      {/* Main context form */}
      <ContextForm 
        onAnalysisComplete={handleAnalysisComplete}
        showSystemInstructions={true}
      />

      {/* Show current context if available */}
      {hasContext && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Current Company Context</h3>
          <div className="space-y-1 text-sm">
            <p><strong>Company:</strong> {businessContext.companyName}</p>
            <p><strong>Website:</strong> {businessContext.companyWebsite}</p>
            <p><strong>Industry:</strong> {businessContext.targetIndustries}</p>
            <p><strong>Description:</strong> {businessContext.productDescription}</p>
          </div>
        </div>
      )}

      {/* Manual analysis example */}
      <div className="border-t pt-6">
        <h3 className="font-semibold mb-4">Manual Analysis</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You can also trigger analysis programmatically
        </p>
        <button
          onClick={handleManualAnalysis}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Example.com'}
        </button>
      </div>

      {/* Saved companies display */}
      {savedCompanies.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Saved Companies ({savedCompanies.length})</h3>
          <div className="grid gap-2">
            {savedCompanies.map((company: any) => (
              <div 
                key={company.id}
                className="border rounded-lg p-3 text-sm"
              >
                <p className="font-medium">{company.name}</p>
                <p className="text-muted-foreground">{company.context.companyWebsite}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}