-- Drop the AdhanConfigAudit audit trail table (feature removed)
DROP TABLE IF EXISTS "AdhanConfigAudit";

-- Remove the reason column from AdhanConfigVersion
-- SQLite does not support DROP COLUMN directly; recreate the table without it.
CREATE TABLE "AdhanConfigVersion_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "effectiveFrom" TEXT NOT NULL,
    "settings" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "AdhanConfigVersion_new" ("id", "effectiveFrom", "settings", "createdBy", "createdAt")
SELECT "id", "effectiveFrom", "settings", "createdBy", "createdAt"
FROM "AdhanConfigVersion";

DROP TABLE "AdhanConfigVersion";

ALTER TABLE "AdhanConfigVersion_new" RENAME TO "AdhanConfigVersion";

CREATE INDEX "AdhanConfigVersion_effectiveFrom_idx" ON "AdhanConfigVersion"("effectiveFrom");
