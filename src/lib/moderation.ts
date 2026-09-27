import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

// URL detection regex matching http, https, www, domain extensions (.com, .net, .org, .app, .io, .gov, etc.)
const URL_PATTERN = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|net|org|io|app|gov|edu|uk|co|info|biz|site|tech|xyz|online))/i;

// Custom lists for severe content that must be blocked outright vs mild profanity auto-censored
const SEVERE_KEYWORDS = [
  'nigger', 'nigga', 'faggot', 'kike', 'spic', 'chink', 'retard',
  'kill yourself', 'die in a fire', 'bomb', 'terrorist', 'slaughter'
];

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export interface ModerationResult {
  allowed: boolean;
  censoredText: string;
  reason?: string;
}

export function moderateComment(text: string): ModerationResult {
  const trimmed = text.trim();

  // 1. Check for URL patterns
  if (URL_PATTERN.test(trimmed)) {
    return {
      allowed: false,
      censoredText: trimmed,
      reason: 'Comments containing website links or URLs are not permitted.',
    };
  }

  // 2. Check for severe hate speech / threats (block outright)
  const lower = trimmed.toLowerCase();
  for (const severeWord of SEVERE_KEYWORDS) {
    if (lower.includes(severeWord)) {
      return {
        allowed: false,
        censoredText: trimmed,
        reason: 'Comment contains hate speech, slurs, or harassment and cannot be posted.',
      };
    }
  }

  // 3. Mild profanity filter using Obscenity (censor with asterisks)
  const matches = matcher.getAllMatches(trimmed);
  if (matches.length > 0) {
    const chars = trimmed.split('');
    for (const match of matches) {
      const start = match.startIndex;
      const end = match.endIndex;
      for (let i = start; i <= end; i++) {
        if (i >= 0 && i < chars.length) {
          chars[i] = '*';
        }
      }
    }
    return {
      allowed: true,
      censoredText: chars.join(''),
    };
  }

  return {
    allowed: true,
    censoredText: trimmed,
  };
}
