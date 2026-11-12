-- Additive tables for the Manager and Trainer panels.
-- These are NEW tables only (no ALTER to existing tables), safe to run
-- on top of db/unified_production_schema.sql at any time (IF NOT EXISTS).
-- They cover two things the mock UI needed that the unified schema has
-- no dedicated table for: broadcast announcements, and trainer<->student
-- doubt threads. Everything else (leads, admissions, batches, attendance
-- alerts, fees, counsellors) is stored in the existing schema tables.

CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorName" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'All',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "panel" TEXT NOT NULL DEFAULT 'MANAGER',
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DoubtThread" (
    "id" TEXT PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "studentName" TEXT NOT NULL,
    "trainerProfileId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "meetingTime" TEXT,
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "Announcement_panel_idx" ON "Announcement" ("panel");
CREATE INDEX IF NOT EXISTS "DoubtThread_trainerProfileId_idx" ON "DoubtThread" ("trainerProfileId");
