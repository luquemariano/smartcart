import { NextResponse } from 'next/server';
import { z } from 'zod';
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
  const id = (await context.params).id;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json(
      { error: 'El identificador de compra no es válido.' },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      await getCompletedShoppingHistoryDetail(session.user.id, id),
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
