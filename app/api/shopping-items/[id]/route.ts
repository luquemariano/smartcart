import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import {
  deleteShoppingItem,
  ShoppingItemCompletedError,
  ShoppingItemNotFoundError,
  ShoppingItemQuantityLimitError,
  updateShoppingItem,
} from '@/server/shopping-items';

type RouteContext = { params: Promise<{ id: string }> };

async function currentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    const { id } = await context.params;
    return NextResponse.json({
      item: await updateShoppingItem(user.id, id, await request.json()),
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'El ítem no es válido.' },
        { status: 400 },
      );
    if (error instanceof ShoppingItemNotFoundError)
      return NextResponse.json(
        { error: 'Ítem no encontrado.' },
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
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    const { id } = await context.params;
    await deleteShoppingItem(user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ShoppingItemNotFoundError)
      return NextResponse.json(
        { error: 'Ítem no encontrado.' },
        { status: 404 },
      );
    if (error instanceof ShoppingItemCompletedError)
      return NextResponse.json(
        { error: 'La compra finalizada no se puede modificar.' },
        { status: 409 },
      );
    throw error;
  }
}
