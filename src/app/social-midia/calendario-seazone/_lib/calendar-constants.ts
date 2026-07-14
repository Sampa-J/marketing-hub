import type { Editorial, EditorialSlug, ContentFormat, ContentStatus, Channel, Frente, Publico, Collab } from './types';
import { T } from '@/lib/constants';

export const FRENTES: { value: Frente; label: string; color: string }[] = [
  { value: 'SZI', label: 'SZI', color: T.statusOkFg },
  { value: 'SZS', label: 'SZS', color: T.primary },
  { value: 'MKTPLACE', label: 'MKTPLACE', color: T.laranja500 },
  { value: 'FRANQUIAS', label: 'FRANQUIAS', color: T.roxo600 },
];

export function getFrente(value: string): { value: Frente; label: string; color: string } | undefined {
  return FRENTES.find((f) => f.value === value);
}

export const PUBLICOS: { value: Publico; label: string; color: string }[] = [
  { value: 'HOSPEDES', label: 'Hóspedes', color: T.teal600 },
  { value: 'PROPRIETARIOS', label: 'Proprietários', color: T.indigo600 },
  { value: 'INVESTIDORES', label: 'Investidores', color: T.statusWarnFg },
  { value: 'FRANQUEADOS', label: 'Franqueados', color: T.destructive },
];

export function getPublico(value: string): { value: Publico; label: string; color: string } | undefined {
  return PUBLICOS.find((p) => p.value === value);
}

export const COLLABS: { value: Collab; label: string; color: string }[] = [
  { value: 'MONICA', label: 'Collab Mônica', color: T.verde600 },
  { value: 'VISTAS', label: 'Vistas', color: T.roxo600 },
  { value: 'OUTROS', label: 'Outros', color: T.cinza600 },
];

export function getCollab(value: string): { value: Collab; label: string; color: string } | undefined {
  return COLLABS.find((c) => c.value === value);
}

export const EDITORIALS: Editorial[] = [
  {
    slug: 'inteligencia_mercado',
    name: 'Inteligencia de Mercado',
    color: T.primary,
    audience: 'Investidores e Proprietarios',
    description: 'Dados do setor: taxa de ocupacao, aluguel fixo vs temporada, regulamentacao Airbnb, sazonalidade',
  },
  {
    slug: 'dono_controle',
    name: 'Dono no Controle',
    color: T.roxo600,
    audience: 'Proprietarios',
    description: 'Renda passiva sem dor de cabeca: erros de quem gerencia sozinho, checklist Airbnb, o que a Seazone faz',
  },
  {
    slug: 'onde_investir',
    name: 'Onde Investir',
    color: T.statusOkFg,
    audience: 'Investidores',
    description: 'Guia dos SPOTs: ranking destinos, custo x retorno, perfil imovel ideal, comparativos por cidade',
  },
  {
    slug: 'resultados_reais',
    name: 'Resultados Reais',
    color: T.laranja500,
    audience: 'Proprietarios e Investidores',
    description: 'Prova social: depoimentos com dados, ocupacao sazonal, casos de sucesso, R$18k em 30 dias',
  },
  {
    slug: 'destinos_seazone',
    name: 'Destinos Seazone',
    color: T.destructive,
    audience: 'Hospedes',
    description: 'Conteudo de viagem: melhores praias Floripa, roteiros, imoveis por destino, bastidores',
  },
  {
    slug: 'autoridade_seazone',
    name: 'Autoridade Seazone',
    color: T.teal600,
    audience: 'Todos',
    description: 'Institucional: bastidores da equipe, eventos, lancamentos, Seazone na midia',
  },
  {
    slug: 'por_dentro_airbnb',
    name: 'Por dentro do Airbnb',
    color: T.indigo600,
    audience: 'Proprietarios e Hospedes',
    description: 'Algoritmo Airbnb: como aparecer no topo, como hospede escolhe, avaliacoes',
  },
  {
    slug: 'experiencia_hospedagem',
    name: 'Experiência de Hospedagem',
    color: T.verde600,
    audience: 'Hospedes',
    description: 'Vídeos imersivos dos imóveis: ambientes, vista, decoração, diferenciais. Hook emocional.',
  },
  {
    slug: 'tendencias_entretenimento',
    name: 'Tendências & Entretenimento',
    color: T.statusWarnFg,
    audience: 'Hospedes + Alcance',
    description: 'Participação em trends do TikTok adaptadas ao universo de viagem. Aumenta alcance orgânico.',
  },
  {
    slug: 'dicas_destinos',
    name: 'Dicas & Destinos',
    color: T.pendingFg,
    audience: 'Hospedes',
    description: 'Melhores praias, roteiros de fim de semana. Posiciona a Seazone como autoridade de viagem.',
  },
];

export const FORMATS: { value: ContentFormat; label: string }[] = [
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'reels', label: 'Reels' },
  { value: 'feed', label: 'Post Fixo' },
  { value: 'stories', label: 'Stories' },
];

export const STATUSES: { value: ContentStatus; label: string; emoji: string }[] = [
  { value: 'rascunho', label: 'Rascunho', emoji: '📝' },
  { value: 'ideia', label: 'Em aprovação', emoji: '💡' },
  { value: 'aprovado', label: 'Aprovado', emoji: '✔️' },
  { value: 'producao', label: 'Em produção', emoji: '🎬' },
  { value: 'agendado', label: 'Agendado', emoji: '📅' },
  { value: 'publicado', label: 'Publicado', emoji: '✅' },
];

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'instagram_feed', label: 'Instagram Feed' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'instagram_stories', label: 'Instagram Stories' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
];

export interface QuadroFixo {
  id: string;
  name: string;
  description: string;
  editorial: EditorialSlug;
  format: ContentFormat;
  audience: string;
  channels: Channel[];
  defaultTopic: string;
}

export const QUADROS_FIXOS: QuadroFixo[] = [
  {
    id: 'achados_seazone',
    name: 'Achados Seazone',
    description: 'Um imovel em destaque do portfolio com imagens e CTA de reserva',
    editorial: 'destinos_seazone',
    format: 'reels',
    audience: 'Hospedes + Alcance',
    channels: ['instagram_reels', 'tiktok'],
    defaultTopic: 'Imovel em destaque do portfolio Seazone com imagens e CTA de reserva',
  },
  {
    id: 'dono_inteligente',
    name: 'Dono Inteligente',
    description: 'Uma decisao ou insight que proprietarios bem-sucedidos tomam',
    editorial: 'dono_controle',
    format: 'carrossel',
    audience: 'Proprietarios',
    channels: ['instagram_feed', 'linkedin'],
    defaultTopic: 'Uma decisao ou insight que proprietarios bem-sucedidos de imoveis de temporada tomam',
  },
  {
    id: 'numero_que_surpreende',
    name: 'Numero que Surpreende',
    description: 'Um dado do mercado de temporada com contexto e analise',
    editorial: 'inteligencia_mercado',
    format: 'feed',
    audience: 'Todos',
    channels: ['instagram_feed', 'linkedin'],
    defaultTopic: 'Um dado surpreendente do mercado de aluguel de temporada com contexto e analise',
  },
  {
    id: 'fato_ou_fake',
    name: 'Fato ou Fake?',
    description: 'Trazer ate 6 perguntas para ser respondidas pelos nossos socios',
    editorial: 'por_dentro_airbnb',
    format: 'reels',
    audience: 'Hospedes + TikTok',
    channels: ['instagram_reels', 'tiktok'],
    defaultTopic: 'Fato ou Fake: ate 6 perguntas sobre Airbnb e aluguel de temporada para os socios responderem',
  },
];

export function getEditorial(slug: string): Editorial | undefined {
  return EDITORIALS.find((e) => e.slug === slug);
}
