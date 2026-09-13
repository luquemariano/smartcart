import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import {
  addShoppingListItem,
  getShoppingListDetail,
  resetShoppingList,
  ShoppingListNotFoundError,
  ShoppingListProductError,
} from '@/server/shopping-lists';
type Context = { params: Promise<{ id: string }> };
async function current() {
  return (await getServerSession())?.user ?? null;
}
export async function GET(_r: Request, c: Context) {
  const u = await current();
  if (!u)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json({
      items: (await getShoppingListDetail(u.id, (await c.params).id)).items,
    });
  } catch (e) {
    if (e instanceof ShoppingListNotFoundError)
      return NextResponse.json(
        { error: 'Lista no encontrada.' },
        { status: 404 },
      );
    throw e;
  }
}
export async function POST(r: Request, c: Context) {
  const u = await current();
  if (!u)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json(
      {
        item: await addShoppingListItem(
          u.id,
          (await c.params).id,
          await r.json(),
        ),
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: e.issues[0]?.message },
        { status: 400 },
      );
    if (e instanceof ShoppingListProductError)
      return NextResponse.json(
        { error: 'El producto no pertenece a tu cuenta.' },
        { status: 403 },
      );
    if (e instanceof ShoppingListNotFoundError)
      return NextResponse.json(
        { error: 'Lista no encontrada.' },
        { status: 404 },
      );
    throw e;
  }
}
export async function PATCH(r: Request, c: Context) {
  const u = await current();
  if (!u)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const body = await r.json();
  if (body.action === 'reset') {
    try {
      await resetShoppingList(u.id, (await c.params).id);
      return NextResponse.json({ ok: true });
    } catch (e) {
      if (e instanceof ShoppingListNotFoundError)
        return NextResponse.json(
          { error: 'Lista no encontrada.' },
          { status: 404 },
        );
      throw e;
    }
  }
  return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
}
