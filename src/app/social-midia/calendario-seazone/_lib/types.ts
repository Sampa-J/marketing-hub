export type EditorialSlug =
  | 'inteligencia_mercado'
  | 'dono_controle'
  | 'onde_investir'
  | 'resultados_reais'
  | 'destinos_seazone'
  | 'autoridade_seazone'
  | 'por_dentro_airbnb'
  | 'experiencia_hospedagem'
  | 'tendencias_entretenimento'
  | 'dicas_destinos';

export type ContentFormat = 'carrossel' | 'reels' | 'feed' | 'stories' | 'tiktok';

export type ContentStatus = 'ideia' | 'aprovado' | 'producao' | 'rascunho' | 'gravacao' | 'edicao' | 'agendado' | 'publicado';

export type Channel = 'instagram_feed' | 'instagram_reels' | 'instagram_stories' | 'linkedin' | 'tiktok';

export type Frente = 'SZI' | 'SZS' | 'MKTPLACE' | 'FRANQUIAS';

export type Publico = 'HOSPEDES' | 'PROPRIETARIOS' | 'INVESTIDORES' | 'FRANQUEADOS';

export type Collab = 'MONICA' | 'VISTAS' | 'OUTROS';

export interface Editorial {
  slug: EditorialSlug;
  name: string;
  color: string;
  audience: string;
  description: string;
}

export interface Post {
  id: string;
  title: string;
  editoria: EditorialSlug;
  formato: ContentFormat;
  canal: string;
  status: ContentStatus;
  scheduled_at: string | null;
  published_at: string | null;
  tema: string | null;
  estrutura: string | null;
  copy: string | null;
  notas: string | null;
  frentes?: Frente[] | null;
  publicos?: Publico[] | null;
  collabs?: Collab[] | null;
  drive_link?: string | null;
  cta_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cta {
  id: string;
  titulo: string;
  texto?: string | null; // campo legado, aposentado do formulário
  descricao: string | null;
  frentes: Frente[] | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentPrompt {
  id: string;
  editorial: EditorialSlug;
  format: ContentFormat;
  system_prompt: string;
  user_prompt_template: string;
  updated_at: string;
}
