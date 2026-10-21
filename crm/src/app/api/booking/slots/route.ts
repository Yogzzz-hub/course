import { NextResponse } from 'next/server';
import { generateSlots } from '@/backend/services/booking';

export async function GET() {
  const slots = generateSlots(7);
  return NextResponse.json({ slots });
}
