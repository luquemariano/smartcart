import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import {
  compareShoppingListForUser,
  ShoppingListComparisonNotFoundError,
} from '@/server/shopping-list-comparison';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const user = (await getServerSession())?.user;
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json(
      await compareShoppingListForUser(user.id, (await context.params).id),
    );
  } catch (error) {
    if (error instanceof ShoppingListComparisonNotFoundError)
      return NextResponse.json(
        { error: 'Lista no encontrada.' },
        { status: 404 },
      );
    throw error;
  }
}
