import fs from 'fs';
import path from 'path';

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

const storagePath = path.join(process.cwd(), 'src/config/columnistSubmissions.json');

export function getAllColumnistSubmissions(): ColumnistSubmission[] {
  try {
    if (fs.existsSync(storagePath)) {
      const raw = fs.readFileSync(storagePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading columnist submissions:', e);
  }
  return [];
}

export function saveColumnistSubmission(sub: ColumnistSubmission): boolean {
  try {
    const list = getAllColumnistSubmissions();
    const existingIdx = list.findIndex((item) => item.id === sub.id);
    if (existingIdx >= 0) {
      list[existingIdx] = sub;
    } else {
      list.unshift(sub);
    }
    fs.writeFileSync(storagePath, JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving columnist submission:', e);
    return false;
  }
}

export function updateSubmissionStatus(id: string, status: 'published' | 'declined'): boolean {
  try {
    const list = getAllColumnistSubmissions();
    const target = list.find((item) => item.id === id);
    if (target) {
      target.status = status;
      target.reviewed_at = new Date().toISOString();
      fs.writeFileSync(storagePath, JSON.stringify(list, null, 2), 'utf8');
      return true;
    }
  } catch (e) {
    console.error('Error updating status:', e);
  }
  return false;
}
