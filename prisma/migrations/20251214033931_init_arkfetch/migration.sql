-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amountSat" INTEGER NOT NULL,
    "description" TEXT,
    "webhookUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "webhookStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentHash" TEXT NOT NULL,
    "invoice" TEXT NOT NULL,
    "metadata" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Charge_paymentHash_key" ON "Charge"("paymentHash");
