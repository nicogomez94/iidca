CREATE UNIQUE INDEX "ClubVerificationRequest_one_pending_per_profile_idx"
ON "ClubVerificationRequest"("profileId")
WHERE "status" = 'PENDING';
