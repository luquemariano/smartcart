import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import { startShoppingSessionSchema } from '@/lib/shopping-session-validation';
import {
  ActiveShoppingSessionError,
  ShoppingSessionStoreError,
  listShoppingSessions,
  startShoppingSession,
} from '@/server/shopping-sessions';

async function currentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export async function GET() {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  return NextResponse.json({ sessions: await listShoppingSessions(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    const input = startShoppingSessionSchema.parse(await request.json());
    return NextResponse.json(
      { session: await startShoppingSession(user.id, input) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Revisá el supermercado y el presupuesto.' },
        { status: 400 },
      );
    if (error instanceof ActiveShoppingSessionError)
      return NextResponse.json(
        {
          error:
            'Ya tenés una compra activa. Finalizala antes de iniciar otra.',
        },
        { status: 409 },
      );
    if (error instanceof ShoppingSessionStoreError)
      return NextResponse.json(
        { error: 'El supermercado seleccionado no pertenece a tu cuenta.' },
        { status: 403 },
      );
    throw error;
  }
}
