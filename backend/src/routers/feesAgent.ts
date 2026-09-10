/**
 * Modular feesAgent Router Entry Point
 * 
 * Decomposed from an 11,700-line monolith into structured, domain-driven sub-routers:
 * - ocr: OCR extraction & smart document recognition
 * - validation: National ID, property boundaries, and price validation
 * - legal: Standard tax and third-party clause generation
 * - documents:
 *     - drafts: OnlyOffice integration, versioning, pagination, and PDF generation
 *     - savedRasms: Saved deeds repository, attachments, and stage lifecycle
 *     - judgeSubmissions: Notary-to-judge workflow and stage transitions
 *     - signedDeeds: Post-signature sealing, judge endorsement, and inclusion strip
 *     - secureArchive: Sovereign secure archive cards, registry search, and QR verification
 * - compliance: Automated notary compliance reporting
 */

export * from './feesAgent/index';
export { feesAgentRouter } from './feesAgent/index';
