import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import {
  createPromotion,
  listPromotions,
  PromotionReferenceError,
} from '@/server/promotions';
export async function GET(request: Request) {
  const user = (await getServerSession())?.user;
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const q = new URL(request.url).searchParams;
  return NextResponse.json({
    promotions: await listPromotions(user.id, {
      storeId: q.get('storeId') ?? undefined,
      productId: q.get('productId') ?? undefined,
      active: q.get('active') === 'true',
    }),
  });
}
export async function POST(request: Request) {
  const user = (await getServerSession())?.user;
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json(
      { promotion: await createPromotion(user.id, await request.json()) },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof PromotionReferenceError)
      return NextResponse.json(
        { error: 'Product o Store no pertenece a tu cuenta.' },
        { status: 403 },
      );
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Promoción inválida.' },
      { status: 400 },
    );
  }
}
