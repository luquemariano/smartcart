import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import { storeInputSchema } from '@/lib/store-validation';
import { createStore, StoreDuplicateError, listStores } from '@/server/stores';

async function currentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export async function GET() {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  return NextResponse.json({ stores: await listStores(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  try {
    const input = storeInputSchema.parse(await request.json());
    return NextResponse.json(
      { store: await createStore(user.id, input) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Revisá los datos del supermercado.' },
        { status: 400 },
      );
    }
    if (error instanceof StoreDuplicateError) {
      return NextResponse.json(
        { error: 'Ese supermercado ya existe para tu cuenta.' },
        { status: 409 },
      );
    }
    throw error;
  }
}
