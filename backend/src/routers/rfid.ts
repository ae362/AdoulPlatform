import { router, publicProcedure } from './trpc';
import { RFIDService } from '../services/rfid';

const rfid = new RFIDService();

export const rfidRouter = router({
  read: publicProcedure.query(() => rfid.readNationalIdFromRFID()),
});
