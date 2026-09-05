import { router } from './routers/trpc';
import { dateRouter } from './routers/date';
import { aiRouter } from './routers/ai';
import { ocrRouter } from './routers/ocr';
import { rfidRouter } from './routers/rfid';
import { legalRouter } from './routers/legal';
import { statisticsRouter } from './routers/statistics';
import { searchRouter } from './routers/search';
import { notariesRouter } from './routers/notaries';
import { marriageRecordsRouter } from './routers/marriageRecords';
import { divorceRecordsRouter } from './routers/divorceRecords';
import { propertyFeesRouter } from './routers/propertyFees';
import { inheritanceFeesRouter } from './routers/inheritanceFees';
import { otherDocumentFeesRouter } from './routers/otherDocumentFees';
import { copyRequestsRouter } from './routers/copyRequests';
import { contractsRouter } from './routers/contracts';
import { contractTemplatesRouter } from './routers/contractTemplates';
import { registrationStampsRouter } from './routers/registrationStamps';
import { pdfRouter } from './routers/pdf';
import { authRouter } from './routers/auth';
import { feesAgentRouter } from './routers/feesAgent';
import { judgeRouter } from './routers/judge';
import { messagingRouter } from './routers/messaging';
import { smartDraftingRouter } from './routers/smartDrafting';
import { cmsRouter } from './routers/cms';
import { analyticsRouter } from './routers/analytics';
import { subscriptionsRouter } from './routers/subscriptions';
import { incomeRouter } from './routers/income';
import { expendituresRouter } from './routers/expenditures';
import { regionalStatusRouter } from './routers/regionalStatus';
import { notificationsRouter } from './routers/notifications';
import { studentsRouter } from './routers/students';
import { remoteNotarialHearingRouter } from './routers/remoteNotarialHearing';
import { dailyLedgerRouter } from './routers/dailyLedger';
import { permissionsRouter } from './routers/permissions';
import { extractionRequestsRouter } from './routers/extractionRequests';
import { wacomRouter } from './routers/wacom';

export const appRouter = router({
  auth: authRouter,
  date: dateRouter,
  ai: aiRouter,
  ocr: ocrRouter,
  rfid: rfidRouter,
  legal: legalRouter,
  statistics: statisticsRouter,
  search: searchRouter,
  notaries: notariesRouter,
  marriageRecords: marriageRecordsRouter,
  divorceRecords: divorceRecordsRouter,
  propertyFees: propertyFeesRouter,
  inheritanceFees: inheritanceFeesRouter,
  otherDocumentFees: otherDocumentFeesRouter,
  copyRequests: copyRequestsRouter,
  extractionRequests: extractionRequestsRouter,
  contracts: contractsRouter,
  contractTemplates: contractTemplatesRouter,
  registrationStamps: registrationStampsRouter,
  pdf: pdfRouter,
  feesAgent: feesAgentRouter,
  judge: judgeRouter,
  messaging: messagingRouter,
  smartDrafting: smartDraftingRouter,
  cms: cmsRouter,
  analytics: analyticsRouter,
  subscriptions: subscriptionsRouter,
  income: incomeRouter,
  expenditures: expendituresRouter,
  regionalStatus: regionalStatusRouter,
  notifications: notificationsRouter,
  students: studentsRouter,
  remoteNotarialHearing: remoteNotarialHearingRouter,
  dailyLedger: dailyLedgerRouter,
  permissions: permissionsRouter,
  wacom: wacomRouter,
});

export type AppRouter = typeof appRouter;
