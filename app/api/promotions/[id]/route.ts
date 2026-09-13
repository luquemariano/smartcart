import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import {
  deletePromotion,
  getPromotion,
  PromotionNotFoundError,
  updatePromotion,
  PromotionReferenceError,
} from '@/server/promotions';
type C = { params: Promise<{ id: string }> };
async function user() {
  return (await getServerSession())?.user ?? null;
}
export async function GET(_: Request, c: C) {
  const u = await user();
  if (!u)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json({
      promotion: await getPromotion(u.id, (await c.params).id),
    });
  } catch (e) {
    if (e instanceof PromotionNotFoundError)
      return NextResponse.json(
        { error: 'Promoción no encontrada.' },
        { status: 404 },
      );
    throw e;
  }
}
export async function PATCH(r: Request, c: C) {
  const u = await user();
  if (!u)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json({
      promotion: await updatePromotion(
        u.id,
        (await c.params).id,
        await r.json(),
      ),
    });
  } catch (e) {
    if (e instanceof PromotionNotFoundError)
      return NextResponse.json(
        { error: 'Promoción no encontrada.' },
        { status: 404 },
      );
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
export async function DELETE(_: Request, c: C) {
  const u = await user();
  if (!u)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    await deletePromotion(u.id, (await c.params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PromotionNotFoundError)
      return NextResponse.json(
        { error: 'Promoción no encontrada.' },
        { status: 404 },
      );
    throw e;
  }
}
