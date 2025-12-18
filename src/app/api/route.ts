import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<Response> {
  return NextResponse.json({
    status: 'OpenContext API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    railway: !!process.env.RAILWAY_ENVIRONMENT
  })
}