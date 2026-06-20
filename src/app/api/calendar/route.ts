import { NextResponse } from "next/server";
import { calendarEvents, familyMembers } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({
    events: calendarEvents,
    members: familyMembers,
  });
}
