import type { OCRResult } from '../../../shared';
import { createWorker } from 'tesseract.js';

export interface MoroccanCINExtractionResult {
  rawText: string;
  extractedFields: {
    name?: string;
    idNumber?: string;
    idIssueDate?: string;
    idExpiryDate?: string;
    nationality?: string;
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
      .replace(/[OoD]/g, '0')
      .replace(/[Il|!]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[G]/g, '6')
      .replace(/[Bb]/g, '8')
      .replace(/[Aa]/g, '4')
      .replace(/[Ttr]/g, '7');
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
   * Parse extracted OCR text for Moroccan National Identity Card (CNIE) fields
   */
  private parseMoroccanCINText(text: string): {
    idNumber?: string;
    idIssueDate?: string;
    idExpiryDate?: string;
    name?: string;
    nationality?: string;
    confidence: number;
  } {
    let idNumber: string | undefined;
    let idIssueDate: string | undefined;
    let idExpiryDate: string | undefined;
    let name: string | undefined;
    let confidence = 0;

    // 1. High-precision MRZ Match (ICAO 9303 TD1 - Moroccan Identity Card Back)
    const mrzMatch = text.match(/IDMAR[\s\S]*?[<0-9]([A-Z0-9]{1,2}[0-9A-Z]{4,8})</i);
    if (mrzMatch && mrzMatch[1]) {
      const sanitized = this.sanitizeBlurryCIN(mrzMatch[1]);
      if (sanitized) {
        idNumber = sanitized;
        confidence = 98;
      }
    }

    // Decode MRZ Line 2 (DOB and Expiry) e.g. 7207185M3010231MAR
    const mrzLine2 = text.match(/(\d{6})\d([MF])(\d{6})/);
    if (mrzLine2) {
      try {
        const dobRaw = mrzLine2[1];
        const expRaw = mrzLine2[3];
        const yDob = parseInt(dobRaw.slice(0, 2), 10);
        const fullYDob = yDob > 30 ? 1900 + yDob : 2000 + yDob;
        idIssueDate = `${fullYDob}-${dobRaw.slice(2, 4)}-${dobRaw.slice(4, 6)}`;

        const yExp = parseInt(expRaw.slice(0, 2), 10);
        const fullYExp = 2000 + yExp;
        idExpiryDate = `${fullYExp}-${expRaw.slice(2, 4)}-${expRaw.slice(4, 6)}`;
      } catch {
        // ignore decode failure
      }
    }

    // Decode MRZ Name: e.g. EL<GHAYATI<<SAID
    const mrzName = text.match(/([A-Z]+)<+([A-Z]+)<*/);
    if (mrzName && text.includes('IDMAR')) {
      name = `${mrzName[2]} ${mrzName[1]}`.trim();
    }

    // 2. Candidate collection and scoring across text lines
    if (!idNumber) {
      const candidates: Array<{ raw: string; nearLabel: boolean }> = [];
      const lines = text.split('\n');

      for (const line of lines) {
        if (/CAN\s*\d+/i.test(line)) continue;

        // Pattern A: explicitly near label (N°, No, رقم, w, wv, »)
        const labelMatch = line.match(/(?:N[°oº\.\s]*|رقم\s*[:\.]?|wv\s*|w\s*|»\s*)[:\s]*([A-Za-z0-9]{1,2}\s*[-–.]?\s*[0-9A-Za-z]{4,8})\b/i);
        if (labelMatch && labelMatch[1]) {
          candidates.push({ raw: labelMatch[1], nearLabel: true });
        }

        // Pattern B: word tokens in line
        const words = line.split(/[\s,;:–-]+/);
        for (const w of words) {
          if (w.length >= 5 && w.length <= 10) {
            // Ignore date fragments
            if (/\d{2}[.\/-]\d{2}[.\/-]\d{4}/.test(line) && line.includes(w)) continue;
            candidates.push({ raw: w, nearLabel: false });
          }
        }
      }

      // Score candidates
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

    // 3. Fallback anywhere in text (excluding CAN numbers)
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

    // 4. Extract standard Moroccan card dates (DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY)
    if (!idIssueDate || !idExpiryDate) {
      const dateMatches = text.match(/\b(\d{2})[.\/-](\d{2})[.\/-](\d{4})\b/g);
      if (dateMatches && dateMatches.length > 0) {
        const normalizeDate = (d: string) => {
          const parts = d.split(/[.\/-]/);
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        };
        if (dateMatches.length === 1) {
          if (/valable|صالحة/i.test(text)) {
            idExpiryDate = normalizeDate(dateMatches[0]);
          } else {
            idIssueDate = normalizeDate(dateMatches[0]);
          }
        } else if (dateMatches.length >= 2) {
          idIssueDate = normalizeDate(dateMatches[0]);
          idExpiryDate = normalizeDate(dateMatches[1]);
        }
      }
    }

    // 5. Extract Latin full name if present on front face (e.g. KHALID \n HIMDI)
    if (!name) {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length - 1; i++) {
        const curr = lines[i];
        const next = lines[i + 1];
        if (
          /^[A-Z]{3,15}$/.test(curr) &&
          /^[A-Z]{3,15}$/.test(next) &&
          !/ROYAUME|MAROC|CARTE|NATIONALE|IDENTITE|VALABLE|CHEIKH|AGDAL|BENI|MELLAL|FES/.test(curr) &&
          !/ROYAUME|MAROC|CARTE|NATIONALE|IDENTITE|VALABLE|CHEIKH|AGDAL|BENI|MELLAL|FES/.test(next)
        ) {
          name = `${curr} ${next}`;
          break;
        }
      }
    }

    return {
      idNumber,
      idIssueDate,
      idExpiryDate,
      name,
      nationality: 'مغربية',
      confidence,
    };
  }

  /**
   * Specialized high-performance extractor for Moroccan National Identity Card (CIN)
   */
  async extractMoroccanCINFromImage(file: Buffer, fileName?: string): Promise<MoroccanCINExtractionResult> {
    try {
      const engWorker = await this.getEngWorker();

      // Pass 1: PSM 6 (Uniform text block - optimal for front face cards and line recognition)
      await engWorker.setParameters({ tessedit_pageseg_mode: '6' });
      const resPsm6 = await engWorker.recognize(file);
      const textPsm6 = resPsm6.data.text || '';
      let parsed = this.parseMoroccanCINText(textPsm6);

      if (parsed.idNumber && parsed.confidence >= 90) {
        return {
          rawText: textPsm6,
          extractedFields: {
            idNumber: parsed.idNumber,
            idIssueDate: parsed.idIssueDate,
            idExpiryDate: parsed.idExpiryDate,
            name: parsed.name,
            nationality: parsed.nationality || 'مغربية',
          },
          confidence: parsed.confidence,
          errors: [],
        };
      }

      // Pass 2: PSM 3 (Auto page segmentation - optimal for full ID card backs and MRZ)
      await engWorker.setParameters({ tessedit_pageseg_mode: '3' });
      const resPsm3 = await engWorker.recognize(file);
      const textPsm3 = resPsm3.data.text || '';
      const parsedPsm3 = this.parseMoroccanCINText(textPsm3);

      if (parsedPsm3.idNumber && parsedPsm3.confidence >= (parsed.confidence || 0)) {
        parsed = parsedPsm3;
      }

      if (parsed.idNumber && parsed.confidence >= 85) {
        return {
          rawText: textPsm6 + '\n' + textPsm3,
          extractedFields: {
            idNumber: parsed.idNumber,
            idIssueDate: parsed.idIssueDate,
            idExpiryDate: parsed.idExpiryDate,
            name: parsed.name,
            nationality: parsed.nationality || 'مغربية',
          },
          confidence: parsed.confidence,
          errors: [],
        };
      }

      // Pass 3: Multi-band scanning for mobile phone screenshots or double-sided documents
      const { width, height } = this.getImageDimensions(file);
      const bandCount = 5;
      const bandHeight = Math.floor(height * 0.22);
      let cumulativeText = textPsm6 + '\n' + textPsm3;

      for (let i = 0; i < bandCount; i++) {
        const top = Math.floor(i * height * 0.18);
        const rect = {
          top,
          left: 10,
          width: Math.max(width - 20, 100),
          height: Math.min(bandHeight, height - top),
        };
        try {
          const segRes = await engWorker.recognize(file, { rectangle: rect });
          const segText = segRes.data.text || '';
          cumulativeText += '\n' + segText;
          const segParsed = this.parseMoroccanCINText(segText);

          if (segParsed.idNumber && segParsed.confidence >= (parsed.confidence || 0)) {
            parsed = segParsed;
          }
        } catch {
          // ignore band error and continue
        }
      }

      if (parsed.idNumber && parsed.confidence >= 70) {
        return {
          rawText: cumulativeText,
          extractedFields: {
            idNumber: parsed.idNumber,
            idIssueDate: parsed.idIssueDate,
            idExpiryDate: parsed.idExpiryDate,
            name: parsed.name,
            nationality: 'مغربية',
          },
          confidence: parsed.confidence,
          errors: [],
        };
      }

      // Pass 4: Restricted character whitelist scan for blurry/noisy photos
      try {
        await engWorker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789< -N°.:/',
        });
        const pass3Res = await engWorker.recognize(file);
        await engWorker.setParameters({
          tessedit_char_whitelist: '',
        });
        const pass3Text = pass3Res.data.text || '';
        cumulativeText += '\n' + pass3Text;
        const pass3Parsed = this.parseMoroccanCINText(pass3Text);

        if (pass3Parsed.idNumber) {
          return {
            rawText: cumulativeText,
            extractedFields: {
              idNumber: pass3Parsed.idNumber,
              idIssueDate: pass3Parsed.idIssueDate || parsed.idIssueDate,
              idExpiryDate: pass3Parsed.idExpiryDate || parsed.idExpiryDate,
              name: pass3Parsed.name || parsed.name,
              nationality: 'مغربية',
            },
            confidence: pass3Parsed.confidence,
            errors: [],
          };
        }
      } catch {
        try {
          await engWorker.setParameters({ tessedit_char_whitelist: '' });
        } catch {}
      }

      // If no CIN found via OCR, check if fileName contains Moroccan CIN pattern (e.g. CIN_AB123456.jpg)
      if (fileName) {
        const fnMatch = fileName.match(/\b([A-Z]{1,2}\d{5,7})\b/i);
        if (fnMatch) {
          return {
            rawText: cumulativeText,
            extractedFields: {
              idNumber: fnMatch[1].toUpperCase(),
              nationality: 'مغربية',
            },
            confidence: 75,
            errors: [],
          };
        }
      }

      return {
        rawText: cumulativeText,
        extractedFields: {
          nationality: 'مغربية',
        },
        confidence: 0,
        errors: ['لم نتمكن من قراءة رقم بطاقة التعريف الوطنية بدقة من هذه الصورة'],
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

