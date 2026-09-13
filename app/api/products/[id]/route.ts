import { NextResponse } from 'next/server';
import { productInputSchema } from '@/lib/product-validation';
import { getServerSession } from '@/lib/server-session';
import {
  deleteProduct,
  getProduct,
  ProductDuplicateError,
  ProductNotFoundError,
  ProductReferencedError,
  updateProduct,
} from '@/server/products';

type RouteContext = { params: Promise<{ id: string }> };

async function currentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    const { id } = await context.params;
    return NextResponse.json({ product: await getProduct(user.id, id) });
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: 'Producto no encontrado.' },
        { status: 404 },
      );
    }
    throw error;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const parsed = productInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Los datos del producto no son válidos.' },
      { status: 400 },
    );
  }
  try {
    const { id } = await context.params;
    return NextResponse.json({
      product: await updateProduct(user.id, id, parsed.data),
    });
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: 'Producto no encontrado.' },
        { status: 404 },
      );
    }
    if (error instanceof ProductDuplicateError) {
      return NextResponse.json(
        { error: 'Ese producto ya está guardado.' },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    const { id } = await context.params;
    await deleteProduct(user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: 'Producto no encontrado.' },
        { status: 404 },
      );
    }
    if (error instanceof ProductReferencedError) {
      return NextResponse.json(
        { error: 'No podés eliminar un producto usado en una compra o lista.' },
        { status: 409 },
      );
    }
    throw error;
  }
}
