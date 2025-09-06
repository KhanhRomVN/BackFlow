export function getWordCount(value: string): number {
  if (!value || typeof value !== 'string') return 0
  // Split on whitespace, filter empty parts.
  return value.split(/\s+/).filter((w) => w && /\w/.test(w)).length
}

// Examples: "~250 words", "150 words", "~150-225 words"
export function parseMinWords(words: string | undefined): number {
  if (!words) return 1
  // Remove '~', and 'words', 'word', then trim
  let numStr = words
    .replace(/~/g, '')
    .replace(/words?/gi, '')
    .trim()
  // Pick the lower bound if there's a '-' (range)
  if (numStr.includes('-')) {
    const parts = numStr.split('-')
    const minPart = parts[0].trim()
    return parseInt(minPart, 10) || 1
  }
  // Fallback: parse first number
  const match = numStr.match(/\d+/)
  return match ? parseInt(match[0], 10) : 1
}
