import { router } from '../trpc';
import { ocrRouter } from './subrouters/ocr.router';
import { validationRouter } from './subrouters/validation.router';
import { legalRouter } from './subrouters/legal.router';
import { complianceRouter } from './subrouters/compliance.router';
import { documentsRouter } from './subrouters/documents/index';

export * from './types';
export * from './helpers';
export * from './extractors';

export const feesAgentRouter = router({
  ocr: ocrRouter,
  validation: validationRouter,
  legal: legalRouter,
  documents: documentsRouter,
  compliance: complianceRouter,
});
