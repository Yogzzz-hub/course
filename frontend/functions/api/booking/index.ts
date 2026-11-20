import { onRequest as handleCatchAll, type BookingEnv } from './[[path]].ts';

export async function onRequest(context: { request: Request; env: BookingEnv }): Promise<Response> {
  return handleCatchAll(context);
}
