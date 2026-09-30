export type FinancialStatus = 'settled' | 'partial' | 'due' | 'followup';

export type PaymentMethod = 'نقد' | 'شيك' | 'تحويل بنكي';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
  remainingAfter: number;
}

export interface FinancialItem {
  key: 'registration_and_stamp' | 'notary_fee' | 'tax_declaration' | 'admin_certificates' | 'contract_incidentals';
  title: string;
  total: number;
  paid: number;
  remaining: number;
}

export type DeedWorkflowStatus =
  | 'مسودة_للمعاينة'
  | 'أرسلت_المسودة'
  | 'تمت_المعاينة'
  | 'توجد_ملاحظات'
  | 'تم_تحديث_المسودة'
  | 'تم_إنجاز_الرسم';

export interface CurrentDeedInfo {
  deedType: string;
  ledgerNumber: string;
  deedNumber: string;
  receiptDate: string;
  workflowStatus: DeedWorkflowStatus;
  statusNotes?: string;
  draftUrl?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'system' | 'client_feedback';
  iconType: 'send' | 'note' | 'money' | 'bell' | 'update' | 'check';
  title: string;
  description: string;
  author: string;
}

export interface PastDeedRecord {
  id: string;
  year: number;
  deedType: string;
  reference: string;
  fees: number;
  status: 'settled' | 'remaining';
  remainingAmount?: number;
  notes?: string;
}

export interface SmartAlert {
  id: string;
  type: 'financial' | 'followup' | 'correction' | 'procedure';
  title: string;
  description: string;
  date: string;
}

export interface ClientFollowUp {
  id: string;
  fullName: string;
  cin: string;
  phone: string;
  email: string;
  address: string;
  avatarColor?: string;
  currentDeed: CurrentDeedInfo;
  financials: {
    status: FinancialStatus;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
    items: FinancialItem[];
    payments: PaymentRecord[];
  };
  communications: TimelineEvent[];
  deedHistory: PastDeedRecord[];
  alerts: SmartAlert[];
  clientSinceYear: number;
}

export type InvoiceMode = 'comprehensive' | 'itemized' | 'statement';
export type ActiveDetailTab = 'financials' | 'documents' | 'communications' | 'history';
