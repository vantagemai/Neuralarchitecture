-- CreateTable
CREATE TABLE "DailyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "gastoTotal" REAL NOT NULL DEFAULT 0,
    "receitaTotal" REAL NOT NULL DEFAULT 0,
    "mer" REAL NOT NULL DEFAULT 0,
    "emq" REAL NOT NULL DEFAULT 0,
    "convTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '',
    "budget" REAL NOT NULL DEFAULT 0,
    "spent" REAL NOT NULL DEFAULT 0,
    "cpmr" REAL NOT NULL DEFAULT 0,
    "frequency" REAL NOT NULL DEFAULT 0,
    "hookRate" REAL NOT NULL DEFAULT 0,
    "holdRate" REAL NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "cpa" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OK',
    CONSTRAINT "Campaign_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "DailyRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Creative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pda" TEXT NOT NULL DEFAULT '',
    "daysRunning" INTEGER NOT NULL DEFAULT 0,
    "spent" REAL NOT NULL DEFAULT 0,
    "hookRate" REAL NOT NULL DEFAULT 0,
    "holdRate" REAL NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "cpa" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Testing',
    CONSTRAINT "Creative_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "DailyRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "cliques" INTEGER NOT NULL DEFAULT 0,
    "tbInicio" INTEGER NOT NULL DEFAULT 0,
    "taxaEntrada" REAL NOT NULL DEFAULT 0,
    "checkouts" INTEGER NOT NULL DEFAULT 0,
    "taxaCheckout" REAL NOT NULL DEFAULT 0,
    "compras" INTEGER NOT NULL DEFAULT 0,
    "taxaConv" REAL NOT NULL DEFAULT 0,
    "ticket" REAL NOT NULL DEFAULT 0,
    "upsells" INTEGER NOT NULL DEFAULT 0,
    "taxaUpsell" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Funnel_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "DailyRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Geo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "top1" TEXT NOT NULL DEFAULT '',
    "top2" TEXT NOT NULL DEFAULT '',
    "top3" TEXT NOT NULL DEFAULT '',
    "geoCaro" TEXT NOT NULL DEFAULT '',
    "excluidos" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Geo_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "DailyRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "pausados" TEXT NOT NULL DEFAULT '',
    "winners" TEXT NOT NULL DEFAULT '',
    "budgetAdj" TEXT NOT NULL DEFAULT '',
    "novos" TEXT NOT NULL DEFAULT '',
    "obs" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Decision_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "DailyRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecord_date_key" ON "DailyRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_recordId_key" ON "Funnel"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "Geo_recordId_key" ON "Geo"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_recordId_key" ON "Decision"("recordId");
