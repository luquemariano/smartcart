import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import {
  getCompletedShoppingHistoryDetail,
  isHistorySessionNotFound,
} from '@/server/shopping-history';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession();
  if (!session?.user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json(
      await getCompletedShoppingHistoryDetail(
        session.user.id,
        (await context.params).id,
      ),
    );
  } catch (error) {
    if (isHistorySessionNotFound(error))
      return NextResponse.json(
        { error: 'Compra finalizada no encontrada.' },
        { status: 404 },
      );
    throw error;
  }
}
