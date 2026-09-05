import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { LegalCheckerService } from '../services/legalChecker';

const legal = new LegalCheckerService();

export const legalRouter = router({
  validate: publicProcedure
    .input(z.object({ recordType: z.string(), payload: z.any() }))
    .mutation(({ input }) => legal.validateLegalRecord(input.recordType, input.payload)),
});
