import { NextResponse } from 'next/server';
import { generateSlots, requestBookingOtp, verifyBookingOtp, confirmBooking } from '@/backend/services/booking';

export async function GET() {
  try {
    const slots = generateSlots(7);
    return NextResponse.json({ slots });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'get_slots') {
      const slots = generateSlots(7);
      return NextResponse.json({ slots });
    }

    if (action === 'send_otp') {
      const { email, about } = body;
      if (!email) {
        return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
      }
      const res = await requestBookingOtp(email, about);
      return NextResponse.json(res);
    }

    if (action === 'verify_otp') {
      const { email, code } = body;
      if (!email || !code) {
        return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
      }
      const res = verifyBookingOtp(email, code);
      return NextResponse.json(res);
    }

    if (action === 'confirm_booking') {
      const { programmeId, programmeTitle, slot, about, brief } = body;
      if (!slot || !about?.email || !about?.fullName) {
        return NextResponse.json({ error: 'Incomplete booking details provided.' }, { status: 400 });
      }
      const res = await confirmBooking({
        programmeId,
        programmeTitle,
        slot,
        about,
        brief,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Unknown booking action requested.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
