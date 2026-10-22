CREATE TABLE "ProfilePhoto" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfilePhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfilePhoto_profileId_createdAt_idx" ON "ProfilePhoto"("profileId", "createdAt");

ALTER TABLE "ProfilePhoto"
ADD CONSTRAINT "ProfilePhoto_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
