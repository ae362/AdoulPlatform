import { z } from 'zod';
import { supabase } from '../services/supabase';
import { router, publicProcedure } from './trpc';
import { sanitizePostgrestValue, sanitizeIlikePattern, sanitizePlainText } from '../utils/inputSanitizer';

export const searchRouter = router({
  // Search by identity / CIN / name across marriage, divorce, and other fee records.
  byIdentity: publicProcedure
    .input(
      z.object({
        recordType: z.enum(['marriage', 'divorce', 'property', 'inheritance', 'other', 'all']).optional(),
        cin: z.string().optional(),
        name: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().min(0).optional(),
      }),
    )
    .query(async ({ input }) => {
      const { recordType, limit, offset = 0 } = input;
      const cin = input.cin ? sanitizePostgrestValue(input.cin) : undefined;
      const name = input.name ? sanitizeIlikePattern(input.name) : undefined;
      const from = input.from ? sanitizePlainText(input.from) : undefined;
      const to = input.to ? sanitizePlainText(input.to) : undefined;
      const selectedType = recordType === 'all' ? undefined : recordType;

      const applyRange = (q: any) => {
        if (limit) {
          return q.range(offset, offset + limit - 1);
        }
        return q;
      };

      const makeMarriageQuery = () => {
        let q = supabase.from('marriage_records').select('id,husband_name,wife_name,husband_cin,wife_cin,inclusion_date,registry_book_type,registry_number,registry_count,registry_page');
        if (cin) {
          q = q.or(`husband_cin.eq.${cin},wife_cin.eq.${cin}`);
        }
        if (name) {
          q = q.or(`husband_name.ilike.%${name}%,wife_name.ilike.%${name}%`);
        }
        if (from) q = q.gte('inclusion_date', from);
        if (to) q = q.lte('inclusion_date', to);
        return applyRange(q);
      };

      const makeDivorceQuery = () => {
        let q = supabase.from('divorce_records').select('id,husband_name,wife_name,husband_cin,wife_cin,inclusion_date,divorce_type,divorce_registry_book_type,divorce_registry_number,divorce_registry_count,divorce_registry_page');
        if (cin) {
          q = q.or(`husband_cin.eq.${cin},wife_cin.eq.${cin}`);
        }
        if (name) {
          q = q.or(`husband_name.ilike.%${name}%,wife_name.ilike.%${name}%`);
        }
        if (from) q = q.gte('inclusion_date', from);
        if (to) q = q.lte('inclusion_date', to);
        return applyRange(q);
      };

      const results: any[] = [];

      const makePropertyQuery = () => {
        let q = supabase.from('property_fees').select('id,fee_type,parties_names,parties_cin,inclusion_date');
        if (cin) {
          q = q.ilike('parties_cin', `%${cin}%`);
        }
        if (name) {
          const term = name.trim();
          q = q.ilike('parties_names', `%${term}%`);
        }
        if (from) q = q.gte('inclusion_date', from);
        if (to) q = q.lte('inclusion_date', to);
        return applyRange(q);
      };

      const makeInheritanceQuery = () => {
        let q = supabase
          .from('inheritance_fees')
          .select('id,fee_type,deceased_name,heirs_names,applicants_cin,inclusion_date');
        if (cin) {
          q = q.ilike('applicants_cin', `%${cin}%`);
        }
        if (name) {
          const term = name.trim();
          q = q.or(`heirs_names.ilike.%${term}%,deceased_name.ilike.%${term}%`);
        }
        if (from) q = q.gte('inclusion_date', from);
        if (to) q = q.lte('inclusion_date', to);
        return applyRange(q);
      };

      const makeOtherFeesQuery = () => {
        let q = supabase
          .from('other_document_fees')
          .select('id,fee_type,applicants_names,applicants_cin,inclusion_date');
        if (cin) {
          q = q.ilike('applicants_cin', `%${cin}%`);
        }
        if (name) {
          const term = name.trim();
          q = q.ilike('applicants_names', `%${term}%`);
        }
        if (from) q = q.gte('inclusion_date', from);
        if (to) q = q.lte('inclusion_date', to);
        return applyRange(q);
      };

      if (!selectedType || selectedType === 'marriage') {
        const { data, error } = await makeMarriageQuery();
        if (error) throw new Error(error.message);
        (data ?? []).forEach((row) =>
          results.push({
            source: 'marriage',
            ...row,
          }),
        );
      }

      if (!selectedType || selectedType === 'divorce') {
        const { data, error } = await makeDivorceQuery();
        if (error) throw new Error(error.message);
        (data ?? []).forEach((row) =>
          results.push({
            source: 'divorce',
            ...row,
          }),
        );
      }

      if (!selectedType || selectedType === 'property') {
        const { data, error } = await makePropertyQuery();
        if (error) throw new Error(error.message);
        (data ?? []).forEach((row) =>
          results.push({
            source: 'property',
            ...row,
          }),
        );
      }

      if (!selectedType || selectedType === 'inheritance') {
        const { data, error } = await makeInheritanceQuery();
        if (error) throw new Error(error.message);
        (data ?? []).forEach((row) =>
          results.push({
            source: 'inheritance',
            ...row,
          }),
        );
      }

      if (!selectedType || selectedType === 'other') {
        const { data, error } = await makeOtherFeesQuery();
        if (error) throw new Error(error.message);
        (data ?? []).forEach((row) =>
          results.push({
            source: 'other',
            ...row,
          }),
        );
      }

      return results;
    }),

  // Search by registry reference (book / number / count / page) across main fee tables.
  byRegistry: publicProcedure
    .input(
      z.object({
        bookType: z.string().optional(),
        registryNumber: z.number().optional(),
        registryCount: z.number().optional(),
        registryPage: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { bookType, registryNumber, registryCount, registryPage } = input;

      const makeQuery = (table: string, bookField: string, numField: string, countField: string, pageField: string) => {
        let q = supabase.from(table).select('*');
        if (bookType) q = q.eq(bookField, bookType);
        if (registryNumber !== undefined) q = q.eq(numField, registryNumber);
        if (registryCount !== undefined) q = q.eq(countField, registryCount);
        if (registryPage !== undefined) q = q.eq(pageField, registryPage);
        return q;
      };

      const [marriage, divorce, property, inheritance, other] = await Promise.all([
        makeQuery('marriage_records', 'registry_book_type', 'registry_number', 'registry_count', 'registry_page'),
        makeQuery('divorce_records', 'divorce_registry_book_type', 'divorce_registry_number', 'divorce_registry_count', 'divorce_registry_page'),
        makeQuery('property_fees', 'registry_book_type', 'registry_number', 'registry_count', 'registry_page'),
        makeQuery('inheritance_fees', 'registry_book_type', 'registry_number', 'registry_count', 'registry_page'),
        makeQuery('other_document_fees', 'registry_number', 'registry_number', 'registry_count', 'registry_page'),
      ]);

      if (marriage.error) throw new Error(marriage.error.message);
      if (divorce.error) throw new Error(divorce.error.message);
      if (property.error) throw new Error(property.error.message);
      if (inheritance.error) throw new Error(inheritance.error.message);
      if (other.error) throw new Error(other.error.message);

      return {
        marriage: marriage.data ?? [],
        divorce: divorce.data ?? [],
        property: property.data ?? [],
        inheritance: inheritance.data ?? [],
        other: other.data ?? [],
      };
    }),

  // Search by external document reference across multiple tables.
  byDocumentRef: publicProcedure
    .input(
      z.object({
        ref: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const term = input.ref.trim();

      const [marriage, property, inheritance, other, contracts] = await Promise.all([
        supabase.from('marriage_records').select('id,source_document_ref,inclusion_date').ilike('source_document_ref', `%${term}%`),
        supabase.from('property_fees').select('id,source_document_ref,inclusion_date').ilike('source_document_ref', `%${term}%`),
        supabase.from('inheritance_fees').select('id,document_references,inclusion_date').ilike('document_references', `%${term}%`),
        supabase.from('other_document_fees').select('id,document_refs,inclusion_date').ilike('document_refs', `%${term}%`),
        supabase.from('contracts').select('id,title,body,created_at').ilike('body', `%${term}%`),
      ]);

      if (marriage.error) throw new Error(marriage.error.message);
      if (property.error) throw new Error(property.error.message);
      if (inheritance.error) throw new Error(inheritance.error.message);
      if (other.error) throw new Error(other.error.message);
      if (contracts.error) throw new Error(contracts.error.message);

      return {
        marriage: marriage.data ?? [],
        property: property.data ?? [],
        inheritance: inheritance.data ?? [],
        other: other.data ?? [],
        contracts: contracts.data ?? [],
      };
    }),

  // Search property fees by coordinates text.
  byCoordinates: publicProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const term = input.text.trim();
      let q = supabase.from('property_fees').select('*');
      if (term) {
        q = q.ilike('property_coordinates', `%${term}%`);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
});
