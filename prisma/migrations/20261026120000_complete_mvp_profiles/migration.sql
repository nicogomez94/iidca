ALTER TABLE "User"
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "publicConsentAt" TIMESTAMP(3);

CREATE TABLE "ProfileDocument" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfileDocument_profileId_kind_idx" ON "ProfileDocument"("profileId", "kind");

ALTER TABLE "ProfileDocument"
  ADD CONSTRAINT "ProfileDocument_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
