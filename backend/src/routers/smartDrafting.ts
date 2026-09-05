import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { 
  smartDraftingService, 
  IMMUTABLE_TEMPLATES, 
  JUDICIAL_VARIABLES_MAP, 
  type TemplateId,
  generateDocxFromText
} from '../services/smartDrafting';

export const smartDraftingRouter = router({
  // 1. List available templates
  listTemplates: publicProcedure.query(() => {
    return Object.keys(IMMUTABLE_TEMPLATES).map(id => ({
      id,
      name: id.replace(/_/g, ' '), // Simple formatting
    }));
  }),

  // 2. Get variables map for a template
  getTemplateVariables: publicProcedure
    .input(z.object({ templateId: z.string() }))
    .query(({ input }) => {
      const templateId = input.templateId as TemplateId;
      const variables = JUDICIAL_VARIABLES_MAP[templateId];
      
      if (!variables) {
        throw new Error('Template not found');
      }

      // Convert the map to a serializable format (removing Zod schemas)
      const serializableVariables: Record<string, any> = {};
      for (const [key, def] of Object.entries(variables)) {
        serializableVariables[key] = {
          source: def.source,
          required: def.required,
          label: def.label,
          // We don't send the Zod schema to the frontend directly
        };
      }
      
      return serializableVariables;
    }),

  // 3. Generate Draft
  generateDraft: publicProcedure
    .input(z.object({
      templateId: z.string(),
      data: z.record(z.any()),
    }))
    .mutation(async ({ input }) => {
      const templateId = input.templateId as TemplateId;
      
      // The service handles validation and generation
      const draft = await smartDraftingService.generateDraft(templateId, input.data);
      
      return {
        success: true,
        draft,
      };
    }),

  // 4. Generate DOCX from text (server-side, for stability)
  generateDocxFromText: publicProcedure
    .input(z.object({
      text: z.string().min(1, 'Text content is required'),
      templateBase64: z.string().min(1, 'Template base64 is required'),
    }))
    .mutation(async ({ input }) => {
      try {
        const docxBuffer = await generateDocxFromText(input.text, input.templateBase64);
        
        // Convert buffer to base64 for transmission
        const base64 = docxBuffer.toString('base64');
        
        return {
          success: true,
          base64,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: docxBuffer.length,
        };
      } catch (error: any) {
        throw new Error(`Failed to generate DOCX: ${error.message}`);
      }
    }),
});
