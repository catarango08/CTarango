import { NextResponse } from "next/server";
import { getDevices, getScenes, toggleDevice, activateScene } from "@/lib/homeassistant";

export async function GET() {
  const [devices, scenes] = await Promise.all([getDevices(), getScenes()]);
  return NextResponse.json({ devices, scenes });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, deviceId, sceneId } = body;

  if (action === "toggle" && deviceId) {
    const device = await toggleDevice(deviceId);
    return NextResponse.json({ device });
  }

  if (action === "scene" && sceneId) {
    await activateScene(sceneId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
