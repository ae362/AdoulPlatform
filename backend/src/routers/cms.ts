import { router, publicProcedure } from './trpc';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { TRPCError } from '@trpc/server';

export const cmsRouter = router({
  getContent: publicProcedure
    .input(z.object({ section: z.string().optional() }))
    .query(async ({ input }) => {
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
      const { data: session, error: sessionError } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', input.sessionToken)
        .single();

      if (sessionError || !session) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, role, is_active')
        .eq('id', session.user_id)
        .single();

      if (userError || !user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
      }
      if (!user.is_active) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
      }
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
      const { data: session, error: sessionError } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', input.sessionToken)
        .single();

      if (sessionError || !session) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, role, is_active')
        .eq('id', session.user_id)
        .single();

      if (userError || !user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
      }
      if (!user.is_active) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
      }
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
      return { success: true };
    })
});
