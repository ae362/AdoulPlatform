import { z } from 'zod';
import { marriageRecordSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { publicProcedure, protectedProcedure, router } from './trpc';
import { fileUploadSchema, uploadDocument } from '../utils/storage';
import { sanitizePostgrestValue, sanitizePlainText } from '../utils/inputSanitizer';

const documentSelectFields =
  'id,file_name,file_url,file_type,file_size,subject,ocr_raw_text,ocr_detected_fields,created_at';
const marriageSelect = `*, marriage_documents(${documentSelectFields})`;

const idInput = z.object({ id: z.string() });

const marriageDocumentUploadSchema = fileUploadSchema.extend({
  subject: z.enum(['husband', 'wife', 'other']).optional(),
  ocr_raw_text: z.string().optional(),
  ocr_detected_fields: z.record(z.string(), z.string()).optional(),
});

const marriageCreateSchema = marriageRecordSchema.extend({
  uploaded_files: z.array(marriageDocumentUploadSchema).optional(),
});

const marriageUpdateSchema = marriageRecordSchema.extend({
  id: z.string(),
  uploaded_files: z.array(marriageDocumentUploadSchema).optional(),
});

type MarriageDocumentUpload = z.infer<typeof marriageDocumentUploadSchema>;

function normalizeMarriageRecord<T extends Record<string, unknown>>(row: T) {
  const { marriage_documents, ...rest } = row as T & { marriage_documents?: unknown[] };
  return { ...rest, documents: (marriage_documents as unknown[]) ?? [] };
}

async function fetchMarriageRecordWithDocuments(id: string) {
  const { data, error } = await supabase.from('marriage_records').select(marriageSelect).eq('id', id).single();
  if (error) throw new Error(error.message);
  return normalizeMarriageRecord(data);
}

async function attachMarriageDocuments(recordId: string, files?: MarriageDocumentUpload[] | null) {
  if (!files || files.length === 0) return null;
  type InsertPayload = {
    marriage_record_id: string;
    file_name: string;
    file_url: string;
    storage_path: string;
    file_type?: string | null;
    file_size?: number | null;
    subject?: string | null;
    ocr_raw_text?: string | null;
    ocr_detected_fields?: Record<string, string> | null;
  };
  const inserts: InsertPayload[] = [];
  let primaryDocument: { url: string; name: string } | null = null;
  for (const file of files) {
    const uploaded = await uploadDocument(file);
    inserts.push({
      marriage_record_id: recordId,
      file_name: file.name,
      file_url: uploaded.url,
      storage_path: uploaded.path,
      file_type: file.type ?? null,
      file_size: file.size ?? null,
      subject: file.subject ?? null,
      ocr_raw_text: file.ocr_raw_text ?? null,
      ocr_detected_fields: file.ocr_detected_fields ?? null,
    });
    if (!primaryDocument) {
      primaryDocument = { url: uploaded.url, name: file.name };
    }
  }
  if (inserts.length > 0) {
    const { error } = await supabase.from('marriage_documents').insert(inserts);
    if (error) throw new Error(error.message);
  }
  return primaryDocument;
}

export const marriageRecordsRouter = router({
  list: protectedProcedure
    .input(z.object({ cin: z.string().optional(), type: z.string().optional() }).optional())
    .query(async ({ input }) => {
      let query = supabase.from('marriage_records').select(marriageSelect);

      if (input?.cin) {
        // Filter by either husband or wife CIN.
        const safeCin = sanitizePostgrestValue(input.cin);
        query = query.or(`husband_cin.eq.${safeCin},wife_cin.eq.${safeCin}`);
      }
      if (input?.type) {
        query = query.eq('record_type', sanitizePlainText(input.type));
      }

      const { data, error } = await query.order('inclusion_date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => normalizeMarriageRecord(row));
    }),

  create: protectedProcedure.input(marriageCreateSchema).mutation(async ({ input, ctx }) => {
    const { id, uploaded_files, ...rest } = input;
    
    // Extract OCR data from uploaded files if available
    let ocrData: Record<string, string> = {};
    if (uploaded_files?.length) {
      uploaded_files.forEach(file => {
        if (file.ocr_detected_fields) {
          ocrData = { ...ocrData, ...file.ocr_detected_fields };
        }
      });
    }
    
    const payload = { 
      ...rest,
      husband_name: sanitizePlainText(rest.husband_name || ''),
      wife_name: sanitizePlainText(rest.wife_name || ''),
      husband_cin: sanitizePostgrestValue(rest.husband_cin || ''),
      wife_cin: sanitizePostgrestValue(rest.wife_cin || ''),
      // Store consolidated OCR extracted data for reference
      ...(Object.keys(ocrData).length > 0 && { ocr_metadata: ocrData })
    };
    
    const { data, error } = await supabase
      .from('marriage_records')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    if (uploaded_files?.length) {
      const primaryDocument = await attachMarriageDocuments(data.id, uploaded_files);
      if (primaryDocument && !data.document_url) {
        await supabase
          .from('marriage_records')
          .update({ document_url: primaryDocument.url, document_name: primaryDocument.name })
          .eq('id', data.id);
      }
    }
    return fetchMarriageRecordWithDocuments(data.id);
  }),

  update: protectedProcedure.input(marriageUpdateSchema).mutation(async ({ input, ctx }) => {
    const { id, uploaded_files, ...rest } = input;
    const payload: any = { ...rest };
    if (payload.husband_name) payload.husband_name = sanitizePlainText(payload.husband_name);
    if (payload.wife_name) payload.wife_name = sanitizePlainText(payload.wife_name);
    if (payload.husband_cin) payload.husband_cin = sanitizePostgrestValue(payload.husband_cin);
    if (payload.wife_cin) payload.wife_cin = sanitizePostgrestValue(payload.wife_cin);

    const { data, error } = await supabase
      .from('marriage_records')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    if (uploaded_files?.length) {
      const primaryDocument = await attachMarriageDocuments(id, uploaded_files);
      if (primaryDocument && !data.document_url) {
        await supabase
          .from('marriage_records')
          .update({ document_url: primaryDocument.url, document_name: primaryDocument.name })
          .eq('id', id);
      }
    }
    return fetchMarriageRecordWithDocuments(id);
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const { error } = await supabase.from('marriage_records').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),
});
