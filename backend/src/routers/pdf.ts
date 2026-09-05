import { router, publicProcedure } from './trpc';
import { HtmlPdfFillerService } from '../services/htmlPdfFiller';
import { z } from 'zod';

const pdfFiller = new HtmlPdfFillerService();

const marriagePdfDataSchema = z.object({
  husband_name: z.string().optional(),
  husband_cin: z.string().optional(),
  husband_birth_date: z.string().optional(),
  husband_birth_place: z.string().optional(),
  husband_birth_cert_num: z.string().optional(),
  husband_birth_year: z.string().optional(),
  husband_nationality: z.string().optional(),
  husband_marital_status: z.string().optional(),
  husband_residence: z.string().optional(),
  husband_occupation: z.string().optional(),
  wife_name: z.string().optional(),
  wife_cin: z.string().optional(),
  wife_birth_date: z.string().optional(),
  wife_birth_place: z.string().optional(),
  wife_birth_cert_num: z.string().optional(),
  wife_birth_year: z.string().optional(),
  wife_nationality: z.string().optional(),
  wife_marital_status: z.string().optional(),
  wife_residence: z.string().optional(),
  wife_occupation: z.string().optional(),
  wife_father_name: z.string().optional(),
  wife_father_birth_date: z.string().optional(),
  wife_father_cin: z.string().optional(),
  inclusion_date: z.string().optional(),
  inclusion_hijri: z.string().optional(),
  marriage_authorization_no: z.string().optional(),
  engagement_cert_num: z.string().optional(),
  engagement_cert_date: z.string().optional(),
  dowry_amount: z.number().optional(),
  contracted_by: z.string().optional(),
  registry_book_type: z.string().optional(),
  registry_number: z.number().optional(),
  registry_count: z.number().optional(),
  registry_letter: z.string().optional(),
  registry_page: z.number().optional(),
  file_number: z.string().optional(),
  file_year: z.string().optional(),
  request_date_gregorian: z.string().optional(),
  request_date_hijri: z.string().optional(),
  court_city: z.string().optional(),
  court_appeal: z.string().optional(),
  court_first_instance: z.string().optional(),
  // Meeting time and date details
  meeting_time: z.string().optional(),
  meeting_day: z.string().optional(),
  hijri_day: z.string().optional(),
  hijri_month: z.string().optional(),
  hijri_year: z.string().optional(),
  gregorian_day: z.string().optional(),
  gregorian_month: z.string().optional(),
  gregorian_year: z.string().optional(),
  // Witnesses
  witness1_name: z.string().optional(),
  witness2_name: z.string().optional(),
  interactive_document_pages: z.array(z.string()).optional(),
});

export const pdfRouter = router({
  // OLD: Fill marriage certificate PDF using HTML template (4-page document)
  fillMarriageCertificate: publicProcedure
    .input(marriagePdfDataSchema)
    .mutation(async ({ input }) => {
      const pdfFiller = new HtmlPdfFillerService();
      const pdfBuffer = await pdfFiller.generateMarriagePdf(input);
      // Return base64 encoded PDF
      return {
        pdf: pdfBuffer.toString('base64'),
        filename: `marriage-certificate-${Date.now()}.pdf`,
      };
    }),

  // NEW: Generate authorization template (single-page document from screenshot)
  generateAuthorizationTemplate: publicProcedure
    .input(marriagePdfDataSchema)
    .mutation(async ({ input }) => {
      const pdfFiller = new HtmlPdfFillerService();
      const pdfBuffer = await pdfFiller.generateAuthorizationTemplate(input);
      // Return base64 encoded PDF
      return {
        pdf: pdfBuffer.toString('base64'),
        filename: `authorization-template-${Date.now()}.pdf`,
      };
    }),
});
