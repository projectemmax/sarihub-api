-- Marketplace category hierarchy migration
-- 1. Add hierarchy fields while keeping existing category IDs stable for Product.categoryId.
ALTER TABLE "Category" ADD COLUMN "slug" TEXT;
ALTER TABLE "Category" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill slugs from current names and deduplicate slug collisions safely.
WITH generated_slugs AS (
    SELECT
        "id",
        COALESCE(
            NULLIF(
                trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')),
                ''
            ),
            lower("id")
        ) AS base_slug
    FROM "Category"
),
ranked_slugs AS (
    SELECT
        "id",
        base_slug,
        row_number() OVER (PARTITION BY base_slug ORDER BY "id") AS slug_rank
    FROM generated_slugs
)
UPDATE "Category"
SET "slug" = CASE
    WHEN ranked_slugs.slug_rank = 1 THEN ranked_slugs.base_slug
    ELSE ranked_slugs.base_slug || '-' || ranked_slugs.slug_rank
END
FROM ranked_slugs
WHERE "Category"."id" = ranked_slugs."id";

-- 4. Enforce the new required slug field and marketplace indexes.
ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;
DROP INDEX IF EXISTS "Category_name_key";
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- 5. Add self-reference after the column exists.
ALTER TABLE "Category"
ADD CONSTRAINT "Category_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Category"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Remove the legacy medical-catalog fields from the category model.
ALTER TABLE "Category" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "Category" DROP COLUMN IF EXISTS "variantTemplate";
