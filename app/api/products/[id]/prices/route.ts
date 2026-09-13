import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { getProduct, ProductNotFoundError } from '@/server/products';
import { listPriceObservations } from '@/server/price-observations';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const session = await getServerSession();
  if (!session?.user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    const productId = (await context.params).id;
    const product = await getProduct(session.user.id, productId);
    const rawLimit = Number(
      new URL(request.url).searchParams.get('limit') ?? 50,
    );
    return NextResponse.json({
      product,
      observations: await listPriceObservations(
        session.user.id,
        product.id,
        Number.isFinite(rawLimit) ? rawLimit : 50,
      ),
    });
  } catch (error) {
    if (error instanceof ProductNotFoundError)
      return NextResponse.json(
        { error: 'Producto no encontrado.' },
        { status: 404 },
      );
    throw error;
  }
}
