import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const note = {
      id: `note-${Date.now()}`,
      studentProfileId: body.studentProfileId,
      channel: body.channel || "CALL",
      note: body.note,
      createdAt: new Date().toISOString(),
      nextFollowUpDate: body.nextFollowUpDate || null,
    };
    return NextResponse.json({ note }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
