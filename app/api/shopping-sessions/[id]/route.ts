import { NextResponse } from 'next/server';
import { z } from 'zod';
import { finishShoppingSessionSchema } from '@/lib/shopping-session-validation';
import { getServerSession } from '@/lib/server-session';
import {
  finishShoppingSession,
  getShoppingSession,
  ShoppingSessionNotFoundError,
} from '@/server/shopping-sessions';

type Context = { params: Promise<{ id: string }> };

async function currentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export async function GET(_request: Request, context: Context) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json({
      session: await getShoppingSession(user.id, (await context.params).id),
    });
  } catch (error) {
    if (error instanceof ShoppingSessionNotFoundError)
      return NextResponse.json(
        { error: 'Compra no encontrada.' },
        { status: 404 },
      );
    throw error;
  }
}

export async function PATCH(request: Request, context: Context) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    finishShoppingSessionSchema.parse(await request.json());
    return NextResponse.json({
      session: await finishShoppingSession(user.id, (await context.params).id),
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Solo podés finalizar una compra activa.' },
        { status: 400 },
      );
    if (error instanceof ShoppingSessionNotFoundError)
      return NextResponse.json(
        { error: 'Compra no encontrada.' },
        { status: 404 },
      );
    throw error;
  }
}
