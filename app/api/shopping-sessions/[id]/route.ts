import { NextResponse } from 'next/server';
import { z } from 'zod';
import { shoppingSessionPatchSchema } from '@/lib/shopping-session-validation';
import { getServerSession } from '@/lib/server-session';
import {
  finishShoppingSession,
  ShoppingSessionCompletedError,
  ShoppingSessionNotFoundError,
  updateShoppingSessionBudget,
} from '@/server/shopping-sessions';
import { getShoppingSessionSummary } from '@/server/shopping-items';

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
    return NextResponse.json(
      await getShoppingSessionSummary(user.id, (await context.params).id),
    );
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
    const input = shoppingSessionPatchSchema.parse(await request.json());
    const sessionId = (await context.params).id;
    if ('status' in input)
      return NextResponse.json({
        session: await finishShoppingSession(user.id, sessionId),
      });
    return NextResponse.json({
      session: await updateShoppingSessionBudget(
        user.id,
        sessionId,
        input.budgetAmount,
      ),
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Revisá la acción y el presupuesto.' },
        { status: 400 },
      );
    if (error instanceof ShoppingSessionNotFoundError)
      return NextResponse.json(
        { error: 'Compra no encontrada.' },
        { status: 404 },
      );
    if (error instanceof ShoppingSessionCompletedError)
      return NextResponse.json(
        { error: 'Una compra finalizada no puede cambiar su presupuesto.' },
        { status: 409 },
      );
    throw error;
  }
}
