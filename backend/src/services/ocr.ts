import type { OCRResult } from '../../../shared';
import { createWorker } from 'tesseract.js';

export class OCRService {
  private worker: any = null;

  /**
   * Initialize Tesseract.js worker
   */
  private async getWorker() {
    if (!this.worker) {
      this.worker = await createWorker('ara+eng');
    }
    return this.worker;
  }

  /**
   * Cleanup worker
   */
  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
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
              // Try to extract value from same line or next
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
