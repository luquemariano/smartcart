import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import {
  ActiveShoppingSessionError,
  ShoppingSessionStoreError,
} from '@/server/shopping-sessions';
import {
  deleteShoppingList,
  duplicateShoppingList,
  getShoppingListDetail,
  updateShoppingList,
  addListToActiveShoppingSession,
  startShoppingSessionFromList,
  ShoppingListNotFoundError,
} from '@/server/shopping-lists';
type Context = { params: Promise<{ id: string }> };
async function user() {
  return (await getServerSession())?.user ?? null;
}
export async function GET(_request: Request, context: Context) {
  const current = await user();
  if (!current)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json(
      await getShoppingListDetail(current.id, (await context.params).id),
    );
  } catch (e) {
    if (e instanceof ShoppingListNotFoundError)
      return NextResponse.json(
        { error: 'Lista no encontrada.' },
        { status: 404 },
      );
    throw e;
  }
}
export async function PATCH(request: Request, context: Context) {
  const current = await user();
  if (!current)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json({
      list: await updateShoppingList(
        current.id,
        (await context.params).id,
        (await request.json()).name,
      ),
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: e.issues[0]?.message },
        { status: 400 },
      );
    if (e instanceof ShoppingListNotFoundError)
      return NextResponse.json(
        { error: 'Lista no encontrada.' },
        { status: 404 },
      );
    throw e;
  }
}
export async function DELETE(_request: Request, context: Context) {
  const current = await user();
  if (!current)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    await deleteShoppingList(current.id, (await context.params).id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof ShoppingListNotFoundError)
      return NextResponse.json(
        { error: 'Lista no encontrada.' },
        { status: 404 },
      );
    throw e;
  }
}
export async function POST(request: Request, context: Context) {
  const current = await user();
  if (!current)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const body = await request.json();
  const action = body.action;
  if (action === 'duplicate')
    return NextResponse.json(
      {
        detail: await duplicateShoppingList(
          current.id,
          (await context.params).id,
        ),
      },
      { status: 201 },
    );
  if (action === 'import')
    return NextResponse.json({
      session: await addListToActiveShoppingSession(
        current.id,
        (await context.params).id,
      ),
    });
  if (action === 'start-import') {
    try {
      return NextResponse.json(
        {
          session: await startShoppingSessionFromList(
            current.id,
            (await context.params).id,
            body.options ?? {},
          ),
        },
        { status: 201 },
      );
    } catch (e) {
      if (e instanceof ActiveShoppingSessionError)
        return NextResponse.json(
          { error: 'Ya tenés una compra activa.' },
          { status: 409 },
        );
      if (e instanceof ShoppingSessionStoreError)
        return NextResponse.json(
          { error: 'El supermercado no pertenece a tu cuenta.' },
          { status: 403 },
        );
      if (e instanceof z.ZodError)
        return NextResponse.json(
          { error: 'Revisá el supermercado y el presupuesto.' },
          { status: 400 },
        );
      throw e;
    }
  }
  return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
}
