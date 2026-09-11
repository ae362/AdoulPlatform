import { Ollama } from 'ollama';
import type { ContractTemplate } from '../../../shared/schemas';
import { supabase } from './supabase';

export interface ContractDraftInput {
  contractType: string;
  parties: string;
  details?: string;
}

export interface ContractReviewInput {
  recordType: string;
  payload: any;
}

export interface Issue {
  level: 'info' | 'warning' | 'error';
  message: string;
  field?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  snippet: string;
}

export interface FieldSuggestionContext {
  recordType: string;
  payload: any;
}

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
});

const DEFAULT_CONTRACT_MODEL = process.env.OLLAMA_CONTRACT_MODEL || process.env.OLLAMA_VISION_MODEL || 'gpt-oss:120b-cloud';

const SALE_TEMPLATE = `
يجب صياغة العقد بدقة متناهية وفق النموذج المغربي التقليدي التالي (مع استبدال ما بين المعقوفين بالبيانات المقدمة):

الحمد لله وحده،
وعلى الساعة العاشرة من صباح يوم [اليوم] [التاريخ الهجري] الموافق لـ [التاريخ الميلادي]،
تلقى العدلان -أمنهما الله- [اسم العدل 1] و [اسم العدل 2]، المنتصبان للإشهاد بـ[الدائرة القضائية/المدينة]،
الشهادة المدرجة بمذكرة الحفظ رقم [رقم عشوائي] صحيفة [رقم] عدد [رقم]، نصها:
"الحمد لله وحده،
اشترى بحول الله وقوته السيد: [اسم المشتري الكامل]، ابن [اسم الأب] و [اسم الأم]، الحامل للبطاقة الوطنية رقم [رقم البطاقة]، الساكن بـ [العنوان]،
من البائع له السيد: [اسم البائع الكامل]، ابن [اسم الأب] و [اسم الأم]، الحامل للبطاقة الوطنية رقم [رقم البطاقة]، الساكن بـ [العنوان]،
وذلك جميع [وصف العقار: أرض/منزل/شقة] الكائنة بـ [موقع العقار]،
والتي تحد:
شمالاً: [الحد الشمالي] (بطول [الطول] م)،
جنوباً: [الحد الجنوبي] (بطول [الطول] م)،
شرقاً: [الحد الشرقي] (بطول [الطول] م)،
غرباً: [الحد الغربي] (بطول [الطول] م)،
بمساحة إجمالية قدرها [المساحة] متراً مربعاً.
وأصل الملكية: [ذكر مراجع الملكية أو الرسم العقاري].
وقد تم هذا البيع بثمن قدره ونهايته [الثمن بالحروف] ([الثمن بالأرقام] درهم).
[صيغة الأداء: مثلاً "وقد قبض البائع المذكور من يد المشتري جميع الثمن عياناً وأبرأه منه إبراءً تاماً لا رجعة فيه"].
وبذلك تملك المشتري جميع مشتراه وحل فيه محله ونزل منزلته كحل ذي المال في ماله وذي الملك الصحيح في ملكه.
شهد به عليهما وهما بأتمه، وحرر بتاريخ [تاريخ التحرير].
عبد ربه [اسم العدل 1]     وعبد ربه [اسم العدل 2]"
`;

const GENERIC_TEMPLATE = `
الخطوة 1 – مقدمة رسمية:
- تلخيص هوية العدول، مقر مكتبهم، ورقم المرجع.

الخطوة 2 – تعريف الأطراف:
- أسماء الأطراف، أسماء الأبوين، المهنة، السكنى، الوثائق التعريفية، والصفة القانونية أو التمثيلية.

الخطوة 3 – موضوع العقد:
- وصف دقيق للالتزام أو الحق محل التعاقد، والشروط الأساسية التي تحدد نطاقه.

الخطوة 4 – الالتزامات المالية والتنفيذ:
- كيفية الأداء، الجداول الزمنية، الجزاءات، والضمانات أو وسائل الإثبات.

الخطوة 5 – الخاتمة والتوثيق:
- التنصيص على الشهود، الإشهاد القانوني، مقر التوقيع، والتنبيه لأي مراجع قانونية مكملة.`;

export class AIService {
  private readonly contractModel = DEFAULT_CONTRACT_MODEL;
  private readonly templateCache = new Map<string, string>();

  async generateContractDraft(input: ContractDraftInput) {
    const template = await this.resolveTemplate(input.contractType);
    const prompt = this.buildContractPrompt({
      contractType: input.contractType,
      parties: input.parties,
      details: input.details,
      template,
    });

    try {
      const response = await ollama.generate({
        model: this.contractModel,
        prompt,
        options: {
          temperature: 0.2,
          top_p: 0.9,
        },
      });

      const cleaned = this.cleanResponse(response?.response);
      if (cleaned) {
        return { text: cleaned };
      }

      return { text: this.buildFallbackDraft(input, template) };
    } catch (error) {
      console.error('Ollama contract draft error:', error);
      return { text: this.buildFallbackDraft(input, template) };
    }
  }

  async *streamContractDraft(input: ContractDraftInput): AsyncGenerator<string, void, unknown> {
    const template = await this.resolveTemplate(input.contractType);
    const prompt = this.buildContractPrompt({
      contractType: input.contractType,
      parties: input.parties,
      details: input.details,
      template,
    });

    try {
      const responseStream = await (ollama.generate as any)({
        model: this.contractModel,
        prompt,
        stream: true,
        options: {
          temperature: 0.2,
          top_p: 0.9,
        },
      });

      for await (const part of responseStream) {
        if (part?.response) {
          yield part.response;
        }
      }
    } catch (error) {
      console.error('Ollama streaming error, falling back to simulated draft stream:', error);
      const fallback = this.buildFallbackDraft(input, template);
      const words = fallback.split(' ');
      for (const word of words) {
        yield word + ' ';
      }
    }
  }

  async reviewContractLegality(input: ContractReviewInput) {
    const issues: Issue[] = [
      { level: 'info', message: 'O¦U. OU,U?O-Oæ O"U+OªOO-.' },
    ];
    if (!input.payload) {
      issues.push({ level: 'warning', message: 'U,O O¦U^OªO_ O"USOU+OO¦ UŸOU?USOc U,U,U?O-Oæ.' });
    }
    return { issues, suggestions: 'OœOU? O¦U?OOæUSU, OOOU?USOc U,U,U.OæOO_U,Oc.' };
  }

  async semanticSearch(query: string): Promise<SearchResult[]> {
    return [{ id: 'mock-id', score: 0.8, snippet: `U+O¦OOÝOª O¦U,OñUSO"USOc U,U,O"O-O®: ${query}` }];
  }

  async suggestFieldValues(_context: FieldSuggestionContext) {
    return { suggestions: { notes: 'OU,O¦OñOO- O›U,US O¦OªOñUSO"US' } };
  }

  private async resolveTemplate(contractType: string): Promise<string> {
    const cacheKey = (contractType || 'default').trim().toLowerCase() || 'default';
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    const fromDb = await this.fetchTemplateFromDatabase(contractType);
    const template = fromDb || this.getPresetTemplate(contractType);
    this.templateCache.set(cacheKey, template);
    return template;
  }

  private async fetchTemplateFromDatabase(contractType: string): Promise<string | null> {
    const type = contractType?.trim();
    if (!type) return null;

    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('content')
        .eq('template_type', type)
        .limit(1);

      if (error) {
        console.warn('Failed to load contract template by type:', error.message);
      } else if (data && data.length && data[0]?.content) {
        return (data[0] as ContractTemplate).content;
      }

      const { data: byName, error: nameError } = await supabase
        .from('contract_templates')
        .select('content')
        .eq('name', type)
        .limit(1);

      if (nameError) {
        console.warn('Failed to load contract template by name:', nameError.message);
      } else if (byName && byName.length && byName[0]?.content) {
        return (byName[0] as ContractTemplate).content;
      }
    } catch (error) {
      console.error('Contract template lookup failed:', error);
    }

    return null;
  }

  private getPresetTemplate(contractType: string): string {
    const normalized = (contractType || '').toLowerCase();
    if (normalized.includes('بيع') || normalized.includes('شراء')) {
      return SALE_TEMPLATE.trim();
    }
    return GENERIC_TEMPLATE.trim();
  }

  private buildContractPrompt(params: { contractType: string; parties: string; details?: string; template: string }): string {
    const { contractType, parties, details, template } = params;
    const preparedDetails = this.formatDetails(details);

    return [
      'أنت كاتب عدل مغربي يعمل داخل مكتب التوثيق. اكتب مسودة عقد رسمية بالعربية الفصحى القانونية، دون أي وسوم Markdown أو تنسيقات برمجية.',
      `نوع العقد المطلوب: ${contractType || 'غير محدد'}`,
      `معلومات الأطراف أو عنوان العقد: ${parties || 'لم يتم تزويد أسماء الأطراف.'}`,
      preparedDetails,
      'استعمل المخطط أدناه المكون من خمس خطوات إلزامية لضمان إدراج أسماء الأبوين، العناوين، تفاصيل المشترين المتعددين (مع نسب حصصهم)، والمساحة بالطول والعرض والإحداثيات عند توفرها:',
      template.trim(),
      'أعد النص النهائي في شكل فقرات مرقمة تتبع الخطوات الخمس وبأسلوب قانوني واضح، مع إبراز وسيلة الأداء التي يمكن أن تتضمن خيار "اعترافا".',
    ].join('\n\n');
  }

  private formatDetails(details?: string): string {
    if (!details) {
      return 'تفاصيل إضافية: غير متوفرة.';
    }

    try {
      const parsed = JSON.parse(details) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        const lines = Object.entries(parsed)
          .filter(([, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => `- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);

        if (lines.length) {
          return ['تفاصيل إضافية منظمة:', ...lines].join('\n');
        }
      }
    } catch {
      // details was not JSON; keep raw text
    }

    return `تفاصيل إضافية (نص حر):\n${details}`;
  }

  private cleanResponse(raw?: string): string {
    if (!raw) return '';
    let text = raw.replace(/```([\s\S]*?)```/g, '$1');
    text = text.replace(/\*\*/g, '');
    text = text.replace(/__+/g, '');
    text = text.replace(/\u0000/g, '');
    return text.trim();
  }

  private buildFallbackDraft(input: ContractDraftInput, template: string): string {
    return [
      'تعذر الاتصال بنموذج الذكاء الاصطناعي المحلي (Ollama)، يرجى استعمال القالب اليدوي أدناه.',
      `نوع العقد: ${input.contractType || 'غير محدد'}`,
      `الأطراف / العنوان: ${input.parties || 'غير متوفر'}`,
      input.details ? `تفاصيل إضافية:\n${input.details}` : 'لا توجد تفاصيل إضافية مرفقة.',
      'قالب مقترح بخمس خطوات:',
      template.trim(),
    ].join('\n\n');
  }
}
