import { router, mergeRouters } from '../../../trpc';
import { draftsProcedures } from './drafts.router';
import { savedRasmsProcedures } from './savedRasms.router';
import { judgeSubmissionsProcedures } from './judgeSubmissions.router';
import { signedDeedsProcedures } from './signedDeeds.router';
import { secureArchiveProcedures } from './secureArchive.router';
import { dualSigningProcedures } from './dualSigning.router';

export const documentsRouter = mergeRouters(
  router(draftsProcedures),
  router(savedRasmsProcedures),
  router(judgeSubmissionsProcedures),
  router(signedDeedsProcedures),
  router(secureArchiveProcedures),
  router(dualSigningProcedures)
);

export { dualSigningProcedures };

