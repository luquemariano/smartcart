import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import { storeInputSchema } from '@/lib/store-validation';
import {
  deleteStore,
  getStore,
  StoreDuplicateError,
  StoreNotFoundError,
  StoreReferencedError,
  updateStore,
} from '@/server/stores';

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
      store: await getStore(user.id, (await context.params).id),
    });
  } catch (error) {
    if (error instanceof StoreNotFoundError)
      return NextResponse.json(
        { error: 'Supermercado no encontrado.' },
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
    const input = storeInputSchema.parse(await request.json());
    return NextResponse.json({
      store: await updateStore(user.id, (await context.params).id, input),
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Revisá los datos del supermercado.' },
        { status: 400 },
      );
    if (error instanceof StoreNotFoundError)
      return NextResponse.json(
        { error: 'Supermercado no encontrado.' },
        { status: 404 },
      );
    if (error instanceof StoreDuplicateError)
      return NextResponse.json(
        { error: 'Ese supermercado ya existe para tu cuenta.' },
        { status: 409 },
      );
    throw error;
  }
}

export async function DELETE(_request: Request, context: Context) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    await deleteStore(user.id, (await context.params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof StoreNotFoundError)
      return NextResponse.json(
        { error: 'Supermercado no encontrado.' },
        { status: 404 },
      );
    if (error instanceof StoreReferencedError)
      return NextResponse.json(
        { error: 'No podés eliminar un supermercado con compras asociadas.' },
        { status: 409 },
      );
    throw error;
  }
}
