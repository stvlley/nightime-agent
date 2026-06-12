// Provider automation preferences (provider_preferences table).
// Demo-safe like lib/data.ts: reads return null and writes throw a clear
// message when Supabase is not configured.
import { supabase } from '@/lib/supabase';
import { Database, ProviderPreferences } from '@/types/database';

type PreferencesPatch = Omit<
  Partial<Database['public']['Tables']['provider_preferences']['Insert']>,
  'user_id'
>;

export const preferencesService = {
  async get(userId: string): Promise<ProviderPreferences | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('provider_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /** Upsert a partial patch; creates the row on first write. */
  async update(userId: string, patch: PreferencesPatch): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase
      .from('provider_preferences')
      .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
    if (error) throw error;
  },
};
