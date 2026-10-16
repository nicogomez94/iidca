CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'CLAIM_PENDING', 'VERIFIED');
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "User" ADD COLUMN "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaPendingSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Profile" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_userId_fkey";
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD COLUMN "claimedById" TEXT;
ALTER TABLE "Profile" ADD COLUMN "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "Profile" ADD COLUMN "sourceKey" TEXT;
ALTER TABLE "Profile" ADD COLUMN "sourceName" TEXT;
ALTER TABLE "Profile" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "sourceContact" JSONB;
ALTER TABLE "Profile" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "imageCredit" TEXT;
ALTER TABLE "Profile" ADD COLUMN "imageSourceUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "imageIllustrative" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Profile_claimedById_key" ON "Profile"("claimedById");
CREATE UNIQUE INDEX "Profile_sourceKey_key" ON "Profile"("sourceKey");
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ClaimRequest" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "evidence" TEXT NOT NULL,
  "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClaimRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClaimRequest_profileId_userId_key" ON "ClaimRequest"("profileId", "userId");
CREATE INDEX "ClaimRequest_status_createdAt_idx" ON "ClaimRequest"("status", "createdAt");
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "targetId" TEXT,
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
