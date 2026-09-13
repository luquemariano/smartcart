import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import {
  createProduct,
  listProducts,
  ProductDuplicateError,
} from '@/server/products';
import { productInputSchema } from '@/lib/product-validation';

async function currentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const query = new URL(request.url).searchParams.get('q') ?? undefined;
  return NextResponse.json({ products: await listProducts(user.id, query) });
}

export async function POST(request: Request) {
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
    const product = await createProduct(user.id, parsed.data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductDuplicateError) {
      return NextResponse.json(
        { error: 'Ese producto ya está guardado.' },
        { status: 409 },
      );
    }
    throw error;
  }
}
