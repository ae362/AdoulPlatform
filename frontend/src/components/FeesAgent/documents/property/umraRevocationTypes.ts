// ==============================================================================
// 🔄 اعتصار العمرى — Type Definitions (المواد 105-108 م.ح.ع)
// ==============================================================================

export type UmraOperationType =
  | 'اعتصار_العمرى'
  | 'انتهاء_العمرى_بانتهاء_مدتها'
  | 'انتهاء_العمرى_بوفاة_المعمر'
  | 'رجوع_المنفعة_الى_المعطي'
  | 'تنفيذ_شرط_في_رسم_العمرى'
  | 'انهاء_باتفاق';

export interface UmraOriginalDeed {
  sourceType: 'رسم_عدلي' | 'عقد_توثيقي' | 'حكم_قضائي' | 'وثيقة_أخرى';
  deedNumber: string;
  registerBook?: string;
  court?: string;
  creationDate: string;
  creationEra: 'سابقة_على_المدونة' | 'في_ظل_المدونة';
  notary?: string;
}

export interface UmraParty {
  name: string;
  cin: string;
  capacity?: string;
  dob?: string;
  address?: string;
  phone?: string;
  aliveStatus?: 'على_قيد_الحياة' | 'متوفى' | 'غير_معلوم';
}

export interface UmraProperty {
  registrationType: 'محفظ' | 'غير_محفظ' | 'في_طور_التحفيظ';
  titleNumber?: string;
  location?: {
    province?: string;
    commune?: string;
    propertyName?: string;
    address?: string;
  };
}

export interface UmraCondition {
  conditionText: string;
  category: string;
}

export interface UmraRevocationState {
  operationType: UmraOperationType;
  originalDeed?: UmraOriginalDeed;
  donor?: UmraParty;
  donee?: UmraParty;
  doneeStance?: string;
  poa?: {
    hasPoa?: boolean;
    poaNumber?: string;
  };
  property?: UmraProperty;
  retractionIntent?: {
    scope: 'كامل_العقار' | 'حصة_مشاعة' | 'جزء_مفرز';
    shareFraction?: string;
    partialDescription?: string;
  };
  conditions?: UmraCondition[];
  dispute?: {
    hasDispute?: boolean;
    courtName?: string;
    caseNumber?: string;
    disputeType?: string;
  };
  draftText?: string;
}
