// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API = "https://new-backend-lovat.vercel.app/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // CORREGIDO: req.ip no existe, se saca del header
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '';

    await fetch(`${BACKEND_API}/tracking/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      ...body,
        ip_hash: ip,
        user_agent: req.headers.get('user-agent') || ''
      })
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Track error", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
