import { NextResponse } from "next/server";
import { getDevices, getScenes, toggleDevice } from "@/lib/homeassistant";

export async function GET() {
  const [devices, scenes] = await Promise.all([getDevices(), getScenes()]);
  return NextResponse.json({ devices, scenes });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, deviceId } = body;

  if (action === "toggle" && deviceId) {
    const device = await toggleDevice(deviceId);
    return NextResponse.json({ device });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
