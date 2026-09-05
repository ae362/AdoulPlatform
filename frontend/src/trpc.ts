import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../backendTypes';

export const trpc = createTRPCReact<AppRouter>();
