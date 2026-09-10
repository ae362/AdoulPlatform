/**
 * Complete Court Mapping for Morocco
 * محاكم الاستئناف والمحاكم الابتدائية التابعة لها
 *
 * ⚠️ TO UPDATE PRIMARY COURTS MAPPED TO EACH محكمة الاستئناف:
 * Edit the `primaryCourts` array under each appellate court in COURT_MAPPINGS below.
 * This is the SINGLE SOURCE OF TRUTH for all court mappings.
 */
export declare const COURT_TYPES: {
    readonly APPELLATE: "appellate";
    readonly FIRST_INSTANCE: "first_instance";
};
export interface CourtMapping {
    appellateCourt: string;
    primaryCourts: string[];
}
/**
 * ⚠️ EDIT THIS ARRAY TO CHANGE PRIMARY COURTS FOR EACH محكمة الاستئناف
 * Each object contains one محكمة الاستئناف and all المحاكم الابتدائية التابعة لها
 */
export declare const COURT_MAPPINGS: CourtMapping[];
/**
 * Get all appellate courts (محاكم الاستئناف)
 */
export declare function getAppellateCourts(): string[];
/**
 * Get primary courts for a specific appellate court
 * Returns empty array if appellate court not found
 */
export declare function getPrimaryCourts(appellateCourt: string): string[];
/**
 * Get court mapping as JSON (for API responses)
 */
export declare function getCourtMappingJson(appellateCourt: string): {
    error: string;
    appeal_court?: undefined;
    primary_courts?: undefined;
} | {
    appeal_court: string;
    primary_courts: string[];
    error?: undefined;
};
export declare const APPELLATE_COURTS: string[];
export declare const FIRST_INSTANCE_COURTS: string[];
export type AppellateCourtName = string;
export type FirstInstanceCourtName = string;
export type CourtName = AppellateCourtName | FirstInstanceCourtName;
