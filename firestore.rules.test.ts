import fs from 'fs';

/**
 * Security Rule Assertion Matrix for the 12 "Dirty Dozen" Adversarial Vectors + Collection Coverage.
 * Validates structural presence of all hardened guards in firestore.rules.
 */
const rulesContent = fs.readFileSync('./firestore.rules', 'utf8');

const assertions: { name: string; check: boolean }[] = [
  { name: '1. Global default-deny catch-all', check: rulesContent.includes('match /{document=**}') && rulesContent.includes('allow read, write: if false;') },
  { name: '2. Email verification mandate', check: rulesContent.includes('request.auth.token.email_verified == true') },
  { name: '3. ID poisoning guard', check: rulesContent.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')") },
  { name: '4. PII split collection isolation', check: rulesContent.includes('match /private/{docId}') },
  { name: '5. Self-assigned Super Admin blocked', check: rulesContent.includes("incoming().globalRole == 'USER'") },
  { name: '6. Cross-assessor isolation (PENILAI_1 vs PENILAI_2)', check: rulesContent.includes("incoming().assessorRole == 'PENILAI_1' && isPenilai1") && rulesContent.includes("incoming().assessorRole == 'PENILAI_2' && isPenilai2") },
  { name: '7. Terminal finalization & archive lock', check: rulesContent.includes("status != 'archived'") && rulesContent.includes('p1Finalized == false') && rulesContent.includes('p2Finalized == false') },
  { name: '8. Server timestamp enforcement', check: rulesContent.includes('incoming().updatedAt == request.time') && rulesContent.includes('incoming().createdAt == request.time') },
  { name: '9. Immutable auditLogs & scoreHistory', check: rulesContent.includes('match /auditLogs/{logId}') && rulesContent.includes('match /scoreHistory/{historyId}') && rulesContent.includes('allow update, delete: if false;') },
  { name: '10. Score range clamping (1..4)', check: rulesContent.includes('data.score >= 1 && data.score <= 4') },
  { name: '11. Query list boundary without get()', check: rulesContent.includes('request.auth.uid in resource.data.authorizedUids') },
  { name: '12. File size <= 50MB & self-verify block', check: rulesContent.includes('data.sizeBytes <= 52428800') && rulesContent.includes("incoming().verificationStatus in ['uploaded', 'pending']") },
  { name: '13. MasterAssessors Super Admin write guard', check: rulesContent.includes('match /masterAssessors/{assessorId}') && rulesContent.includes('isValidMasterAssessor') },
  { name: '14. Recommendations RTL tenant isolation', check: rulesContent.includes('match /recommendations/{recId}') && rulesContent.includes('isValidRecommendationItem') },
  { name: '15. Email-verified teamInvitations claim isolation', check: rulesContent.includes('match /teamInvitations/{inviteId}') && rulesContent.includes('request.auth.token.email == existing().invitedEmail') },
  { name: '16. MasterInstruments bounded indicators array guard', check: rulesContent.includes('data.indicators.size() <= 200') && rulesContent.includes('data.indicators[0] is map') },
];

const failed = assertions.filter((a) => !a.check);
if (failed.length > 0) {
  console.error('Security assertions failed:', failed);
  process.exit(1);
}
console.log(`All ${assertions.length} Firestore security assertions verified successfully.`);
