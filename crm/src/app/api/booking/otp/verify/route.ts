import { NextResponse } from 'next/server';
import { verifyBookingOtp } from '@/backend/services/booking';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body;
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }
    const res = verifyBookingOtp(email, code);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
