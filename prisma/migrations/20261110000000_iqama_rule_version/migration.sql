-- CreateTable
CREATE TABLE "IqamaRuleVersion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "effectiveFrom" TEXT NOT NULL,
    "settings" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "IqamaRuleVersion_effectiveFrom_idx" ON "IqamaRuleVersion"("effectiveFrom");
