import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TOKEN = process.env.REPORTEI_TOKEN;
const BASE = 'https://app.reportei.com/api/v2';
const INTEGRATION_ID = 3573142;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const METRIC_TOTAL = { id: '371e93e0-f0a9-403d-8ada-0da32d72b917', reference_key: 'ig:followers_count', component: 'number_v1', metrics: ['followers'], dimensions: [], filters: [], filter: null, sort: [], chart_type: null, custom: [], type: [] };
const METRIC_NEW = { id: '5d397be5-60ef-42d1-973e-919998ffb96d', reference_key: 'ig:new_followers_count', component: 'number_v1', metrics: ['new_followers'], dimensions: [], filters: [], filter: null, sort: [], chart_type: null, custom: [], type: 'new_followers' };

const v = (x: any) =>
  typeof x?.values === 'number' ? x.values
  : Array.isArray(x?.values) ? x.values[0]
  : null;

async function fetchReportei(start: string, end: string) {
  const resp = await fetch(`${BASE}/metrics/get-data`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end, integration_id: INTEGRATION_ID, metrics: [METRIC_NEW] }),
  });
  const data = await resp.json();
  return v(data?.data?.['5d397be5-60ef-42d1-973e-919998ffb96d']);
}

export async function GET() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = hoje.slice(0, 7) + '-01';

    // Total seguidores + ganho hoje — janela de UM dia (start == end), igual ao backfill.
    // Antes usava start=ontem, o que somava ontem+hoje e gravava esse valor de 2 dias
    // como ganho_dia de um único dia, inflando a soma da série diária.
    const respHoje = await fetch(`${BASE}/metrics/get-data`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ start: hoje, end: hoje, integration_id: INTEGRATION_ID, metrics: [METRIC_TOTAL, METRIC_NEW] }),
    });
    const dataHoje = await respHoje.json();
    if (dataHoje?.data?.exception || dataHoje?.code === 'integration_expired') {
      return NextResponse.json({
        error: dataHoje?.data?.exception?.message ?? 'Integração do Instagram (Vistas) expirou no Reportei. Reautorize em app.reportei.com.',
        code: dataHoje?.code ?? 'reportei_error',
      }, { status: 502 });
    }
    const total_seguidores = v(dataHoje?.data?.['371e93e0-f0a9-403d-8ada-0da32d72b917']);
    const ganho_hoje = v(dataHoje?.data?.['5d397be5-60ef-42d1-973e-919998ffb96d']);

    // Ganho acumulado do mês atual
    const respMes = await fetch(`${BASE}/metrics/get-data`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ start: inicioMes, end: hoje, integration_id: INTEGRATION_ID, metrics: [METRIC_NEW] }),
    });
    const dataMes = await respMes.json();
    const ganho_mes = v(dataMes?.data?.['5d397be5-60ef-42d1-973e-919998ffb96d']);

    // Salva hoje no Supabase
    if (total_seguidores !== null && ganho_hoje !== null) {
      await supabase.from('seguidores_historico').upsert(
        { data: hoje, total_seguidores, ganho_dia: ganho_hoje },
        { onConflict: 'data' }
      );
    }

    // Preenche dias faltando nos últimos 90 dias
    const data90 = new Date(); data90.setDate(data90.getDate() - 90);
    const inicioJanela = data90.toISOString().split('T')[0];

    const { data: existentes } = await supabase
      .from('seguidores_historico').select('data').gte('data', inicioJanela);

    const datasExistentes = new Set((existentes || []).map((r: any) => r.data));
    const diasFaltando: string[] = [];
    for (let i = 89; i >= 1; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      if (!datasExistentes.has(iso)) diasFaltando.push(iso);
    }

    for (const dia of diasFaltando) {
      try {
        const ganho = await fetchReportei(dia, dia);
        if (ganho !== null) {
          await supabase.from('seguidores_historico').upsert(
            { data: dia, ganho_dia: ganho }, { onConflict: 'data' }
          );
        }
      } catch {}
    }

    // Retorna histórico dos últimos 90 dias
    const { data: historico } = await supabase
      .from('seguidores_historico').select('data, total_seguidores, ganho_dia')
      .gte('data', inicioJanela).order('data', { ascending: true });

    return NextResponse.json({ total_seguidores, ganho_hoje, ganho_mes, historico: historico || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}