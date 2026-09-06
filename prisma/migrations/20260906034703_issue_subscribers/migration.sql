-- CreateTable
CREATE TABLE "IssueSubscriber" (
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueSubscriber_pkey" PRIMARY KEY ("issueId","userId")
);

-- CreateIndex
CREATE INDEX "IssueSubscriber_userId_idx" ON "IssueSubscriber"("userId");

-- AddForeignKey
ALTER TABLE "IssueSubscriber" ADD CONSTRAINT "IssueSubscriber_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueSubscriber" ADD CONSTRAINT "IssueSubscriber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
