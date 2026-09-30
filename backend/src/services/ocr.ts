import type { OCRResult } from '../../../shared';
import { createWorker } from 'tesseract.js';

export interface MoroccanCINExtractionResult {
  rawText: string;
  extractedFields: {
    name?: string;
    nameLatin?: string;
    idNumber?: string;
    idIssueDate?: string;
    idExpiryDate?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    fatherName?: string;
    motherName?: string;
    nationality?: string;
    address?: string;
  };
  confidence: number;
  errors: string[];
}

export class OCRService {
  private worker: any = null;
  private engWorker: any = null;

  /**
   * Initialize Tesseract.js worker for Arabic + English
   */
  private async getWorker() {
    if (!this.worker) {
      this.worker = await createWorker('ara+eng');
    }
    return this.worker;
  }

  /**
   * Initialize Tesseract.js worker for Latin/English (optimal for Moroccan CINs and MRZ)
   */
  private async getEngWorker() {
    if (!this.engWorker) {
      this.engWorker = await createWorker('eng');
    }
    return this.engWorker;
  }

  /**
   * Cleanup workers
   */
  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    if (this.engWorker) {
      await this.engWorker.terminate();
      this.engWorker = null;
    }
  }

  /**
   * Helper to parse dimensions from JPEG or PNG buffer
   */
  private getImageDimensions(buffer: Buffer): { width: number; height: number } {
    let width = 1000;
    let height = 1000;
    try {
      if (buffer.length > 24) {
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
          width = buffer.readUInt32BE(16);
          height = buffer.readUInt32BE(20);
        } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
          let offset = 2;
          while (offset < buffer.length - 8) {
            if (buffer[offset] === 0xff && buffer[offset + 1] >= 0xc0 && buffer[offset + 1] <= 0xc3) {
              height = buffer.readUInt16BE(offset + 5);
              width = buffer.readUInt16BE(offset + 7);
              break;
            }
            offset += 2 + buffer.readUInt16BE(offset + 2);
          }
        }
      }
    } catch {
      // fallback to default
    }
    return { width, height };
  }

  /**
   * Moroccan CIN Regional Prefixes (Wilayas / Prefectures / Provinces)
   */
  private static readonly MOROCCAN_CIN_PREFIXES = new Set([
    'A', 'AA', 'AB', 'AD', 'AE', 'AF', 'AG', 'AH', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AS', 'AY',
    'B', 'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BH', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BW',
    'C', 'CB', 'CD', 'CN',
    'D', 'DA', 'DB', 'DC', 'DD', 'DE', 'DG', 'DJ', 'DK', 'DN', 'DO',
    'E', 'EA', 'EB', 'EC', 'EE',
    'F', 'FA', 'FB', 'FC', 'FD', 'FE', 'FG', 'FK', 'FL',
    'G', 'GA', 'GB', 'GC', 'GD', 'GE', 'GK', 'GM', 'GN',
    'H', 'HA', 'HB', 'HC', 'HH',
    'I', 'IA', 'IB', 'IC', 'ID', 'IE',
    'J', 'JA', 'JB', 'JC', 'JD', 'JE', 'JF', 'JH', 'JK', 'JM', 'JT', 'JY',
    'K', 'KB',
    'L', 'LA', 'LB', 'LC', 'LE', 'LG', 'LJ', 'LK',
    'M', 'MA', 'MC', 'MD', 'MH', 'MK', 'ML',
    'N', 'NA',
    'P', 'PB',
    'Q',
    'R', 'RA', 'RC',
    'S', 'SA', 'SB', 'SH', 'SJ', 'SL',
    'T', 'TA', 'TB', 'TK',
    'U', 'UA', 'UB', 'UC', 'UD',
    'V', 'VA', 'VB',
    'W', 'WA', 'WB',
    'X', 'XA',
    'Y',
    'Z',
  ]);

  /**
   * Repair blurry character confusions in numeric parts (letters misrecognized as digits)
   */
  private repairNumericPart(str: string): string {
    return str
      .replace(/[OoDQqCc]/g, '0')
      .replace(/[Il|!]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ee]/g, '3')
      .replace(/[Aa]/g, '4')
      .replace(/[Ss]/g, '5')
      .replace(/[G]/g, '6')
      .replace(/[Ttr]/g, '7')
      .replace(/[Bb]/g, '8')
      .replace(/[q]/g, '9');
  }

  /**
   * Repair blurry character confusions in prefix letter parts
   */
  private repairPrefixPart(str: string): string {
    return str
      .replace(/8/g, 'B')
      .replace(/0/g, 'O')
      .replace(/1/g, 'I')
      .replace(/5/g, 'S')
      .replace(/6/g, 'G')
      .replace(/2/g, 'Z')
      .replace(/4/g, 'A')
      .replace(/3/g, 'E')
      .replace(/7/g, 'T')
      .replace(/e/g, 'C')
      .replace(/c/g, 'C')
      .replace(/o/g, 'C');
  }

  /**
   * Score and normalize a potential CIN candidate token
   */
  private scoreAndNormalizeCandidate(cand: { raw: string; nearLabel: boolean }): {
    cin: string;
    prefix: string;
    numPart: string;
    score: number;
  } | null {
    const clean = cand.raw.trim().replace(/[\s\-_.:,;'"/\\|<>()]/g, '');
    if (clean.length < 5 || clean.length > 10) return null;

    let prefix = '';
    let numPart = '';

    // Moroccan CIN has 1 or 2 letters followed by 4 to 8 digits
    const letterMatch = clean.match(/^([A-Za-z]{1,2})([0-9A-Za-z]{4,8})$/);
    if (letterMatch) {
      prefix = letterMatch[1].toUpperCase();
      numPart = letterMatch[2];
    } else {
      // Allow single leading digit if blurred letter (e.g. 863923 -> B63923)
      const digitMatch = clean.match(/^(\d)([0-9A-Za-z]{4,8})$/);
      if (digitMatch) {
        prefix = this.repairPrefixPart(digitMatch[1]).toUpperCase();
        numPart = digitMatch[2];
      } else {
        return null;
      }
    }

    prefix = this.repairPrefixPart(prefix).toUpperCase();
    numPart = this.repairNumericPart(numPart);

    if (!/^\d{4,8}$/.test(numPart)) return null;

    let score = 0;
    if (OCRService.MOROCCAN_CIN_PREFIXES.has(prefix)) {
      score += 50;
    }
    if (cand.nearLabel) {
      score += 40;
    }
    if (numPart.length >= 5 && numPart.length <= 7) {
      score += 20;
    }

    return {
      cin: prefix + numPart,
      prefix,
      numPart,
      score,
    };
  }

  /**
   * Intelligently repair and sanitize blurry CIN candidate strings
   */
  private sanitizeBlurryCIN(candidate: string): string | null {
    if (!candidate) return null;
    const scored = this.scoreAndNormalizeCandidate({ raw: candidate, nearLabel: false });
    return scored ? scored.cin : null;
  }

  /**
   * Moroccan First and Last Names Dictionaries for Transliteration
   */
  private static readonly MOROCCAN_FIRST_NAMES_MAP: Record<string, string> = {
    'MOHAMMED': 'محمد', 'MOHAMED': 'محمد', 'AHMED': 'أحمد', 'YOUSSEF': 'يوسف',
    'HAMZA': 'حمزة', 'FATIMA': 'فاطمة', 'KHADIJA': 'خديجة', 'AICHA': 'عائشة',
    'MERIEM': 'مريم', 'MARYAM': 'مريم', 'MERYEM': 'مريم', 'HASSAN': 'حسن',
    'HOUCINE': 'حسين', 'HOUSSEIN': 'حسين', 'OMAR': 'عمر', 'ALI': 'علي',
    'ABDELKRIM': 'عبد الكريم', 'ABDELILAH': 'عبد الإله', 'ABDELLAH': 'عبد الله',
    'ABDERRAHMAN': 'عبد الرحمان', 'ABDERRAHIM': 'عبد الرحيم', 'ABDELALI': 'عبد العالي',
    'ABDELAZIZ': 'عبد العزيز', 'ABDELLATIF': 'عبد اللطيف', 'ABDELKADER': 'عبد القادر',
    'ABDELMAJID': 'عبد المجيد', 'ABDELHAK': 'عبد الحق', 'ABDELOUAHED': 'عبد الواحد',
    'ABDELSALAM': 'عبد السلام', 'ABDELWAHED': 'عبد الواحد', 'ABDESSAMAD': 'عبد الصمد',
    'ABDELOUAHAB': 'عبد الوهاب', 'MUSTAPHA': 'مصطفى', 'MOUSTAPHA': 'مصطفى',
    'RACHID': 'رشيد', 'TARIK': 'طارق', 'TARIQ': 'طارق', 'KHALID': 'خالد',
    'SAID': 'سعيد', 'AMINE': 'أمين', 'AMIN': 'أمين', 'ANAS': 'أنس',
    'MEHDI': 'المهدي', 'ZINEB': 'زينب', 'SOUKAYNA': 'سكينة', 'SOUKAINA': 'سكينة',
    'SALMA': 'سلمى', 'IMANE': 'إيمان', 'SOUAD': 'سعاد', 'NAIMA': 'نعيمة',
    'SAMIRA': 'سميرة', 'HOUDA': 'هدى', 'SARA': 'سارة', 'SARAH': 'سارة',
    'IKRAM': 'إكرام', 'ILHAM': 'إلهام', 'HANANE': 'حنان', 'LOUBNA': 'لبنى',
    'SANAE': 'سناء', 'SANAA': 'سناء', 'ASMAE': 'أسماء', 'ASMAA': 'أسماء',
    'SIHAM': 'سهام', 'NADIA': 'نادية', 'BOUCHRA': 'بشرى', 'NAOUAL': 'نوال',
    'NAWAL': 'نوال', 'LAILA': 'ليلى', 'LAYLA': 'ليلى', 'GHITA': 'غيثة',
    'KENZA': 'كنزة', 'HAFSA': 'حفصة', 'ASSIA': 'آسية', 'HIND': 'هند',
    'MANAL': 'منال', 'KAOUTAR': 'كوثر', 'ZOUHAIR': 'زهير', 'BILAL': 'بلال',
    'AYOUB': 'أيوب', 'OTHMANE': 'عثمان', 'OTMANE': 'عثمان', 'ISMAIL': 'إسماعيل',
    'ZAKARIA': 'زكرياء', 'YASSINE': 'ياسين', 'YASSIR': 'ياسر', 'BADR': 'بدر',
    'REDOUANE': 'رضوان', 'RIDOUANE': 'رضوان', 'KARIM': 'كريم', 'JAMAL': 'جمال',
    'KAMAL': 'كمال', 'ADIL': 'عادل', 'FARID': 'فريد', 'HICHAM': 'هشام',
    'WALID': 'وليد', 'OUALID': 'وليد', 'NABIL': 'نبيل', 'AZIZ': 'عزيز',
    'DRISS': 'إدريس', 'TAHA': 'طه', 'JAOUAD': 'جواد', 'JAWAD': 'جواد',
    'FOUAD': 'فؤاد', 'MONCEF': 'منصف', 'SIMOHAMED': 'سي محمد', 'SI MOHAMED': 'سي محمد',
    'ABDELFATTAH': 'عبد الفتاح', 'MOHSINE': 'محسن', 'MOUNCIF': 'منصف',
    'REDA': 'رضا', 'AYMAN': 'أيمن', 'AYMANE': 'أيمن', 'MAROUANE': 'مروان',
    'MARWANE': 'مروان', 'SOFIANE': 'سفيان', 'SOUFIANE': 'سفيان', 'ILYES': 'إلياس',
    'ILYAS': 'إلياس', 'ILIAS': 'إلياس', 'ILYASS': 'إلياس', 'BRAHIM': 'إبراهيم',
    'IBRAHIM': 'إبراهيم', 'OUSSAMA': 'أسامة', 'ACHRAF': 'أشرف', 'ANWAR': 'أنور',
    'ANOUAR': 'أنور', 'MOUNA': 'منى', 'MOUNIA': 'منية', 'HASNA': 'حسناء',
    'HASNAE': 'حسناء', 'CHAIMAE': 'شيماء', 'CHAIMA': 'شيماء', 'DOUAE': 'دعاء',
    'DOUNIA': 'دنيا', 'RABAB': 'رباب', 'RAJAE': 'رجاء', 'NAJAT': 'نجاة',
    'LATIFA': 'لطيفة', 'MALIKA': 'مليكة', 'AMINA': 'أمينة', 'SAMIA': 'سامية',
    'KHOLOUD': 'خلود', 'NIHAD': 'نهاد', 'RIHAM': 'ريهام', 'SAFAE': 'صفاء',
    'SAFAA': 'صفاء', 'WAFAE': 'وفاء', 'WAFAA': 'وفاء', 'NAJOUA': 'نجوى',
    'NAJWA': 'نجوى', 'FATIMA ZAHRA': 'فاطمة الزهراء', 'FATIMA-ZAHRA': 'فاطمة الزهراء',
    'FATIMA EZZAHRA': 'فاطمة الزهراء', 'MOHAMMED AMINE': 'محمد أمين',
    'MOHAMED AMINE': 'محمد أمين',
  };

  private static readonly MOROCCAN_LAST_NAMES_MAP: Record<string, string> = {
    'ALAOUI': 'العلوي', 'ALAMI': 'العلمي', 'IDRISSI': 'الإدريسي', 'BENJELLOUN': 'بن جلون',
    'BENKIRANE': 'بن كيران', 'BENNANI': 'بناني', 'BENANI': 'بناني', 'BERRADA': 'برادة',
    'CHRAIBI': 'الشرايبي', 'FASSI': 'الفاسي', 'FILALI': 'الفيلالي', 'KABBAJ': 'القباج',
    'LAHLOU': 'لحلو', 'SQALLI': 'الصقلي', 'SKALLI': 'الصقلي', 'TAZI': 'التازي',
    'AMRANI': 'العمراني', 'MANSOURI': 'المنصوري', 'HASSANI': 'الحسني', 'SADIKI': 'الصديقي',
    'OUAZZANI': 'الوزاني', 'SLIMANI': 'السليماني', 'JAAFARI': 'الجعفري', 'KHALIFI': 'الخليفي',
    'MRABET': 'المرابط', 'CHAKIR': 'شاكر', 'KADIRI': 'القادري', 'DAOUDI': 'الداودي',
    'BAHI': 'باهي', 'NACIRI': 'الناصري', 'YAAKOUBI': 'اليعقوبي', 'KHALIL': 'خليل',
    'SABRI': 'صبري', 'ZAHIR': 'ظاهر', 'TAHIRI': 'الطاهري', 'ANDALOUSSI': 'الأندلسي',
    'AZZOUZI': 'العزوزي', 'BELKACEM': 'بلقاسم', 'BENALI': 'بن علي', 'BENSAID': 'بنسعيد',
    'BOUCHIKHI': 'بوشيخي', 'BOUKHALFA': 'بوخالفة', 'CHAOUKI': 'شوقي', 'CHERKAOUI': 'الشرقاوي',
    'HAKIMI': 'حكيمي', 'HAMDAOUI': 'الحمداوي', 'HARRAK': 'الحراق', 'IBRAHIMI': 'الإبراهيمي',
    'JABRI': 'الجابري', 'KARKOURI': 'القرقوري', 'LAAROUSSI': 'العروسي', 'MAAROUFI': 'المعروفي',
    'MAHJOUBI': 'المحجوبي', 'MARZOUK': 'مرزوق', 'MARZOUKI': 'مرزوقي', 'MESKINI': 'المسكيني',
    'MOKHTARI': 'المختاري', 'MOUTAOUAKKIL': 'المتوكل', 'NAJAH': 'نجاح', 'OUALI': 'الوالي',
    'OUFKIR': 'أوفقير', 'RAHMANI': 'الرحماني', 'SAADI': 'السعدي', 'SBAI': 'السباعي',
    'SEKKAT': 'السقاط', 'TABIT': 'ثابت', 'TALBI': 'الطلبي', 'TOUIMI': 'التويمي', 'ZOUITEN': 'زويتن',
    'EL AMRANI': 'العمراني', 'EL IDRISSI': 'الإدريسي', 'BEN JELLOUN': 'بن جلون', 'EL ALAMI': 'العلمي',
    'EL FASSI': 'الفاسي', 'EL FILALI': 'الفيلالي', 'EL TAZI': 'التازي', 'EL MANSOURI': 'المنصوري',
    'RAFIK': 'رفيق', 'JILALI': 'الجيلالي', 'RHANEM': 'غانم', 'GHANEM': 'غانم',
    'ZOUHIR': 'زهير', 'KANDIL': 'قنديل', 'HADDAD': 'الحداد', 'EL HADDAD': 'الحداد',
    'AZAMI': 'العزمي', 'BOUZIANE': 'بوزيان', 'CHOUKRI': 'شكري', 'DERKAOUI': 'الدرقاوي',
    'DRISSI': 'الدريسي', 'ENNAJI': 'الناجي', 'FAHMI': 'فهمي', 'GHARBI': 'الغربي',
    'HAFID': 'حفيظ', 'JAOUHARI': 'الجوهري', 'LAMRANI': 'العمراني', 'LOUKILI': 'اللوكيلي',
    'MEZIANE': 'مزيان', 'MOFID': 'مفيد', 'NADIR': 'نادر', 'OMARI': 'العماري',
    'QURAICHI': 'القريشي', 'RADI': 'راضي', 'SABIR': 'صابر', 'TALEB': 'طالب',
    'WAHBI': 'وهبي', 'YOUSFI': 'يوسفي', 'ZIANI': 'زياني', 'ZAHRAOUI': 'الزهراوي',
    'ABOULKACEM': 'أبو القاسم', 'BELHAJ': 'بلحاج', 'BENCHEIKH': 'بن الشيخ',
    'BENNOUNA': 'بنونة', 'BOUANANI': 'البوعناني', 'CHAFII': 'الشافعي',
    'EL GHAZI': 'الغازي', 'GHAZI': 'الغازي', 'GUERRAOUI': 'الكراوي',
    'KETTANI': 'الكتاني', 'MOUDDEN': 'المودن', 'SEBTI': 'السبتي',
    'ZENTAR': 'الزنطار', 'ZEROUAL': 'زروال', 'ZNATI': 'الزناتي',
  };

  private static readonly ARABIC_TO_LATIN_MAP: Record<string, string> = (() => {
    const map: Record<string, string> = {};
    for (const [lat, ar] of Object.entries(OCRService.MOROCCAN_FIRST_NAMES_MAP)) {
      if (!map[ar]) map[ar] = lat;
    }
    for (const [lat, ar] of Object.entries(OCRService.MOROCCAN_LAST_NAMES_MAP)) {
      if (!map[ar]) map[ar] = lat;
    }
    return map;
  })();

  private static readonly ARABIC_CHAR_TO_LATIN: Record<string, string> = {
    'ا': 'A', 'أ': 'A', 'إ': 'I', 'آ': 'A', 'ء': '', 'ئ': 'E', 'ؤ': 'O',
    'ب': 'B', 'ت': 'T', 'ث': 'TH', 'ج': 'J', 'ح': 'H', 'خ': 'KH',
    'د': 'D', 'ذ': 'DH', 'ر': 'R', 'ز': 'Z', 'س': 'S', 'ش': 'CH',
    'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'DH', 'ع': 'A', 'غ': 'GH',
    'ف': 'F', 'ق': 'Q', 'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N',
    'ه': 'H', 'ة': 'A', 'و': 'OU', 'ي': 'I', 'ى': 'A',
  };

  /**
   * Transliterate Arabic Full Name to Latin script
   */
  private transliterateArabicToLatinFullName(arabicName: string): string {
    if (!arabicName) return '';
    const trimmed = arabicName.trim();
    if (OCRService.ARABIC_TO_LATIN_MAP[trimmed]) return OCRService.ARABIC_TO_LATIN_MAP[trimmed];

    const words = trimmed.split(/\s+/).filter(Boolean);
    const latinWords = words.map((w) => {
      if (OCRService.ARABIC_TO_LATIN_MAP[w]) return OCRService.ARABIC_TO_LATIN_MAP[w];
      if (w.startsWith('ال') && w.length > 2) {
        const rest = w.slice(2);
        if (OCRService.ARABIC_TO_LATIN_MAP[rest]) return 'EL ' + OCRService.ARABIC_TO_LATIN_MAP[rest];
      }
      if (w.startsWith('بن') && w.length > 2) {
        const rest = w.slice(2);
        if (OCRService.ARABIC_TO_LATIN_MAP[rest]) return 'BEN ' + OCRService.ARABIC_TO_LATIN_MAP[rest];
      }
      return Array.from(w).map((c) => OCRService.ARABIC_CHAR_TO_LATIN[c] || '').join('');
    });

    return latinWords.join(' ').trim();
  }

  /**
   * Transliterate a single Latin word to Arabic using Moroccan onomastic rules
   */
  private transliterateWord(word: string): string {
    const upper = word.toUpperCase().trim();
    if (OCRService.MOROCCAN_FIRST_NAMES_MAP[upper]) return OCRService.MOROCCAN_FIRST_NAMES_MAP[upper];
    if (OCRService.MOROCCAN_LAST_NAMES_MAP[upper]) return OCRService.MOROCCAN_LAST_NAMES_MAP[upper];

    if (upper.startsWith('EL') && upper.length > 2) {
      const rest = upper.slice(2).trim();
      if (OCRService.MOROCCAN_LAST_NAMES_MAP[rest]) return 'ال' + OCRService.MOROCCAN_LAST_NAMES_MAP[rest].replace(/^ال/, '');
    }
    if (upper.startsWith('BEN') && upper.length > 3) {
      const rest = upper.slice(3).trim();
      if (OCRService.MOROCCAN_LAST_NAMES_MAP[rest]) return 'بن ' + OCRService.MOROCCAN_LAST_NAMES_MAP[rest];
    }
    if (upper.startsWith('AIT') && upper.length > 3) {
      const rest = upper.slice(3).trim();
      if (OCRService.MOROCCAN_FIRST_NAMES_MAP[rest] || OCRService.MOROCCAN_LAST_NAMES_MAP[rest]) {
        return 'أيت ' + (OCRService.MOROCCAN_FIRST_NAMES_MAP[rest] || OCRService.MOROCCAN_LAST_NAMES_MAP[rest]);
      }
    }

    return upper
      .replace(/^EL/, 'ال')
      .replace(/^AL/, 'ال')
      .replace(/OU/g, 'و')
      .replace(/CH/g, 'ش')
      .replace(/KH/g, 'خ')
      .replace(/GH/g, 'غ')
      .replace(/TH/g, 'ث')
      .replace(/DH/g, 'ذ')
      .replace(/PH/g, 'ف')
      .replace(/SH/g, 'ش')
      .replace(/AA/g, 'عا')
      .replace(/AI/g, 'عي')
      .replace(/EE/g, 'ي')
      .replace(/B/g, 'ب')
      .replace(/T/g, 'ت')
      .replace(/J/g, 'ج')
      .replace(/H/g, 'ح')
      .replace(/D/g, 'د')
      .replace(/R/g, 'ر')
      .replace(/Z/g, 'ز')
      .replace(/S/g, 'س')
      .replace(/F/g, 'ف')
      .replace(/Q/g, 'ق')
      .replace(/K/g, 'ك')
      .replace(/L/g, 'ل')
      .replace(/M/g, 'م')
      .replace(/N/g, 'ن')
      .replace(/W/g, 'و')
      .replace(/Y/g, 'ي')
      .replace(/A/g, 'ا')
      .replace(/I/g, 'ي')
      .replace(/O/g, 'و')
      .replace(/U/g, 'و')
      .replace(/E/g, '')
      .trim();
  }

  /**
   * Transliterate a full Moroccan Latin name to authentic Arabic script
   */
  private transliterateMoroccanFullName(fullName: string): string {
    if (!fullName) return '';
    const upper = fullName.trim().toUpperCase();
    if (OCRService.MOROCCAN_FIRST_NAMES_MAP[upper]) return OCRService.MOROCCAN_FIRST_NAMES_MAP[upper];
    if (OCRService.MOROCCAN_LAST_NAMES_MAP[upper]) return OCRService.MOROCCAN_LAST_NAMES_MAP[upper];

    // Compound prefix / suffix matches (e.g. FATIMA ZAHRA EL AMRANI)
    for (const [k, v] of Object.entries(OCRService.MOROCCAN_FIRST_NAMES_MAP)) {
      if (k.includes(' ') && upper.startsWith(k)) {
        const rest = upper.slice(k.length).trim();
        return `${v} ${this.transliterateMoroccanFullName(rest)}`.trim();
      }
    }
    for (const [k, v] of Object.entries(OCRService.MOROCCAN_LAST_NAMES_MAP)) {
      if (k.includes(' ') && upper.endsWith(k)) {
        const first = upper.slice(0, upper.length - k.length).trim();
        return `${this.transliterateMoroccanFullName(first)} ${v}`.trim();
      }
    }

    const words = fullName.trim().split(/\s+/).filter(Boolean);
    return words.map((w) => this.transliterateWord(w)).join(' ');
  }

  /**
   * Parse extracted OCR text for Moroccan National Identity Card (CNIE) fields
   */
  private parseMoroccanCINText(text: string): {
    idNumber?: string;
    idIssueDate?: string;
    idExpiryDate?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    name?: string;
    nameLatin?: string;
    fatherName?: string;
    motherName?: string;
    address?: string;
    nationality?: string;
    confidence: number;
  } {
    let idNumber: string | undefined;
    let idIssueDate: string | undefined;
    let idExpiryDate: string | undefined;
    let dateOfBirth: string | undefined;
    let placeOfBirth: string | undefined;
    let name: string | undefined;
    let nameLatin: string | undefined;
    let fatherName: string | undefined;
    let motherName: string | undefined;
    let address: string | undefined;
    let confidence = 0;

    const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);

    // =========================================================================
    // 1. HIGH-PRECISION MRZ PARSING (ICAO 9303 TD1 - Moroccan Identity Card Back)
    // =========================================================================
    let mrzLine2Index = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const norm = line.replace(/[«‹\(\)\[\]\{\}\*_\-–\\/:]/g, '<').replace(/\s+/g, '<').toUpperCase();

      // MRZ Line 1: IDMAR or I<MAR followed by CIN and filler '<' (or end of line)
      if (!idNumber) {
        const mrz1 = norm.match(/(?:I[<D]|ID|IA|1D|LD)?MAR<*([A-Z0-9]{1,2}[0-9A-Z]{4,8})(?:<|$|\s)/);
        if (mrz1 && mrz1[1]) {
          const cleanCin = mrz1[1].replace(/[^A-Za-z0-9]/g, '');
          const scored = this.sanitizeBlurryCIN(cleanCin);
          if (scored) {
            idNumber = scored;
            confidence = Math.max(confidence, 98);
          }
        }
      }

      // MRZ Line 2: DOB, Sex, Expiry, Nationality (e.g. 6401078M3102042MAR<<<<<<<<<<<4)
      if (!idExpiryDate || !dateOfBirth) {
        const mrz2 = norm.match(/(\d{6})<*(\d)?<*([MF<])<*(\d{6})<*(\d)?<*MAR/);
        if (mrz2) {
          mrzLine2Index = i;
          try {
            const dobRaw = mrz2[1];
            const expRaw = mrz2[4];
            const yDob = parseInt(dobRaw.slice(0, 2), 10);
            const fullYDob = yDob > 30 ? 1900 + yDob : 2000 + yDob;
            dateOfBirth = `${fullYDob}-${dobRaw.slice(2, 4)}-${dobRaw.slice(4, 6)}`;
            idIssueDate = dateOfBirth;

            const yExp = parseInt(expRaw.slice(0, 2), 10);
            const fullYExp = 2000 + yExp;
            idExpiryDate = `${fullYExp}-${expRaw.slice(2, 4)}-${expRaw.slice(4, 6)}`;
            confidence = Math.max(confidence, 95);
          } catch {
            // ignore decode failure
          }
        }
      }
    }

    // MRZ Line 3 Extraction (Position-aware: directly following Line 2)
    if (mrzLine2Index !== -1 && mrzLine2Index + 1 < lines.length && !nameLatin) {
      const nextLine = lines[mrzLine2Index + 1];
      const normNext = nextLine
        .replace(/[«‹\(\)\[\]\{\}\*_\-–\\/:]/g, '<')
        .replace(/[\s\t]+/g, '<')
        .replace(/[^A-Za-z<]/g, '')
        .toUpperCase();

      const parts = normNext.split(/<<+/).filter(Boolean);
      if (parts.length >= 2) {
        const surname = parts[0].replace(/<+/g, ' ').trim();
        const givenName = parts[1].replace(/<+/g, ' ').trim();
        if (surname.length >= 2 && givenName.length >= 2) {
          nameLatin = `${givenName} ${surname}`.trim();
          confidence = Math.max(confidence, 96);
        }
      } else if (normNext.length >= 5) {
        const cleaned = nextLine.replace(/[^A-Za-z\s]/g, ' ').trim();
        const words = cleaned.split(/\s+/).filter((w) => w.length >= 2);
        if (words.length >= 2) {
          nameLatin = `${words[1]} ${words[0]}`.trim();
          confidence = Math.max(confidence, 92);
        }
      }
    }

    // General MRZ Line 3 fallback across all lines
    if (!nameLatin) {
      for (const line of lines) {
        if (/né\s*le|azdad|ازداد|valable|صالحة/i.test(line)) continue;
        const normName = line
          .replace(/[«‹\(\)\[\]\{\}\*_\-–\\/:]/g, '<')
          .replace(/[\s\t]+/g, '<')
          .replace(/[^A-Za-z<]/g, '')
          .toUpperCase();

        const parts = normName.split(/<<+/).filter(Boolean);
        if (parts.length >= 2) {
          const surname = parts[0].replace(/<+/g, ' ').trim();
          const givenName = parts[1].replace(/<+/g, ' ').trim();
          if (
            surname.length >= 2 &&
            givenName.length >= 2 &&
            !/ROYAUME|MAROC|CARTE|NATIONALE|IDENTITE/.test(surname + givenName)
          ) {
            nameLatin = `${givenName} ${surname}`.trim();
            confidence = Math.max(confidence, 92);
            break;
          }
        }
      }
    }

    // =========================================================================
    // 2. CANDIDATE COLLECTION & SCORING FOR CIN NUMBER (Front or Standalone)
    // =========================================================================
    if (!idNumber) {
      const candidates: Array<{ raw: string; nearLabel: boolean }> = [];

      for (const line of lines) {
        if (/CAN\s*\d+/i.test(line)) continue;

        // Pattern A: explicitly near label (N°, No, رقم, CIN, wv, w, »)
        const labelMatch = line.match(
          /(?:N[°oº\.\s]*|رقم(?:\s*ب\.ت\.و)?\s*[:\.]?|CIN\s*[:\.]?|C\.I\.N\.\s*[:\.]?|wv\s*|w\s*|»\s*)[:\s]*([A-Za-z0-9]{1,2}\s*[-–.]?\s*[0-9A-Za-z]{4,8})\b/i
        );
        if (labelMatch && labelMatch[1]) {
          candidates.push({ raw: labelMatch[1], nearLabel: true });
        }

        // Pattern B: word tokens in line
        const words = line.split(/[\s,;:–-]+/);
        for (const w of words) {
          if (w.length >= 5 && w.length <= 10) {
            if (/\d{2}[.\/-]\d{2}[.\/-]\d{4}/.test(line) && line.includes(w)) continue;
            candidates.push({ raw: w, nearLabel: false });
          }
        }
      }

      let bestCand: { cin: string; score: number } | null = null;
      for (const cand of candidates) {
        const scored = this.scoreAndNormalizeCandidate(cand);
        if (scored && (!bestCand || scored.score > bestCand.score)) {
          bestCand = scored;
        }
      }

      if (bestCand && bestCand.score >= 50) {
        idNumber = bestCand.cin;
        confidence = Math.min(96, bestCand.score);
      }
    }

    // Fallback regex for CIN anywhere in text
    if (!idNumber) {
      const matches = text.matchAll(/\b([A-Z0-9]{1,2})\s*[-–.]?\s*([0-9A-Z]{4,8})\b/gi);
      for (const m of matches) {
        const preIndex = Math.max(0, m.index ? m.index - 5 : 0);
        const prefix = text.substring(preIndex, m.index);
        if (/CAN/i.test(prefix)) continue;
        const sanitized = this.sanitizeBlurryCIN(m[1] + m[2]);
        if (sanitized) {
          idNumber = sanitized;
          confidence = 85;
          break;
        }
      }
    }

    // =========================================================================
    // 3. CARD EXPIRY DATE EXTRACTION (Front or Back)
    // =========================================================================
    if (!idExpiryDate) {
      const expiryMatch = text.match(
        /(?:valable\s*jusqu['’]?\s*au|valable\s*au|صالحة\s*إلى\s*غاية|صالحة\s*الى\s*غاية|صالحة\s*إلى|صالحة\s*الى|إلى\s*غاية|exp(?:iry)?|valid(?:ity)?)\s*[:.\-–]?\s*(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{2,4})/i
      );
      if (expiryMatch) {
        const d = expiryMatch[1].padStart(2, '0');
        const mo = expiryMatch[2].padStart(2, '0');
        let y = expiryMatch[3];
        if (y.length === 2) y = '20' + y;
        idExpiryDate = `${y}-${mo}-${d}`;
      }
    }

    // =========================================================================
    // 4. DATE OF BIRTH EXTRACTION
    // =========================================================================
    if (!dateOfBirth) {
      const dobMatch = text.match(
        /(?:né(?:e)?\s*le|ne\s*le|azdad|ازداد(?:ت)?\s*(?:في|ب)?|تاريخ\s*الازدياد)\s*[:.\-–]?\s*(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{2,4})/i
      );
      if (dobMatch) {
        const d = dobMatch[1].padStart(2, '0');
        const mo = dobMatch[2].padStart(2, '0');
        let y = dobMatch[3];
        if (y.length === 2) y = parseInt(y, 10) > 30 ? '19' + y : '20' + y;
        dateOfBirth = `${y}-${mo}-${d}`;
        if (!idIssueDate) idIssueDate = dateOfBirth;
      }
    }

    // Fallback across all dates detected in the text
    if (!idExpiryDate || !dateOfBirth) {
      const allDates = [...text.matchAll(/\b(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{4})\b/g)].map((m) => {
        const d = m[1].padStart(2, '0');
        const mo = m[2].padStart(2, '0');
        const yr = parseInt(m[3], 10);
        return { str: `${yr}-${mo}-${d}`, year: yr };
      });

      if (allDates.length > 0) {
        const futureDates = allDates.filter((d) => d.year >= 2024).sort((a, b) => b.year - a.year);
        const pastDates = allDates.filter((d) => d.year < 2024 && d.year > 1920).sort((a, b) => a.year - b.year);

        if (!idExpiryDate && futureDates.length > 0) {
          idExpiryDate = futureDates[0].str;
        }
        if (!dateOfBirth && pastDates.length > 0) {
          dateOfBirth = pastDates[0].str;
          if (!idIssueDate) idIssueDate = dateOfBirth;
        }
      }
    }

    // =========================================================================
    // 5. ARABIC FULL NAME EXTRACTION (Front of Card)
    // =========================================================================
    let arLastName: string | undefined;
    let arFirstName: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];

      // Match Last Name (النسب or الاسم العائلي)
      const lastMatch = l.match(/(?:الـ?نـ?سـ?ب|الاسم\s*العائلي|اللقب)\s*[:.\-–]?\s*([\u0621-\u064A\s]{2,30})/);
      if (lastMatch && lastMatch[1].trim().length >= 2) {
        const cand = lastMatch[1].trim();
        if (!/المملكة|المغربية|بطاقة|التعريف|الوطنية|الاسم|صالحة/i.test(cand)) {
          arLastName = cand;
        }
      } else if (/(?:الـ?نـ?سـ?ب|الاسم\s*العائلي|اللقب)\b/i.test(l) && i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (/^[\u0621-\u064A\s]{2,30}$/.test(next) && !/المملكة|المغربية|بطاقة|التعريف|الوطنية|الاسم|صالحة/i.test(next)) {
          arLastName = next;
        }
      }

      // Match First Name (الاسم الشخصي or الاسم)
      const firstMatch = l.match(/(?:الاسم\s*الشخصي|الـ?شـ?خـ?صـ?ي|الاسم(?!\s*(?:العائلي|الكامل|الوطني)))\s*[:.\-–]?\s*([\u0621-\u064A\s]{2,30})/);
      if (firstMatch && firstMatch[1].trim().length >= 2) {
        const cand = firstMatch[1].trim();
        if (!/المملكة|المغربية|بطاقة|التعريف|الوطنية|النسب|العائلي/i.test(cand)) {
          arFirstName = cand;
        }
      } else if (/(?:الاسم\s*الشخصي|الـ?شـ?خـ?صـ?ي)\b/i.test(l) && i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (/^[\u0621-\u064A\s]{2,30}$/.test(next) && !/المملكة|المغربية|بطاقة|التعريف|الوطنية|النسب|العائلي/i.test(next)) {
          arFirstName = next;
        }
      }
    }

    if (arFirstName && arLastName) {
      name = `${arFirstName} ${arLastName}`;
    } else if (arFirstName) {
      name = arFirstName;
    } else if (arLastName) {
      name = arLastName;
    }

    // Standalone clean Arabic lines (pairing consecutive lines if labels omitted)
    if (!name) {
      const cleanArabicLines = lines
        .map((l) => l.trim())
        .filter(
          (l) =>
            /^[\u0621-\u064A]{2,15}(?:\s+[\u0621-\u064A]{2,15}){0,2}$/.test(l) &&
            !/المملكة|المغربية|بطاقة|التعريف|الوطنية|صالحة|غاية|ازداد|ازدادت|العنوان|المهنة|ابن|ابنة|الحالة|العائلية|جماعة|عمالة|إقليم/i.test(
              l
            )
        );

      if (cleanArabicLines.length >= 2) {
        name = `${cleanArabicLines[1]} ${cleanArabicLines[0]}`;
      } else if (cleanArabicLines.length === 1 && cleanArabicLines[0].includes(' ')) {
        name = cleanArabicLines[0];
      }
    }

    // =========================================================================
    // 6. FRENCH / LATIN NAME EXTRACTION (Front of Card)
    // =========================================================================
    if (!nameLatin) {
      let frLastName: string | undefined;
      let frFirstName: string | undefined;

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];

        if (/pr[eé]nom/i.test(l)) {
          const m = l.match(/pr[eé]nom\s*[:.\-–]?\s*([A-Za-z\s]{2,30})/i);
          if (m && m[1].trim().length >= 2) {
            frFirstName = m[1].trim().toUpperCase();
          } else if (i + 1 < lines.length) {
            const next = lines[i + 1].trim().toUpperCase();
            if (/^[A-Za-z\s]{2,30}$/.test(next) && !/ROYAUME|MAROC|CARTE|NATIONALE|IDENTITE|NOM/.test(next)) {
              frFirstName = next;
            }
          }
        } else if (/(?:^|[^a-zA-Z\u00C0-\u024F])Nom\b/i.test(l)) {
          const m = l.match(/(?:^|[^a-zA-Z\u00C0-\u024F])Nom\s*[:.\-–]?\s*([A-Za-z\s]{2,30})/i);
          if (m && m[1].trim().length >= 2) {
            frLastName = m[1].trim().toUpperCase();
          } else if (i + 1 < lines.length) {
            const next = lines[i + 1].trim().toUpperCase();
            if (/^[A-Za-z\s]{2,30}$/.test(next) && !/ROYAUME|MAROC|CARTE|NATIONALE|IDENTITE|PRENOM/.test(next)) {
              frLastName = next;
            }
          }
        }
      }

      if (frFirstName && frLastName) {
        nameLatin = `${frFirstName} ${frLastName}`;
      } else if (frLastName) {
        nameLatin = frLastName;
      } else if (frFirstName) {
        nameLatin = frFirstName;
      }
    }

    // Standalone clean Latin lines (pairing consecutive lines if labels omitted)
    if (!nameLatin) {
      const cleanLatinLines = lines
        .map((l) => l.trim().toUpperCase())
        .filter(
          (l) =>
            /^[A-Z]{2,15}(?:\s+[A-Z]{2,15})?$/.test(l) &&
            !/ROYAUME|MAROC|CARTE|NATIONALE|IDENTITE|VALABLE|JUSQU|ADRESSE|RESIDENCE|FILS|FILLE|DATE|EXPIRY|BIRTH/i.test(
              l
            )
        );

      if (cleanLatinLines.length >= 2) {
        nameLatin = `${cleanLatinLines[1]} ${cleanLatinLines[0]}`;
      } else if (cleanLatinLines.length === 1 && cleanLatinLines[0].includes(' ')) {
        nameLatin = cleanLatinLines[0];
      }
    }

    // =========================================================================
    // 7. PARENTS & PLACE OF BIRTH
    // =========================================================================
    const parentsMatch = text.match(/(?:ابن|ابنة)\s+([\u0621-\u064A\s]{2,20})\s+(?:و|بن)\s+([\u0621-\u064A\s]{2,20})/);
    if (parentsMatch) {
      fatherName = parentsMatch[1].trim();
      motherName = parentsMatch[2].trim();
    } else {
      const frParents = text.match(/Fils\s+de\s+([A-Za-z\s]{2,20})\s+et\s+de\s+([A-Za-z\s]{2,20})/i);
      if (frParents) {
        fatherName = frParents[1].trim();
        motherName = frParents[2].trim();
      }
    }

    const pobMatch = text.match(/(?:azdad|ازداد|ازدادت)\s*(?:في|بـ|ب)?\s*[\d./-]*\s*(?:à|في|بـ|ب)\s*([^\r\n]{2,25})/i);
    if (pobMatch) {
      placeOfBirth = pobMatch[1].trim().replace(/^(?:à|في|بـ|ب)\s*/, '').replace(/[\r\n].*/g, '').trim();
    }

    // =========================================================================
    // 8. ADDRESS EXTRACTION (Adresse / العنوان)
    // =========================================================================
    const addressMatch = text.match(/(?:ADRESSE|Adresse|العنوان)\s*[:.]?\s*([^\n\r]+(?:\n[^\n\r]+)?)/i);
    if (addressMatch && addressMatch[1]) {
      const cleaned = addressMatch[1]
        .replace(/(?:ADRESSE|Adresse|العنوان)\s*[:.]?/gi, '')
        .replace(/IDMAR[\s\S]*/i, '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/[\s:=|؛.,\-_]+$/, '')
        .replace(/^[\s:=|؛.,\-_]+/, '')
        .trim();
      if (cleaned.length > 5 && !/ROYAUME|MAROC/i.test(cleaned)) {
        address = cleaned;
      }
    }
    if (!address) {
      for (const line of lines) {
        if (
          !/ROYAUME|MAROC|CARTE|NATIONALE|IDENTITE|IDMAR|VALABLE/i.test(line) &&
          /(?:RES|RESIDENCE|IMM|IMMEUBLE|APP|RUE|BD|BOULEVARD|AV|AVENUE|QUARTIER|HAY|DOUAR|LOT|LOTISSEMENT|DERB|زنقة|شارع|حي|دوار|تجزئة|عمارة|شقة)\b/i.test(
            line
          )
        ) {
          const cleaned = line
            .replace(/(?:ADRESSE|Adresse|العنوان)\s*[:.]?/gi, '')
            .replace(/[\s:=|؛.,\-_]+$/, '')
            .replace(/^[\s:=|؛.,\-_]+/, '')
            .trim();
          if (cleaned.length > 5) {
            address = cleaned;
            break;
          }
        }
      }
    }

    // =========================================================================
    // 9. BIDIRECTIONAL NAME TRANSLITERATION & SYNCHRONIZATION
    // =========================================================================
    if (!name && nameLatin) {
      const transliterated = this.transliterateMoroccanFullName(nameLatin);
      name = transliterated || nameLatin;
    } else if (!nameLatin && name) {
      nameLatin = this.transliterateArabicToLatinFullName(name) || name;
    }

    return {
      idNumber,
      idIssueDate,
      idExpiryDate,
      dateOfBirth,
      placeOfBirth,
      name,
      nameLatin,
      fatherName,
      motherName,
      address,
      nationality: 'مغربية',
      confidence,
    };
  }

  /**
   * Specialized high-performance extractor for Moroccan National Identity Card (CIN)
   */
  async extractMoroccanCINFromImage(file: Buffer, fileName?: string): Promise<MoroccanCINExtractionResult> {
    try {
      const araWorker = await this.getWorker();
      const engWorker = await this.getEngWorker();

      // Pass 0: Targeted Zonal OCR (isolates MRZ on back & text zones on front)
      const { width, height } = this.getImageDimensions(file);
      let cumulativeText = '';

      if (width >= 200 && height >= 200) {
        try {
          // Zone A: MRZ Zone (Bottom ~40% of card) with English worker
          await engWorker.setParameters({ tessedit_pageseg_mode: '6' }).catch(() => {});
          const mrzZone = {
            top: Math.round(height * 0.60),
            left: 0,
            width: width,
            height: Math.round(height * 0.40),
          };
          const resMrzZone = await engWorker.recognize(file, { rectangle: mrzZone }).catch(() => ({ data: { text: '' } }));
          const textMrzZone = resMrzZone.data?.text || '';
          if (textMrzZone) {
            cumulativeText += textMrzZone + '\n';
          }
        } catch {
          // fallback to full image
        }
      }

      // Pass 1: Full image PSM 6 (Uniform text block - optimal for line-by-line card layout)
      await Promise.all([
        araWorker.setParameters({ tessedit_pageseg_mode: '6' }).catch(() => {}),
        engWorker.setParameters({ tessedit_pageseg_mode: '6' }).catch(() => {}),
      ]);

      const [resAra6, resEng6] = await Promise.all([
        araWorker.recognize(file).catch(() => ({ data: { text: '' } })),
        engWorker.recognize(file).catch(() => ({ data: { text: '' } })),
      ]);

      const textAra6 = resAra6.data?.text || '';
      const textEng6 = resEng6.data?.text || '';
      cumulativeText += textAra6 + '\n' + textEng6;

      const pAra6 = this.parseMoroccanCINText(textAra6);
      const pEng6 = this.parseMoroccanCINText(textEng6);

      let idNumber = pEng6.idNumber || pAra6.idNumber;
      let name = pAra6.name || pEng6.name;
      let nameLatin = pEng6.nameLatin || pAra6.nameLatin;
      let address = pAra6.address || pEng6.address;
      let idExpiryDate = pAra6.idExpiryDate || pEng6.idExpiryDate;
      let idIssueDate = pAra6.idIssueDate || pEng6.idIssueDate;
      let dateOfBirth = pAra6.dateOfBirth || pEng6.dateOfBirth;
      let placeOfBirth = pAra6.placeOfBirth || pEng6.placeOfBirth;
      let fatherName = pAra6.fatherName || pEng6.fatherName;
      let motherName = pAra6.motherName || pEng6.motherName;
      let confidence = Math.max(pEng6.confidence, pAra6.confidence);

      // Pass 2: If key fields are missing, scan with PSM 3 (Auto page segmentation for full ID card / MRZ)
      if (!idNumber || !name || !idExpiryDate) {
        await Promise.all([
          araWorker.setParameters({ tessedit_pageseg_mode: '3' }).catch(() => {}),
          engWorker.setParameters({ tessedit_pageseg_mode: '3' }).catch(() => {}),
        ]);

        const [resAra3, resEng3] = await Promise.all([
          araWorker.recognize(file).catch(() => ({ data: { text: '' } })),
          engWorker.recognize(file).catch(() => ({ data: { text: '' } })),
        ]);

        const textAra3 = resAra3.data?.text || '';
        const textEng3 = resEng3.data?.text || '';
        cumulativeText += '\n' + textAra3 + '\n' + textEng3;

        const pAra3 = this.parseMoroccanCINText(textAra3);
        const pEng3 = this.parseMoroccanCINText(textEng3);

        idNumber = idNumber || pEng3.idNumber || pAra3.idNumber;
        name = name || pAra3.name || pEng3.name;
        nameLatin = nameLatin || pEng3.nameLatin || pAra3.nameLatin;
        address = address || pAra3.address || pEng3.address;
        idExpiryDate = idExpiryDate || pAra3.idExpiryDate || pEng3.idExpiryDate;
        idIssueDate = idIssueDate || pAra3.idIssueDate || pEng3.idIssueDate;
        dateOfBirth = dateOfBirth || pAra3.dateOfBirth || pEng3.dateOfBirth;
        placeOfBirth = placeOfBirth || pAra3.placeOfBirth || pEng3.placeOfBirth;
        fatherName = fatherName || pAra3.fatherName || pEng3.fatherName;
        motherName = motherName || pAra3.motherName || pEng3.motherName;
        confidence = Math.max(confidence, pAra3.confidence, pEng3.confidence);
      }

      // Pass 3: Cumulative text analysis across all passes to capture multi-block combinations
      const pCumulative = this.parseMoroccanCINText(cumulativeText);
      idNumber = idNumber || pCumulative.idNumber;
      name = name || pCumulative.name;
      nameLatin = nameLatin || pCumulative.nameLatin;
      address = address || pCumulative.address;
      idExpiryDate = idExpiryDate || pCumulative.idExpiryDate;
      idIssueDate = idIssueDate || pCumulative.idIssueDate;
      dateOfBirth = dateOfBirth || pCumulative.dateOfBirth;
      placeOfBirth = placeOfBirth || pCumulative.placeOfBirth;
      fatherName = fatherName || pCumulative.fatherName;
      motherName = motherName || pCumulative.motherName;
      confidence = Math.max(confidence, pCumulative.confidence);

      // Pass 4: Character whitelist fallback for blurry ID numbers if still missing
      if (!idNumber) {
        try {
          await engWorker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789< -N°.:/',
          });
          const resWhitelist = await engWorker.recognize(file);
          await engWorker.setParameters({ tessedit_char_whitelist: '' });
          const textWhitelist = resWhitelist.data?.text || '';
          cumulativeText += '\n' + textWhitelist;
          const pWl = this.parseMoroccanCINText(textWhitelist);
          if (pWl.idNumber) {
            idNumber = pWl.idNumber;
            confidence = Math.max(confidence, pWl.confidence);
          }
        } catch {
          try {
            await engWorker.setParameters({ tessedit_char_whitelist: '' });
          } catch {}
        }
      }

      // Pass 5: Check if fileName contains Moroccan CIN pattern (e.g. CIN_AB123456.jpg)
      if (!idNumber && fileName) {
        const fnMatch = fileName.match(/\b([A-Z]{1,2}\d{5,7})\b/i);
        if (fnMatch) {
          idNumber = fnMatch[1].toUpperCase();
          confidence = Math.max(confidence, 75);
        }
      }

      // Final synchronization between name and nameLatin if one is missing
      if (!name && nameLatin) {
        name = this.transliterateMoroccanFullName(nameLatin) || nameLatin;
      } else if (!nameLatin && name) {
        nameLatin = this.transliterateArabicToLatinFullName(name) || name;
      }

      // Calculate composite confidence score
      if (idNumber) {
        let score = 65;
        if (name) score += 15;
        if (idExpiryDate) score += 10;
        if (address) score += 5;
        if (dateOfBirth) score += 5;
        confidence = Math.min(98, score);
      }

      const hasAnyData = Boolean(idNumber || name || address || idExpiryDate);

      return {
        rawText: cumulativeText,
        extractedFields: {
          idNumber,
          idIssueDate: idIssueDate || dateOfBirth,
          idExpiryDate,
          dateOfBirth,
          placeOfBirth,
          name: name || nameLatin,
          nameLatin: nameLatin || name,
          fatherName,
          motherName,
          address,
          nationality: 'مغربية',
        },
        confidence: hasAnyData ? confidence : 0,
        errors: hasAnyData ? [] : ['لم نتمكن من قراءة بيانات بطاقة التعريف الوطنية بدقة من هذه الصورة'],
      };
    } catch (error) {
      console.error('extractMoroccanCINFromImage error:', error);
      return {
        rawText: '',
        extractedFields: {
          nationality: 'مغربية',
        },
        confidence: 0,
        errors: [error instanceof Error ? error.message : 'فشل التعرف الضوئي على البطاقة'],
      };
    }
  }

  async extractOcrFromDocument(file: Buffer): Promise<OCRResult> {
    try {
      // Use Tesseract.js for OCR extraction
      const worker = await this.getWorker();
      const { data } = await worker.recognize(file);

      const rawText = data.text.trim();
      const lines = data.lines || [];

      // Build detectedFields using heuristics
      const detectedFields: Record<string, string> = {};

      // Common label keywords in Arabic
      const nameKeywords = ['الاسم', 'الاسم الكامل', 'الاسم والنسب'];
      const cinKeywords = ['رقم البطاقة', 'بطاقة', 'رقم البطاقة الوطنية'];
      const dobKeywords = ['تاريخ الازدياد', 'تاريخ الميلاد'];
      const nationalityKeywords = ['الجنسية'];
      const addressKeywords = ['السكن', 'العنوان', 'عنوان'];

      // Simple text-based extraction
      const findField = (keywords: string[], pattern?: RegExp) => {
        for (const line of lines) {
          const text = line.text || '';
          const normalized = text.replace(/\s+/g, '').toLowerCase();
          
          for (const kw of keywords) {
            if (normalized.includes(kw.replace(/\s+/g, '').toLowerCase())) {
              const words = text.split(/\s+/).filter(Boolean);
              const after = words.slice(1).join(' ').trim();
              if (after && (!pattern || pattern.test(after))) {
                return after;
              }
            }
          }
        }
        return null;
      };

      // Extract CIN
      const cinMatch = rawText.match(/[A-Z]{1,2}\d{5,7}/);
      if (cinMatch) detectedFields.cin = cinMatch[0];

      // Extract birth date
      const dateMatch = rawText.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/);
      if (dateMatch) detectedFields.dob = dateMatch[0];

      // Extract name (first Arabic line with reasonable length)
      const arabicLines = lines.filter((l: any) => /[\u0600-\u06FF]/.test(l.text || ''));
      if (arabicLines.length > 0) {
        const nameLine = arabicLines.find((l: any) => {
          const text = l.text || '';
          const words = text.split(/\s+/).filter(Boolean);
          return words.length >= 2 && words.length <= 6;
        });
        if (nameLine) detectedFields.name = nameLine.text.trim();
      }

      // Extract nationality
      const natField = findField(nationalityKeywords);
      if (natField) detectedFields.nationality = natField;

      // Extract address
      const addrField = findField(addressKeywords);
      if (addrField) detectedFields.address = addrField;

      return {
        rawText,
        detectedFields,
      };
    } catch (error) {
      console.error('OCR extraction error:', error);
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

