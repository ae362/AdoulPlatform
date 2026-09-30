import React from 'react';
import type { DocumentType } from '../../constants/feesAgentLocales';
import type { DocumentWizardProps } from './types';

// Marriage
import { MarriageWizard } from './documents/marriage/MarriageWizard';
import { MixedMarriageWizard } from './documents/marriage/MixedMarriageWizard';
import { MarriageContinuityWizard } from './documents/marriage/MarriageContinuityWizard';
import { MarriageJudicialRulingWizard } from './documents/marriage/MarriageJudicialRulingWizard';

// Divorce
import { DivorceWizard } from './documents/divorce/DivorceWizard';

// Property
import { SalePersonWizard } from './documents/property/SalePersonWizard';
import { SaleEntityWizard } from './documents/property/SaleEntityWizard';
import { SaleJointPropertyWizard } from './documents/property/SaleJointPropertyWizard';
import { RentToOwnWizard } from './documents/property/RentToOwnWizard';
import { LongTermLeaseWizard } from './documents/property/LongTermLeaseWizard';
import { WaqfWizard } from './documents/property/WaqfWizard';
import { AirRightsSaleWizard } from './documents/property/AirRightsSaleWizard';
import { SurfaceRightsWizard } from './documents/property/SurfaceRightsWizard';
import { OrnamentalRightWizard } from './documents/property/OrnamentalRightWizard';
import { BuildingProofWizard } from './documents/property/BuildingProofWizard';
import { OmraWizard } from './documents/property/OmraWizard';
import { OffPlanInitialSaleWizard } from './documents/property/OffPlanInitialSaleWizard';
import { OffPlanFinalSaleWizard } from './documents/property/OffPlanFinalSaleWizard';
import { MalakiyaWizard } from './documents/property/MalakiyaWizard';
import { PossessionWizard } from './documents/property/PossessionWizard';
import { PartitionWizard } from './documents/property/PartitionWizard';
import { MunakalaWizard } from './documents/property/MunakalaWizard';
import { GiftWizard } from './documents/property/GiftWizard';
import { GiftRevocationWizard } from './documents/property/GiftRevocationWizard';
import { SadaqaWizard } from './documents/property/SadaqaWizard';
import { MortgageWizard } from './documents/other/MortgageWizard';
import { PromiseToSellWizard } from './documents/property/PromiseToSellWizard';
import { PromiseToLeaseWizard } from './documents/property/PromiseToLeaseWizard';
import { LeaseWizard } from './documents/property/LeaseWizard';
import { DeliveryWithCompensationWizard } from './documents/property/DeliveryWithCompensationWizard';
import { AcknowledgmentWizard } from './documents/property/AcknowledgmentWizard';

// Commercial
import { BusinessSaleWizard } from './documents/commercial/BusinessSaleWizard';

// Inheritance
import { InheritanceWizard } from './documents/inheritance/InheritanceWizard';
import { EstateInventoryWizard } from './documents/inheritance/EstateInventoryWizard';
import { ProofOfEstateWizard } from './documents/inheritance/ProofOfEstateWizard';
import { FaridahStatementWizard } from './documents/inheritance/FaridahStatementWizard';
import { WillWizard } from './documents/inheritance/WillWizard';

// Other
import { TawkilWizard } from './documents/other/TawkilWizard';
import { PaternityAcknowledgmentWizard } from './documents/other/PaternityAcknowledgmentWizard';
import { LineageProofWizard } from './documents/other/LineageProofWizard';
import { MaritalAssetsAgreementWizard } from './documents/other/MaritalAssetsAgreementWizard';
import { EasementProofWizard } from './documents/other/EasementProofWizard';
import { PossessoryMortgageWizard } from './documents/other/PossessoryMortgageWizard';
import { DebtDischargeWizard } from './documents/other/DebtDischargeWizard';
import { DebtAcknowledgmentWizard } from './documents/other/DebtAcknowledgmentWizard';
import { OtherDocumentWizard } from './documents/other/OtherDocumentWizard';
import { AgentDismissalWorkflow } from './documents/other/AgentDismissalWorkflow';
import { KafalaWizard } from './documents/other/KafalaWizard';
import { MentalDisabilityInquestWizard } from './documents/other/MentalDisabilityInquestWizard';
import { GuardianshipSuitabilityWizard } from './documents/other/GuardianshipSuitabilityWizard';
import { AbsenceInquestWizard } from './documents/other/AbsenceInquestWizard';
import { CorrectionAddendumWizard } from './documents/other/CorrectionAddendumWizard';
import { WitnessRecantationWizard } from './documents/other/WitnessRecantationWizard';

export const DOCUMENT_WIZARD_REGISTRY: Record<string, React.ComponentType<DocumentWizardProps>> = {
  // Marriage
  'زواج': MarriageWizard,
  'زواج_مختلط': MixedMarriageWizard,
  'رسم_استمرار_زواج': MarriageContinuityWizard,
  'توثيق_حكم_ثبوت_الزوجية': MarriageJudicialRulingWizard,

  // Divorce
  'الاشهاد_على_الطلاق_الاتفاقي': DivorceWizard,

  // Property
  'بيع_وشراء': SalePersonWizard,
  'بيع_وشراء_معنوي': SaleEntityWizard,
  'بيع_وشراء_ملكية_مشتركة': SaleJointPropertyWizard,
  'عقد_ايجار_المفضي_الى_تملك': RentToOwnWizard,
  'كراء_طويل_الامد': LongTermLeaseWizard,
  'عقد_تحبيس': WaqfWizard,
  'عقد_بيع_حق_الهواء_والتعلية': AirRightsSaleWizard,
  'عقد_تفويت_حق_السطحية': SurfaceRightsWizard,
  'ثبوت_زينة_عقار': OrnamentalRightWizard,
  'ثبوت_بناء': BuildingProofWizard,
  'عقد_العمري': OmraWizard,
  'بيع_وشراء_طور_انجاز_ابتدائي': OffPlanInitialSaleWizard,
  'بيع_وشراء_طور_انجاز_نهائي': OffPlanFinalSaleWizard,
  'ملكية': MalakiyaWizard,
  'حيازة': PossessionWizard,
  'مقاسمة': PartitionWizard,
  'مناقلة': MunakalaWizard,
  'هبة': GiftWizard,
  'اعتصار_هبة': GiftRevocationWizard,
  'صدقة': SadaqaWizard,
  'رهن': MortgageWizard,
  'وعد_بالبيع': PromiseToSellWizard,
  'وعد_بالكراء': PromiseToLeaseWizard,
  'كراء': LeaseWizard,
  'عقد_كراء': LeaseWizard,
  'رسم_كراء': LeaseWizard,
  'عقد كراء': LeaseWizard,
  'رسم كراء': LeaseWizard,
  'رسم_تسليم_بعوض': DeliveryWithCompensationWizard,
  'رسم_اقرار_واعتراف': AcknowledgmentWizard,

  // Commercial
  'بيع_اصل_تجاري': BusinessSaleWizard,
  'بيع_الأصل_التجاري': BusinessSaleWizard,
  'تفويت_اصل_تجاري': BusinessSaleWizard,
  'بيع اصل تجاري': BusinessSaleWizard,
  'بيع الأصل التجاري': BusinessSaleWizard,

  // Inheritance
  'اراثة': InheritanceWizard,
  'احصاء_متروك': EstateInventoryWizard,
  'ثبوت_مخلف': ProofOfEstateWizard,
  'بيان_فريضة': FaridahStatementWizard,
  'وصية': WillWizard,

  // Other
  'توكيل_رسمي': TawkilWizard,
  'رسم_الاقرار_ببنوة': PaternityAcknowledgmentWizard,
  'ثبوت_نسب_ببينة_السماع': LineageProofWizard,
  'اتفاق_تدبير_اموال_زوجية': MaritalAssetsAgreementWizard,
  'ثبوت_مرفق': EasementProofWizard,
  'رهن_حيازي': PossessoryMortgageWizard,
  'رسم_إبراء_من_دين': DebtDischargeWizard,
  'رسم_اقرار_بدين': DebtAcknowledgmentWizard,
  'عزل_وكيل': AgentDismissalWorkflow,
  'كفالة': KafalaWizard,
  'موجب_خلل_عقلي': MentalDisabilityInquestWizard,
  'موجب خلل عقلي': MentalDisabilityInquestWizard,
  'موجب_التقديم_والصلاحية': GuardianshipSuitabilityWizard,
  'موجب التقديم والصلاحية': GuardianshipSuitabilityWizard,
  'موجب_اثبات_غيبة': AbsenceInquestWizard,
  'موجب_إثبات_غيبة': AbsenceInquestWizard,
  'موجب إثبات غيبة': AbsenceInquestWizard,
  'موجب اثبات غيبة': AbsenceInquestWizard,
  'اعتصار هبة': GiftRevocationWizard,
  'ملحق_تصحيحي': CorrectionAddendumWizard,
  'رسم_ملحق_تصحيحي': CorrectionAddendumWizard,
  'ملحق تصحيحي': CorrectionAddendumWizard,
  'رسم ملحق تصحيحي': CorrectionAddendumWizard,
  'إسمحة': CorrectionAddendumWizard,
  'رسم_الإسمحة': CorrectionAddendumWizard,
  'رجوع_عن_شهادة': WitnessRecantationWizard,
  'رسم_الرجوع_عن_الشهادة': WitnessRecantationWizard,
  'رجوع في شهادة': WitnessRecantationWizard,
  'رسم الرجوع عن الشهادة': WitnessRecantationWizard,
  'رجوع_في_شهادة': WitnessRecantationWizard,
  'رجوع_شاهد': WitnessRecantationWizard,
  'رجوع_عدل': WitnessRecantationWizard,
  'أخرى': OtherDocumentWizard,
};

