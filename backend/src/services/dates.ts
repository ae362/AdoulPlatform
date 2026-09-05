import { DateInfo } from '../../../shared';

export class DateService {
  getCurrentDates(): DateInfo {
    const now = new Date();
    return { gregorian: now.toISOString(), hijri: this.convertGregorianToHijri(now) };
  }

  convertGregorianToHijri(date: Date): string {
    // Placeholder conversion; replace with real calendar conversion library.
    const hijriYear = date.getUTCFullYear() - 579;
    return `${hijriYear}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  }

  convertHijriToGregorian(hijri: string): Date {
    const [y, m, d] = hijri.split('-').map(Number);
    return new Date((y + 579), (m ?? 1) - 1, d ?? 1);
  }
}
