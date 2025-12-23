/**
 * Health Check Endpoint for Next.js Frontend
 *
 * This endpoint is used by:
 * - Docker health checks
 * - Load balancers
 * - Monitoring systems (Prometheus, Uptime monitors)
 * - Caddy reverse proxy health checks
 *
 * Returns:
 * - 200 OK if application is healthy
 * - 503 Service Unavailable if application has issues
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'onquota-frontend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
    };

    // Optional: Check backend API connectivity
    // Uncomment if you want to verify backend is reachable
    /*
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        health.backend = 'unhealthy';
        health.status = 'degraded';
      } else {
        health.backend = 'healthy';
      }
    } catch (error) {
      health.backend = 'unreachable';
      health.status = 'degraded';
    }
    */

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    // If anything fails, return unhealthy status
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// Optional: Support HEAD requests for simple health checks
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
