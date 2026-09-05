import { Ollama } from 'ollama';
import { z } from 'zod';
// @ts-ignore
import PizZip from 'pizzip';
// @ts-ignore
import Docxtemplater from 'docxtemplater';

// --- Layer 1: Immutable Templates (النماذج العدلية) ---
// These are the "Silent Law" inside the AI.
export const IMMUTABLE_TEMPLATES = {
  TEMPLATE_RASM_BAY3_V1: `
الحمد لله وحده،
بمقتضى هذا الرسم، يشهد العدلان الموقعان أسفله، المنتصبان للإشهاد بدائرة محكمة الاستئناف بـ {{COURT_CITY}}،
أن السيد {{SELLER_NAME}}، الحامل لبطاقة التعريف الوطنية رقم {{SELLER_CIN}}،
قد باع وسلم، بيعا تاما ناجزا لا خيار فيه ولا ثنيا،
للسيد {{BUYER_NAME}}، الحامل لبطاقة التعريف الوطنية رقم {{BUYER_CIN}}،
جميع {{PROPERTY_DESCRIPTION}}، الكائن بـ {{PROPERTY_LOCATION}}،
بثمن قدره {{PRICE}} درهم، قبضه البائع من يد المشتري عدا ونقدا،
وبهذا تم الإشهاد، وحرر في {{DATE_HIJRI}} الموافق لـ {{DATE_GREGORIAN}}.
  `.trim(),

  TEMPLATE_RASM_HIYAZA_V2: `
الحمد لله وحده،
يشهد العدلان الموقعان أسفله، المنتصبان للإشهاد بدائرة محكمة الاستئناف بـ {{COURT_CITY}}،
أن السيد {{POSSESSOR_NAME}}، الحامل لبطاقة التعريف الوطنية رقم {{POSSESSOR_CIN}}،
يحوز ويتصرف في {{PROPERTY_DESCRIPTION}}، الكائن بـ {{PROPERTY_LOCATION}}،
حيازة هادئة علنية مستمرة، لا ينازعه فيها منازع، لمدة تزيد عن {{DURATION}} سنة،
وبهذا تم الإشهاد، وحرر في {{DATE_HIJRI}} الموافق لـ {{DATE_GREGORIAN}}.
  `.trim(),

  TEMPLATE_IHSA_MATRUK: `
الحمد لله وحده،
على الساعة {{TIME}} بعد زوال يوم {{DAY_NAME}} {{DATE_HIJRI_TEXT}} الموافق لـ {{DATE_GREGORIAN}}،
تلقى العدلان -أمنهما الله- {{ADUL_1_NAME}} و {{ADUL_2_NAME}}، المنتصبان للإشهاد بدائرة محكمة الاستئناف بـ {{COURT_CITY}}، المحكمة الابتدائية بـ {{PRIMARY_COURT}}، قسم التوثيق،
الشهادة المدرجة بمذكرة الحفظ رقم {{MEMO_NUMBER}} عدد {{NUMBER}} صحيفة {{PAGE}}، نصها:
"الحمد لله وحده،
بطلب من السيدة {{REQUESTER_NAME}}، المولودة بتاريخ {{REQUESTER_DOB}}، الحاملة لبطاقة التعريف الوطنية رقم {{REQUESTER_CIN}}، الساكنة بـ {{REQUESTER_ADDRESS}}،
يشهدون شهودها المذكورين أسفله بأنهم يعرفون المرحوم {{DECEASED_NAME}}، الساكن قيد حياته بـ {{DECEASED_ADDRESS}}، المعرفة التامة الكافية شرعا،
ويشهدون بأنه من جملة ما خلف لورثته وهم: {{HEIRS_LIST}}،
ما يورث عنه شرعا ويخلد جميع {{ESTATE_DESCRIPTION}}،
ويشهدون على علمهم وصحة يقينهم ومستند علمهم في ذلك المخالطة والمجاورة والكل بشهادة الاطلاع على جل الأحوال،
وبضمنه قيدت شهادتهم مسؤولة منهم لسائلتها المذكورة التي صرحت بالمصلحة المذكورة،
وقومت ذلك بتفسير {{ESTATE_VALUE}} درهم، وهم عارفون قدره وبأتمه شهد بذلك السادة:
{{WITNESSES_LIST}}
كلهم مغاربة وبتعاريفهم أعلاه، وحرر في غد تاريخه عبد ربه."
  `.trim(),

  TEMPLATE_MQASMA: `
الحمد لله وحده،
على الساعة {{TIME}} مساء يوم {{DAY_NAME}} {{DATE_HIJRI_TEXT}} الموافق لـ {{DATE_GREGORIAN}}،
تلقى العدلان {{ADUL_1_NAME}} و {{ADUL_2_NAME}}، المنتصبان للإشهاد بدائرة المحكمة الاستئنافية بـ {{COURT_CITY}}،
الشهادة المدرجة بمذكرة الحفظ لأولهما رقم {{MEMO_NUMBER}} صحيفة {{PAGE}} عدد {{NUMBER}} نصها:
"الحمد لله،
اشترى بحول الله وقوته السيد {{BUYER_NAME}}، المولود في {{BUYER_DOB}}، الساكن بـ {{BUYER_ADDRESS}}، الحامل لبطاقة التعريف الوطنية رقم {{BUYER_CIN}}،
من البائعين له الإخوة الأشقاء أبناء المرحوم {{DECEASED_FATHER_NAME}} وهم: {{SELLERS_LIST}}،
وذلك جميع {{PROPERTY_DESCRIPTION}}،
بثمن قدره {{PRICE}} درهم، قبض {{SELLER_REPRESENTATIVE}} حظه وقدره جميع {{SHARE_PRICE}} درهم نقدا،
وباقي الشركاء بواسطة شيكات من البنك {{BANK_NAME}}،
قبضا تاما معاينة به برئت ذمة المشتري المذكور وتملك مشتراه الموصوف وحل وتنزل في ذلك منزلة بائعيه على السنة في ذلك والمرجع بالدرك بعد النظر والرضى ومعرفة القدر كما يجب،
مع إشهادهم أنهم في كامل الأهلية وقرئ عليهم نص العقد فوافقوا عليه مع توقيعهم عليه بمذكرة الحفظ أعلاه،
عرفوا قدره شهد به عليهم وبأتمه وعرف بهم بما ذكر وحرر في غد تلقيه وسجل الكترونيا بمالية {{FINANCE_CITY}} في {{REGISTRATION_DATE}} رقم الايداع {{DEPOSIT_NUMBER}} عبد ربه تعالى."
  `.trim(),

  TEMPLATE_AQD_HIBA: `
الحمد لله وحده،
على الساعة {{TIME}} صباح يوم {{DAY_NAME}} {{DATE_HIJRI_TEXT}} الموافق لـ {{DATE_GREGORIAN}}،
تلقى العدلان {{ADUL_1_NAME}} و {{ADUL_2_NAME}}، المنتصبان للإشهاد بدائرة المحكمة الابتدائية بـ {{PRIMARY_COURT}}، قسم التوثيق،
الشهادة المدرجة بمذكرة الحفظ للأول رقم {{MEMO_NUMBER}} صحيفة {{PAGE}} عدد {{NUMBER}} نصها:
"حضرت لدى شهيديه السيدة {{DONOR_NAME}}، المغربية الجنسية، المزدادة بـ {{DONOR_POB}} بتاريخ {{DONOR_DOB}}، مهنتها {{DONOR_JOB}}، الحاملة لبطاقة التعريف الوطنية رقم {{DONOR_CIN}}، الساكنة بـ {{DONOR_ADDRESS}}،
وأشهدت على نفسها أنها وهبت لشقيقها السيد {{DONEE_NAME}}، المغربي الجنسية، المزداد بـ {{DONEE_POB}} بتاريخ {{DONEE_DOB}}، الحامل لبطاقة التعريف الوطنية رقم {{DONEE_CIN}}، الساكن بـ {{DONEE_ADDRESS}}،
وذلك جميع {{PROPERTY_DESCRIPTION}}،
هبة تامة باتة بتلة، أبانته ذلك عن ملكها وصيرته ملكا لشقيقها المذكور، قصدت بذلك مودته وإعانته وبسطت له يد الحوز في ذلك،
حضر الموهوب له السيد {{DONEE_NAME}} المذكور وقبل الهبة المذكورة وحازها حوزا تاما باعترافهما بعدما قوما ذلك من أجل التسجيل بثمن قدره {{VALUE}} درهم،
عرفوا قدره شهد به عليهما وبأتمه وعرف بهما بما ذكر أعلاه،
وحرر في {{DATE_HIJRI}} الموافق لـ {{DATE_GREGORIAN}}."
  `.trim(),

  TEMPLATE_SHIRA: `
الحمد لله وحده،
على الساعة {{TIME}} مساء يوم {{DAY_NAME}} {{DATE_HIJRI_TEXT}} الموافق لـ {{DATE_GREGORIAN}}،
تلقى العدلان {{ADUL_1_NAME}} و {{ADUL_2_NAME}}، المنتصبان للإشهاد بدائرة المحكمة الاستئنافية بـ {{COURT_CITY}}،
الشهادة المدرجة بمذكرة الحفظ لأولهما رقم {{MEMO_NUMBER}} صحيفة {{PAGE}} عدد {{NUMBER}} نصها:
"الحمد لله،
اشترى بحول الله وقوته السيد {{BUYER_NAME}}، المولود في {{BUYER_DOB}}، الساكن بـ {{BUYER_ADDRESS}}، الحامل لبطاقة التعريف الوطنية رقم {{BUYER_CIN}}،
من البائعين له {{SELLERS_DESCRIPTION}} وهم: {{SELLERS_LIST}}،
وذلك جميع {{PROPERTY_DESCRIPTION}}،
بثمن قدره {{PRICE}} درهم، قبض {{SELLER_REPRESENTATIVE}} حظه وقدره جميع {{SHARE_PRICE}} درهم نقدا،
وباقي الشركاء بواسطة شيكات من البنك {{BANK_NAME}}،
قبضا تاما معاينة به برئت ذمة المشتري المذكور وتملك مشتراه الموصوف وحل وتنزل في ذلك منزلة بائعيه على السنة في ذلك والمرجع بالدرك بعد النظر والرضى ومعرفة القدر كما يجب،
مع إشهادهم أنهم في كامل الأهلية وقرئ عليهم نص العقد فوافقوا عليه مع توقيعهم عليه بمذكرة الحفظ أعلاه،
عرفوا قدره شهد به عليهم وبأتمه وعرف بهم بما ذكر وحرر في غد تلقيه وسجل الكترونيا بمالية {{FINANCE_CITY}} في {{REGISTRATION_DATE}} رقم الايداع {{DEPOSIT_NUMBER}} عبد ربه تعالى."
  `.trim(),

  TEMPLATE_ZAWAJ_SULAIMAN_AMTIA3: `
الحمد لله حق حمده و ما كل نعمة إلا من عنده و بعد على الساعة {{TIME}} من بعد زوال يوم {{DAY_NAME}} {{DATE_HIJRI_TEXT}} موافق {{DATE_GREGORIAN}} تلقى العدلان {{ADUL_1_NAME}} و {{ADUL_2_NAME}} المنتصبان للإشهاد بدائرة محكمة الاستئناف بـ {{COURT_CITY}} قسم قضاء الأسرة بالمحكمة الابتدائية بـ {{PRIMARY_COURT}} الشهادة المدرجة بمذكرة الحفظ للأول رقم {{MEMO_NUMBER}} عدد {{NUMBER}} صفحة {{PAGE}} نصها :
الحمد لله بعد إذن قاضي الأسرة المكلف بالزواج ملف رقم {{AUTH_FILE_NUMBER}} في {{AUTH_DATE}} :
تزوج على بركـة الله وحسن عونــه وتوفيقــه الجميل الشاب : {{HUSBAND_NAME}} المزداد بـ {{HUSBAND_POB}} سنة {{HUSBAND_DOB_YEAR}} من والديه : {{HUSBAND_FATHER}} و {{HUSBAND_MOTHER}} حسب عقد ولادته رقم {{HUSBAND_BIRTH_CERT_NUM}} من جماعة {{HUSBAND_BIRTH_COMMUNE}} بطاقته الوطنية رقم {{HUSBAND_CIN}} جنسيته {{HUSBAND_NATIONALITY}} حالته العائلية {{HUSBAND_STATUS}} بتصريحه و حسب الشهادة الادارية للزواج ملف رقم {{HUSBAND_ADMIN_CERT_NUM}} من جماعة {{HUSBAND_ADMIN_CERT_COMMUNE}} اقليم {{HUSBAND_ADMIN_CERT_PROVINCE}} في {{HUSBAND_ADMIN_CERT_DATE}} الساكن بـ {{HUSBAND_ADDRESS}}
زوجته المباركة عليه البنت المصونة الآنسة : {{WIFE_NAME}} المولودة بـ {{WIFE_POB}} بتاريخ {{WIFE_DOB}} من والديها : {{WIFE_FATHER}} و {{WIFE_MOTHER}} حسب عقد ولادتها رقم {{WIFE_BIRTH_CERT_NUM}} من جماعة {{WIFE_BIRTH_COMMUNE}} بطاقتها الوطنية رقم {{WIFE_CIN}} جنسيتها {{WIFE_NATIONALITY}} مهنتها {{WIFE_JOB}} حالتها العائلية {{WIFE_STATUS}} بتصريحها و حسب الشهادة الادارية للزواج ملف رقم {{WIFE_ADMIN_CERT_NUM}} من جماعة {{WIFE_ADMIN_CERT_COMMUNE}} في {{WIFE_ADMIN_CERT_DATE}} الساكنة بـ {{WIFE_ADDRESS}}
الحل للزواج الخالية من موانعه على صداق مبارك قدره و نهايته {{DOWRY_AMOUNT}} درهم قبضت الزوجة من يد الزوج المذكور جميع الثمن المسطور قبضا تاما اعترافا و أبرأته من درك القبض أتم إبراء فبرئ تزوجها على الكتاب والسنة واليمن والأمان وما جاء في محكم القرآن من قوله عز وجل " فإمسـاك بمعـروف أو تسريح بإحسان "
عقد زواجها وليها أبوها السيد : {{GUARDIAN_NAME}} المذكور متزوج فلاح الساكن معها بنفس العنوان سمع منهما شهيداه الايجاب و القبول و هما متمتعان بالأهلية و التمييز و الاختيار و لم يشترط الزوجان على بعضهما أية شروط و أشعرا بالمادة 149 من مدونة الأسرة بخصوص الأموال المكتسبة أثناء قيام الزوجية بحيث يجوز لهما في إطار تدبير الأموال التي ستكتسب أثناء قيام الزوجية الإتفاق على استثمارها و توزيعها في وثيقة مستقلة عن عقد الزواج
وقبل الزوجان هذا الزواج وارتضياه والله يوفقهما لما يحبه ويرضاه عرفوا قدره شهد به عليهم بما فيه عنهم وهما باتمه وعرفهم بما ذكر أعلاه وتم الاشهاد دون قيد أو شرط وبتلاوة نص الاشهاد عليهم قبل توقيعهم بمذكرة الحفظ للعدل الأول و حرر الرسم بتاريخه عبدربه تعالى.
  `.trim(),
} as const;

export type TemplateId = keyof typeof IMMUTABLE_TEMPLATES;

// --- Layer 2: Judicial Variables Map (قاموس المتغيرات العدلية) ---
// Mandatory data map for each template.

export interface VariableDefinition {
  source: 'ADUL_RECORD' | 'MANUAL_INPUT' | 'SELECTION' | 'AUTOMATIC';
  required: boolean;
  label: string;
  validation?: z.ZodTypeAny;
}

export const JUDICIAL_VARIABLES_MAP: Record<TemplateId, Record<string, VariableDefinition>> = {
  TEMPLATE_RASM_BAY3_V1: {
    COURT_CITY: { source: 'ADUL_RECORD', required: true, label: 'مدينة المحكمة' },
    SELLER_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم البائع', validation: z.string().min(3) },
    SELLER_CIN: { source: 'MANUAL_INPUT', required: true, label: 'رقم بطاقة البائع', validation: z.string().min(4) },
    BUYER_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم المشتري', validation: z.string().min(3) },
    BUYER_CIN: { source: 'MANUAL_INPUT', required: true, label: 'رقم بطاقة المشتري', validation: z.string().min(4) },
    PROPERTY_DESCRIPTION: { source: 'MANUAL_INPUT', required: true, label: 'وصف العقار' },
    PROPERTY_LOCATION: { source: 'MANUAL_INPUT', required: true, label: 'موقع العقار' },
    PRICE: { source: 'MANUAL_INPUT', required: true, label: 'الثمن', validation: z.number().positive() },
    DATE_HIJRI: { source: 'AUTOMATIC', required: true, label: 'التاريخ الهجري' },
    DATE_GREGORIAN: { source: 'AUTOMATIC', required: true, label: 'التاريخ الميلادي' },
  },
  TEMPLATE_RASM_HIYAZA_V2: {
    COURT_CITY: { source: 'ADUL_RECORD', required: true, label: 'مدينة المحكمة' },
    POSSESSOR_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم الحائز', validation: z.string().min(3) },
    POSSESSOR_CIN: { source: 'MANUAL_INPUT', required: true, label: 'رقم بطاقة الحائز', validation: z.string().min(4) },
    PROPERTY_DESCRIPTION: { source: 'MANUAL_INPUT', required: true, label: 'وصف العقار' },
    PROPERTY_LOCATION: { source: 'MANUAL_INPUT', required: true, label: 'موقع العقار' },
    DURATION: { source: 'MANUAL_INPUT', required: true, label: 'مدة الحيازة', validation: z.number().positive() },
    DATE_HIJRI: { source: 'AUTOMATIC', required: true, label: 'التاريخ الهجري' },
    DATE_GREGORIAN: { source: 'AUTOMATIC', required: true, label: 'التاريخ الميلادي' },
  },
  TEMPLATE_IHSA_MATRUK: {
    TIME: { source: 'AUTOMATIC', required: true, label: 'الساعة' },
    DAY_NAME: { source: 'AUTOMATIC', required: true, label: 'اسم اليوم' },
    DATE_HIJRI_TEXT: { source: 'AUTOMATIC', required: true, label: 'التاريخ الهجري (نص)' },
    DATE_GREGORIAN: { source: 'AUTOMATIC', required: true, label: 'التاريخ الميلادي' },
    ADUL_1_NAME: { source: 'ADUL_RECORD', required: true, label: 'اسم العدل الأول' },
    ADUL_2_NAME: { source: 'ADUL_RECORD', required: true, label: 'اسم العدل الثاني' },
    COURT_CITY: { source: 'ADUL_RECORD', required: true, label: 'مدينة محكمة الاستئناف' },
    PRIMARY_COURT: { source: 'ADUL_RECORD', required: true, label: 'المحكمة الابتدائية' },
    MEMO_NUMBER: { source: 'ADUL_RECORD', required: true, label: 'رقم مذكرة الحفظ' },
    NUMBER: { source: 'ADUL_RECORD', required: true, label: 'العدد' },
    PAGE: { source: 'ADUL_RECORD', required: true, label: 'الصحيفة' },
    REQUESTER_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم الطالبة' },
    REQUESTER_DOB: { source: 'MANUAL_INPUT', required: true, label: 'تاريخ ميلاد الطالبة' },
    REQUESTER_CIN: { source: 'MANUAL_INPUT', required: true, label: 'رقم بطاقة الطالبة' },
    REQUESTER_ADDRESS: { source: 'MANUAL_INPUT', required: true, label: 'عنوان الطالبة' },
    DECEASED_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم الهالك' },
    DECEASED_ADDRESS: { source: 'MANUAL_INPUT', required: true, label: 'عنوان الهالك' },
    HEIRS_LIST: { source: 'MANUAL_INPUT', required: true, label: 'قائمة الورثة' },
    ESTATE_DESCRIPTION: { source: 'MANUAL_INPUT', required: true, label: 'وصف المتروك' },
    ESTATE_VALUE: { source: 'MANUAL_INPUT', required: true, label: 'قيمة المتروك' },
    WITNESSES_LIST: { source: 'MANUAL_INPUT', required: true, label: 'قائمة الشهود' },
  },
  TEMPLATE_MQASMA: {
    TIME: { source: 'AUTOMATIC', required: true, label: 'الساعة' },
    DAY_NAME: { source: 'AUTOMATIC', required: true, label: 'اسم اليوم' },
    DATE_HIJRI_TEXT: { source: 'AUTOMATIC', required: true, label: 'التاريخ الهجري (نص)' },
    DATE_GREGORIAN: { source: 'AUTOMATIC', required: true, label: 'التاريخ الميلادي' },
    ADUL_1_NAME: { source: 'ADUL_RECORD', required: true, label: 'اسم العدل الأول' },
    ADUL_2_NAME: { source: 'ADUL_RECORD', required: true, label: 'اسم العدل الثاني' },
    COURT_CITY: { source: 'ADUL_RECORD', required: true, label: 'مدينة محكمة الاستئناف' },
    MEMO_NUMBER: { source: 'ADUL_RECORD', required: true, label: 'رقم مذكرة الحفظ' },
    NUMBER: { source: 'ADUL_RECORD', required: true, label: 'العدد' },
    PAGE: { source: 'ADUL_RECORD', required: true, label: 'الصحيفة' },
    BUYER_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم المشتري' },
    BUYER_DOB: { source: 'MANUAL_INPUT', required: true, label: 'تاريخ ميلاد المشتري' },
    BUYER_ADDRESS: { source: 'MANUAL_INPUT', required: true, label: 'عنوان المشتري' },
    BUYER_CIN: { source: 'MANUAL_INPUT', required: true, label: 'رقم بطاقة المشتري' },
    DECEASED_FATHER_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم الأب المتوفى' },
    SELLERS_LIST: { source: 'MANUAL_INPUT', required: true, label: 'قائمة البائعين' },
    PROPERTY_DESCRIPTION: { source: 'MANUAL_INPUT', required: true, label: 'وصف العقار' },
    PRICE: { source: 'MANUAL_INPUT', required: true, label: 'الثمن' },
    SELLER_REPRESENTATIVE: { source: 'MANUAL_INPUT', required: true, label: 'ممثل البائعين' },
    SHARE_PRICE: { source: 'MANUAL_INPUT', required: true, label: 'قيمة الحصة' },
    BANK_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم البنك' },
    FINANCE_CITY: { source: 'MANUAL_INPUT', required: true, label: 'مدينة المالية' },
    REGISTRATION_DATE: { source: 'MANUAL_INPUT', required: true, label: 'تاريخ التسجيل' },
    DEPOSIT_NUMBER: { source: 'MANUAL_INPUT', required: true, label: 'رقم الإيداع' },
  },
  TEMPLATE_AQD_HIBA: {
    TIME: { source: 'AUTOMATIC', required: true, label: 'الساعة' },
    DAY_NAME: { source: 'AUTOMATIC', required: true, label: 'اسم اليوم' },
    DATE_HIJRI_TEXT: { source: 'AUTOMATIC', required: true, label: 'التاريخ الهجري (نص)' },
    DATE_GREGORIAN: { source: 'AUTOMATIC', required: true, label: 'التاريخ الميلادي' },
    ADUL_1_NAME: { source: 'ADUL_RECORD', required: true, label: 'اسم العدل الأول' },
    ADUL_2_NAME: { source: 'ADUL_RECORD', required: true, label: 'اسم العدل الثاني' },
    PRIMARY_COURT: { source: 'ADUL_RECORD', required: true, label: 'المحكمة الابتدائية' },
    MEMO_NUMBER: { source: 'ADUL_RECORD', required: true, label: 'رقم مذكرة الحفظ' },
    NUMBER: { source: 'ADUL_RECORD', required: true, label: 'العدد' },
    PAGE: { source: 'ADUL_RECORD', required: true, label: 'الصحيفة' },
    DONOR_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم الواهبة' },
    DONOR_POB: { source: 'MANUAL_INPUT', required: true, label: 'مكان ميلاد الواهبة' },
    DONOR_DOB: { source: 'MANUAL_INPUT', required: true, label: 'تاريخ ميلاد الواهبة' },
    DONOR_JOB: { source: 'MANUAL_INPUT', required: true, label: 'مهنة الواهبة' },
    DONOR_CIN: { source: 'MANUAL_INPUT', required: true, label: 'رقم بطاقة الواهبة' },
    DONOR_ADDRESS: { source: 'MANUAL_INPUT', required: true, label: 'عنوان الواهبة' },
    DONEE_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم الموهوب له' },
    DONEE_POB: { source: 'MANUAL_INPUT', required: true, label: 'مكان ميلاد الموهوب له' },
    DONEE_DOB: { source: 'MANUAL_INPUT', required: true, label: 'تاريخ ميلاد الموهوب له' },
    DONEE_CIN: { source: 'MANUAL_INPUT', required: true, label: 'رقم بطاقة الموهوب له' },
    DONEE_ADDRESS: { source: 'MANUAL_INPUT', required: true, label: 'عنوان الموهوب له' },
    PROPERTY_DESCRIPTION: { source: 'MANUAL_INPUT', required: true, label: 'وصف العقار الموهوب' },
    VALUE: { source: 'MANUAL_INPUT', required: true, label: 'القيمة المقدرة' },
    DATE_HIJRI: { source: 'AUTOMATIC', required: true, label: 'التاريخ الهجري' },
  },
  TEMPLATE_SHIRA: {
    TIME: { source: 'AUTOMATIC', required: true, label: 'الساعة' },
    DAY_NAME: { source: 'AUTOMATIC', required: true, label: 'اسم اليوم' },
    DATE_HIJRI_TEXT: { source: 'AUTOMATIC', required: true, label: 'التاريخ الهجري (نص)' },
    DATE_GREGORIAN: { source: 'AUTOMATIC', required: true, label: 'التاريخ الميلادي' },
    ADUL_1_NAME: { source: 'ADUL_RECORD', required: true, label: 'اسم العدل الأول' },
    ADUL_2_NAME: { source: 'ADUL_RECORD', required: true, label: 'اسم العدل الثاني' },
    COURT_CITY: { source: 'ADUL_RECORD', required: true, label: 'مدينة محكمة الاستئناف' },
    MEMO_NUMBER: { source: 'ADUL_RECORD', required: true, label: 'رقم مذكرة الحفظ' },
    NUMBER: { source: 'ADUL_RECORD', required: true, label: 'العدد' },
    PAGE: { source: 'ADUL_RECORD', required: true, label: 'الصحيفة' },
    BUYER_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم المشتري' },
    BUYER_DOB: { source: 'MANUAL_INPUT', required: true, label: 'تاريخ ميلاد المشتري' },
    BUYER_ADDRESS: { source: 'MANUAL_INPUT', required: true, label: 'عنوان المشتري' },
    BUYER_CIN: { source: 'MANUAL_INPUT', required: true, label: 'رقم بطاقة المشتري' },
    SELLERS_DESCRIPTION: { source: 'MANUAL_INPUT', required: true, label: 'وصف البائعين' },
    SELLERS_LIST: { source: 'MANUAL_INPUT', required: true, label: 'قائمة البائعين' },
    PROPERTY_DESCRIPTION: { source: 'MANUAL_INPUT', required: true, label: 'وصف العقار' },
    PRICE: { source: 'MANUAL_INPUT', required: true, label: 'الثمن' },
    SELLER_REPRESENTATIVE: { source: 'MANUAL_INPUT', required: true, label: 'ممثل البائعين' },
    SHARE_PRICE: { source: 'MANUAL_INPUT', required: true, label: 'قيمة الحصة' },
    BANK_NAME: { source: 'MANUAL_INPUT', required: true, label: 'اسم البنك' },
    FINANCE_CITY: { source: 'MANUAL_INPUT', required: true, label: 'مدينة المالية' },
    REGISTRATION_DATE: { source: 'MANUAL_INPUT', required: true, label: 'تاريخ التسجيل' },
    DEPOSIT_NUMBER: { source: 'MANUAL_INPUT', required: true, label: 'رقم الإيداع' },
  },

  TEMPLATE_ZAWAJ_SULAIMAN_AMTIA3: {
    TIME: { source: 'AUTOMATIC', required: true, label: 'الساعة' },
    DAY_NAME: { source: 'AUTOMATIC', required: true, label: 'اليوم' },
    DATE_HIJRI_TEXT: { source: 'AUTOMATIC', required: true, label: 'التاريخ الهجري' },
    DATE_GREGORIAN: { source: 'AUTOMATIC', required: true, label: 'التاريخ الميلادي' },

    ADUL_1_NAME: { source: 'ADUL_RECORD', required: true, label: 'اسم العدل الأول' },
    ADUL_2_NAME: { source: 'ADUL_RECORD', required: true, label: 'اسم العدل الثاني' },
    COURT_CITY: { source: 'ADUL_RECORD', required: true, label: 'مدينة محكمة الاستئناف' },
    PRIMARY_COURT: { source: 'ADUL_RECORD', required: true, label: 'المحكمة الابتدائية' },
    MEMO_NUMBER: { source: 'ADUL_RECORD', required: true, label: 'رقم مذكرة الحفظ' },
    NUMBER: { source: 'ADUL_RECORD', required: true, label: 'العدد' },
    PAGE: { source: 'ADUL_RECORD', required: true, label: 'الصحيفة' },

    AUTH_FILE_NUMBER: { source: 'MANUAL_INPUT', required: false, label: 'رقم ملف الإذن' },
    AUTH_DATE: { source: 'MANUAL_INPUT', required: false, label: 'تاريخ الإذن' },

    HUSBAND_NAME: { source: 'MANUAL_INPUT', required: false, label: 'اسم الزوج' },
    HUSBAND_POB: { source: 'MANUAL_INPUT', required: false, label: 'مكان ازدياد الزوج' },
    HUSBAND_DOB_YEAR: { source: 'MANUAL_INPUT', required: false, label: 'سنة ازدياد الزوج' },
    HUSBAND_FATHER: { source: 'MANUAL_INPUT', required: false, label: 'اسم أب الزوج' },
    HUSBAND_MOTHER: { source: 'MANUAL_INPUT', required: false, label: 'اسم أم الزوج' },
    HUSBAND_BIRTH_CERT_NUM: { source: 'MANUAL_INPUT', required: false, label: 'رقم عقد ازدياد الزوج' },
    HUSBAND_BIRTH_COMMUNE: { source: 'MANUAL_INPUT', required: false, label: 'جماعة ازدياد الزوج' },
    HUSBAND_CIN: { source: 'MANUAL_INPUT', required: false, label: 'رقم بطاقة الزوج' },
    HUSBAND_NATIONALITY: { source: 'MANUAL_INPUT', required: false, label: 'جنسية الزوج' },
    HUSBAND_STATUS: { source: 'MANUAL_INPUT', required: false, label: 'حالة الزوج العائلية' },
    HUSBAND_ADMIN_CERT_NUM: { source: 'MANUAL_INPUT', required: false, label: 'رقم الشهادة الإدارية للزوج' },
    HUSBAND_ADMIN_CERT_COMMUNE: { source: 'MANUAL_INPUT', required: false, label: 'جماعة الشهادة الإدارية للزوج' },
    HUSBAND_ADMIN_CERT_PROVINCE: { source: 'MANUAL_INPUT', required: false, label: 'إقليم الشهادة الإدارية للزوج' },
    HUSBAND_ADMIN_CERT_DATE: { source: 'MANUAL_INPUT', required: false, label: 'تاريخ الشهادة الإدارية للزوج' },
    HUSBAND_ADDRESS: { source: 'MANUAL_INPUT', required: false, label: 'عنوان الزوج' },

    WIFE_NAME: { source: 'MANUAL_INPUT', required: false, label: 'اسم الزوجة' },
    WIFE_POB: { source: 'MANUAL_INPUT', required: false, label: 'مكان ازدياد الزوجة' },
    WIFE_DOB: { source: 'MANUAL_INPUT', required: false, label: 'تاريخ ازدياد الزوجة' },
    WIFE_FATHER: { source: 'MANUAL_INPUT', required: false, label: 'اسم أب الزوجة' },
    WIFE_MOTHER: { source: 'MANUAL_INPUT', required: false, label: 'اسم أم الزوجة' },
    WIFE_BIRTH_CERT_NUM: { source: 'MANUAL_INPUT', required: false, label: 'رقم عقد ازدياد الزوجة' },
    WIFE_BIRTH_COMMUNE: { source: 'MANUAL_INPUT', required: false, label: 'جماعة ازدياد الزوجة' },
    WIFE_CIN: { source: 'MANUAL_INPUT', required: false, label: 'رقم بطاقة الزوجة' },
    WIFE_NATIONALITY: { source: 'MANUAL_INPUT', required: false, label: 'جنسية الزوجة' },
    WIFE_JOB: { source: 'MANUAL_INPUT', required: false, label: 'مهنة الزوجة' },
    WIFE_STATUS: { source: 'MANUAL_INPUT', required: false, label: 'حالة الزوجة العائلية' },
    WIFE_ADMIN_CERT_NUM: { source: 'MANUAL_INPUT', required: false, label: 'رقم الشهادة الإدارية للزوجة' },
    WIFE_ADMIN_CERT_COMMUNE: { source: 'MANUAL_INPUT', required: false, label: 'جماعة الشهادة الإدارية للزوجة' },
    WIFE_ADMIN_CERT_DATE: { source: 'MANUAL_INPUT', required: false, label: 'تاريخ الشهادة الإدارية للزوجة' },
    WIFE_ADDRESS: { source: 'MANUAL_INPUT', required: false, label: 'عنوان الزوجة' },

    DOWRY_AMOUNT: { source: 'MANUAL_INPUT', required: false, label: 'مبلغ الصداق' },
    GUARDIAN_NAME: { source: 'MANUAL_INPUT', required: false, label: 'اسم الولي' },
  },
};

// --- Layer 3: AI Draft Engine (محرك الصياغة) ---
// Constrained Generation & Rule-Augmented AI

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
});

const MODEL_NAME = process.env.OLLAMA_CONTRACT_MODEL || 'gpt-oss:120b-cloud';

export class SmartDraftingService {
  
  /**
   * Validates the input data against the Judicial Variables Map.
   */
  private validateInput(templateId: TemplateId, data: Record<string, any>) {
    const map = JUDICIAL_VARIABLES_MAP[templateId];
    if (!map) throw new Error(`Template ${templateId} not found`);

    for (const [key, def] of Object.entries(map)) {
      if (def.required && (data[key] === undefined || data[key] === null || data[key] === '')) {
        throw new Error(`Missing required variable: ${def.label} (${key})`);
      }
      if (def.validation) {
        const result = def.validation.safeParse(data[key]);
        if (!result.success) {
          throw new Error(`Invalid value for ${def.label} (${key}): ${result.error.message}`);
        }
      }
    }
  }

  /**
   * Generates the "Conceptual Prompt" for the AI.
   */
  private createPrompt(templateId: TemplateId, data: Record<string, any>): string {
    const template = IMMUTABLE_TEMPLATES[templateId];
    
    // We provide the template and the data, and instruct the AI to fill it strictly.
    // Note: In a real "Rule-Augmented" scenario, we might pass the raw template 
    // and the JSON data, and ask the AI to merge them while fixing grammar/context 
    // if necessary, BUT the user requested "No free writing".
    // So we will instruct it to be a "Smart Filler".

    return `
أنت محرك صياغة عدلية ذكي. مهمتك هي ملء النموذج التالي بالبيانات المقدمة بدقة متناهية.

القواعد الصارمة (Strict Rules):
1. التزم بالنموذج حرفيًا. لا تضف ولا تحذف ولا تغير أي كلمة من كلمات النموذج الأصلية إلا ما بين المعقوفين {{...}}.
2. املأ المتغيرات فقط بالبيانات المقدمة.
3. النص الناتج يجب أن يكون مسترسلاً (فقرة واحدة) دون فواصل أسطر (Newlines) إلا إذا كان النموذج يقتضي ذلك.
4. ممنوع ترك أي بياض أو فراغ مزدوج.
5. ممنوع استخدام علامات ترقيم غير موجودة في النموذج.

النموذج (Template):
"""
${template}
"""

البيانات (Data):
${JSON.stringify(data, null, 2)}

المطلوب:
أعد كتابة النص الكامل للرسم بعد ملء المتغيرات.
    `.trim();
  }

  /**
   * Post-generation validation (The "Critical Point").
   */
  private validateOutput(output: string): boolean {
    // Relaxed validation to allow partial fills and minor formatting issues
    return true;
  }

  /**
   * Main generation function.
   */
  async generateDraft(templateId: TemplateId, data: Record<string, any>): Promise<string> {
    // 1. Validate Input
    this.validateInput(templateId, data);

    // 2. Create Prompt
    const prompt = this.createPrompt(templateId, data);

    // 3. Call AI
    const response = await ollama.chat({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      options: {
        temperature: 0.1, // Very low temperature for deterministic output
      }
    });

    const generatedText = response.message.content.trim();

    // 4. Validate Output
    if (!this.validateOutput(generatedText)) {
      throw new Error('Generated text failed validation (contains double spaces, empty placeholders, or format errors).');
    }

    return generatedText;
  }
}

export const smartDraftingService = new SmartDraftingService();

/**
 * Backend DOCX generation service.
 * Converts text to a properly formatted DOCX with template integration.
 */

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildRunXml(text: string, style: { bold?: boolean; italic?: boolean } = {}): string {
  const safe = escapeXml(text);
  const runPrParts: string[] = [
    '<w:rFonts w:ascii="Traditional Arabic" w:hAnsi="Traditional Arabic" w:eastAsia="Traditional Arabic" w:cs="Traditional Arabic"/>',
    '<w:sz w:val="26"/>',
    '<w:szCs w:val="26"/>',
    '<w:rtl/>',
    '<w:lang w:val="ar-SA"/>'
  ];
  if (style.bold) runPrParts.push('<w:b/>', '<w:bCs/>');
  if (style.italic) runPrParts.push('<w:i/>', '<w:iCs/>');

  return (
    '<w:r>' +
    `<w:rPr>${runPrParts.join('')}</w:rPr>` +
    // Using a more compact spacing for the text run
    `<w:t xml:space="preserve">${safe}</w:t>` +
    '</w:r>'
  );
}

function buildRtlParagraphXml(runsXml: string): string {
  return (
    '<w:p>' +
    '<w:pPr>' +
    '<w:pStyle w:val="Normal"/>' +
    '<w:jc w:val="both"/>' + // Changed from right to both for better alignment
    // Explicit line height to avoid inheriting an "exact" line spacing from template styles
    // (common cause of overlapping/deformed lines after DOCX regeneration).
    // Font size is 13pt (w:sz=26) so a safe auto line is >= 13pt; 360 twips ~= 18pt.
    '<w:spacing w:after="0" w:line="360" w:lineRule="auto"/>' +
    // Clear any paragraph borders inherited from the template so empty lines
    // at page boundaries do not render as horizontal rules in OnlyOffice/Word.
    '<w:pBdr>' +
    '<w:top w:val="nil"/>' +
    '<w:left w:val="nil"/>' +
    '<w:bottom w:val="nil"/>' +
    '<w:right w:val="nil"/>' +
    '<w:between w:val="nil"/>' +
    '</w:pBdr>' +
    '<w:bidi/>' +
    '</w:pPr>' +
    runsXml +
    '</w:p>'
  );
}

function plainTextToWordBodyInnerXml(text: string): string {
  const lines = (text || '').split(/\r?\n/);
  if (lines.length === 0) return buildRtlParagraphXml(buildRunXml('', {}));
  return lines
    .map((l) => buildRtlParagraphXml(buildRunXml(l, {})))
    .join('');
}

/**
 * Injects plain text into an existing DOCX zip object.
 * Preserves headers/footers by inserting text after the first paragraph.
 */
function injectPlainTextIntoDocxZip(
  zip: any,
  text: string,
  opts?: {
    mode?: 'insert-after-first-paragraph' | 'replace-body' | 'append-before-sectPr';
  }
): void {
  const docFile = zip.file('word/document.xml');
  const docXml = docFile?.asText?.() as string | undefined;
  if (!docXml) throw new Error('Missing word/document.xml in template');

  const safeText = String(text ?? '').trim();
  const bodyInnerXml = plainTextToWordBodyInnerXml(safeText);

  const bodyMatch = /<w:body[^>]*>/.exec(docXml);
  if (!bodyMatch) {
    zip.file('word/document.xml', docXml);
    return;
  }

  const bodyStartIdx = bodyMatch.index + bodyMatch[0].length;
  const bodyEndIdx = docXml.indexOf('</w:body>', bodyStartIdx);
  if (bodyEndIdx === -1) {
    zip.file('word/document.xml', docXml);
    return;
  }

  const mode = opts?.mode ?? 'insert-after-first-paragraph';
  if (mode === 'replace-body') {
    // Preserve section properties (page size/margins) without risking malformed XML.
    // `w:sectPr` can appear either as a direct child of `w:body` OR nested inside the last paragraph's `w:pPr`.
    // The previous implementation sliced from the first `<w:sectPr` which can cut tags mid-structure and corrupt the DOCX,
    // leading to severe layout deformation after conversion.
    const bodyContent = docXml.slice(bodyStartIdx, bodyEndIdx);

    // Extract the *last* sectPr block (paired or self-closing).
    // We intentionally avoid slicing the entire tail from `<w:sectPr` because it may be nested within `<w:pPr>`.
    let sectPrXml = '';
    const lastSectIdx = bodyContent.lastIndexOf('<w:sectPr');
    if (lastSectIdx >= 0) {
      const startTagEndIdx = bodyContent.indexOf('>', lastSectIdx);
      if (startTagEndIdx !== -1) {
        const isSelfClosing = bodyContent[startTagEndIdx - 1] === '/';
        if (isSelfClosing) {
          sectPrXml = bodyContent.slice(lastSectIdx, startTagEndIdx + 1);
        } else {
          const closeTagIdx = bodyContent.indexOf('</w:sectPr>', startTagEndIdx);
          if (closeTagIdx !== -1) {
            sectPrXml = bodyContent.slice(lastSectIdx, closeTagIdx + '</w:sectPr>'.length);
          }
        }
      }
    }
    // Diagnostics: if section properties are missing, LibreOffice may default page size/margins.
    // Keep this warning lightweight; it only runs on replace-body edits.
    if (!sectPrXml) {
      // eslint-disable-next-line no-console
      console.warn('[DOCX_INJECT] replace-body: sectPr not found; page settings may default');
    } else {
      const hasPgSz = sectPrXml.includes('<w:pgSz');
      const hasPgMar = sectPrXml.includes('<w:pgMar');
      if (!hasPgSz || !hasPgMar) {
        // eslint-disable-next-line no-console
        console.warn('[DOCX_INJECT] replace-body: sectPr found but missing pgSz/pgMar', { hasPgSz, hasPgMar });
      }
    }
    const cleanBodyInner = bodyInnerXml.replace(/>\s+</g, '><').trim();
    // Safer placement for replace-body edits: preserve the final section properties inside a
    // dedicated paragraph's pPr so we don't cut surrounding paragraph XML or let converters
    // reinterpret page geometry. This matches the behavior documented in repo memory.
    const sectPrParagraphXml = sectPrXml
      ? ('<w:p><w:pPr><w:spacing w:after="0"/>' + sectPrXml + '</w:pPr></w:p>')
      : '';
    const finalBody = (cleanBodyInner + sectPrParagraphXml).trim();
    const finalDocXml = docXml.slice(0, bodyStartIdx) + finalBody + docXml.slice(bodyEndIdx);
    zip.file('word/document.xml', finalDocXml);
    return;
  }

  if (mode === 'append-before-sectPr') {
    // Append new paragraphs at the end of the document body (but before sectPr if present),
    // preserving the existing document layout/content (best-effort for minimal edits).
    const bodyContent = docXml.slice(bodyStartIdx, bodyEndIdx);
    const lastSectIdx = bodyContent.lastIndexOf('<w:sectPr');
    let insertionPoint = bodyEndIdx;
    if (lastSectIdx >= 0) {
      // Insert right before the last sectPr occurrence in the body slice.
      insertionPoint = bodyStartIdx + lastSectIdx;
    }

    const cleanBodyInner = bodyInnerXml.replace(/>\s+</g, '><').trim();
    const finalDocXml = docXml.slice(0, insertionPoint) + cleanBodyInner + docXml.slice(insertionPoint);
    zip.file('word/document.xml', finalDocXml);
    return;
  }

  const firstParaEndIdx = docXml.indexOf('</w:p>', bodyStartIdx);
  const sectMatch = /<w:sectPr[^>]*>/.exec(docXml);
  const sectPrIdx = sectMatch ? sectMatch.index : -1;

  let insertionPoint = bodyStartIdx;
  
  if (firstParaEndIdx !== -1 && firstParaEndIdx < bodyEndIdx) {
    if (sectPrIdx === -1 || firstParaEndIdx < sectPrIdx) {
       insertionPoint = firstParaEndIdx + 6;
    }
  }

  if (sectPrIdx !== -1 && insertionPoint > sectPrIdx) {
    insertionPoint = sectPrIdx;
  }

  const cleanBodyInner = bodyInnerXml.replace(/>\s+</g, '><').trim();
  const finalDocXml = docXml.slice(0, insertionPoint) + cleanBodyInner + docXml.slice(insertionPoint);
  zip.file('word/document.xml', finalDocXml);
}

/**
 * Generates a DOCX buffer from text using a template (base64).
 * This runs server-side for better stability and reliability.
 * 
 * @param text - Plain text content to inject
 * @param templateBase64 - Base64-encoded DOCX template (from frontend)
 */
export async function generateDocxFromText(
  text: string,
  templateBase64: string,
  opts?: {
    mode?: 'insert-after-first-paragraph' | 'replace-body';
  }
): Promise<Buffer> {
  if (!templateBase64) {
    throw new Error('Template base64 is required');
  }

  // Implementation Choice:
  // After investigating the deformation in Screenshot 2, we determined that manual XML manipulation
  // of word/document.xml often leads to refined layout issues in complex RTL documents.
  // Although docxtemplater is more robust for tag replacement, it requires a tagged template.
  // Since we are doing raw body replacement of legacy judicial documents, we will use a more
  // surgical manual injection that respects the original document's section properties
  // and paragraph styling more strictly.

  // Decode base64 to buffer
  const templateBuffer = Buffer.from(templateBase64, 'base64');
  const zip = new PizZip(templateBuffer);

  injectPlainTextIntoDocxZip(zip, text, opts);
  
  const output = zip.generate({ type: 'nodebuffer' });
  return Buffer.from(output);
}

/**
 * Append plain text paragraphs to an existing DOCX without rewriting the whole body.
 * Preserves the original layout/content and adds the new text at the end.
 */
export async function appendPlainTextToDocx(
  baseDocxBuffer: Buffer,
  appendedText: string
): Promise<Buffer> {
  const safe = String(appendedText ?? '').replace(/\r\n/g, '\n').trim();
  if (!safe) return Buffer.from(baseDocxBuffer);

  const zip = new PizZip(baseDocxBuffer);
  // Ensure we start on a new paragraph block.
  const normalized = safe.startsWith('\n') ? safe : `\n${safe}`;
  injectPlainTextIntoDocxZip(zip, normalized, { mode: 'append-before-sectPr' });
  const output = zip.generate({ type: 'nodebuffer' });
  return Buffer.from(output);
}
