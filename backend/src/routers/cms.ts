import { router, publicProcedure, resolveSessionUser } from './trpc';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { TRPCError } from '@trpc/server';
import { CacheService } from '../services/cacheService';

export const cmsRouter = router({
  getContent: publicProcedure
    .input(z.object({ section: z.string().optional() }))
    .query(async ({ input }) => {
      const cacheKey = `ref:cms:content:${input.section || 'all'}`;
      return CacheService.remember(cacheKey, 3600, async () => {
        let query = supabase.from('cms_content').select('*');
        
        if (input.section) {
          query = query.eq('section', input.section);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('CMS Fetch Error:', error);
          return {};
        }
        
        // Convert array to object map for easier consumption
        const contentMap: Record<string, any> = {};
        if (data) {
          data.forEach((row: any) => {
            contentMap[row.key] = {
              value: row.value,
              type: row.type,
              description: row.description
            };
          });
        }
        
        return contentMap;
      });
    }),

  updateContent: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      updates: z.array(z.object({
        key: z.string(),
        value: z.string(),
        type: z.enum(['text', 'image', 'video', 'json', 'card_list']).optional(),
        section: z.string().optional(),
        description: z.string().optional(),
      }))
    }))
    .mutation(async ({ input }) => {
      const user = await resolveSessionUser(input.sessionToken);

      if (user.role !== 'creator') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only creators can update CMS content' });
      }

      const now = new Date().toISOString();
      const rows = input.updates.map((u) => ({
        key: u.key,
        value: u.value,
        ...(u.type ? { type: u.type } : {}),
        ...(u.section ? { section: u.section } : {}),
        ...(u.description ? { description: u.description } : {}),
        updated_at: now,
        updated_by: user.id,
      }));

      const { error } = await supabase
        .from('cms_content')
        .upsert(rows, { onConflict: 'key' });

      if (error) {
        console.error('CMS Upsert Error:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      
      await CacheService.delPattern('ref:cms:content:*');
      return { success: true };
    }),

  addCard: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      key: z.literal('cards_data'), // Currently restricted to cards_data list
      newCard: z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string()
      })
    }))
    .mutation(async ({ input }) => {
      const user = await resolveSessionUser(input.sessionToken);

      if (user.role !== 'creator') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only creators can update CMS content' });
      }

      // Fetch current list
      const { data } = await supabase
        .from('cms_content')
        .select('value')
        .eq('key', input.key)
        .single();
      
      const currentList = data ? JSON.parse(data.value) : [];
      const newList = [...currentList, input.newCard];
      
      const { error } = await supabase
        .from('cms_content')
        .upsert(
          {
            key: input.key,
            value: JSON.stringify(newList),
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
          { onConflict: 'key' }
        );
        
      if (error) throw new Error(error.message);
      await CacheService.delPattern('ref:cms:content:*');
      return { success: true };
    })
});
