import {
  COMMAND_LAW,
  CANONICAL_COMMAND_AUTHORITY,
  CRANIUM_COMMAND_LAW_VERSION,
  assertCommandLawRequest,
  commandLawDigest,
  denyWithoutCanonicalAuthority,
} from '../src/kernel/commandLaw';
import type { AuthorityTransitionRequest } from '../src/kernel/types';

const request: AuthorityTransitionRequest = {
  requestId: 'law-check-request',
  idempotencyKey: 'law-check-request',
  subjectId: 'law-check-subject',
  requestedAuthority: { authorityClass: 'WORKING', weight: 0.45 },
  evidence: [],
  justification: 'constitutional law enforcement check',
  requesterId: 'law-check-subject',
  timestamp: 0,
  targetAuthorityVersion: 1,
  namespace: 'command-law-check',
};

assertCommandLawRequest(request, {
  namespace: 'command-law-check',
  subjectId: 'law-check-subject',
  issuer: CANONICAL_COMMAND_AUTHORITY,
});

let foreignIssuerBlocked = false;
try {
  assertCommandLawRequest(request, {
    namespace: 'command-law-check',
    subjectId: 'law-check-subject',
    issuer: 'not-cranium',
  });
} catch {
  foreignIssuerBlocked = true;
}
if (!foreignIssuerBlocked) throw new Error('COMMAND_LAW_CHECK_FAILED: foreign issuer was accepted');

let namespaceBlocked = false;
try {
  assertCommandLawRequest(request, {
    namespace: 'foreign-namespace',
    subjectId: 'law-check-subject',
    issuer: CANONICAL_COMMAND_AUTHORITY,
  });
} catch {
  namespaceBlocked = true;
}
if (!namespaceBlocked) throw new Error('COMMAND_LAW_CHECK_FAILED: namespace bypass was accepted');

const denied = denyWithoutCanonicalAuthority('test denial');
if (denied.allowed || denied.authoritySource !== CANONICAL_COMMAND_AUTHORITY) {
  throw new Error('COMMAND_LAW_CHECK_FAILED: fail-closed denial contract invalid');
}

if (!COMMAND_LAW.nonKernelAuthorityForbidden || !COMMAND_LAW.failClosed) {
  throw new Error('COMMAND_LAW_CHECK_FAILED: non-negotiable law flags are disabled');
}

console.log(`CRANIUM_COMMAND_LAW_SUMMARY: PASS version=${CRANIUM_COMMAND_LAW_VERSION} authority=${CANONICAL_COMMAND_AUTHORITY} digest=${commandLawDigest()} foreign-issuer=blocked namespace-bypass=blocked fail-closed=verified`);
