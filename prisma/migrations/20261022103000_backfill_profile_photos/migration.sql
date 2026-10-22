INSERT INTO "ProfilePhoto" ("id", "profileId", "url", "createdAt")
SELECT
  'cover_' || md5("id" || "imageUrl"),
  "id",
  "imageUrl",
  CURRENT_TIMESTAMP
FROM "Profile"
WHERE "imageUrl" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "ProfilePhoto"
    WHERE "ProfilePhoto"."profileId" = "Profile"."id"
      AND "ProfilePhoto"."url" = "Profile"."imageUrl"
  );
