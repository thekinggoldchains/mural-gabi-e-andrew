import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_COOKIE_NAME, DASHBOARD_COOKIE_VALUE } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

function isAuthorized(req: NextRequest): boolean {
  const cookie = req.cookies.get(DASHBOARD_COOKIE_NAME)?.value;
  return cookie === DASHBOARD_COOKIE_VALUE;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const visible = Boolean(body.visible);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('posts')
    .update({ visible })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('posts').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
