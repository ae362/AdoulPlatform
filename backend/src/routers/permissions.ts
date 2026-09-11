import { router, publicProcedure, protectedProcedure, judgeProcedure, councilProcedure } from './trpc';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { uploadDocument, fileUploadSchema } from '../utils/storage';
import { sanitizePlainText, deepSanitizeObject } from '../utils/inputSanitizer';

const permissionSchema = z.object({
  fullName: z.string().min(1),
  professionalNumber: z.string().min(1),
  appointmentDecreeNumber: z.string().optional(),
  appointmentDate: z.string().optional(),
  officeNumber: z.string().optional(),
  jurisdiction: z.string().optional(),
  targetCourt: z.string().optional(),
  certificateType: z.string().optional(),
  receptionPlace: z.string().optional(),
  receptionDate: z.string().optional(),
  receptionTime: z.string().optional(),
  writingPlace: z.string().optional(),
  involvedNames: z.string().optional(),
  recipientType: z.enum(['judge', 'regional_council', 'both']).optional(),
  reasonForMovement: z.string().optional(),
  requestedDuration: z.string().optional(),
  durationUnit: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.union([z.string(), z.array(fileUploadSchema)]).optional(),
  notaryId: z.string().optional(),
  data: z.any().optional(),
});

type PermissionInput = z.infer<typeof permissionSchema>;

const permissionTypeTableMap = {
  scientific: 'scientific_certificate_permissions',
  marriage: 'marriage_permissions',
  judicialFees: 'judicial_fees_permissions',
  individualReception: 'individual_reception_permissions',
  workCertificate: 'work_certificate_requests',
  officeMovement: 'office_movement_notifications',
} as const;

type PermissionTypeKey = keyof typeof permissionTypeTableMap;

const parsePermissionData = (raw: unknown): Record<string, any> => {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, any>) };
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...(parsed as Record<string, any>) };
      }
    } catch {
      return {};
    }
  }
  return {};
};

const createPermissionHandler = async (input: PermissionInput, tableName: string) => {
  try {
    const requestNumber = `PERM-${Date.now()}`;
    
    // Handle file uploads if any
    let attachmentsString = '';
    if (typeof input.attachments === 'string') {
      attachmentsString = input.attachments;
    } else if (Array.isArray(input.attachments)) {
      const uploadPromises = input.attachments.map(file => uploadDocument(file));
      const results = await Promise.all(uploadPromises);
      attachmentsString = JSON.stringify(results.map(r => r.url));
    }

    const cleanData = input.data ? deepSanitizeObject(input.data) : {};

    const insertData = {
      request_number: requestNumber,
      notary_name: sanitizePlainText(input.fullName),
      notary_professional_number: sanitizePlainText(input.professionalNumber),
      notary_office_number: input.officeNumber ? sanitizePlainText(input.officeNumber) : null,
      jurisdiction: input.jurisdiction ? sanitizePlainText(input.jurisdiction) : null,
      target_court: input.targetCourt ? sanitizePlainText(input.targetCourt) : null,
      certificate_type: input.certificateType ? sanitizePlainText(input.certificateType) : null,
      appointment_decree_number: input.appointmentDecreeNumber ? sanitizePlainText(input.appointmentDecreeNumber) : null,
      appointment_date: input.appointmentDate ? sanitizePlainText(input.appointmentDate) : null,
      reception_place: input.receptionPlace ? sanitizePlainText(input.receptionPlace) : null,
      reception_date: input.receptionDate ? sanitizePlainText(input.receptionDate) : null,
      reception_time: input.receptionTime ? sanitizePlainText(input.receptionTime) : null,
      writing_place: input.writingPlace ? sanitizePlainText(input.writingPlace) : null,
      involved_names: input.involvedNames ? sanitizePlainText(input.involvedNames) : null,
      recipient_type: input.recipientType || 'judge',
      reason_for_movement: input.reasonForMovement ? sanitizePlainText(input.reasonForMovement) : null,
      notary_id: input.notaryId ? sanitizePlainText(input.notaryId) : null,
      status: 'قيد_المعالجة',
      notes: input.notes ? sanitizePlainText(input.notes) : null,
      attachments: attachmentsString,
      data: cleanData,
      requested_duration: parseInt(input.requestedDuration || '1', 10),
      duration_unit: input.durationUnit || 'يوم',
    };

    const { data, error } = await supabase
      .from(tableName)
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    // Dual-write to judicial_notifications if tableName is office_movement_notifications
    if (tableName === 'office_movement_notifications') {
      try {
        const certType = input.certificateType
          ? `إشعار بالتوجه: ${input.certificateType}`
          : 'إشعار بالتوجه خارج مكتب التعيين';

        await supabase.from('judicial_notifications').insert([{
          request_number: requestNumber,
          notary_name: input.fullName,
          notary_professional_number: input.professionalNumber,
          notary_office_number: input.officeNumber,
          jurisdiction: input.jurisdiction,
          target_court: input.targetCourt,
          certificate_type: certType,
          appointment_decree_number: input.appointmentDecreeNumber,
          appointment_date: input.appointmentDate,
          reception_place: input.receptionPlace,
          reception_date: input.receptionDate,
          reception_time: input.receptionTime,
          writing_place: input.writingPlace,
          involved_names: input.involvedNames,
          recipient_type: input.recipientType || 'judge',
          reason_for_movement: input.reasonForMovement,
          notary_id: input.notaryId,
          status: 'قيد_المعالجة',
          notes: input.notes || '',
          attachments: attachmentsString,
          requested_duration: parseInt(input.requestedDuration || '1', 10),
          duration_unit: input.durationUnit || 'يوم',
        }]);
      } catch (syncErr) {
        console.error('Failed to dual-insert office movement to judicial_notifications:', syncErr);
      }
    }

    return { success: true, permission: data };
  } catch (error: any) {
    throw new Error(`Failed to create permission in ${tableName}: ${error.message}`);
  }
};

const resolveScopedNotaryId = (ctx: any, requestedNotaryId?: string): string => {
  const isOversight =
    ctx.user?.role === 'authentication_judge' ||
    ctx.user?.role === 'regional_judge' ||
    ctx.user?.role === 'supreme_judge' ||
    ctx.user?.role === 'regional_adoul_council' ||
    ctx.user?.role === 'national_notary_authority' ||
    ctx.user?.role === 'admin';

  if (isOversight && requestedNotaryId) {
    return requestedNotaryId;
  }
  // Enforce self-scoping for notaries to prevent cross-account IDOR
  return ctx.notaryProfile?.id || ctx.user?.id || '';
};

const getPermissionsHandler = async (notaryId: string | undefined, tableName: string) => {
  try {
    if (!notaryId) {
      return [];
    }

    let query = supabase
      .from(tableName)
      .select('*')
      .eq('notary_id', notaryId)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error: any) {
    throw new Error(`Failed to fetch permissions from ${tableName}: ${error.message}`);
  }
};

const getAllPermissionsHandler = async (tableName: string) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error: any) {
    throw new Error(`Failed to fetch all permissions from ${tableName}: ${error.message}`);
  }
};

const updatePermissionStatusHandler = async (tableName: string, id: string, status: string, decisionType?: string, decisionSerialNumber?: string, reasoning?: string, judgeName?: string) => {
  try {
    const { data: existing } = await supabase
      .from(tableName)
      .select('data, recipient_type')
      .eq('id', id)
      .maybeSingle();

    const existingData = (existing?.data as Record<string, any>) || {};
    const updatedData: Record<string, any> = {
      ...existingData,
      judge_decision: {
        status,
        decision_type: decisionType,
        decision_serial_number: decisionSerialNumber,
        reasoning,
        judge_name: judgeName,
        decided_at: new Date().toISOString(),
      },
    };

    if (existingData?.council_decision) {
      updatedData.council_decision = existingData.council_decision;
    }

    const { data, error } = await supabase
      .from(tableName)
      .update({
        status,
        decision_type: decisionType,
        decision_serial_number: decisionSerialNumber,
        decision_reasoning: reasoning,
        judge_name: judgeName,
        data: updatedData,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (tableName === 'office_movement_notifications' && data?.request_number) {
      try {
        const jStatus = decisionType === 'موافقة' ? 'موافق_عليه' : (decisionType === 'رفض' ? 'مرفوض' : status);
        await supabase
          .from('judicial_notifications')
          .update({
            status: jStatus,
            decision_type: decisionType,
            decision_reasoning: reasoning,
            decision_serial_number: decisionSerialNumber,
            decided_at: new Date().toISOString(),
          })
          .eq('request_number', data.request_number);
      } catch (syncErr) {
        console.error('Failed to sync office movement decision to judicial_notifications:', syncErr);
      }
    }

    return { success: true, permission: data };
  } catch (error: any) {
    throw new Error(`Failed to update permission status in ${tableName}: ${error.message}`);
  }
};

const updatePermissionNotarySigningHandler = async (
  tableName: string,
  input: {
    id: string;
    signerSlot: 'adoul1' | 'adoul2';
    signerLabel: string;
    signerName: string;
    professionalNumber?: string;
    signatureDataUrl: string;
    bioHash: string;
    deviceInfo?: {
      serial?: string;
      firmware?: string;
      resolution?: string;
      pressureLevels?: string;
    };
    signedAt?: string;
  }
) => {
  try {
    const { data: existing, error: existingError } = await supabase
      .from(tableName)
      .select('id, data')
      .eq('id', input.id)
      .single();

    if (existingError) throw existingError;

    const currentData = parsePermissionData(existing?.data);
    const currentSigning = parsePermissionData(currentData.notarySigning);
    const currentSignatures = parsePermissionData(currentSigning.signatures);

    const nextSignatures = {
      ...currentSignatures,
      [input.signerSlot]: {
        slot: input.signerSlot,
        label: input.signerLabel,
        signerName: input.signerName,
        professionalNumber: input.professionalNumber || '',
        signatureDataUrl: input.signatureDataUrl,
        bioHash: input.bioHash,
        signedAt: input.signedAt || new Date().toISOString(),
        deviceInfo: input.deviceInfo || null,
      },
    };

    const allSigned = !!nextSignatures.adoul1?.signatureDataUrl && !!nextSignatures.adoul2?.signatureDataUrl;

    const nextData = {
      ...currentData,
      notarySigning: {
        ...currentSigning,
        enabled: true,
        completed: allSigned,
        completedAt: allSigned ? new Date().toISOString() : currentSigning.completedAt || null,
        signatures: nextSignatures,
      },
    };

    const { data, error } = await supabase
      .from(tableName)
      .update({ data: nextData })
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, permission: data };
  } catch (error: any) {
    throw new Error(`Failed to update notary signing in ${tableName}: ${error.message}`);
  }
};

export const permissionsRouter = router({
  // Scientific Certificate Permissions
  createScientific: protectedProcedure.input(permissionSchema).mutation(({ input }) => 
    createPermissionHandler(input, 'scientific_certificate_permissions')),
  getScientific: protectedProcedure.input(z.object({ notaryId: z.string().optional() })).query(({ input, ctx }) => 
    getPermissionsHandler(resolveScopedNotaryId(ctx, input.notaryId), 'scientific_certificate_permissions')),
  getAllScientific: judgeProcedure.query(() => 
    getAllPermissionsHandler('scientific_certificate_permissions')),

  // Marriage Permissions
  createMarriage: protectedProcedure.input(permissionSchema).mutation(({ input }) => 
    createPermissionHandler(input, 'marriage_permissions')),
  getMarriage: protectedProcedure.input(z.object({ notaryId: z.string().optional() })).query(({ input, ctx }) => 
    getPermissionsHandler(resolveScopedNotaryId(ctx, input.notaryId), 'marriage_permissions')),
  getAllMarriage: judgeProcedure.query(() => 
    getAllPermissionsHandler('marriage_permissions')),

  // Judicial Fees Permissions
  createJudicialFees: protectedProcedure.input(permissionSchema).mutation(({ input }) => 
    createPermissionHandler(input, 'judicial_fees_permissions')),
  getJudicialFees: protectedProcedure.input(z.object({ notaryId: z.string().optional() })).query(({ input, ctx }) => 
    getPermissionsHandler(resolveScopedNotaryId(ctx, input.notaryId), 'judicial_fees_permissions')),
  getAllJudicialFees: judgeProcedure.query(() => 
    getAllPermissionsHandler('judicial_fees_permissions')),

  // Individual Reception Permissions
  createIndividualReception: protectedProcedure.input(permissionSchema).mutation(({ input }) => 
    createPermissionHandler(input, 'individual_reception_permissions')),
  getIndividualReception: protectedProcedure.input(z.object({ notaryId: z.string().optional() })).query(({ input, ctx }) => 
    getPermissionsHandler(resolveScopedNotaryId(ctx, input.notaryId), 'individual_reception_permissions')),
  getAllIndividualReception: judgeProcedure.query(() => 
    getAllPermissionsHandler('individual_reception_permissions')),

  // Work Certificate Requests
  createWorkCertificate: protectedProcedure.input(permissionSchema).mutation(({ input }) => 
    createPermissionHandler(input, 'work_certificate_requests')),
  getWorkCertificates: protectedProcedure.input(z.object({ notaryId: z.string().optional() })).query(({ input, ctx }) => 
    getPermissionsHandler(resolveScopedNotaryId(ctx, input.notaryId), 'work_certificate_requests')),
  getAllWorkCertificates: judgeProcedure.query(() => 
    getAllPermissionsHandler('work_certificate_requests')),

  // Office Movement Notifications
  createOfficeMovement: protectedProcedure.input(permissionSchema).mutation(({ input }) => 
    createPermissionHandler(input, 'office_movement_notifications')),
  getOfficeMovements: protectedProcedure.input(z.object({ notaryId: z.string().optional() })).query(({ input, ctx }) => 
    getPermissionsHandler(resolveScopedNotaryId(ctx, input.notaryId), 'office_movement_notifications')),
  getAllOfficeMovements: judgeProcedure.query(() => 
    getAllPermissionsHandler('office_movement_notifications')),

  // Unified Update - Restricted to Judges & Councils
  updateStatus: protectedProcedure.input(z.object({
    id: z.string().min(1),
    type: z.enum(['scientific', 'marriage', 'judicialFees', 'individualReception', 'workCertificate', 'officeMovement']),
    status: z.string().min(1),
    decisionType: z.string().optional(),
    decisionSerialNumber: z.string().optional(),
    reasoning: z.string().optional(),
    judgeName: z.string().optional(),
  })).mutation(({ input, ctx }) => {
    // RBAC Defense: Only judicial officers or regional councils can update permission status
    const allowedRoles = ['authentication_judge', 'regional_judge', 'supreme_judge', 'regional_adoul_council', 'government_authority'];
    if (!ctx.user || !allowedRoles.includes(ctx.user.role)) {
      throw new Error('Security Error: Notaries are not authorized to decide on or approve permissions');
    }
    const safeReasoning = input.reasoning ? sanitizePlainText(input.reasoning) : undefined;
    const safeJudgeName = input.judgeName ? sanitizePlainText(input.judgeName) : (ctx.user.full_name || 'قاضي التوثيق');
    const safeSerial = input.decisionSerialNumber ? sanitizePlainText(input.decisionSerialNumber) : undefined;

    return updatePermissionStatusHandler(
      permissionTypeTableMap[input.type],
      input.id,
      sanitizePlainText(input.status),
      input.decisionType ? sanitizePlainText(input.decisionType) : undefined,
      safeSerial,
      safeReasoning,
      safeJudgeName
    );
  }),

  updateNotarySigning: protectedProcedure.input(z.object({
    id: z.string().min(1),
    type: z.enum(['scientific', 'marriage', 'judicialFees', 'individualReception', 'workCertificate', 'officeMovement']),
    signerSlot: z.enum(['adoul1', 'adoul2']),
    signerLabel: z.string(),
    signerName: z.string(),
    professionalNumber: z.string().optional(),
    signatureDataUrl: z.string().min(1),
    bioHash: z.string().min(1),
    signedAt: z.string().optional(),
    deviceInfo: z.object({
      serial: z.string().optional(),
      firmware: z.string().optional(),
      resolution: z.string().optional(),
      pressureLevels: z.string().optional(),
    }).optional(),
  })).mutation(({ input }) => {
    const tableName = permissionTypeTableMap[input.type as PermissionTypeKey];
    return updatePermissionNotarySigningHandler(tableName, {
      id: input.id,
      signerSlot: input.signerSlot,
      signerLabel: sanitizePlainText(input.signerLabel),
      signerName: sanitizePlainText(input.signerName),
      professionalNumber: input.professionalNumber ? sanitizePlainText(input.professionalNumber) : undefined,
      signatureDataUrl: input.signatureDataUrl,
      bioHash: input.bioHash,
      signedAt: input.signedAt,
      deviceInfo: input.deviceInfo,
    });
  }),
});
