import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { isWacomServiceAvailable, sendWacomCommand } from '../services/wacomProxy';

export const wacomRouter = router({
  /**
   * Check if Wacom device is available
   */
  isConnected: publicProcedure
    .input(z.object({ 
      host: z.string().default('localhost').describe('Wacom service host'),
      port: z.number().int().default(9000).describe('Wacom service port'),
    }).optional())
    .query(async ({ input = {} }) => {
      const host = input?.host || 'localhost';
      const port = input?.port || 9000;
      try {
        const connected = await isWacomServiceAvailable(host, port);
        return { 
          connected,
          host,
          port,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return { 
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          host,
          port,
        };
      }
    }),

  /**
   * Get Wacom device information (enumerate devices)
   */
  getDevices: publicProcedure
    .input(z.object({
      host: z.string().default('localhost'),
      port: z.number().int().default(9000),
    }).optional())
    .query(async ({ input = {} }) => {
      const host = input?.host || 'localhost';
      const port = input?.port || 9000;
      try {
        const devices = await sendWacomCommand<any[]>(
          {
            scope: 'WacomGSS.STU.GetUsbDevices',
            function: 'getUsbDevices',
          },
          host,
          port,
          1500
        );

        // Filter for STU-540 devices
        const wacomDevices = (devices || []).filter((d) => Number(d?.idVendor) === 0x056a);
        const stu540Devices = wacomDevices.filter((d) => {
          const idProduct = Number(d?.idProduct);
          const name = String(d?.model || d?.name || '').toUpperCase();
          return idProduct === 0x00a8 || name.includes('STU-540') || name.includes('540');
        });

        return {
          success: true,
          allDevices: devices || [],
          wacomDevices,
          stu540Devices,
          available: (stu540Devices.length || wacomDevices.length) > 0,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get devices',
          allDevices: [],
          wacomDevices: [],
          stu540Devices: [],
          available: false,
        };
      }
    }),

  /**
   * Generic command proxy - forward any Wacom command to the service
   */
  sendCommand: publicProcedure
    .input(z.object({
      host: z.string().default('localhost'),
      port: z.number().int().default(9000),
      command: z.record(z.any()),
      timeout: z.number().int().default(1200),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await sendWacomCommand(
          input.command,
          input.host,
          input.port,
          input.timeout
        );
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Command failed',
        };
      }
    }),
});
