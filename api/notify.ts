import { onRequest, type NotifyEnv } from '../functions/api/notify.ts';
import { pool } from '../server/db.ts';
import { sendEmail } from '../server/mailer.ts';

export async function handleRequest(request: Request) {
  const env: NotifyEnv = {
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    ENQUIRY_FROM: process.env.SMTP_FROM || process.env.ENQUIRY_FROM || 'Aintrix Academy <aintrixacademy2026@gmail.com>',
    ENQUIRY_TO: process.env.ENQUIRY_TO || 'aintrixacademy2026@gmail.com',
    RECEIVER_EMAIL: process.env.RECEIVER_EMAIL || 'aintrixacademy2026@gmail.com',
    sendMail: async (opts) => {
      const res = await sendEmail(opts);
      return { success: res.success, id: res.id };
    },
    onPersist: async (body) => {
      if (!process.env.DATABASE_URL) return;
      try {
        if (body.type === 'enrolment') {
          await pool.query(
            'INSERT INTO student_enrolments(student_name, student_email, phone, programme, package, total_amount_minor, status) VALUES($1, $2, $3, $4, $5, $6, $7)',
            [body.studentName, body.studentEmail, (body.phone as string) || null, body.programme, body.package, 0, 'pending']
          );
        } else {
          await pool.query(
            'INSERT INTO consultation_enquiries(student_name, student_email, phone, programme, preferred_date, preferred_time, topics, message) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
            [body.studentName, body.studentEmail, (body.phone as string) || null, body.programme, (body.preferredDate as string) || null, (body.preferredTime as string) || null, (body.topics as string) || null, (body.message as string) || null]
          );
        }
      } catch {
        // Non-blocking
      }
    },
  };
  return onRequest({ request, env });
}

export const GET = handleRequest;
export const POST = handleRequest;
export default handleRequest;
