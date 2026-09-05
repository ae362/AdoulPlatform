/**
 * Types for Judicial Mobility Notification System
 * إدارة إشعارات وتوجيهات التنقل القضائي للعدول
 */

export type NotificationStatus = 
  | 'قيد_المعالجة' // under processing
  | 'انتظار_استعلام' // awaiting inquiry
  | 'موافق_عليه' // approved
  | 'موافق_مع_شروط' // approved with conditions
  | 'مرفوض' // rejected
  | 'مؤجل' // postponed
  | 'منتهي_الصلاحية'; // expired

export type DecisionType = 
  | 'موافقة'
  | 'موافقة_مع_شروط'
  | 'رفض'
  | 'تأجيل';

export type CertificateType = 
  | 'زواج'
  | 'طلاق'
  | 'وصية'
  | 'إشهادات_عقارية'
  | 'سماسرة'
  | 'مالية'
  | 'أخرى';

export type DurationUnit = 'ساعة' | 'يوم' | 'تاريخ_محدد';

export interface NotaryInfo {
  id: string;
  fullName: string;
  professionalNumber: string;
  officeNumber: string;
  jurisdiction: string;
  userId: string;
}

export interface JudicialNotification {
  id: string;
  notificationNumber: string; // e.g., 2026/GRC-TET/N-00817
  notaryId: string;
  notary: NotaryInfo;
  targetCourt: string;
  certificateType: CertificateType;
  reasonForMovement: string;
  requestedDuration: {
    value: number;
    unit: DurationUnit;
  };
  status: NotificationStatus;
  attachments?: string[];
  notes?: string;
  internalNotes?: string; // visible only to council
  createdAt: Date;
  createdBy: string; // regional council user ID
  updatedAt: Date;
  updatedBy?: string;
}

export interface Decision {
  id: string;
  notificationId: string;
  decisionType: DecisionType;
  reasoning: string; // required for rejection
  conditions?: string[];
  decidedBy: string; // regional council user ID
  decidedAt: Date;
  validUntil?: Date;
  professionalRemarks?: string;
}

export interface OfficialDocument {
  id: string;
  decisionId: string;
  documentNumber: string;
  documentType: 'قرار' | 'موافقة' | 'رفض';
  content: string; // full document content
  issueDate: Date;
  qrCode?: string; // for verification
  signature?: string; // digital signature
  seal?: string; // electronic seal
  isPrinted: boolean;
  isArchived: boolean;
  shareToken?: string; // for sharing via email
}

export interface Exchange {
  id: string;
  notificationId: string;
  type: 'استعلام' | 'رد' | 'ملاحظة' | 'تعديل';
  sender: string; // user ID
  senderRole: 'notary' | 'council';
  message: string;
  attachments?: string[];
  isVisibleToNotary: boolean; // internal notes not visible to notary
  createdAt: Date;
}

export interface Archive {
  id: string;
  notificationId: string;
  decisionId?: string;
  documentId?: string;
  category: 'عدل' | 'محكمة' | 'سنة' | 'نوع' | 'حالة' | 'رقم_إداري';
  archivedAt: Date;
  archivedBy: string;
}

export interface DashboardStats {
  totalIncoming: number;
  totalApproved: number;
  totalRejected: number;
  totalPostponed: number;
  averageProcessingTime: number; // in hours
  notificationsByNotary: Record<string, number>;
  notificationsByCourt: Record<string, number>;
  notificationsByType: Record<string, number>;
  notificationsByStatus: Record<string, number>;
}

export interface NotaryDashboard {
  totalSubmitted: number;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  averageWaitingTime: number; // in hours
  lastNotifications: JudicialNotification[];
}
