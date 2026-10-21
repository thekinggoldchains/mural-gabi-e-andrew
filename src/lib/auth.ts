export const DASHBOARD_COOKIE_NAME = 'gabi_dashboard_auth';
export const DASHBOARD_COOKIE_VALUE = 'authenticated_bride';

export function verifyDashboardPassword(input: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD || 'casamentogabi';
  return input.trim() === expected;
}
