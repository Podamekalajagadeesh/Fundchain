-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authNonce" TEXT,
ADD COLUMN     "authNonceExpires" TIMESTAMP(3);
