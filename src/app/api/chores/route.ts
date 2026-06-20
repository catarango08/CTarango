import { NextResponse } from "next/server";
import { chores, familyMembers } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({
    chores,
    members: familyMembers,
  });
}
