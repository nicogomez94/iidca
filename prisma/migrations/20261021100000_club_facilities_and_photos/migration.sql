CREATE TABLE "ClubFacility" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubFacility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FacilityPhoto" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubFacility_profileId_sortOrder_idx" ON "ClubFacility"("profileId", "sortOrder");
CREATE INDEX "FacilityPhoto_facilityId_createdAt_idx" ON "FacilityPhoto"("facilityId", "createdAt");

ALTER TABLE "ClubFacility"
ADD CONSTRAINT "ClubFacility_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FacilityPhoto"
ADD CONSTRAINT "FacilityPhoto_facilityId_fkey"
FOREIGN KEY ("facilityId") REFERENCES "ClubFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ClubFacility" ("id", "profileId", "name", "sortOrder", "createdAt", "updatedAt")
SELECT
  'legacy_' || md5("id" || COALESCE("details"->>'facilities', '')),
  "id",
  LEFT("details"->>'facilities', 120),
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Profile"
WHERE "category" = 'CLUB'
  AND NULLIF(TRIM(COALESCE("details"->>'facilities', '')), '') IS NOT NULL;

UPDATE "Profile"
SET "verification" = 'UNVERIFIED'
WHERE "category" = 'CLUB'
  AND "verification" = 'VERIFIED';
