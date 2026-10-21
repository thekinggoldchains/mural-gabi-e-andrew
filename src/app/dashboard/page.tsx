import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DASHBOARD_COOKIE_NAME, DASHBOARD_COOKIE_VALUE } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { Post } from '@/types/post';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(DASHBOARD_COOKIE_NAME)?.value;

  if (authCookie !== DASHBOARD_COOKIE_VALUE) {
    redirect('/dashboard/login');
  }

  let initialPosts: Post[] = [];
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    initialPosts = (data ?? []) as Post[];
  } catch {
    initialPosts = [];
  }

  return <DashboardClient initialPosts={initialPosts} />;
}
