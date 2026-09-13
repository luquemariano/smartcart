import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/server-session';
import {
  GuestImportActiveSessionConflictError,
  GuestImportAlreadyCompletedError,
  GuestImportDataError,
  importGuestSnapshot,
} from '@/server/guest-import';
export async function POST(request: Request) {
  const user = (await getServerSession())?.user;
  if (!user)
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    return NextResponse.json(
      await importGuestSnapshot(user.id, await request.json()),
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? 'Los datos guest no son válidos.',
        },
        { status: 400 },
      );
    if (error instanceof GuestImportAlreadyCompletedError)
      return NextResponse.json({
        importStatus: 'already_imported',
        alreadyImported: true,
        activeSessionConflict: false,
        warnings: [],
      });
    if (error instanceof GuestImportActiveSessionConflictError)
      return NextResponse.json(
        {
          importStatus: 'conflict',
          alreadyImported: false,
          activeSessionConflict: true,
          warnings: [
            'Tu cuenta ya tiene una compra activa. Finalizala para reintentar la importación.',
          ],
        },
        { status: 409 },
      );
    if (error instanceof GuestImportDataError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
