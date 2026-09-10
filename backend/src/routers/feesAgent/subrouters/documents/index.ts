import { router } from '../../../trpc';
import { draftsProcedures } from './drafts.router';
import { savedRasmsProcedures } from './savedRasms.router';
import { judgeSubmissionsProcedures } from './judgeSubmissions.router';
import { signedDeedsProcedures } from './signedDeeds.router';
import { secureArchiveProcedures } from './secureArchive.router';

export const documentsRouter = router({
  ...draftsProcedures,
  ...savedRasmsProcedures,
  ...judgeSubmissionsProcedures,
  ...signedDeedsProcedures,
  ...secureArchiveProcedures,
});
