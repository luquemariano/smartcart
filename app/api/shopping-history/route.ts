import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import { listCompletedShoppingHistory } from '@/server/shopping-history';

function parseInteger(value: string | null, fallback: number, minimum: number) {
  if (value === null) return { value: fallback };
  if (!new RegExp(`^\\d+$`).test(value)) return { error: 'invalid' as const };
  const parsed = Number(value);
  return parsed >= minimum ? { value: parsed } : { error: 'invalid' as const };
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const url = new URL(request.url);
  const rawSort = url.searchParams.get('sort');
  if (rawSort && rawSort !== 'newest' && rawSort !== 'oldest')
    return NextResponse.json(
      { error: 'El orden no es válido.' },
      { status: 400 },
    );
  const sort = rawSort === 'oldest' ? 'oldest' : 'newest';
  const limitResult = parseInteger(url.searchParams.get('limit'), 20, 1);
  const offsetResult = parseInteger(url.searchParams.get('offset'), 0, 0);
  const storeId = url.searchParams.get('storeId');
  if (limitResult.error || offsetResult.error)
    return NextResponse.json(
      { error: 'La paginación no es válida.' },
      { status: 400 },
    );
  if (storeId && !z.string().uuid().safeParse(storeId).success)
    return NextResponse.json(
      { error: 'El supermercado no es válido.' },
      { status: 400 },
    );
  const limit = Math.min(50, limitResult.value);
  const offset = offsetResult.value;
  return NextResponse.json(
    await listCompletedShoppingHistory(session.user.id, {
      storeId: storeId || undefined,
      sort,
      limit,
      offset,
    }),
  );
}
