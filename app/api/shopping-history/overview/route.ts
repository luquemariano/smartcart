import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { getShoppingHistoryOverview } from '@/server/shopping-history';

export async function GET() {
  const session = await getServerSession();
  if (!session?.user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  return NextResponse.json({
    stores: await getShoppingHistoryOverview(session.user.id),
  });
}
