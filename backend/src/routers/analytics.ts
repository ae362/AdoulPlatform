import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { supabase } from '../services/supabase';

export const analyticsRouter = router({
  getContentViewCounts: publicProcedure
    .input(z.object({ contentKeys: z.array(z.string().min(1)).max(500) }))
    .query(async ({ input }) => {
      const uniqueKeys = Array.from(new Set(input.contentKeys)).filter(Boolean);
      if (!uniqueKeys.length) return { counts: {} as Record<string, number> };

      const { data, error } = await supabase
        .from('content_view_counts')
        .select('content_key, view_count')
        .in('content_key', uniqueKeys);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.content_key] = Number(row.view_count ?? 0);
      }

      for (const k of uniqueKeys) {
        if (counts[k] == null) counts[k] = 0;
      }

      return { counts };
    }),

  recordContentView: publicProcedure
    .input(z.object({ contentKey: z.string().min(1), viewerKey: z.string().min(1).max(128) }))
    .mutation(async ({ input }) => {
      const { contentKey, viewerKey } = input;

      const { error: upsertError } = await supabase
        .from('content_views')
        .upsert(
          {
            content_key: contentKey,
            viewer_key: viewerKey,
          },
          { onConflict: 'content_key,viewer_key' }
        );

      if (upsertError) throw upsertError;

      const { count } = await supabase
        .from('content_views')
        .select('id', { count: 'exact', head: true })
        .eq('content_key', contentKey);

      return { contentKey, viewCount: count ?? 0 };
    }),
});
