import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ColumnistSubmission {
  id: string;
  author_name: string;
  author_email: string;
  author_bio: string;
  author_avatar: string;
  country_code: string;
  title: string;
  slug: string;
  snippet: string;
  content: string;
  featured_image_url: string;
  word_count: number;
  status: 'pending_review' | 'published' | 'declined';
  created_at: string;
  reviewed_at?: string;
}

export async function getAllColumnistSubmissions(): Promise<ColumnistSubmission[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('columnist_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as ColumnistSubmission[];
    }
    if (error) {
      console.warn('[ColumnistStore] Error fetching submissions from Supabase:', error.message);
    }
  } catch (e) {
    console.warn('[ColumnistStore] Error reading columnist submissions:', e);
  }
  return [];
}

export async function saveColumnistSubmission(sub: ColumnistSubmission): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('columnist_submissions')
      .insert([sub]);

    if (!error) {
      return true;
    }
    console.error('[ColumnistStore] Error saving columnist submission to Supabase:', error.message);
    return false;
  } catch (e) {
    console.error('[ColumnistStore] Error saving columnist submission:', e);
    return false;
  }
}

export async function updateSubmissionStatus(id: string, status: 'published' | 'declined'): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('columnist_submissions')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      return true;
    }
    console.error('[ColumnistStore] Error updating columnist submission status in Supabase:', error.message);
    return false;
  } catch (e) {
    console.error('[ColumnistStore] Error updating status:', e);
    return false;
  }
}
