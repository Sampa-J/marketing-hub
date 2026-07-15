import { redis } from "./redis";

export interface ReservationDetail {
  id: string;
  source: string;
  utm: string;
  coupon: string;
  destination: string;
  reservationCode?: string;
  propertyCode?: string;
  effectivePrice?: number;
}

export interface DailyRecord {
  id: string;
  date: string;
  type: string; // "midia-sem-atendimento" | "midia-com-atendimento" | "relatorio-newbyte"
  data: Record<string, string | number>;
  reservations: ReservationDetail[];
}

export interface DailySpending {
  id: string;
  date: string;
  google: number;
  meta: number;
  tiktok: number;
  meta565?: number;
  meta566?: number;
}

export interface FormulaConfig {
  // Fat. Seazone = szBase × szTaxa
  szBase: "fat-liquido" | "fat-effective";
  szTaxa: number;
  // Fat. Líquido = Fat. Effective (- Tx. Limpeza?)
  liqSubtrairLimpeza: boolean;
  // ROI = (roiNum - roiDenom) / roiDenom
  roiNumerador: "fat-seazone" | "fat-liquido" | "fat-effective";
  roiDenominador: "gasto-total" | "gasto-google" | "gasto-meta";
  // Custo/Reserva = crNum / reservas
  crNumerador: "gasto-total" | "gasto-google" | "gasto-meta";
}

export const DEFAULT_FORMULA_CONFIG: FormulaConfig = {
  szBase: "fat-liquido",
  szTaxa: 0.24,
  liqSubtrairLimpeza: true,
  roiNumerador: "fat-seazone",
  roiDenominador: "gasto-total",
  crNumerador: "gasto-total",
};

const RECORDS_KEY = "hospedes-analise:records";
const SPENDING_KEY = "hospedes-analise:spending";
const FORMULA_CONFIG_KEY = "hospedes-analise:formula-config";
const BACKUPS_KEY = "hospedes-analise:records-backups";
const MAX_BACKUPS = 10;

export interface RecordsBackup {
  ts: string; // ISO
  count: number;
  motivo: string; // ex: "revalidate", "manual"
  records: DailyRecord[];
}

// Salva um snapshot dos registros no próprio Redis (rollback confiável, ao contrário
// do backup em arquivo que se perde no filesystem efêmero da Vercel). Mantém os últimos MAX_BACKUPS.
export async function saveRecordsBackup(records: DailyRecord[], motivo: string): Promise<string> {
  const ts = new Date().toISOString();
  const backups = (await redis.get<RecordsBackup[]>(BACKUPS_KEY)) ?? [];
  backups.unshift({ ts, count: records.length, motivo, records });
  await redis.set(BACKUPS_KEY, backups.slice(0, MAX_BACKUPS));
  return ts;
}

// Lista os backups sem trazer os registros inteiros (leve, para a UI).
export async function listRecordsBackups(): Promise<Array<Omit<RecordsBackup, "records">>> {
  const backups = (await redis.get<RecordsBackup[]>(BACKUPS_KEY)) ?? [];
  return backups.map(({ ts, count, motivo }) => ({ ts, count, motivo }));
}

// Restaura um backup (o mais recente por padrão, ou o de um ts específico).
// Retorna a quantidade de registros restaurados, ou null se não houver backup.
export async function restoreRecordsBackup(ts?: string): Promise<number | null> {
  const backups = (await redis.get<RecordsBackup[]>(BACKUPS_KEY)) ?? [];
  const target = ts ? backups.find((b) => b.ts === ts) : backups[0];
  if (!target) return null;
  await redis.set(RECORDS_KEY, target.records);
  return target.records.length;
}

export async function getRecords(): Promise<DailyRecord[]> {
  return (await redis.get<DailyRecord[]>(RECORDS_KEY)) ?? [];
}

export async function saveRecords(records: DailyRecord[]): Promise<void> {
  await redis.set(RECORDS_KEY, records);
}

export async function getSpending(): Promise<DailySpending[]> {
  return (await redis.get<DailySpending[]>(SPENDING_KEY)) ?? [];
}

export async function saveSpending(spending: DailySpending[]): Promise<void> {
  await redis.set(SPENDING_KEY, spending);
}

export async function getFormulaConfig(): Promise<FormulaConfig> {
  const saved = await redis.get<Partial<FormulaConfig>>(FORMULA_CONFIG_KEY);
  return { ...DEFAULT_FORMULA_CONFIG, ...saved };
}

export async function saveFormulaConfig(config: FormulaConfig): Promise<void> {
  await redis.set(FORMULA_CONFIG_KEY, config);
}
