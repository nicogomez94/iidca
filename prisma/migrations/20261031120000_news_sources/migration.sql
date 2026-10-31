CREATE TYPE "NewsSource" AS ENUM ('IIDCA', 'CLUB');

ALTER TABLE "NewsArticle"
  ADD COLUMN "sourceType" "NewsSource" NOT NULL DEFAULT 'IIDCA',
  ADD COLUMN "clubId" TEXT,
  ADD COLUMN "externalUrl" TEXT;

CREATE INDEX "NewsArticle_clubId_published_idx" ON "NewsArticle"("clubId", "published");

ALTER TABLE "NewsArticle"
  ADD CONSTRAINT "NewsArticle_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
