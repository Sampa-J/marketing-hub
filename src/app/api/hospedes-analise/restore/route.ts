import { NextResponse } from "next/server";
import { listRecordsBackups, restoreRecordsBackup } from "@/lib/hospedes-analise-db";

// GET: lista os backups disponíveis (sem os registros, leve)
export async function GET() {
  const backups = await listRecordsBackups();
  return NextResponse.json({ backups });
}

// POST: restaura um backup (o mais recente, ou o de um ts específico via body { ts })
export async function POST(req: Request) {
  try {
    let ts: string | undefined;
    try {
      const body = await req.json();
      ts = body?.ts;
    } catch {
      // sem body → restaura o mais recente
    }
    const restored = await restoreRecordsBackup(ts);
    if (restored == null) {
      return NextResponse.json({ error: "Nenhum backup disponível para restaurar" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, restored });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro interno: " + msg }, { status: 500 });
  }
}
