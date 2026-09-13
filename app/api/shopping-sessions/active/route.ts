import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { getActiveShoppingSession } from '@/server/shopping-sessions';

export async function GET() {
  const session = await getServerSession();
  if (!session?.user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  return NextResponse.json({
    session: await getActiveShoppingSession(session.user.id),
  });
}
