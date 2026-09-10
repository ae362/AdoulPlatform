import { router, mergeRouters } from '../../../trpc';
import { draftsProcedures } from './drafts.router';
import { savedRasmsProcedures } from './savedRasms.router';
import { judgeSubmissionsProcedures } from './judgeSubmissions.router';
import { signedDeedsProcedures } from './signedDeeds.router';
import { secureArchiveProcedures } from './secureArchive.router';

export const documentsRouter = mergeRouters(
  router(draftsProcedures),
  router(savedRasmsProcedures),
  router(judgeSubmissionsProcedures),
  router(signedDeedsProcedures),
  router(secureArchiveProcedures)
);
