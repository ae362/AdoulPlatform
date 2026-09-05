import { PDFDocument, PDFForm, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MarriagePdfData {
  // Husband fields
  husband_name?: string;
  husband_cin?: string;
  husband_birth_date?: string;
  husband_nationality?: string;
  husband_marital_status?: string;
  husband_residence?: string;
  husband_occupation?: string;
  
  // Wife fields
  wife_name?: string;
  wife_cin?: string;
  wife_birth_date?: string;
  wife_nationality?: string;
  wife_marital_status?: string;
  wife_residence?: string;
  wife_occupation?: string;
  
  // Marriage details
  inclusion_date?: string;
  inclusion_hijri?: string;
  marriage_authorization_no?: string;
  dowry_amount?: number;
  contracted_by?: string;
  
  // Registry info
  registry_book_type?: string;
  registry_number?: number;
  registry_count?: number;
  registry_letter?: string;
  registry_page?: number;
}

// Field positions on the PDF (x, y coordinates from bottom-left)
// These will need to be adjusted based on your actual PDF layout
const FIELD_POSITIONS: Record<string, { x: number; y: number; size?: number }> = {
  // Husband section (معلومات عن الخاطب)
  husband_name: { x: 400, y: 600, size: 11 },
  husband_cin: { x: 400, y: 580, size: 10 },
  husband_birth_date: { x: 400, y: 560, size: 10 },
  husband_nationality: { x: 400, y: 540, size: 10 },
  husband_marital_status: { x: 400, y: 520, size: 10 },
  husband_residence: { x: 400, y: 500, size: 10 },
  husband_occupation: { x: 400, y: 480, size: 10 },
  
  // Wife section (معلومات عن المخطوبة)
  wife_name: { x: 400, y: 420, size: 11 },
  wife_cin: { x: 400, y: 400, size: 10 },
  wife_birth_date: { x: 400, y: 380, size: 10 },
  wife_nationality: { x: 400, y: 360, size: 10 },
  wife_marital_status: { x: 400, y: 340, size: 10 },
  wife_residence: { x: 400, y: 320, size: 10 },
  wife_occupation: { x: 400, y: 300, size: 10 },
  
  // Marriage details
  inclusion_date: { x: 100, y: 700, size: 10 },
  inclusion_hijri: { x: 100, y: 680, size: 10 },
  marriage_authorization_no: { x: 100, y: 240, size: 10 },
  dowry_amount: { x: 100, y: 220, size: 10 },
  
  // Registry
  registry_number: { x: 100, y: 160, size: 10 },
  registry_count: { x: 200, y: 160, size: 10 },
  registry_page: { x: 300, y: 160, size: 10 },
};

export class PdfFillerService {
  private templatePath: string;
  private arabicFontPath: string;

  constructor() {
    this.templatePath = path.join(__dirname, '../../marriage-template.pdf');
    // Using a built-in Arabic font or you can provide your own
    this.arabicFontPath = path.join(__dirname, '../../arial-unicode.ttf');
  }

  /**
   * Fill the marriage certificate PDF with provided data
   * Returns the filled PDF as a Buffer
   */
  async fillMarriageCertificate(data: MarriagePdfData): Promise<Buffer> {
    try {
      const templateExists = await fs.access(this.templatePath).then(() => true).catch(() => false);
      
      if (!templateExists) {
        throw new Error(`Template PDF not found at ${this.templatePath}`);
      }

      const templateBytes = await fs.readFile(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      
      // Use Helvetica for now (Arabic will be transliterated)
      // To properly support Arabic, download an Arabic font file to backend folder
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Draw text on the PDF
      this.drawText(firstPage, font, 'husband_name', data.husband_name);
      this.drawText(firstPage, font, 'husband_cin', data.husband_cin);
      this.drawText(firstPage, font, 'husband_birth_date', data.husband_birth_date);
      this.drawText(firstPage, font, 'husband_nationality', data.husband_nationality);
      this.drawText(firstPage, font, 'husband_marital_status', data.husband_marital_status);
      this.drawText(firstPage, font, 'husband_residence', data.husband_residence);
      this.drawText(firstPage, font, 'husband_occupation', data.husband_occupation);

      this.drawText(firstPage, font, 'wife_name', data.wife_name);
      this.drawText(firstPage, font, 'wife_cin', data.wife_cin);
      this.drawText(firstPage, font, 'wife_birth_date', data.wife_birth_date);
      this.drawText(firstPage, font, 'wife_nationality', data.wife_nationality);
      this.drawText(firstPage, font, 'wife_marital_status', data.wife_marital_status);
      this.drawText(firstPage, font, 'wife_residence', data.wife_residence);
      this.drawText(firstPage, font, 'wife_occupation', data.wife_occupation);

      this.drawText(firstPage, font, 'inclusion_date', data.inclusion_date);
      this.drawText(firstPage, font, 'inclusion_hijri', data.inclusion_hijri);
      this.drawText(firstPage, font, 'marriage_authorization_no', data.marriage_authorization_no);
      this.drawText(firstPage, font, 'dowry_amount', data.dowry_amount?.toString());
      
      this.drawText(firstPage, font, 'registry_number', data.registry_number?.toString());
      this.drawText(firstPage, font, 'registry_count', data.registry_count?.toString());
      this.drawText(firstPage, font, 'registry_page', data.registry_page?.toString());

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Error filling PDF:', error);
      throw error;
    }
  }

  /**
   * Draw text on the PDF page at the specified position
   */
  private drawText(page: PDFPage, font: any, fieldName: string, value?: string) {
    if (!value) return;
    
    const position = FIELD_POSITIONS[fieldName];
    if (!position) {
      console.warn(`No position defined for field: ${fieldName}`);
      return;
    }

    try {
      // Skip non-ASCII characters for now (Arabic text)
      const cleanValue = value.replace(/[^\x00-\x7F]/g, '');
      if (!cleanValue) {
        console.warn(`Field ${fieldName} contains only non-ASCII characters, skipping`);
        return;
      }

      page.drawText(cleanValue, {
        x: position.x,
        y: position.y,
        size: position.size || 10,
        font,
        color: rgb(0, 0, 0),
      });
    } catch (error) {
      console.warn(`Failed to draw field ${fieldName}:`, error);
    }
  }

  /**
   * Get PDF dimensions and help with positioning
   */
  async getTemplateDimensions(): Promise<{ width: number; height: number }> {
    try {
      const templateBytes = await fs.readFile(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const firstPage = pdfDoc.getPages()[0];
      const { width, height } = firstPage.getSize();
      return { width, height };
    } catch (error) {
      console.error('Error reading template dimensions:', error);
      return { width: 0, height: 0 };
    }
  }
}
