import { router, publicProcedure, protectedProcedure } from './trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { supabase } from '../services/supabase';
import { sanitizeIlikePattern } from '../utils/inputSanitizer';

export const studentsRouter = router({
  // Get all students for a region/council
  getAll: protectedProcedure
    .input(z.object({ 
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
      status: z.enum(['active', 'pending', 'inactive']).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'regional_adoul_council' && ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح - سجل المتدربين مقتصر على المجالس الجهوية' });
      }
      try {
        let query = supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.status) {
          query = query.eq('status', input.status);
        }

        if (input.search) {
          const term = sanitizeIlikePattern(input.search);
          query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
        }

        const { data: students, error } = await query;

        if (error) throw error;
        return students || [];
      } catch (error) {
        // Silently handle students table not found
        return [];
      }
    }),

  // Get dashboard statistics
  getDashboardStats: publicProcedure
    .query(async () => {
      try {
        const { data: students, error } = await supabase
          .from('students')
          .select('id, status');

        if (error) throw error;

        const allStudents = students || [];
        const totalStudents = allStudents.length;
        const activeStudents = allStudents.filter(s => s.status === 'active').length;
        const pendingStudents = allStudents.filter(s => s.status === 'pending').length;
        const inactiveStudents = allStudents.filter(s => s.status === 'inactive').length;

        return {
          totalStudents,
          activeStudents,
          pendingStudents,
          inactiveStudents,
        };
      } catch (error) {
        // Silently handle students table not found
        return {
          totalStudents: 0,
          activeStudents: 0,
          pendingStudents: 0,
          inactiveStudents: 0,
        };
      }
    }),

  // Get pending requests
  getPendingRequests: protectedProcedure
    .input(z.object({ 
      limit: z.number().optional().default(10),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'regional_adoul_council' && ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح - طلبات المتدربين مقتصرة على المجالس الجهوية' });
      }
      try {
        const { data: requests, error } = await supabase
          .from('student_requests')
          .select('id, student_id, request_type, reason, created_at, students(name)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(input.limit);

        if (error) throw error;
        return requests || [];
      } catch (error) {
        console.error('Error fetching pending requests:', error);
        return [];
      }
    }),

  // Get statistics by level
  getStatsByLevel: publicProcedure
    .query(async () => {
      try {
        const { data: students, error } = await supabase
          .from('students')
          .select('level');

        if (error) throw error;

        const allStudents = students || [];
        const levels = ['6ème', '5ème', '4ème', '3ème'];
        
        const statsByLevel = levels.map(level => {
          const count = allStudents.filter(s => s.level === level).length;
          const total = allStudents.length;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          
          return {
            level,
            count,
            percentage,
          };
        });

        return statsByLevel;
      } catch (error) {
        console.error('Error fetching stats by level:', error);
        return [];
      }
    }),

  // Get monthly statistics
  getMonthlyStats: publicProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();

      try {
        const { data: students, error } = await supabase
          .from('students')
          .select('created_at, status')
          .gte('created_at', `${year}-01-01`)
          .lt('created_at', `${year + 1}-01-01`);

        if (error) throw error;

        const allStudents = students || [];
        const monthLabels = [
          'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
          'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        const monthlyData = Array(12).fill(null).map((_, monthIndex) => {
          const monthStudents = allStudents.filter(s => {
            const studentMonth = new Date(s.created_at).getMonth();
            return studentMonth === monthIndex;
          });

          return {
            month: monthLabels[monthIndex],
            monthIndex: monthIndex + 1,
            registrations: monthStudents.length,
            dropouts: monthStudents.filter(s => s.status === 'inactive').length,
          };
        });

        return monthlyData;
      } catch (error) {
        console.error('Error fetching monthly stats:', error);
        return [];
      }
    }),

  // Get student by ID
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'regional_adoul_council' && ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح - بيانات المتدرب مقتصرة على المجالس الجهوية' });
      }
      try {
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', input)
          .single();

        if (error) throw error;
        return student || null;
      } catch (error) {
        console.error('Error fetching student:', error);
        return null;
      }
    }),

  // Create or update student request decision
  processRequest: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      decision: z.enum(['approved', 'rejected']),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'regional_adoul_council' && ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح - معالجة طلبات المتدربين مقتصرة على المجالس الجهوية' });
      }

      try {
        const { data, error } = await supabase
          .from('student_requests')
          .update({
            status: input.decision === 'approved' ? 'approved' : 'rejected',
            decision_reason: input.reason,
            processed_at: new Date().toISOString(),
          })
          .eq('id', input.requestId)
          .select();

        if (error) throw error;
        return { success: true, updated: data };
      } catch (error) {
        console.error('Error processing request:', error);
        throw new Error('Failed to process request');
      }
    }),

  // Get school statistics
  getSchoolStats: publicProcedure
    .query(async () => {
      try {
        const { data: students, error } = await supabase
          .from('students')
          .select('school_name');

        if (error) throw error;

        const allStudents = students || [];
        const schoolMap = new Map<string, number>();

        allStudents.forEach(student => {
          if (student.school_name) {
            schoolMap.set(student.school_name, (schoolMap.get(student.school_name) || 0) + 1);
          }
        });

        return Array.from(schoolMap, ([school, count]) => ({
          school,
          count,
          percentage: Math.round((count / allStudents.length) * 100),
        }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5 schools
      } catch (error) {
        console.error('Error fetching school stats:', error);
        return [];
      }
    }),
});

export type StudentsRouter = typeof studentsRouter;
