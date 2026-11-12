import { NextResponse } from 'next/server';
import { confirmBooking } from '@/backend/services/booking';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { programmeId, programmeTitle, slot, about, brief } = body;
    if (!slot || !about?.email || !about?.fullName) {
      return NextResponse.json({ error: 'Incomplete booking details provided' }, { status: 400 });
    }
    const res = await confirmBooking({
      programmeId: programmeId || 'general-admissions',
      programmeTitle: programmeTitle || 'Apex Executive Engineering Session',
      slot,
      about,
      brief: brief || { background: 'Not provided', goals: 'Not provided' },
    });
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
