import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * Health check endpoint for OpenContext service
 * Returns minimal service status (no configuration details)
 */

export async function GET(): Promise<Response> {
  // Basic health check - service is up and responding
  return NextResponse.json({
    status: 'ok',
    service: 'opencontext',
    timestamp: new Date().toISOString()
  })
}