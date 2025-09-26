-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "creatorHandle" TEXT;
ALTER TABLE "Entry" ADD COLUMN "dribbbleUserId" TEXT;

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'dribbble',
    "accessToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Token_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Consent" (
    "entryId" TEXT NOT NULL PRIMARY KEY,
    "sentAt" DATETIME,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "evidence" TEXT,
    "grantedAt" DATETIME,
    "scope" TEXT NOT NULL DEFAULT 'all_shots',
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    CONSTRAINT "Consent_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Consent" ("entryId", "evidence", "granted", "grantedAt", "sentAt") SELECT "entryId", "evidence", "granted", "grantedAt", "sentAt" FROM "Consent";
DROP TABLE "Consent";
ALTER TABLE "new_Consent" RENAME TO "Consent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Token_entryId_key" ON "Token"("entryId");
