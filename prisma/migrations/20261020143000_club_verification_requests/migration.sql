CREATE TYPE "VerificationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ClubVerificationRequest" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "VerificationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubVerificationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubVerificationRequest_status_createdAt_idx" ON "ClubVerificationRequest"("status", "createdAt");
CREATE INDEX "ClubVerificationRequest_profileId_createdAt_idx" ON "ClubVerificationRequest"("profileId", "createdAt");

ALTER TABLE "ClubVerificationRequest"
ADD CONSTRAINT "ClubVerificationRequest_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
