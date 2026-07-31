// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API = "https://new-backend-lovat.vercel.app/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || '';

    // Le pegamos a tu backend - asi queda GLOBAL pero separado por business_id
    await fetch(`${BACKEND_API}/tracking/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
       ...body,
        ip_hash: ip, // en tu backend lo hasheas, no lo guardes en claro
        user_agent: req.headers.get('user-agent')
      })
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Track error", e);
    return NextResponse.json({ ok: false }, { status: 200 }); // nunca rompas el front
  }
}
