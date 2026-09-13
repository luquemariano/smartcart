import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import {
  addShoppingItem,
  getShoppingSessionSummary,
  ShoppingItemCompletedError,
  ShoppingItemQuantityLimitError,
  ShoppingItemPriceConflictError,
} from '@/server/shopping-items';
import { ProductNotFoundError } from '@/server/products';
import { ShoppingSessionNotFoundError } from '@/server/shopping-sessions';

type RouteContext = { params: Promise<{ id: string }> };

async function currentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    const { id } = await context.params;
    return NextResponse.json({
      ...(await getShoppingSessionSummary(user.id, id)),
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

export async function POST(request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    const { id } = await context.params;
    return NextResponse.json(
      { item: await addShoppingItem(user.id, id, await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'El ítem no es válido.' },
        { status: 400 },
      );
    if (error instanceof ShoppingSessionNotFoundError)
      return NextResponse.json(
        { error: 'Compra no encontrada.' },
        { status: 404 },
      );
    if (error instanceof ProductNotFoundError)
      return NextResponse.json(
        { error: 'Producto no encontrado.' },
        { status: 404 },
      );
    if (error instanceof ShoppingItemCompletedError)
      return NextResponse.json(
        { error: 'La compra finalizada no se puede modificar.' },
        { status: 409 },
      );
    if (error instanceof ShoppingItemQuantityLimitError)
      return NextResponse.json(
        { error: 'La cantidad supera el límite permitido.' },
        { status: 400 },
      );
    if (error instanceof ShoppingItemPriceConflictError)
      return NextResponse.json(
        {
          error:
            'El producto ya está en la compra con otro precio. Ajustá el ítem existente antes de agregarlo nuevamente.',
        },
        { status: 409 },
      );
    throw error;
  }
}
