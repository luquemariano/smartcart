import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import {
  createShoppingList,
  listShoppingLists,
  ShoppingListDuplicateError,
} from '@/server/shopping-lists';
export async function GET() {
  const user = (await getServerSession())?.user;
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  return NextResponse.json({ lists: await listShoppingLists(user.id) });
}
export async function POST(request: Request) {
  const user = (await getServerSession())?.user;
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json(
      { list: await createShoppingList(user.id, (await request.json()).name) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ShoppingListDuplicateError)
      return NextResponse.json(
        { error: 'Ya existe una lista con ese nombre.' },
        { status: 409 },
      );
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Nombre inválido.' },
        { status: 400 },
      );
    throw error;
  }
}
