export declare const languages: {
    readonly ar: "العربية";
    readonly fr: "Francais";
    readonly en: "English";
};
export type LanguageKey = keyof typeof languages;
export declare const navigation: readonly ["نسخ الرسوم العدلية", "بوابة تدبير طلبات الإذن", "أسماء العدول", "تحرير الرسوم", "مساطر قانونية", "تحرير الرسوم العدلية (سجل البيانات الالكتروني)", "إحصائيات", "ملفات", "نماذج العقود", "مختلفات", "التسجيل و التنبر"];
export type RegistryBookType = '\u0643\u0646\u0627\u0634\u0020\u0627\u0644\u0632\u0648\u0627\u062c' | '\u0643\u0646\u0627\u0634\u0020\u0627\u0644\u0637\u0644\u0627\u0642' | '\u0643\u0646\u0627\u0634\u0020\u0627\u0644\u0623\u0645\u0644\u0627\u0643' | '\u0643\u0646\u0627\u0634\u0020\u0627\u0644\u062a\u0631\u0643\u0627\u062a' | '\u0633\u062c\u0644\u0020\u0645\u062e\u062a\u0644\u0641\u0627\u062a';
export interface DateInfo {
    gregorian: string;
    hijri: string;
}
export interface LegalIssue {
    level: 'info' | 'warning' | 'error';
    message: string;
    field?: string;
}
export interface LegalValidationResult {
    issues: LegalIssue[];
}
export interface OCRResult {
    rawText: string;
    detectedFields: Record<string, string>;
}
export interface AISuggestion<T> {
    suggestions: Partial<T>;
    notes?: string;
}
export * from './schemas';
export declare const i18nStrings: Record<LanguageKey, Record<string, string>>;
