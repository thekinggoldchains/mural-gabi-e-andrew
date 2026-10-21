import { NextRequest, NextResponse } from 'next/server';
import {
  DASHBOARD_COOKIE_NAME,
  DASHBOARD_COOKIE_VALUE,
  verifyDashboardPassword,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');

  if (!verifyDashboardPassword(password)) {
    return NextResponse.json(
      { error: 'Senha incorreta. Tente novamente!' },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DASHBOARD_COOKIE_NAME, DASHBOARD_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DASHBOARD_COOKIE_NAME);
  return res;
}
