import { NextResponse } from 'next/server';
import { requestBookingOtp } from '@/backend/services/booking';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, about } = body;
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    const res = await requestBookingOtp(email, about || { fullName: 'Candidate', email, phone: '' });
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
