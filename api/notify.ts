import { onRequest, type NotifyEnv } from '../functions/api/notify';

export async function handleRequest(request: Request) {
  const env: NotifyEnv = {
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    ENQUIRY_FROM: process.env.ENQUIRY_FROM || 'Aintrix Academy <notifications@aintrix.com>',
    ENQUIRY_TO: process.env.ENQUIRY_TO || 'aintrixacademy2026@gmail.com',
    RECEIVER_EMAIL: process.env.RECEIVER_EMAIL || 'aintrixacademy2026@gmail.com',
  };
  return onRequest({ request, env });
}

export const GET = handleRequest;
export const POST = handleRequest;
export default handleRequest;
