import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { DateService } from '../services/dates';

const dateService = new DateService();

export const dateRouter = router({
  // Current date in both calendars – useful for defaulting form fields.
  getCurrent: publicProcedure.query(async () => {
    return dateService.getCurrentDates();
  }),

  // Convert an ISO/Gregorian date string to Hijri.
  convertToHijri: publicProcedure
    .input(z.object({ gregorian: z.string() }))
    .query(({ input }) => ({
      hijri: dateService.convertGregorianToHijri(new Date(input.gregorian)),
    })),

  // Convert a Hijri date string (yyyy-mm-dd) back to Gregorian ISO string.
  convertToGregorian: publicProcedure
    .input(z.object({ hijri: z.string() }))
    .query(({ input }) => ({
      gregorian: dateService.convertHijriToGregorian(input.hijri).toISOString(),
    })),
});
