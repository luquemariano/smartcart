import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import {
  deleteShoppingListItem,
  updateShoppingListItem,
  ShoppingListItemNotFoundError,
} from '@/server/shopping-lists';
type Context = { params: Promise<{ id: string }> };
export async function PATCH(r: Request, c: Context) {
  const u = (await getServerSession())?.user;
  if (!u)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json({
      item: await updateShoppingListItem(
        u.id,
        (await c.params).id,
        await r.json(),
      ),
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: e.issues[0]?.message },
        { status: 400 },
      );
    if (e instanceof ShoppingListItemNotFoundError)
      return NextResponse.json(
        { error: 'Ítem no encontrado.' },
        { status: 404 },
      );
    throw e;
  }
}
export async function DELETE(_r: Request, c: Context) {
  const u = (await getServerSession())?.user;
  if (!u)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    await deleteShoppingListItem(u.id, (await c.params).id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof ShoppingListItemNotFoundError)
      return NextResponse.json(
        { error: 'Ítem no encontrado.' },
        { status: 404 },
      );
    throw e;
  }
}
