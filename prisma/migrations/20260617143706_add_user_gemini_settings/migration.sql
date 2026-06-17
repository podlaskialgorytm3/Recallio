-- AlterTable
ALTER TABLE "User" ADD COLUMN     "geminiApiKey" TEXT,
ADD COLUMN     "geminiModel" TEXT NOT NULL DEFAULT 'gemini-2.5-flash';
