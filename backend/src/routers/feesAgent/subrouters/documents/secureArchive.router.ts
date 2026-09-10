import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, resolveSessionUser } from '../../../trpc';
import { supabase } from '../../../../services/supabase';

async function requireNotary(sessionToken: string, message = 'Only notaries can access archive') {
  const user = await resolveSessionUser(sessionToken);
  if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message });
  return user;
}
import * as QRCode from 'qrcode';
import {
  readJudgeEndorsedDeedsCache,
  writeJudgeEndorsedDeedsCache,
  hmacToken,
  getPriorityJudgeCourtIdentifier,
} from '../../helpers';
import {
  extractSecureArchiveSearchDetails,
  deriveSignedDeedWorkflowStatus,
  extractPartiesFromPayload,
  extractPayloadDeedRelations,
  extractTaxReferenceCandidates,
  extractInclusionFromPayload,
} from '../../extractors';
import {
  SignedDeedCategorySchema,
  SignedDeedCategory,
} from '../../types';


export const secureArchiveProcedures = {
    listSecureArchiveCards: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          origin: z.string(),
          query: z.string().optional(),
          originalDeed: z.string().optional(),
          transferBook: z.string().optional(),
          transferNumber: z.string().optional(),
          transferCount: z.string().optional(),
          transferDate: z.string().optional(),
          transferAuthority: z.string().optional(),
          deedRelation: z.string().optional(),
          saleProcess: z.string().optional(),
          inclusionRegistryType: z.string().optional(),
          intakeDate: z.string().optional(),
          registryNumber: z.string().optional(),
          registryLetter: z.string().optional(),
          registryPage: z.string().optional(),
          registryCount: z.string().optional(),
          party1Name: z.string().optional(),
          party1Id: z.string().optional(),
          party2Name: z.string().optional(),
          party2Id: z.string().optional(),
          titleDeedType: z.string().optional(),
          titleBookType: z.string().optional(),
          titleBookNumber: z.string().optional(),
          titleDeedNumber: z.string().optional(),
          titleDeedCount: z.string().optional(),
          titleDeedPage: z.string().optional(),
          titleDeedOffice: z.string().optional(),
          titleDeedDate: z.string().optional(),
          financialBook: z.string().optional(),
          financialNumber: z.string().optional(),
          financialCount: z.string().optional(),
          financialDate: z.string().optional(),
          transactionDate: z.string().optional(),
          registrationNumber: z.string().optional(),
          registrationDate: z.string().optional(),
          paymentNumber: z.string().optional(),
          financeReference: z.string().optional(),
          registrationStatement: z.string().optional(),
          categories: z.array(SignedDeedCategorySchema).optional(),
          limit: z.number().int().min(1).max(200).optional(),
        })
      )
      .output(
        z.array(
          z.object({
            signedDeedId: z.string(),
            category: SignedDeedCategorySchema,
            signatureTimestamp: z.string().nullable(),
            createdAt: z.string(),
            fileNumber: z.string().nullable(),
            documentType: z.string().nullable(),
            inclusionRegistryType: z.string().nullable().optional(),
            intakeDate: z.string().nullable().optional(),
            referenceNumber: z.string().nullable().optional(),
            registryNumber: z.string().nullable(),
            registryLetter: z.string().nullable().optional(),
            registryCount: z.string().nullable(),
            registryPage: z.string().nullable(),
            titleBookType: z.string().nullable().optional(),
            titleBookNumber: z.string().nullable().optional(),
            titleDeedType: z.string().nullable().optional(),
            titleDeedNumber: z.string().nullable().optional(),
            titleDeedCount: z.string().nullable().optional(),
            titleDeedPage: z.string().nullable().optional(),
            titleDeedOffice: z.string().nullable().optional(),
            titleDeedDate: z.string().nullable().optional(),
            financialBook: z.string().nullable().optional(),
            financialNumber: z.string().nullable().optional(),
            financialCount: z.string().nullable().optional(),
            financialDate: z.string().nullable().optional(),
            financialCounterpartNumber: z.string().nullable().optional(),
            propertyIncomeReference: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
            court: z.string().nullable(),
            notaryName: z.string().nullable(),
            partyNames: z.array(z.string()).optional(),
            partyIdNumbers: z.array(z.string()).optional(),
            preJudge: z
              .object({ sha256: z.string(), fileUrl: z.string(), sealedAt: z.string() })
              .nullable(),
            postJudge: z
              .object({ sha256: z.string(), fileUrl: z.string(), sealedAt: z.string() })
              .nullable(),
            verification: z
              .object({
                token: z.string(),
                expiresAt: z.string().nullable(),
                url: z.string(),
                qrDataUrl: z.string().nullable(),
              })
              .nullable(),
          })
        )
      )
      .query(async ({ input }) => {
        const escapeLike = (value: string) => value.replace(/[%_]/g, (m) => `\\${m}`);
        const normalizeSearch = (value: unknown) =>
          String(value ?? '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        const user = await requireNotary(input.sessionToken);

        const limit = input.limit ?? 100;
        const query = (input.query || '').trim();
        const originalDeed = (input.originalDeed || '').trim();
        const transferBook = (input.transferBook || '').trim();
        const transferNumber = (input.transferNumber || '').trim();
        const transferCount = (input.transferCount || '').trim();
        const transferDate = (input.transferDate || '').trim();
        const transferAuthority = (input.transferAuthority || '').trim();
        const deedRelation = (input.deedRelation || '').trim();
        const saleProcess = (input.saleProcess || '').trim();
        const inclusionRegistryType = (input.inclusionRegistryType || '').trim();
        const intakeDate = (input.intakeDate || '').trim();
        const registryNumber = (input.registryNumber || '').trim();
        const registryLetter = (input.registryLetter || '').trim();
        const registryPage = (input.registryPage || '').trim();
        const registryCount = (input.registryCount || '').trim();
        const party1Name = (input.party1Name || '').trim();
        const party1Id = (input.party1Id || '').trim();
        const party2Name = (input.party2Name || '').trim();
        const party2Id = (input.party2Id || '').trim();
        const titleDeedType = (input.titleDeedType || '').trim();
        const titleBookType = (input.titleBookType || '').trim();
        const titleBookNumber = (input.titleBookNumber || '').trim();
        const titleDeedNumber = (input.titleDeedNumber || '').trim();
        const titleDeedCount = (input.titleDeedCount || '').trim();
        const titleDeedPage = (input.titleDeedPage || '').trim();
        const titleDeedOffice = (input.titleDeedOffice || '').trim();
        const titleDeedDate = (input.titleDeedDate || '').trim();
        const financialBook = (input.financialBook || '').trim();
        const financialNumber = (input.financialNumber || '').trim();
        const financialCount = (input.financialCount || '').trim();
        const financialDate = (input.financialDate || '').trim();
        const transactionDate = (input.transactionDate || '').trim();
        const registrationNumber = (input.registrationNumber || '').trim();
        const registrationDate = (input.registrationDate || '').trim();
        const paymentNumber = (input.paymentNumber || '').trim();
        const financeReference = (input.financeReference || '').trim();
        const registrationStatement = (input.registrationStatement || '').trim();
        const origin = (input.origin || '').replace(/\/$/, '');
        const effectiveFetchLimit = query ? Math.max(limit, 200) : limit;
        const hasStructuredFilters = !!(
          originalDeed ||
          transferBook ||
          transferNumber ||
          transferCount ||
          transferDate ||
          transferAuthority ||
          deedRelation ||
          saleProcess ||
          inclusionRegistryType ||
          intakeDate ||
          registryNumber ||
          registryLetter ||
          registryPage ||
          registryCount ||
          party1Name ||
          party1Id ||
          party2Name ||
          party2Id ||
          titleDeedType ||
          titleBookType ||
          titleBookNumber ||
          titleDeedNumber ||
          titleDeedCount ||
          titleDeedPage ||
          titleDeedOffice ||
          titleDeedDate ||
          financialBook ||
          financialNumber ||
          financialCount ||
          financialDate ||
          transactionDate ||
          registrationNumber ||
          registrationDate ||
          paymentNumber ||
          financeReference ||
          registrationStatement
        );

        let signedDeedIdsFilter: string[] | null = null;
        if (query) {
          const escapedQuery = escapeLike(query);
          const indexedIds = new Set<string>();

          try {
            const idxLikeRes = await supabase
              .from('deed_search_index')
              .select('signed_deed_id, search_text')
              .ilike('search_text', `%${escapedQuery}%`)
              .limit(effectiveFetchLimit);

            if (!idxLikeRes.error) {
              (idxLikeRes.data || []).forEach((r: any) => {
                if (r?.signed_deed_id) indexedIds.add(String(r.signed_deed_id));
              });
            }
          } catch {
            // fallback to direct row filtering below
          }

          try {
            const idxTextRes = await supabase
              .from('deed_search_index')
              .select('signed_deed_id')
              .textSearch('full_text', query, { type: 'plain', config: 'simple' } as any)
              .limit(effectiveFetchLimit);

            if (!idxTextRes.error) {
              (idxTextRes.data || []).forEach((r: any) => {
                if (r?.signed_deed_id) indexedIds.add(String(r.signed_deed_id));
              });
            }
          } catch {
            // fallback to direct row filtering below
          }

          try {
            const partiesRes = await supabase
              .from('deed_parties')
              .select('signed_deed_id, full_name, id_number')
              .or(`full_name.ilike.%${escapedQuery}%,id_number.ilike.%${escapedQuery}%`)
              .limit(effectiveFetchLimit);

            if (!partiesRes.error) {
              (partiesRes.data || []).forEach((r: any) => {
                if (r?.signed_deed_id) indexedIds.add(String(r.signed_deed_id));
              });
            } else {
              const msg = String(partiesRes.error.message || '');
              const code = String((partiesRes.error as any)?.code || '');
              if (!(code === 'PGRST205' || msg.includes('deed_parties') || msg.includes('schema cache') || msg.includes('does not exist'))) {
                throw partiesRes.error;
              }
            }
          } catch {
            // fallback to direct row filtering below
          }

          signedDeedIdsFilter = indexedIds.size ? Array.from(indexedIds) : null;
        }

        let signedQuery = supabase
          .from('signed_deeds')
          .select(
            [
              'id',
              'category',
              'signature_timestamp',
              'created_at',
              'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, payload)',
              'inclusion_registry!signed_deeds_inclusion_fk(court, notary1_name, register_number, certificate_number, registry_page, inclusion_date, inclusion_hijri)',
              'seal_metadata(notary1_name, register_number, certificate_number, page_number, inclusion_date)',
            ].join(',')
          )
          .eq('saved_rasms.notary_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(effectiveFetchLimit);

        if (input.categories?.length) {
          signedQuery = signedQuery.in('category', input.categories as any);
        }
        if (signedDeedIdsFilter) {
          signedQuery = signedQuery.in('id', signedDeedIdsFilter as any);
        }

        const signedRes = await signedQuery;
        if (signedRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: signedRes.error.message });

        let signedRows = (signedRes.data || []) as any[];
        if (!signedRows.length) return [];

        if ((query && !signedDeedIdsFilter) || hasStructuredFilters) {
          const normalizedNeedle = normalizeSearch(query);
          signedRows = signedRows.filter((r: any) => {
            const saved = Array.isArray(r?.saved_rasms) ? r.saved_rasms[0] : r?.saved_rasms;
            const incl = Array.isArray(r?.inclusion_registry) ? r.inclusion_registry[0] : r?.inclusion_registry;
            const seal = Array.isArray(r?.seal_metadata) ? r.seal_metadata[0] : r?.seal_metadata;
            const payload = saved?.payload || {};
            const payloadParties = extractPartiesFromPayload(saved?.payload || {});
            const deedRelations = extractPayloadDeedRelations(payload);
            const taxReferences = extractTaxReferenceCandidates(payload);
            const archiveDetails = extractSecureArchiveSearchDetails(payload);
            const effectiveRegistryNumber = incl?.register_number ?? seal?.register_number ?? archiveDetails.registryNumber;
            const effectiveRegistryPage = incl?.registry_page ?? seal?.page_number ?? archiveDetails.registryPage;
            const effectiveRegistryCount = incl?.certificate_number ?? seal?.certificate_number ?? archiveDetails.registryCount;
            const effectiveIntakeDate = incl?.inclusion_date ?? seal?.inclusion_date ?? archiveDetails.intakeDate;
            const categoryLabel =
              r?.category === 'Marriage'
                ? 'الزواج'
                : r?.category === 'Divorce'
                  ? 'الطلاق'
                  : r?.category === 'Property'
                    ? 'الأملاك'
                    : r?.category === 'Inheritance'
                      ? 'التركات'
                      : 'باقي الوثائق';
            const categoryAliases =
              r?.category === 'Marriage'
                ? ['marriage', 'زواج', 'الزواج']
                : r?.category === 'Divorce'
                  ? ['divorce', 'طلاق', 'الطلاق']
                  : r?.category === 'Property'
                    ? ['property', 'amlak', 'milk', 'ملك', 'أملاك', 'الاملاك', 'الأملاك']
                    : r?.category === 'Inheritance'
                      ? ['inheritance', 'estate', 'تركة', 'تركات', 'التركات']
                      : ['other', 'misc', 'وثائق', 'باقي الوثائق'];
            const matchesAny = (needle: string, values: Array<unknown>) =>
              values.some((value) => normalizeSearch(value).includes(needle));

            const haystack = normalizeSearch([
              r?.id,
              saved?.file_number,
              saved?.document_type,
              incl?.court,
              incl?.notary1_name,
              seal?.notary1_name,
              ...payloadParties.flatMap((p) => [p.fullName, p.idNumber]),
              r?.category,
              categoryLabel,
              r?.signature_timestamp,
              r?.created_at,
            ].filter(Boolean).join(' '));

            if (query && !haystack.includes(normalizedNeedle)) return false;

            if (inclusionRegistryType) {
              const needle = normalizeSearch(inclusionRegistryType);
              const matched = matchesAny(needle, [
                (archiveDetails as any).inclusionRegistryType,
                archiveDetails.certificateType,
                saved?.document_type,
                r?.category,
                categoryLabel,
                ...categoryAliases,
              ]);
              if (!matched) return false;
            }
            if (intakeDate && !matchesAny(normalizeSearch(intakeDate), [effectiveIntakeDate, archiveDetails.titleDeedDate, (archiveDetails as any).financialDate])) return false;
            if (registryNumber && !matchesAny(normalizeSearch(registryNumber), [effectiveRegistryNumber, archiveDetails.titleDeedNumber, (archiveDetails as any).titleBookNumber, archiveDetails.referenceNumber])) return false;
            if (registryLetter && !matchesAny(normalizeSearch(registryLetter), [(archiveDetails as any).registryLetter])) return false;
            if (registryPage && !matchesAny(normalizeSearch(registryPage), [effectiveRegistryPage, archiveDetails.titleDeedPage])) return false;
            if (registryCount && !matchesAny(normalizeSearch(registryCount), [effectiveRegistryCount, archiveDetails.titleDeedCount, (archiveDetails as any).financialCount])) return false;
            if (party1Name && !normalizeSearch(archiveDetails.party1Name).includes(normalizeSearch(party1Name))) return false;
            if (party1Id && !normalizeSearch(archiveDetails.party1Id).includes(normalizeSearch(party1Id))) return false;
            if (party2Name && !normalizeSearch(archiveDetails.party2Name).includes(normalizeSearch(party2Name))) return false;
            if (party2Id && !normalizeSearch(archiveDetails.party2Id).includes(normalizeSearch(party2Id))) return false;
            if (titleDeedType) {
              const needle = normalizeSearch(titleDeedType);
              const matched = matchesAny(needle, [
                archiveDetails.titleDeedType,
                (archiveDetails as any).titleBookType,
                archiveDetails.certificateType,
                saved?.document_type,
                r?.category,
                categoryLabel,
                ...categoryAliases,
              ]);
              if (!matched) return false;
            }
            if (titleBookType && !matchesAny(normalizeSearch(titleBookType), [(archiveDetails as any).titleBookType, archiveDetails.certificateType, saved?.document_type, r?.category, categoryLabel, ...categoryAliases])) return false;
            if (titleBookNumber && !matchesAny(normalizeSearch(titleBookNumber), [(archiveDetails as any).titleBookNumber, archiveDetails.referenceNumber, archiveDetails.registryNumber])) return false;
            if (titleDeedNumber && !matchesAny(normalizeSearch(titleDeedNumber), [archiveDetails.titleDeedNumber, (archiveDetails as any).titleBookNumber, archiveDetails.referenceNumber])) return false;
            if (titleDeedCount && !matchesAny(normalizeSearch(titleDeedCount), [archiveDetails.titleDeedCount, archiveDetails.registryCount, (archiveDetails as any).financialCount])) return false;
            if (titleDeedPage && !matchesAny(normalizeSearch(titleDeedPage), [archiveDetails.titleDeedPage, archiveDetails.registryPage])) return false;
            if (titleDeedOffice && !matchesAny(normalizeSearch(titleDeedOffice), [archiveDetails.titleDeedOffice, archiveDetails.intakeOffice])) return false;
            if (titleDeedDate && !matchesAny(normalizeSearch(titleDeedDate), [archiveDetails.titleDeedDate, archiveDetails.intakeDate, ...deedRelations.map((item) => item.referenceDate)])) return false;
            if (financialBook && !matchesAny(normalizeSearch(financialBook), [(archiveDetails as any).financialBook, archiveDetails.certificateType, saved?.document_type, r?.category, categoryLabel])) return false;
            if (financialNumber && !matchesAny(normalizeSearch(financialNumber), [(archiveDetails as any).financialNumber, (archiveDetails as any).financialCounterpartNumber, archiveDetails.referenceNumber, archiveDetails.registryNumber])) return false;
            if (financialCount && !matchesAny(normalizeSearch(financialCount), [(archiveDetails as any).financialCount, archiveDetails.registryCount, archiveDetails.titleDeedCount])) return false;
            if (financialDate && !matchesAny(normalizeSearch(financialDate), [(archiveDetails as any).financialDate, archiveDetails.intakeDate, archiveDetails.titleDeedDate, ...taxReferences.map((item) => item.registrationDate)])) return false;

            if (originalDeed) {
              const needle = normalizeSearch(originalDeed);
              const matched = deedRelations.some((item) =>
                normalizeSearch([item.originalDeed, item.originalDeedNumber].filter(Boolean).join(' ')).includes(needle)
              );
              if (!matched) return false;
            }

            if (transferBook) {
              const needle = normalizeSearch(transferBook);
              const matched =
                deedRelations.some((item) => normalizeSearch(item.originalDeed).includes(needle)) ||
                normalizeSearch((archiveDetails as any).titleBookType).includes(needle) ||
                normalizeSearch((archiveDetails as any).titleBookNumber).includes(needle);
              if (!matched) return false;
            }

            if (transferNumber) {
              const needle = normalizeSearch(transferNumber);
              const matched =
                deedRelations.some((item) => normalizeSearch(item.originalDeedNumber).includes(needle) || normalizeSearch(item.originalDeed).includes(needle)) ||
                normalizeSearch(archiveDetails.registryNumber).includes(needle) ||
                normalizeSearch((archiveDetails as any).titleBookNumber).includes(needle) ||
                normalizeSearch(archiveDetails.titleDeedNumber).includes(needle) ||
                normalizeSearch(archiveDetails.referenceNumber).includes(needle);
              if (!matched) return false;
            }

            if (transferCount) {
              const needle = normalizeSearch(transferCount);
              const matched =
                deedRelations.some((item) => normalizeSearch(item.originalDeed).includes(needle)) ||
                normalizeSearch(archiveDetails.registryCount).includes(needle) ||
                normalizeSearch(archiveDetails.titleDeedCount).includes(needle);
              if (!matched) return false;
            }

            if (transferDate) {
              const needle = normalizeSearch(transferDate);
              const matched =
                deedRelations.some((item) => normalizeSearch(item.referenceDate).includes(needle)) ||
                normalizeSearch(archiveDetails.titleDeedDate).includes(needle);
              if (!matched) return false;
            }

            if (transferAuthority) {
              const needle = normalizeSearch(transferAuthority);
              const matched = matchesAny(needle, [archiveDetails.titleDeedOffice, archiveDetails.intakeOffice]);
              if (!matched) return false;
            }

            if (deedRelation) {
              const needle = normalizeSearch(deedRelation);
              const matched = deedRelations.some((item) => normalizeSearch(item.transferType).includes(needle));
              if (!matched) return false;
            }

            if (saleProcess) {
              const needle = normalizeSearch(saleProcess);
              const matched = deedRelations.some((item) => normalizeSearch(item.transferType).includes(needle));
              if (!matched) return false;
            }

            if (transactionDate) {
              const needle = normalizeSearch(transactionDate);
              const matched = deedRelations.some((item) => normalizeSearch(item.referenceDate).includes(needle)) || matchesAny(needle, [archiveDetails.titleDeedDate, archiveDetails.intakeDate]);
              if (!matched) return false;
            }

            if (registrationNumber) {
              const needle = normalizeSearch(registrationNumber);
              const matched =
                taxReferences.some((item) => normalizeSearch(item.registrationNumber).includes(needle)) ||
                matchesAny(needle, [
                  archiveDetails.referenceNumber,
                  archiveDetails.registryNumber,
                  (archiveDetails as any).financialNumber,
                  (archiveDetails as any).financialCounterpartNumber,
                  (archiveDetails as any).propertyIncomeReference,
                ]);
              if (!matched) return false;
            }

            if (registrationDate) {
              const needle = normalizeSearch(registrationDate);
              const matched =
                taxReferences.some((item) => normalizeSearch(item.registrationDate).includes(needle)) ||
                matchesAny(needle, [(archiveDetails as any).financialDate, archiveDetails.titleDeedDate, archiveDetails.intakeDate]);
              if (!matched) return false;
            }

            if (paymentNumber) {
              const needle = normalizeSearch(paymentNumber);
              const matched =
                taxReferences.some((item) => normalizeSearch(item.paymentNumber).includes(needle)) ||
                matchesAny(needle, [
                  (archiveDetails as any).financialCounterpartNumber,
                  (archiveDetails as any).financialNumber,
                  archiveDetails.referenceNumber,
                ]);
              if (!matched) return false;
            }

            if (financeReference) {
              const needle = normalizeSearch(financeReference);
              const matched =
                taxReferences.some((item) => normalizeSearch(item.financeReference).includes(needle)) ||
                matchesAny(needle, [
                  (archiveDetails as any).financialCounterpartNumber,
                  (archiveDetails as any).propertyIncomeReference,
                  (archiveDetails as any).financialBook,
                ]);
              if (!matched) return false;
            }

            if (registrationStatement) {
              const needle = normalizeSearch(registrationStatement);
              const matched =
                normalizeSearch(JSON.stringify(payload || {})).includes(needle) ||
                normalizeSearch((archiveDetails as any).notes).includes(needle) ||
                normalizeSearch((payload as any)?.registrationStatement).includes(needle) ||
                normalizeSearch((payload as any)?.financialData?.registrationStatement).includes(needle);
              if (!matched) return false;
            }

            return true;
          });
        }

        if (!signedRows.length) return [];

        const ids = signedRows.map((r) => String(r.id));
        const fileNumbers = Array.from(
          new Set(
            signedRows
              .map((row: any) => {
                const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
                return String(saved?.file_number || '').trim();
              })
              .filter(Boolean)
          )
        );

        const latestJudgeSubmissionByFileNumber: Record<string, any> = {};
        if (fileNumbers.length) {
          const judgeSubmissionsRes = await supabase
            .from('judge_submissions')
            .select('id, file_number, payload, updated_at')
            .in('file_number', fileNumbers as any)
            .in('status', ['accepted', 'accepted_with_notes'])
            .order('updated_at', { ascending: false });

          if (!judgeSubmissionsRes.error) {
            for (const row of judgeSubmissionsRes.data || []) {
              const fileNumber = row?.file_number ? String(row.file_number) : '';
              if (!fileNumber || latestJudgeSubmissionByFileNumber[fileNumber]) continue;
              latestJudgeSubmissionByFileNumber[fileNumber] = row;
            }
          }
        }

        const partiesBySignedDeedId: Record<string, Array<{ fullName: string | null; idNumber: string | null }>> = {};
        try {
          const deedPartiesRes = await supabase
            .from('deed_parties')
            .select('signed_deed_id, full_name, id_number')
            .in('signed_deed_id', ids as any);

          if (deedPartiesRes.error) {
            const msg = String(deedPartiesRes.error.message || '');
            const code = String((deedPartiesRes.error as any)?.code || '');
            if (!(code === 'PGRST205' || msg.includes('deed_parties') || msg.includes('schema cache') || msg.includes('does not exist'))) {
              throw deedPartiesRes.error;
            }
          } else {
            (deedPartiesRes.data || []).forEach((row: any) => {
              const deedId = String(row?.signed_deed_id || '');
              if (!deedId) return;
              if (!partiesBySignedDeedId[deedId]) partiesBySignedDeedId[deedId] = [];
              partiesBySignedDeedId[deedId].push({
                fullName: row?.full_name ? String(row.full_name) : null,
                idNumber: row?.id_number ? String(row.id_number) : null,
              });
            });
          }
        } catch (e: any) {
          const msg = String(e?.message || '');
          if (!(msg.includes('deed_parties') || msg.includes('schema cache') || msg.includes('does not exist'))) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg || 'Failed to load deed parties' });
          }
        }

        const versionsRes = await supabase
          .from('final_secure_archive_versions')
          .select('signed_deed_id, version_type, sha256, file_url, sealed_at')
          .in('signed_deed_id', ids as any);
        if (versionsRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: versionsRes.error.message });

        const versionsById: Record<string, { pre: any | null; post: any | null }> = {};
        ids.forEach((id) => (versionsById[id] = { pre: null, post: null }));
        (versionsRes.data || []).forEach((v: any) => {
          const id = String(v.signed_deed_id);
          if (!versionsById[id]) versionsById[id] = { pre: null, post: null };
          if (v.version_type === 'pre_judge') versionsById[id].pre = v;
          if (v.version_type === 'post_judge') versionsById[id].post = v;
        });

        const verRes = await supabase
          .from('verification_links')
          .select('signed_deed_id, token, expires_at, revoked_at, created_at')
          .in('signed_deed_id', ids as any)
          .is('revoked_at', null)
          .order('created_at', { ascending: false });
        if (verRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: verRes.error.message });

        const verById: Record<string, any> = {};
        (verRes.data || []).forEach((r: any) => {
          const id = String(r.signed_deed_id);
          if (!verById[id]) verById[id] = r;
        });

        const cards = await Promise.all(
          signedRows.map(async (r: any) => {
            const id = String(r.id);
            const saved = Array.isArray(r?.saved_rasms) ? r.saved_rasms[0] : r?.saved_rasms;
            const incl = Array.isArray(r?.inclusion_registry) ? r.inclusion_registry[0] : r?.inclusion_registry;
            const seal = Array.isArray(r?.seal_metadata) ? r.seal_metadata[0] : r?.seal_metadata;
            const v = versionsById[id] || { pre: null, post: null };
            const ver = verById[id] || null;
            const payloadParties = extractPartiesFromPayload(saved?.payload || {});
            const storedParties = partiesBySignedDeedId[id] || [];
            const parties = storedParties.length
              ? storedParties
              : payloadParties.map((p) => ({ fullName: p.fullName, idNumber: p.idNumber }));
            const archiveDetails = extractSecureArchiveSearchDetails(saved?.payload || {});
            const fileNumber = String(saved?.file_number || '').trim();
            const judgeSubmission = fileNumber ? latestJudgeSubmissionByFileNumber[fileNumber] : null;
            const judgePayload = judgeSubmission?.payload && typeof judgeSubmission.payload === 'object' ? judgeSubmission.payload : null;
            const judgeInclusionReference =
              judgePayload && typeof (judgePayload as any).inclusionReference === 'object'
                ? ((judgePayload as any).inclusionReference as Record<string, unknown>)
                : null;
            const effectiveRegistryNumber =
              incl?.register_number ??
              seal?.register_number ??
              judgeInclusionReference?.registerNumber ??
              judgeInclusionReference?.register_number ??
              archiveDetails.registryNumber;
            const effectiveRegistryCount =
              incl?.certificate_number ??
              seal?.certificate_number ??
              judgeInclusionReference?.inclusionNumber ??
              judgeInclusionReference?.inclusion_number ??
              archiveDetails.registryCount;
            const effectiveRegistryPage =
              incl?.registry_page ??
              seal?.page_number ??
              judgeInclusionReference?.registryPage ??
              judgeInclusionReference?.registry_page ??
              archiveDetails.registryPage;
            const effectiveIntakeDate =
              incl?.inclusion_date ??
              seal?.inclusion_date ??
              judgeInclusionReference?.gregorianDate ??
              judgeInclusionReference?.gregorian_date ??
              archiveDetails.intakeDate;
            const effectiveRegistryLetter =
              (judgeInclusionReference?.registryLetter as string | undefined) ??
              (judgeInclusionReference?.registry_letter as string | undefined) ??
              (archiveDetails as any).registryLetter ??
              null;
            const effectiveRegistryType =
              (judgeInclusionReference?.descriptor as string | undefined) ??
              (archiveDetails as any).inclusionRegistryType ??
              null;

            const preJudge = v.pre
              ? { sha256: String(v.pre.sha256), fileUrl: String(v.pre.file_url), sealedAt: String(v.pre.sealed_at) }
              : null;
            const postJudge = v.post
              ? { sha256: String(v.post.sha256), fileUrl: String(v.post.file_url), sealedAt: String(v.post.sealed_at) }
              : null;

            let verification: any = null;
            if (ver?.token) {
              const url = `${origin}/verify/${ver.token}`;
              let qrDataUrl: string | null = null;
              try {
                qrDataUrl = await QRCode.toDataURL(url, {
                  errorCorrectionLevel: 'M',
                  margin: 1,
                  width: 180,
                } as any);
              } catch {
                qrDataUrl = null;
              }
              verification = {
                token: String(ver.token),
                expiresAt: ver.expires_at ? String(ver.expires_at) : null,
                url,
                qrDataUrl,
              };
            }

            return {
              signedDeedId: id,
              category: r.category as SignedDeedCategory,
              signatureTimestamp: r.signature_timestamp ? String(r.signature_timestamp) : null,
              createdAt: String(r.created_at),
              fileNumber: saved?.file_number ?? archiveDetails.referenceNumber ?? null,
              documentType: saved?.document_type ?? archiveDetails.certificateType ?? archiveDetails.titleDeedType ?? null,
              inclusionRegistryType: effectiveRegistryType ?? null,
              intakeDate: effectiveIntakeDate ?? null,
              referenceNumber: archiveDetails.referenceNumber ?? null,
              registryNumber: effectiveRegistryNumber ?? null,
              registryLetter: effectiveRegistryLetter ?? null,
              registryCount: effectiveRegistryCount ?? null,
              registryPage: effectiveRegistryPage ?? null,
              titleBookType: (archiveDetails as any).titleBookType ?? null,
              titleBookNumber: (archiveDetails as any).titleBookNumber ?? null,
              titleDeedType: archiveDetails.titleDeedType ?? null,
              titleDeedNumber: archiveDetails.titleDeedNumber ?? null,
              titleDeedCount: archiveDetails.titleDeedCount ?? null,
              titleDeedPage: archiveDetails.titleDeedPage ?? null,
              titleDeedOffice: archiveDetails.titleDeedOffice ?? null,
              titleDeedDate: archiveDetails.titleDeedDate ?? null,
              financialBook: (archiveDetails as any).financialBook ?? null,
              financialNumber: (archiveDetails as any).financialNumber ?? null,
              financialCount: (archiveDetails as any).financialCount ?? null,
              financialDate: (archiveDetails as any).financialDate ?? null,
              financialCounterpartNumber: (archiveDetails as any).financialCounterpartNumber ?? null,
              propertyIncomeReference: (archiveDetails as any).propertyIncomeReference ?? null,
              notes: archiveDetails.notes ?? null,
              court: incl?.court ?? archiveDetails.intakeOffice ?? null,
              notaryName: incl?.notary1_name ?? seal?.notary1_name ?? archiveDetails.firstNotaryName ?? null,
              partyNames: parties.map((p) => p.fullName).filter(Boolean),
              partyIdNumbers: parties.map((p) => p.idNumber).filter(Boolean),
              preJudge,
              postJudge,
              verification,
            };
          })
        );

        if (query) {
          const normalizedNeedle = normalizeSearch(query);
          return cards
            .filter((card: any) => {
              const categoryLabel =
                card.category === 'Marriage'
                  ? 'الزواج'
                  : card.category === 'Divorce'
                    ? 'الطلاق'
                    : card.category === 'Property'
                      ? 'الأملاك'
                      : card.category === 'Inheritance'
                        ? 'التركات'
                        : 'باقي الوثائق';

              const haystack = normalizeSearch([
                card.signedDeedId,
                card.fileNumber,
                card.documentType,
                card.court,
                card.notaryName,
                ...(card.partyNames || []),
                ...(card.partyIdNumbers || []),
                card.category,
                categoryLabel,
                card.signatureTimestamp,
                card.createdAt,
                card.preJudge?.sha256,
                card.postJudge?.sha256,
                card.verification?.token,
              ].filter(Boolean).join(' '));

              return haystack.includes(normalizedNeedle);
            })
            .slice(0, limit);
        }

        return cards.slice(0, limit);
      }),

    listJudgeEndorsedDeeds: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          origin: z.string().optional(),
          query: z.string().optional(),
          judgeName: z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          categories: z.array(SignedDeedCategorySchema).optional(),
          limit: z.number().int().min(1).max(200).optional(),
        })
      )
      .output(
        z.array(
          z.object({
            signedDeedId: z.string(),
            savedRasmId: z.string(),
            judicialId: z.string().nullable(),
            inclusionReference: z
              .object({
                descriptor: z.string().nullable(),
                registerNumber: z.string().nullable(),
                registryLetter: z.string().nullable(),
                inclusionNumber: z.string().nullable(),
                registryPage: z.string().nullable(),
                hijriDate: z.string().nullable(),
                gregorianDate: z.string().nullable(),
              })
              .nullable(),
            category: SignedDeedCategorySchema,
            fileNumber: z.string().nullable(),
            documentType: z.string().nullable(),
            createdAt: z.string(),
            signatureTimestamp: z.string().nullable(),
            court: z.string().nullable(),
            notaryName: z.string().nullable(),
            judgeName: z.string().nullable(),
            partyNames: z.array(z.string()),
            partyIdNumbers: z.array(z.string()),
            workflowStatus: z.enum([
              'Draft',
              'ReadyForJudge',
              'SentToJudge',
              'PendingJudgeEndorsement',
              'JudgeEndorsed',
              'FinalArchived',
            ]),
            workflowCurrentStep: z.number().int().min(0).max(5),
            hasQr: z.boolean(),
            hasFingerprint: z.boolean(),
            hasAttachments: z.boolean(),
            isEditable: z.boolean(),
            canArchiveFinal: z.boolean(),
            previewUrl: z.string().nullable(),
            preJudge: z
              .object({ sha256: z.string(), fileUrl: z.string(), sealedAt: z.string() })
              .nullable(),
            postJudge: z
              .object({ sha256: z.string(), fileUrl: z.string(), sealedAt: z.string() })
              .nullable(),
            verification: z
              .object({
                token: z.string(),
                expiresAt: z.string().nullable(),
                url: z.string(),
                qrDataUrl: z.string().nullable(),
              })
              .nullable(),
          })
        )
      )
      .query(async ({ input }) => {
        const startedAt = Date.now();
        const normalizeSearch = (value: unknown) =>
          String(value ?? '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        const user = await requireNotary(input.sessionToken, 'Only notaries can access this page');

        const origin = String(input.origin || '').replace(/\/$/, '');
        const limit = input.limit ?? 120;
        const query = normalizeSearch(input.query);
        const judgeNameQuery = normalizeSearch(input.judgeName);
        const dateFrom = String(input.dateFrom || '').trim();
        const dateTo = String(input.dateTo || '').trim();
        const cacheKey = JSON.stringify({
          userId: user.id,
          origin,
          query,
          judgeNameQuery,
          dateFrom,
          dateTo,
          categories: input.categories || null,
          limit,
        });
        const cached = await readJudgeEndorsedDeedsCache(cacheKey);
        if (cached) {
          console.log('[feesAgent.listJudgeEndorsedDeeds] cache hit', {
            userId: user.id,
            ms: Date.now() - startedAt,
          });
          return cached as any;
        }
        const sentToNotaryRes = await supabase
          .from('archive_operation_logs')
          .select('signed_deed_id, timestamp')
          .eq('action_type', 'SEND_TO_NOTARY_JUDGE_ENDORSED')
          .not('signed_deed_id', 'is', null)
          .order('timestamp', { ascending: false })
          .limit(Math.max(limit * 6, limit));
        if (sentToNotaryRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: sentToNotaryRes.error.message });
        }

        const sentSignedDeedIds = Array.from(
          new Set(
            (sentToNotaryRes.data || [])
              .map((row: any) => String(row?.signed_deed_id || '').trim())
              .filter(Boolean)
          )
        );
        if (!sentSignedDeedIds.length) return [];

        let signedQuery = supabase
          .from('signed_deeds')
          .select(
            [
              'id',
              'saved_rasm_id',
              'inclusion_id',
              'category',
              'signature_timestamp',
              'created_at',
              'ready_for_judge',
              'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, payload)',
              'inclusion_registry!signed_deeds_inclusion_fk(court, notary1_name)',
              'seal_metadata(notary1_name)',
            ].join(',')
          )
          .in('id', sentSignedDeedIds as any)
          .eq('saved_rasms.notary_user_id', user.id)
          .not('inclusion_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(Math.max(limit * 2, limit));

        if (input.categories?.length) {
          signedQuery = signedQuery.in('category', input.categories as any);
        }

        const signedRes = await signedQuery;
        if (signedRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: signedRes.error.message });
        }
        const signedFetchedAt = Date.now();

        const signedRowsSent = ((signedRes.data || []) as any[]).filter((row: any) => {
          const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
          const fileNumber = saved?.file_number ? String(saved.file_number) : '';
          return !!fileNumber;
        }).slice(0, limit);
        if (!signedRowsSent.length) return [];

        const ids = signedRowsSent.map((r) => String(r.id));
        const fileNumbers = Array.from(
          new Set(
            signedRowsSent
              .map((row: any) => {
                const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
                return String(saved?.file_number || '').trim();
              })
              .filter(Boolean)
          )
        );
        if (!fileNumbers.length) return [];

        const submissionsRes = await supabase
          .from('judge_submissions')
          .select('id, file_number, document_type, payload, status, updated_at, decided_at, created_at')
          .in('status', ['accepted', 'accepted_with_notes'])
          .in('file_number', fileNumbers as any)
          .order('updated_at', { ascending: false });
        if (submissionsRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: submissionsRes.error.message });
        }

        const latestSubmissionByFileNumber: Record<string, any> = {};
        for (const row of submissionsRes.data || []) {
          const fileNumber = row?.file_number ? String(row.file_number) : '';
          if (!fileNumber || latestSubmissionByFileNumber[fileNumber]) continue;
          latestSubmissionByFileNumber[fileNumber] = row;
        }

        const partiesBySignedDeedId: Record<string, Array<{ fullName: string | null; idNumber: string | null }>> = {};
        try {
          const deedPartiesRes = await supabase
            .from('deed_parties')
            .select('signed_deed_id, full_name, id_number')
            .in('signed_deed_id', ids as any);
          if (!deedPartiesRes.error) {
            (deedPartiesRes.data || []).forEach((row: any) => {
              const deedId = String(row?.signed_deed_id || '');
              if (!deedId) return;
              if (!partiesBySignedDeedId[deedId]) partiesBySignedDeedId[deedId] = [];
              partiesBySignedDeedId[deedId].push({
                fullName: row?.full_name ? String(row.full_name) : null,
                idNumber: row?.id_number ? String(row.id_number) : null,
              });
            });
          }
        } catch {
          // ignore optional table
        }

        const attachmentRes = await supabase
          .from('deed_attachments')
          .select('record_id, category, file_url, created_at')
          .eq('record_type', 'signed_deed')
          .in('record_id', ids as any)
          .in('category', ['judge_court_stamped_pdf', 'judge_signed_pdf', 'signed_pdf'] as any)
          .order('created_at', { ascending: false });
        if (attachmentRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attachmentRes.error.message });
        }
        const attachmentsFetchedAt = Date.now();

        const latestPreviewById: Record<string, string | null> = {};
        const attachmentPriority: Record<string, number> = {
          judge_signed_pdf: 3,
          judge_court_stamped_pdf: 2,
          signed_pdf: 1,
        };
        const attachmentChoiceById: Record<string, { priority: number; url: string } | undefined> = {};
        (attachmentRes.data || []).forEach((attachment: any) => {
          const signedDeedId = String(attachment?.record_id || '');
          const category = String(attachment?.category || '');
          const fileUrl = String(attachment?.file_url || '').trim();
          if (!signedDeedId || !fileUrl) return;
          const priority = attachmentPriority[category] || 0;
          const current = attachmentChoiceById[signedDeedId];
          if (!current || priority > current.priority) {
            attachmentChoiceById[signedDeedId] = { priority, url: fileUrl };
            latestPreviewById[signedDeedId] = fileUrl;
          }
        });

        const rows = signedRowsSent.map((r: any) => {
            const id = String(r.id);
            const saved = Array.isArray(r?.saved_rasms) ? r.saved_rasms[0] : r?.saved_rasms;
            const incl = Array.isArray(r?.inclusion_registry) ? r.inclusion_registry[0] : r?.inclusion_registry;
            const seal = Array.isArray(r?.seal_metadata) ? r.seal_metadata[0] : r?.seal_metadata;
            const payload = saved?.payload || {};
            const submission = latestSubmissionByFileNumber[String(saved?.file_number || '')] || null;
            const judgePayload = submission?.payload && typeof submission.payload === 'object' ? submission.payload : {};
            const judicialId = getPriorityJudgeCourtIdentifier(
              Object.keys(judgePayload || {}).length ? judgePayload : payload,
              String(submission?.id || id),
              String(saved?.file_number || '')
            );
            const judgeInclusionReference =
              judgePayload && typeof judgePayload.inclusionReference === 'object' && judgePayload.inclusionReference
                ? (judgePayload.inclusionReference as Record<string, unknown>)
                : null;
            const payloadInclusionReference =
              payload && typeof payload.inclusionReference === 'object' && payload.inclusionReference
                ? (payload.inclusionReference as Record<string, unknown>)
                : null;
            const sealMetadata = seal && typeof seal === 'object' ? (seal as Record<string, unknown>) : null;
            const inclusionReference = {
              descriptor:
                String(
                  judgeInclusionReference?.descriptor ??
                    payloadInclusionReference?.descriptor ??
                    ''
                ).trim() || null,
              registerNumber:
                String(
                  incl?.register_number ??
                    sealMetadata?.register_number ??
                    judgeInclusionReference?.registerNumber ??
                    judgeInclusionReference?.register_number ??
                    payloadInclusionReference?.registerNumber ??
                    payloadInclusionReference?.register_number ??
                    ''
                ).trim() || null,
              registryLetter:
                String(
                  judgeInclusionReference?.registryLetter ??
                    judgeInclusionReference?.registry_letter ??
                    payloadInclusionReference?.registryLetter ??
                    payloadInclusionReference?.registry_letter ??
                    ''
                ).trim() || null,
              inclusionNumber:
                String(
                  incl?.certificate_number ??
                    sealMetadata?.certificate_number ??
                    judgeInclusionReference?.inclusionNumber ??
                    judgeInclusionReference?.inclusion_number ??
                    payloadInclusionReference?.inclusionNumber ??
                    payloadInclusionReference?.inclusion_number ??
                    ''
                ).trim() || null,
              registryPage:
                String(
                  incl?.page_number ??
                    sealMetadata?.page_number ??
                    judgeInclusionReference?.registryPage ??
                    judgeInclusionReference?.registry_page ??
                    payloadInclusionReference?.registryPage ??
                    payloadInclusionReference?.registry_page ??
                    ''
                ).trim() || null,
              hijriDate:
                String(
                  judgeInclusionReference?.hijriDate ??
                    judgeInclusionReference?.hijri_date ??
                    payloadInclusionReference?.hijriDate ??
                    payloadInclusionReference?.hijri_date ??
                    ''
                ).trim() || null,
              gregorianDate:
                String(
                  incl?.inclusion_date ??
                    sealMetadata?.inclusion_date ??
                    judgeInclusionReference?.gregorianDate ??
                    judgeInclusionReference?.gregorian_date ??
                    payloadInclusionReference?.gregorianDate ??
                    payloadInclusionReference?.gregorian_date ??
                    ''
                ).trim() || null,
            };
            const payloadParties = extractPartiesFromPayload(payload || {});
            const storedParties = partiesBySignedDeedId[id] || [];
            const parties = storedParties.length
              ? storedParties
              : payloadParties.map((p) => ({ fullName: p.fullName, idNumber: p.idNumber }));
            const archiveDetails = extractSecureArchiveSearchDetails(payload);
            const judgeName =
              judgePayload?.judgeName ||
              judgePayload?.judge_name ||
              null;

            return {
              signedDeedId: id,
              savedRasmId: String(r.saved_rasm_id),
              judicialId: judicialId || null,
              inclusionReference,
              category: r.category as SignedDeedCategory,
              fileNumber: saved?.file_number ?? archiveDetails.referenceNumber ?? null,
              documentType: saved?.document_type ?? archiveDetails.certificateType ?? null,
              createdAt: String(r.created_at),
              signatureTimestamp: r.signature_timestamp ? String(r.signature_timestamp) : null,
              court: incl?.court ?? archiveDetails.intakeOffice ?? null,
              notaryName: incl?.notary1_name ?? seal?.notary1_name ?? archiveDetails.firstNotaryName ?? null,
              judgeName: judgeName ? String(judgeName) : null,
              partyNames: parties.map((p) => p.fullName).filter(Boolean) as string[],
              partyIdNumbers: parties.map((p) => p.idNumber).filter(Boolean) as string[],
              workflowStatus: 'FinalArchived' as const,
              workflowCurrentStep: 5,
              hasQr: true,
              hasFingerprint: true,
              hasAttachments: !!saved,
              isEditable: false,
              canArchiveFinal: false,
              previewUrl: latestPreviewById[id] || null,
              preJudge: null,
              postJudge: null,
              verification: null,
            };
          });

        const filteredRows = rows.filter((row) => {
          const createdStamp = row.signatureTimestamp || row.createdAt;
          if (dateFrom && String(createdStamp).slice(0, 10) < dateFrom) return false;
          if (dateTo && String(createdStamp).slice(0, 10) > dateTo) return false;
          if (judgeNameQuery && !normalizeSearch(row.judgeName).includes(judgeNameQuery)) return false;
          if (query) {
            const haystack = normalizeSearch([
              row.judicialId,
              row.fileNumber,
              row.documentType,
              row.inclusionReference?.descriptor,
              row.inclusionReference?.registerNumber,
              row.inclusionReference?.registryLetter,
              row.inclusionReference?.inclusionNumber,
              row.inclusionReference?.registryPage,
              row.inclusionReference?.hijriDate,
              row.inclusionReference?.gregorianDate,
              row.court,
              row.judgeName,
              ...row.partyNames,
              ...row.partyIdNumbers,
              row.category,
              createdStamp,
            ].filter(Boolean).join(' '));
            if (!haystack.includes(query)) return false;
          }
          return true;
        });
        await writeJudgeEndorsedDeedsCache(cacheKey, filteredRows);
        console.log('[feesAgent.listJudgeEndorsedDeeds] timings', {
          userId: user.id,
          signedMs: signedFetchedAt - startedAt,
          attachmentsAndAuxMs: attachmentsFetchedAt - signedFetchedAt,
          totalMs: Date.now() - startedAt,
          rows: filteredRows.length,
        });
        return filteredRows;
      }),

    getArchiveSecurityLog: publicProcedure
      .input(z.object({ sessionToken: z.string(), signedDeedId: z.string().uuid() }))
      .output(
        z.array(
          z.object({
            id: z.string(),
            actionType: z.string(),
            timestamp: z.string(),
            userId: z.string().nullable(),
            device: z.any().nullable(),
            ip: z.string().nullable(),
            previousHash: z.string().nullable(),
            newHash: z.string().nullable(),
            metadata: z.any().nullable(),
          })
        )
      )
      .query(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can access logs');

        const ownRes = await supabase
          .from('signed_deeds')
          .select('id, saved_rasms!signed_deeds_saved_rasm_fk(notary_user_id)')
          .eq('id', input.signedDeedId)
          .single();
        if (ownRes.error || !ownRes.data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signed deed not found' });
        const saved = Array.isArray((ownRes.data as any)?.saved_rasms) ? (ownRes.data as any).saved_rasms[0] : (ownRes.data as any)?.saved_rasms;
        if (!saved || String(saved.notary_user_id) !== String(user.id)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

        const { data: rows, error } = await supabase
          .from('archive_operation_logs')
          .select('id, action_type, timestamp, user_id, device, ip, previous_hash, new_hash, metadata')
          .eq('signed_deed_id', input.signedDeedId)
          .order('timestamp', { ascending: false });
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return (rows || []).map((r: any) => ({
          id: String(r.id),
          actionType: String(r.action_type),
          timestamp: String(r.timestamp),
          userId: r.user_id ? String(r.user_id) : null,
          device: r.device ?? null,
          ip: r.ip ? String(r.ip) : null,
          previousHash: r.previous_hash ? String(r.previous_hash) : null,
          newHash: r.new_hash ? String(r.new_hash) : null,
          metadata: r.metadata ?? null,
        }));
      }),

    regenerateVerificationLink: publicProcedure
      .input(z.object({ sessionToken: z.string(), signedDeedId: z.string().uuid(), origin: z.string() }))
      .output(z.object({ token: z.string(), expiresAt: z.string().nullable(), url: z.string(), qrDataUrl: z.string().nullable() }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can regenerate links');

        const ownRes = await supabase
          .from('signed_deeds')
          .select('id, saved_rasms!signed_deeds_saved_rasm_fk(notary_user_id)')
          .eq('id', input.signedDeedId)
          .single();
        if (ownRes.error || !ownRes.data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signed deed not found' });
        const saved = Array.isArray((ownRes.data as any)?.saved_rasms) ? (ownRes.data as any).saved_rasms[0] : (ownRes.data as any)?.saved_rasms;
        if (!saved || String(saved.notary_user_id) !== String(user.id)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

        let verificationExpiryDays = 30;
        try {
          const settingsRes = await supabase
            .from('archive_settings')
            .select('verification_link_expiry_days')
            .eq('id', 1)
            .maybeSingle();
          const v = Number((settingsRes.data as any)?.verification_link_expiry_days);
          if (Number.isFinite(v) && v > 0 && v <= 3650) verificationExpiryDays = v;
        } catch {
          // ignore
        }

        const nowIso = new Date().toISOString();
        const expiresAt = new Date(Date.now() + verificationExpiryDays * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from('verification_links')
          .update({ revoked_at: nowIso })
          .eq('signed_deed_id', input.signedDeedId)
          .is('revoked_at', null);

        const insertRes = await supabase
          .from('verification_links')
          .insert({ signed_deed_id: input.signedDeedId, expires_at: expiresAt, created_by: user.id })
          .select('token, expires_at')
          .single();
        if (insertRes.error || !insertRes.data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertRes.error?.message ?? 'Failed to create link' });

        const origin = (input.origin || '').replace(/\/$/, '');
        const token = String((insertRes.data as any).token);
        const url = `${origin}/verify/${token}`;
        let qrDataUrl: string | null = null;
        try {
          qrDataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 180 } as any);
        } catch {
          qrDataUrl = null;
        }

        try {
          await supabase.from('archive_operation_logs').insert({
            signed_deed_id: input.signedDeedId,
            action_type: 'REGENERATE_VERIFICATION_LINK',
            timestamp: nowIso,
            user_id: user.id,
            device: null,
            ip: null,
            previous_hash: null,
            new_hash: null,
            metadata: { token },
          });
        } catch {
          // ignore
        }

        return { token, expiresAt: (insertRes.data as any).expires_at ? String((insertRes.data as any).expires_at) : null, url, qrDataUrl };
      }),

    searchLostDeedsByNationalId: publicProcedure
      .input(z.object({ sessionToken: z.string(), nationalId: z.string().min(1) }))
      .output(
        z.array(
          z.object({
            signedDeedId: z.string(),
            partyNames: z.array(z.string()),
            serialNumber: z.string().nullable(),
            registerNumber: z.string().nullable(),
            deedType: z.string().nullable(),
            date: z.string().nullable(),
            court: z.string().nullable(),
            notaryName: z.string().nullable(),
            visualCopy: z.string().nullable(),
            attachments: z.array(
              z.object({
                name: z.string(),
                url: z.string().nullable(),
                category: z.string().nullable(),
              })
            ),
          })
        )
      )
      .query(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can search archive');

        const nationalId = String(input.nationalId || '').trim();
        if (!nationalId) return [];

        const partyRes = await supabase
          .from('deed_parties')
          .select('signed_deed_id, full_name, id_number')
          .ilike('id_number', `%${nationalId.replace(/[%_]/g, '\\$&')}%`)
          .limit(100);
        if (partyRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: partyRes.error.message });

        const partyRows = (partyRes.data || []) as any[];
        const ids = Array.from(new Set(partyRows.map((r) => String(r.signed_deed_id)).filter(Boolean)));
        if (!ids.length) return [];

        const deedRes = await supabase
          .from('signed_deeds')
          .select([
            'id',
            'created_at',
            'signature_timestamp',
            'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, payload)',
            'inclusion_registry!signed_deeds_inclusion_fk(register_number, court, inclusion_date, notary1_name)',
            'seal_metadata(notary1_name)',
          ].join(','))
          .in('id', ids as any)
          .eq('saved_rasms.notary_user_id', user.id);
        if (deedRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deedRes.error.message });

        const ownedRows = (deedRes.data || []) as any[];
        if (!ownedRows.length) return [];

        const ownedIds = ownedRows.map((r: any) => String(r.id));
        const attachmentRes = await supabase
          .from('deed_attachments')
          .select('record_id, category, file_name, file_url')
          .eq('record_type', 'signed_deed')
          .in('record_id', ownedIds as any);
        if (attachmentRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attachmentRes.error.message });

        const attachmentsById: Record<string, Array<{ name: string; url: string | null; category: string | null }>> = {};
        (attachmentRes.data || []).forEach((att: any) => {
          const id = String(att.record_id);
          if (!attachmentsById[id]) attachmentsById[id] = [];
          attachmentsById[id].push({
            name: String(att.file_name || 'مرفق'),
            url: att.file_url ? String(att.file_url) : null,
            category: att.category ? String(att.category) : null,
          });
        });

        const partiesById: Record<string, string[]> = {};
        partyRows.forEach((party: any) => {
          const id = String(party.signed_deed_id);
          if (!partiesById[id]) partiesById[id] = [];
          const fullName = String(party.full_name || '').trim();
          if (fullName && !partiesById[id].includes(fullName)) partiesById[id].push(fullName);
        });

        return ownedRows.map((row: any) => {
          const id = String(row.id);
          const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
          const incl = Array.isArray(row?.inclusion_registry) ? row.inclusion_registry[0] : row?.inclusion_registry;
          const seal = Array.isArray(row?.seal_metadata) ? row.seal_metadata[0] : row?.seal_metadata;
          const payloadObj = saved?.payload ?? {};
          const extractedIncl = extractInclusionFromPayload(payloadObj);
          const attachments = attachmentsById[id] || [];
          const visualCopy = attachments.find((a) => a.category === 'signed_pdf')?.url || null;

          return {
            signedDeedId: id,
            partyNames: partiesById[id] || [],
            serialNumber: saved?.file_number ? String(saved.file_number) : null,
            registerNumber: incl?.register_number ?? extractedIncl.registerNumber ?? null,
            deedType: saved?.document_type ? String(saved.document_type) : null,
            date: row.signature_timestamp ? String(row.signature_timestamp) : (incl?.inclusion_date ? String(incl.inclusion_date) : String(row.created_at)),
            court: incl?.court ?? extractedIncl.court ?? null,
            notaryName: seal?.notary1_name ?? incl?.notary1_name ?? extractedIncl.notary1Name ?? null,
            visualCopy,
            attachments,
          };
        });
      }),

    searchDeedRelationshipTracker: publicProcedure
      .input(z.object({ sessionToken: z.string(), reference: z.string().min(1) }))
      .output(
        z.array(
          z.object({
            signedDeedId: z.string(),
            originalDeed: z.string().nullable(),
            subsequentSale: z.string().nullable(),
            transferType: z.string().nullable(),
            date: z.string().nullable(),
            notary: z.string().nullable(),
          })
        )
      )
      .query(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can search archive');

        const reference = String(input.reference || '').trim().toLowerCase();
        if (!reference) return [];

        const matchingPartyRes = await supabase
          .from('deed_parties')
          .select('signed_deed_id, id_number, full_name')
          .or(`id_number.ilike.%${reference.replace(/[%_]/g, '\\$&')}%,full_name.ilike.%${reference.replace(/[%_]/g, '\\$&')}%`)
          .limit(250);
        if (matchingPartyRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: matchingPartyRes.error.message });

        const matchingPartyDeedIds = new Set(
          ((matchingPartyRes.data || []) as any[])
            .map((row: any) => String(row.signed_deed_id || ''))
            .filter(Boolean)
        );

        const deedRes = await supabase
          .from('signed_deeds')
          .select([
            'id',
            'created_at',
            'signature_timestamp',
            'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, payload)',
            'inclusion_registry!signed_deeds_inclusion_fk(notary1_name)',
            'seal_metadata(notary1_name)',
          ].join(','))
          .eq('saved_rasms.notary_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(250);
        if (deedRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deedRes.error.message });

        const matches: Array<{
          signedDeedId: string;
          originalDeed: string | null;
          subsequentSale: string | null;
          transferType: string | null;
          date: string | null;
          notary: string | null;
        }> = [];

        ((deedRes.data || []) as any[]).forEach((row: any) => {
          const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
          if (!saved || String(saved.notary_user_id) !== String(user.id)) return;

          const incl = Array.isArray(row?.inclusion_registry) ? row.inclusion_registry[0] : row?.inclusion_registry;
          const seal = Array.isArray(row?.seal_metadata) ? row.seal_metadata[0] : row?.seal_metadata;
          const currentFileNumber = saved?.file_number ? String(saved.file_number) : null;
          const currentDocType = saved?.document_type ? String(saved.document_type) : null;
          const relations = extractPayloadDeedRelations(saved?.payload ?? {});

          relations.forEach((relation) => {
            const haystack = [
              relation.originalDeed,
              relation.originalDeedNumber,
              relation.transferType,
              currentFileNumber,
              currentDocType,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            const cinMatched = matchingPartyDeedIds.has(String(row.id));
            if (!haystack.includes(reference) && !cinMatched) return;

            matches.push({
              signedDeedId: String(row.id),
              originalDeed: relation.originalDeed,
              subsequentSale: currentFileNumber ? `${currentFileNumber}${currentDocType ? ` • ${currentDocType}` : ''}` : currentDocType,
              transferType: relation.transferType ?? currentDocType ?? null,
              date: row.signature_timestamp ? String(row.signature_timestamp) : String(row.created_at),
              notary: seal?.notary1_name ?? incl?.notary1_name ?? null,
            });
          });
        });

        const seen = new Set<string>();
        return matches.filter((item) => {
          const key = `${item.signedDeedId}::${item.originalDeed || ''}::${item.subsequentSale || ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 100);
      }),

    searchTaxRegistrationReferences: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          registrationNumber: z.string().optional(),
          registrationDate: z.string().optional(),
          paymentNumber: z.string().optional(),
          financeReference: z.string().optional(),
        })
      )
      .output(
        z.array(
          z.object({
            signedDeedId: z.string(),
            fileNumber: z.string().nullable(),
            deedType: z.string().nullable(),
            court: z.string().nullable(),
            registrationNumber: z.string().nullable(),
            registrationDate: z.string().nullable(),
            paymentNumber: z.string().nullable(),
            financeReference: z.string().nullable(),
            visualCopy: z.string().nullable(),
          })
        )
      )
      .query(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can search archive');

        const normalizedInput = {
          registrationNumber: String(input.registrationNumber || '').trim().toLowerCase(),
          registrationDate: String(input.registrationDate || '').trim(),
          paymentNumber: String(input.paymentNumber || '').trim().toLowerCase(),
          financeReference: String(input.financeReference || '').trim().toLowerCase(),
        };
        if (!normalizedInput.registrationNumber && !normalizedInput.registrationDate && !normalizedInput.paymentNumber && !normalizedInput.financeReference) {
          return [];
        }

        const deedRes = await supabase
          .from('signed_deeds')
          .select([
            'id',
            'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, payload)',
            'inclusion_registry!signed_deeds_inclusion_fk(court)',
          ].join(','))
          .eq('saved_rasms.notary_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(250);
        if (deedRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deedRes.error.message });

        const ownedRows = (deedRes.data || []) as any[];
        if (!ownedRows.length) return [];

        const ids = ownedRows.map((r: any) => String(r.id));
        const attachmentRes = await supabase
          .from('deed_attachments')
          .select('record_id, category, file_url')
          .eq('record_type', 'signed_deed')
          .eq('category', 'signed_pdf')
          .in('record_id', ids as any);
        if (attachmentRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attachmentRes.error.message });

        const visualById: Record<string, string | null> = {};
        (attachmentRes.data || []).forEach((att: any) => {
          const id = String(att.record_id);
          if (!visualById[id]) visualById[id] = att.file_url ? String(att.file_url) : null;
        });

        const matches: Array<{
          signedDeedId: string;
          fileNumber: string | null;
          deedType: string | null;
          court: string | null;
          registrationNumber: string | null;
          registrationDate: string | null;
          paymentNumber: string | null;
          financeReference: string | null;
          visualCopy: string | null;
        }> = [];

        ownedRows.forEach((row: any) => {
          const id = String(row.id);
          const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
          const incl = Array.isArray(row?.inclusion_registry) ? row.inclusion_registry[0] : row?.inclusion_registry;
          const candidates = extractTaxReferenceCandidates(saved?.payload ?? {});

          candidates.forEach((candidate) => {
            const ok =
              (!normalizedInput.registrationNumber || String(candidate.registrationNumber || '').toLowerCase().includes(normalizedInput.registrationNumber)) &&
              (!normalizedInput.registrationDate || String(candidate.registrationDate || '').includes(normalizedInput.registrationDate)) &&
              (!normalizedInput.paymentNumber || String(candidate.paymentNumber || '').toLowerCase().includes(normalizedInput.paymentNumber)) &&
              (!normalizedInput.financeReference || String(candidate.financeReference || '').toLowerCase().includes(normalizedInput.financeReference));

            if (!ok) return;

            matches.push({
              signedDeedId: id,
              fileNumber: saved?.file_number ? String(saved.file_number) : null,
              deedType: saved?.document_type ? String(saved.document_type) : null,
              court: incl?.court ? String(incl.court) : null,
              registrationNumber: candidate.registrationNumber,
              registrationDate: candidate.registrationDate,
              paymentNumber: candidate.paymentNumber,
              financeReference: candidate.financeReference,
              visualCopy: visualById[id] || null,
            });
          });
        });

        const seen = new Set<string>();
        return matches.filter((item) => {
          const key = `${item.signedDeedId}::${item.registrationNumber || ''}::${item.registrationDate || ''}::${item.paymentNumber || ''}::${item.financeReference || ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 100);
      }),

    verifyByToken: publicProcedure
      .input(z.object({ token: z.string().uuid() }))
      .output(
        z.object({
          valid: z.boolean(),
          reason: z.string().nullable(),
          signedDeedId: z.string().nullable(),
          expiresAt: z.string().nullable(),
          category: SignedDeedCategorySchema.nullable(),
          fileNumber: z.string().nullable(),
          documentType: z.string().nullable(),
          court: z.string().nullable(),
          preJudgeSha256: z.string().nullable(),
          postJudgeSha256: z.string().nullable(),
          artifactUrl: z.string().nullable(),
        })
      )
      .query(async ({ input }) => {
        const linkRes = await supabase
          .from('verification_links')
          .select('signed_deed_id, expires_at, revoked_at')
          .eq('token', input.token)
          .maybeSingle();

        if (linkRes.error || !linkRes.data || linkRes.data.revoked_at) {
          return {
            valid: false,
            reason: 'INVALID_OR_REVOKED',
            signedDeedId: null,
            expiresAt: null,
            category: null,
            fileNumber: null,
            documentType: null,
            court: null,
            preJudgeSha256: null,
            postJudgeSha256: null,
            artifactUrl: null,
          };
        }

        const expiresAt = linkRes.data.expires_at ? String(linkRes.data.expires_at) : null;
        if (expiresAt) {
          const exp = new Date(expiresAt);
          if (Number.isFinite(exp.getTime()) && exp.getTime() < Date.now()) {
            return {
              valid: false,
              reason: 'EXPIRED',
              signedDeedId: String(linkRes.data.signed_deed_id),
              expiresAt,
              category: null,
              fileNumber: null,
              documentType: null,
              court: null,
              preJudgeSha256: null,
              postJudgeSha256: null,
              artifactUrl: null,
            };
          }
        }

        const signedDeedId = String(linkRes.data.signed_deed_id);

        const deedRes = await supabase
          .from('signed_deeds')
          .select(
            [
              'id',
              'category',
              'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type)',
              'inclusion_registry!signed_deeds_inclusion_fk(court)',
            ].join(',')
          )
          .eq('id', signedDeedId)
          .maybeSingle();

        if (deedRes.error || !deedRes.data) {
          return {
            valid: false,
            reason: 'NOT_FOUND',
            signedDeedId,
            expiresAt,
            category: null,
            fileNumber: null,
            documentType: null,
            court: null,
            preJudgeSha256: null,
            postJudgeSha256: null,
            artifactUrl: null,
          };
        }

        const versionsRes = await supabase
          .from('final_secure_archive_versions')
          .select('version_type, sha256, file_url')
          .eq('signed_deed_id', signedDeedId);

        const versions = versionsRes.data || [];
        const pre = versions.find((v: any) => v.version_type === 'pre_judge') || null;
        const post = versions.find((v: any) => v.version_type === 'post_judge') || null;

        const saved = Array.isArray((deedRes.data as any)?.saved_rasms) ? (deedRes.data as any).saved_rasms[0] : (deedRes.data as any)?.saved_rasms;
        const incl = Array.isArray((deedRes.data as any)?.inclusion_registry) ? (deedRes.data as any).inclusion_registry[0] : (deedRes.data as any)?.inclusion_registry;

        return {
          valid: true,
          reason: null,
          signedDeedId,
          expiresAt,
          category: (deedRes.data as any).category as SignedDeedCategory,
          fileNumber: saved?.file_number ?? null,
          documentType: saved?.document_type ?? null,
          court: incl?.court ?? null,
          preJudgeSha256: pre?.sha256 ? String(pre.sha256) : null,
          postJudgeSha256: post?.sha256 ? String(post.sha256) : null,
          artifactUrl: post?.file_url ? String(post.file_url) : pre?.file_url ? String(pre.file_url) : null,
        };
      }),
};
