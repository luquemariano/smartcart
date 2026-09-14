import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { clientOperations } from '@/db/schema';
import { getServerSession } from '@/lib/server-session';
import {
  createProduct,
  findProductForInput,
  ProductDuplicateError,
} from '@/server/products';
import {
  addShoppingItem,
  deleteShoppingItem,
  updateShoppingItem,
} from '@/server/shopping-items';
import { finishShoppingSession } from '@/server/shopping-sessions';

const operationSchema = z.object({
  clientOperationId: z.string().uuid(),
  type: z.enum([
    'product_create',
    'shopping_item_create',
    'shopping_item_update',
    'shopping_item_delete',
    'shopping_session_finish',
  ]),
  payload: z.record(z.string(), z.unknown()),
  localEntityId: z.string().optional(),
  serverEntityId: z.string().nullable().optional(),
});
const bodySchema = z.object({
  operations: z.array(operationSchema).min(1).max(100),
});
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: 'La cola offline no es válida.' },
      { status: 400 },
    );
  const results = [];
  const localProducts = new Map<string, string>();
  const localItems = new Map<string, string>();
  for (const operation of parsed.data.operations) {
    try {
      const result = await db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(clientOperations)
          .where(
            and(
              eq(clientOperations.ownerUserId, session.user.id),
              eq(clientOperations.operationId, operation.clientOperationId),
            ),
          )
          .limit(1);
        if (existing[0])
          return {
            clientOperationId: operation.clientOperationId,
            status: 'already_applied' as const,
            serverEntityId: existing[0].resultEntityId ?? undefined,
          };
        const executor = tx as unknown as typeof db;
        let entityId: string | undefined;
        if (operation.type === 'product_create') {
          try {
            entityId = (
              await createProduct(
                session.user.id,
                operation.payload as never,
                executor,
              )
            ).id;
          } catch (error) {
            if (error instanceof ProductDuplicateError)
              entityId = (
                await findProductForInput(
                  session.user.id,
                  operation.payload as never,
                  executor,
                )
              )?.id;
            else throw error;
          }
          if (!entityId) throw new Error('PRODUCT_NOT_FOUND');
          if (operation.localEntityId)
            localProducts.set(operation.localEntityId, entityId);
        } else if (operation.type === 'shopping_item_create') {
          const input = {
            ...(operation.payload.input as Record<string, unknown>),
          };
          if (
            typeof input.productId === 'string' &&
            localProducts.has(input.productId)
          )
            input.productId = localProducts.get(input.productId);
          entityId = (
            await addShoppingItem(
              session.user.id,
              operation.payload.sessionId as string,
              input,
              executor,
            )
          ).id;
          if (operation.localEntityId)
            localItems.set(operation.localEntityId, entityId);
        } else if (operation.type === 'shopping_item_update')
          await updateShoppingItem(
            session.user.id,
            operation.serverEntityId ??
              localItems.get(operation.payload.itemId as string) ??
              (operation.payload.itemId as string),
            operation.payload.patch,
            executor,
          );
        else if (operation.type === 'shopping_item_delete')
          await deleteShoppingItem(
            session.user.id,
            operation.serverEntityId ??
              localItems.get(operation.payload.itemId as string) ??
              (operation.payload.itemId as string),
            executor,
          );
        else
          await finishShoppingSession(
            session.user.id,
            operation.payload.sessionId as string,
            executor,
          );
        await tx.insert(clientOperations).values({
          id: crypto.randomUUID(),
          ownerUserId: session.user.id,
          operationId: operation.clientOperationId,
          operationType: operation.type,
          resultEntityId: entityId,
        });
        return {
          clientOperationId: operation.clientOperationId,
          status: 'applied' as const,
          serverEntityId: entityId,
        };
      });
      results.push(result);
    } catch (error) {
      {
        const existing = await db
          .select()
          .from(clientOperations)
          .where(
            and(
              eq(clientOperations.ownerUserId, session.user.id),
              eq(clientOperations.operationId, operation.clientOperationId),
            ),
          )
          .limit(1);
        if (existing[0]) {
          results.push({
            clientOperationId: operation.clientOperationId,
            status: 'already_applied' as const,
            serverEntityId: existing[0].resultEntityId ?? undefined,
          });
          continue;
        }
      }
      results.push({
        clientOperationId: operation.clientOperationId,
        status: 'conflict' as const,
        errorCode:
          error instanceof Error ? error.constructor.name : 'SYNC_ERROR',
      });
    }
  }
  return NextResponse.json({ results });
}
