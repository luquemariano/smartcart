import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { getActiveShoppingSession } from '@/server/shopping-sessions';
import { getShoppingSessionSummary } from '@/server/shopping-items';

export async function GET() {
  const session = await getServerSession();
  if (!session?.user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const active = await getActiveShoppingSession(session.user.id);
  return NextResponse.json(
    active
      ? await getShoppingSessionSummary(session.user.id, active.id)
      : { session: null, items: [], summary: null },
  );
}
