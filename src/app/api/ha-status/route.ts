import { NextResponse } from "next/server";

export async function GET() {
  const haUrl = process.env.NEXT_PUBLIC_HA_URL;
  const haToken = process.env.NEXT_PUBLIC_HA_TOKEN;

  if (!haUrl || !haToken) {
    return NextResponse.json({
      connected: false,
      reason: "missing config",
      hasUrl: !!haUrl,
      hasToken: !!haToken,
    });
  }

  try {
    const res = await fetch(`${haUrl}/api/`, {
      headers: { Authorization: `Bearer ${haToken}` },
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json({ connected: res.ok, status: res.status });
  } catch (e) {
    return NextResponse.json({ connected: false, error: String(e) });
  }
}
