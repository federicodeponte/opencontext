'use client'

import { useState, useCallback, useEffect } from 'react'
import { Globe, CheckCircle, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useContextStorage } from '@/hooks/useContextStorage'
import { ANALYSIS_CONFIG } from '@/lib/constants'
import { isValidUrl, normalizeUrl, formatTimeRemaining } from '@/lib/utils'

export interface ContextFormProps {
  onAnalysisComplete?: (context: AnalysisResponse) => void
  showSystemInstructions?: boolean
  className?: string
}

export function ContextForm({ 
  onAnalysisComplete, 
  showSystemInstructions = true,
  className = '' 
}: ContextFormProps) {
  const { businessContext, updateContext, clearContext, hasContext, isLoading, analyzeWebsite, savedCompanies } = useContextStorage()
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const handleAnalyzeWebsite = useCallback(async () => {
    if (!websiteUrl.trim()) {
      setAnalysisError('Please enter a website URL')
      return
    }

    if (!isValidUrl(websiteUrl)) {
      setAnalysisError('Please enter a valid URL (e.g., company.com or https://company.com)')
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setTimeRemaining(ANALYSIS_CONFIG.expectedDuration)
    setAnalysisError(null)
    
    // Start progress timer
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min((elapsed / ANALYSIS_CONFIG.expectedDuration) * 100, 95) // Cap at 95% until complete
      const remaining = Math.max(ANALYSIS_CONFIG.expectedDuration - Math.floor(elapsed), 0)
      
      setAnalysisProgress(progress)
      setTimeRemaining(remaining)
    }, 100)
    
    try {
      await analyzeWebsite(websiteUrl)
      
      // Complete progress
      clearInterval(progressInterval)
      setAnalysisProgress(100)
      setTimeRemaining(0)
      setWebsiteUrl('')

      onAnalysisComplete?.(businessContext)
    } catch (error) {
      console.error('Analysis error:', error)
      clearInterval(progressInterval)
      setAnalysisProgress(0)
      setTimeRemaining(0)
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze website')
    } finally {
      setIsAnalyzing(false)
    }
  }, [websiteUrl, analyzeWebsite, businessContext, onAnalysisComplete])

  const handleClearAll = useCallback(() => {
    clearContext()
    setShowClearConfirmation(false)
  }, [clearContext])

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-20 bg-secondary/50 rounded animate-pulse" />
        <div className="h-32 bg-secondary/50 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Saved Company Profiles - Show at top for easy switching */}
      {savedCompanies.length > 1 && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Switch Company Profile ({savedCompanies.length} saved)</Label>
              <p className="text-xs text-muted-foreground">Click any profile to switch to it</p>
            </div>
          </div>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {savedCompanies.map((company) => (
              <Button
                key={company.id}
                variant="outline"
                className={`flex items-center justify-between p-3 h-auto text-left ${
                  businessContext?.companyName === company.name 
                    ? 'bg-primary/10 border-primary/30' 
                    : ''
                }`}
                onClick={() => {
                  updateContext(company.context)
                }}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {company.name}
                    {businessContext?.companyName === company.name && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Current</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {company.context?.companyWebsite || 'No website'}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(company.createdAt).toLocaleDateString()}
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Website Analysis Section */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <Label htmlFor="website-url" className="text-sm font-semibold text-foreground">
            Analyze Website
          </Label>
        </div>
        
        <div className="flex gap-2">
          <Input
            id="website-url"
            type="text"
            placeholder="Enter website URL (e.g., apple.com, microsoft.com)"
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value)
              setAnalysisError(null) // Clear error when user types
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isAnalyzing && websiteUrl.trim()) {
                handleAnalyzeWebsite()
              }
            }}
            disabled={isAnalyzing}
            className="text-sm flex-1"
          />
          <Button
            onClick={handleAnalyzeWebsite}
            disabled={!websiteUrl.trim() || isAnalyzing}
            size="sm"
            className="text-sm font-medium"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze'
            )}
          </Button>
        </div>
        
        {/* Error Display */}
        {analysisError && (
          <div className="flex items-center gap-2 p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            <AlertTriangle className="h-4 w-4" />
            {analysisError}
          </div>
        )}
        
        {/* Progress Bar with Timer */}
        {isAnalyzing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Analyzing with Gemini 3.0 Pro...
              </span>
              <span className="font-medium text-primary">
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Powered by Gemini 3.0 Pro with web search and URL context
        </p>
      </div>

      {/* Context Display */}
      {hasContext && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Extracted Context</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearConfirmation(true)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          </div>

          <div className="grid gap-3">
            {businessContext.companyName && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Company Name</Label>
                <Input value={businessContext.companyName} readOnly className="text-xs bg-muted/50" />
              </div>
            )}
            
            {businessContext.companyWebsite && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Website</Label>
                <Input value={businessContext.companyWebsite} readOnly className="text-xs bg-muted/50" />
              </div>
            )}
            
            {businessContext.targetIndustries && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Industry</Label>
                <Input value={businessContext.targetIndustries} readOnly className="text-xs bg-muted/50" />
              </div>
            )}
            
            {businessContext.productDescription && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  value={businessContext.productDescription} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={3}
                />
              </div>
            )}
            
            {businessContext.products && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Products/Services</Label>
                <Textarea
                  value={businessContext.products} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
                />
              </div>
            )}
            
            {businessContext.targetAudience && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Target Audience</Label>
                <Input value={businessContext.targetAudience} readOnly className="text-xs bg-muted/50" />
              </div>
            )}
            
            {businessContext.competitors && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Competitors</Label>
                <Textarea 
                  value={businessContext.competitors} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
                />
              </div>
            )}
            
            {businessContext.tone && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Brand Tone</Label>
                <Input value={businessContext.tone} readOnly className="text-xs bg-muted/50" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Instructions Section */}
      {showSystemInstructions && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-semibold">System Instructions</Label>
              <p className="text-xs text-muted-foreground">
                Additional context and instructions for AI processing
              </p>
            </div>
          </div>
          
          <Textarea
            placeholder="Example: Always mention sustainability. Focus on B2B audiences. Use technical language."
            value={businessContext.systemInstructions || ''}
            onChange={(e) => updateContext({ systemInstructions: e.target.value })}
            className="text-xs min-h-[80px]"
            rows={3}
          />
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h3 className="text-sm font-semibold">Clear all context?</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              This will clear all extracted context. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirmation(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAll}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}