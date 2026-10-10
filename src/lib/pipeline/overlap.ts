export interface OverlapSpan {
  span: string;
  wordCount: number;
}

/**
 * Normalizes text into an array of lowercase alphanumeric words.
 * Strips HTML tags, punctuation, special symbols, and collapses whitespace.
 */
export function normalizeWords(text: string): string[] {
  return (text || '')
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Finds all consecutive identical word spans of length >= minWords (default 8)
 * shared between candidateText and sourceText.
 *
 * Implements a fast sliding n-gram window algorithm with greedy forward extension.
 */
export function findConsecutiveWordOverlaps(
  sourceText: string,
  candidateText: string,
  minWords: number = 8
): OverlapSpan[] {
  const sourceWords = normalizeWords(sourceText);
  const candidateWords = normalizeWords(candidateText);

  if (sourceWords.length < minWords || candidateWords.length < minWords) {
    return [];
  }

  // Construct a Set of all minWords-grams from sourceText for O(1) lookup
  const sourceNGrams = new Set<string>();
  for (let i = 0; i <= sourceWords.length - minWords; i++) {
    sourceNGrams.add(sourceWords.slice(i, i + minWords).join(' '));
  }

  const overlaps: OverlapSpan[] = [];
  let i = 0;
  while (i <= candidateWords.length - minWords) {
    const gram = candidateWords.slice(i, i + minWords).join(' ');
    if (sourceNGrams.has(gram)) {
      // Greedily expand forward to find the full length of the matching consecutive span
      let matchLen = minWords;
      while (i + matchLen < candidateWords.length) {
        let foundLonger = false;
        const targetLen = matchLen + 1;
        for (let j = 0; j <= sourceWords.length - targetLen; j++) {
          let matches = true;
          for (let k = 0; k < targetLen; k++) {
            if (sourceWords[j + k] !== candidateWords[i + k]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            foundLonger = true;
            break;
          }
        }
        if (foundLonger) {
          matchLen++;
        } else {
          break;
        }
      }

      overlaps.push({
        span: candidateWords.slice(i, i + matchLen).join(' '),
        wordCount: matchLen,
      });

      // Advance past this match to avoid duplicate sub-span entries
      i += matchLen;
    } else {
      i++;
    }
  }

  return overlaps;
}
