import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = performance.now();
  let dbStatus = "CONNECTED";
  let dbLatencyMs = 0;
  let overallStatus = "HEALTHY";

  try {
    // Ping SQLite database with lightweight read query
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Math.round(performance.now() - start);
  } catch (error) {
    dbStatus = "DISCONNECTED";
    overallStatus = "DEGRADED";
    console.error("[Health Check] Database probe failed:", error);
  }

  const memoryUsage = process.memoryUsage();

  const healthPayload = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    version: "4.0.0-production",
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        dialect: "sqlite",
      },
      process: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryRssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
        memoryHeapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        memoryHeapTotalMb: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
      },
    },
  };

  const statusCode = overallStatus === "HEALTHY" ? 200 : 503;
  return NextResponse.json(healthPayload, { status: statusCode });
}
