import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { listCompletedShoppingHistory } from '@/server/shopping-history';

function positiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const url = new URL(request.url);
  const sort = url.searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const limit = Math.min(
    50,
    Math.max(1, positiveInteger(url.searchParams.get('limit'), 20)),
  );
  const offset = positiveInteger(url.searchParams.get('offset'), 0);
  return NextResponse.json(
    await listCompletedShoppingHistory(session.user.id, {
      storeId: url.searchParams.get('storeId') || undefined,
      sort,
      limit,
      offset,
    }),
  );
}
