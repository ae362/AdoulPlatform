import { z } from 'zod';

const marriageDocumentSubjectSchema = z.enum(['husband', 'wife', 'other']);

export const notarySchema = z.object({
  id: z.string().optional(),
  full_name: z.string(),
  cin: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  appointment_number: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  office_location: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const marriageDocumentSchema = z.object({
  id: z.string(),
  marriage_record_id: z.string(),
  file_name: z.string(),
  file_url: z.string(),
  file_type: z.string().optional().nullable(),
  file_size: z.number().optional().nullable(),
  subject: marriageDocumentSubjectSchema.optional().nullable(),
  ocr_raw_text: z.string().optional().nullable(),
  ocr_detected_fields: z.record(z.string(), z.string()).optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

export const marriageRecordSchema = z.object({
  id: z.string().optional(),
  record_type: z.enum(['adult', 'minor', 'mixed', 'disabled']),
  fee_type: z.string(),
  inclusion_date: z.string(),
  inclusion_hijri: z.string(),
  husband_name: z.string(),
  husband_cin: z.string(),
  husband_birth_date: z.string().optional().nullable(),
  husband_nationality: z.string().optional().nullable(),
  husband_is_muslim: z.boolean().optional().nullable(),
  husband_marital_status: z.string().optional().nullable(),
  husband_residence: z.string().optional().nullable(),
  husband_occupation: z.string().optional().nullable(),
  wife_name: z.string(),
  wife_cin: z.string(),
  wife_birth_date: z.string().optional().nullable(),
  wife_nationality: z.string().optional().nullable(),
  wife_is_muslim: z.boolean().optional().nullable(),
  wife_marital_status: z.string().optional().nullable(),
  wife_residence: z.string().optional().nullable(),
  wife_occupation: z.string().optional().nullable(),
  is_minor_husband: z.boolean().default(false),
  is_minor_wife: z.boolean().default(false),
  minor_husband_permit_file_no: z.string().optional().nullable(),
  minor_wife_permit_file_no: z.string().optional().nullable(),
  mixed_marriage_husband_passport_no: z.string().optional().nullable(),
  mixed_marriage_wife_passport_no: z.string().optional().nullable(),
  husband_disability_type: z.string().optional().nullable(),
  wife_disability_type: z.string().optional().nullable(),
  marriage_authorization_no: z.string().optional().nullable(),
  dowry_amount: z.number().optional().nullable(),
  investment_of_assets_agreed: z.boolean().optional().nullable(),
  contracted_by: z.string().optional().nullable(),
  registry_book_type: z.string().optional().nullable(),
  registry_number: z.number().int().optional().nullable(),
  registry_count: z.number().int().optional().nullable(),
  registry_letter: z.string().optional().nullable(),
  registry_page: z.number().int().optional().nullable(),
  source_document_ref: z.string().optional().nullable(),
  document_url: z.string().optional().nullable(),
  document_name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  husband_previous_divorce_ref: z.string().optional().nullable(),
  documents: z.array(marriageDocumentSchema).optional().nullable(),
});

export const divorceRecordSchema = z.object({
  id: z.string().optional(),
  divorce_type: z.enum(['shiqaq', 'agreement', 'khul', 'mamluk', 'complete_three', 'bain']),
  fee_type: z.string(),
  inclusion_date: z.string(),
  inclusion_hijri: z.string(),
  husband_name: z.string(),
  husband_cin: z.string(),
  wife_name: z.string(),
  wife_cin: z.string(),
  judgment_number: z.string().optional().nullable(),
  divorce_witnessing_date: z.string().optional().nullable(),
  marriage_registry_number: z.string().optional().nullable(),
  marriage_registry_count: z.number().int().optional().nullable(),
  marriage_registry_page: z.number().int().optional().nullable(),
  divorce_registry_book_type: z.string().optional().nullable(),
  divorce_registry_number: z.number().int().optional().nullable(),
  divorce_registry_count: z.number().int().optional().nullable(),
  divorce_registry_letter: z.string().optional().nullable(),
  divorce_registry_page: z.number().int().optional().nullable(),
  husband_birth_date: z.string().optional().nullable(),
  wife_birth_date: z.string().optional().nullable(),
  occupations: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  number_of_children: z.number().int().optional().nullable(),
  cohabiting: z.boolean().optional().nullable(),
  document_url: z.string().optional().nullable(),
  document_name: z.string().optional().nullable(),
});

export const propertyFeeSchema = z.object({
  id: z.string().optional(),
  fee_type: z.string(),
  inclusion_date: z.string(),
  inclusion_hijri: z.string(),
  parties_names: z.string(),
  parties_cin: z.string(),
  transferor_name: z.string().optional().nullable(),
  transferor_parents_names: z.string().optional().nullable(),
  transferor_home_address: z.string().optional().nullable(),
  sellers_list: z
    .array(
      z.object({
        name: z.string(),
        cin: z.string().optional().nullable(),
        parents_names: z.string().optional().nullable(),
        home_address: z.string().optional().nullable(),
        fraction: z.number().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  // Multiple buyers support
  buyers_list: z.array(z.object({
    name: z.string(),
    cin: z.string(),
    parents_names: z.string().optional().nullable(),
    home_address: z.string().optional().nullable(),
    fraction: z.number().optional().nullable(),
  })).optional().nullable(),
  registration_and_stamp_ref: z.string().optional().nullable(),
  property_coordinates: z.string().optional().nullable(),
  property_length_m: z.number().optional().nullable(),
  property_width_m: z.number().optional().nullable(),
  property_area_m2: z.number().optional().nullable(),
  geo_latitude: z.number().optional().nullable(),
  geo_longitude: z.number().optional().nullable(),
  purchase_method: z.enum(['بيع', 'شراء', 'اعترافا', 'هبة', 'وصية']).optional().nullable(),
  registry_book_type: z.string().optional().nullable(),
  registry_number: z.number().int().optional().nullable(),
  registry_count: z.number().int().optional().nullable(),
  registry_letter: z.string().optional().nullable(),
  registry_page: z.number().int().optional().nullable(),
  source_document_ref: z.string().optional().nullable(),
  document_url: z.string().optional().nullable(),
  document_name: z.string().optional().nullable(),
});

export const inheritanceFeeSchema = z.object({
  id: z.string().optional(),
  fee_type: z.string(),
  inclusion_date: z.string(),
  inclusion_hijri: z.string(),
  deceased_name: z.string(),
  heirs_names: z.string(),
  applicants_cin: z.string().optional().nullable(),
  document_references: z.string().optional().nullable(),
  registry_book_type: z.string().optional().nullable(),
  registry_number: z.number().int().optional().nullable(),
  registry_count: z.number().int().optional().nullable(),
  registry_letter: z.string().optional().nullable(),
  registry_page: z.number().int().optional().nullable(),
  document_url: z.string().optional().nullable(),
  document_name: z.string().optional().nullable(),
});

export const otherDocumentFeeSchema = z.object({
  id: z.string().optional(),
  fee_type: z.string(),
  inclusion_date: z.string(),
  inclusion_hijri: z.string(),
  applicants_names: z.string(),
  applicants_cin: z.string(),
  document_refs: z.string().optional().nullable(),
  is_in_inheritance_registry: z.boolean().optional().nullable(),
  registry_number: z.number().int().optional().nullable(),
  registry_count: z.number().int().optional().nullable(),
  registry_page: z.number().int().optional().nullable(),
  document_url: z.string().optional().nullable(),
  document_name: z.string().optional().nullable(),
});

export const copyRequestSchema = z.object({
  id: z.string().optional(),
  record_type: z.string(),
  reference_ids: z.array(z.string()).optional().nullable(),
  requester_name: z.string(),
  requester_cin: z.string(),
  request_date: z.string(),
  status: z.enum(['pending', 'processed']).default('pending'),
  notes: z.string().optional().nullable(),
  primary_court: z.string().optional().nullable(),
  record_year: z.number().int().min(1900).optional().nullable(),
  record_details: z.record(z.unknown()).optional().nullable(),
  assigned_notary_ids: z.array(z.string()).optional().nullable(),
  routing_mode: z.enum(['direct', 'historical_selection']).optional().nullable(),
});

export const contractSchema = z.object({
  id: z.string().optional(),
  contract_type: z.string(),
  title: z.string(),
  body: z.string(),
  ai_notes: z.string().optional().nullable(),
  legal_review: z.any().optional().nullable(),
  storage_document_id: z.string().optional().nullable(),
});

export const contractTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  template_type: z.string(),
  content: z.string(),
});

export const registrationStampSchema = z.object({
  id: z.string().optional(),
  record_type: z.string(),
  record_id: z.string(),
  registration_number: z.string(),
  tax_value: z.number(),
  paid_date: z.string(),
  office: z.string(),
  receipt_ref: z.string().optional().nullable(),
});

export type Notary = z.infer<typeof notarySchema>;
export type MarriageRecord = z.infer<typeof marriageRecordSchema>;
export type MarriageDocument = z.infer<typeof marriageDocumentSchema>;
export type MarriageDocumentSubject = z.infer<typeof marriageDocumentSubjectSchema>;
export type DivorceRecord = z.infer<typeof divorceRecordSchema>;
export type PropertyFee = z.infer<typeof propertyFeeSchema>;
export type InheritanceFee = z.infer<typeof inheritanceFeeSchema>;
export type OtherDocumentFee = z.infer<typeof otherDocumentFeeSchema>;
export type CopyRequest = z.infer<typeof copyRequestSchema>;
export type Contract = z.infer<typeof contractSchema>;
export type ContractTemplate = z.infer<typeof contractTemplateSchema>;
export type RegistrationStamp = z.infer<typeof registrationStampSchema>;
