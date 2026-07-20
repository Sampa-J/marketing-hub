import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../_lib/supabase';
import type { Cta } from '../_lib/types';

export function useCtas() {
  const [ctas, setCtas] = useState<Cta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCtas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getSupabase()
      .from('ctas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ctas:', error);
      setLoading(false);
      return;
    }
    setCtas((data as Cta[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCtas();
  }, [fetchCtas]);

  const createCta = async (cta: Omit<Cta, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await getSupabase().from('ctas').insert(cta).select().single();
    if (error) throw error;
    setCtas((prev) => [data as Cta, ...prev]);
    return data as Cta;
  };

  const updateCta = async (id: string, updates: Partial<Cta>) => {
    const { data, error } = await getSupabase().from('ctas').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setCtas((prev) => prev.map((c) => (c.id === id ? (data as Cta) : c)));
    return data as Cta;
  };

  const deleteCta = async (id: string) => {
    const { error } = await getSupabase().from('ctas').delete().eq('id', id);
    if (error) throw error;
    setCtas((prev) => prev.filter((c) => c.id !== id));
  };

  return { ctas, loading, fetchCtas, createCta, updateCta, deleteCta };
}
