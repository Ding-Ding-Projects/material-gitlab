/**
 * Regex search logic for the Issues surface. Reuses the shared RegexBuilder
 * primitive for pattern validity and sample matching, and adds the
 * surface-specific pieces the primitive does not cover: a snippet palette,
 * a plain-English token explainer, and a live preview against real issues.
 */
import RegexBuilder from '../../regex-builder';

export const REGEX_FLAG_INFO = Object.freeze([
  { name: 'i', tip: 'case-insensitive' },
  { name: 'g', tip: 'global' },
  { name: 'm', tip: 'multiline' },
  { name: 's', tip: 'dotall' },
]);

export const SNIPPET_GROUPS = Object.freeze([
  { name: 'Classes', items: [['\\d', 'digit 0-9'], ['\\w', 'word char'], ['\\s', 'whitespace'], ['[a-z]', 'range'], ['[^ ]', 'not space'], ['.', 'any char']] },
  { name: 'Quantifiers', items: [['*', 'zero+'], ['+', 'one+'], ['?', 'optional'], ['{2,5}', '2 to 5'], ['*?', 'lazy zero+'], ['+?', 'lazy one+']] },
  { name: 'Anchors', items: [['^', 'line start'], ['$', 'line end'], ['\\b', 'word boundary'], ['\\B', 'non-boundary']] },
  { name: 'Groups', items: [['( )', 'capture'], ['(?: )', 'non-capture'], ['(a|b)', 'alternation'], ['(?= )', 'lookahead'], ['(?! )', 'neg lookahead'], ['(?<= )', 'lookbehind']] },
  { name: 'Recipes', items: [['#\\d+', 'issue ref'], ['\\d{2}:\\d{2}', 'duration'], ['(fail|error)', 'failures'], ['^ERROR', 'error lines'], ['\\bretry\\w*', 'retry words']] },
]).map(({ name, items }) => ({ name, items: items.map(([text, tip]) => ({ text, tip })) }));

const EXPLAIN_DICTIONARY = [
  ['(?:', 'non-capturing group'], ['(?=', 'lookahead'], ['(?!', 'negative lookahead'], ['(?<=', 'lookbehind'], ['(?<!', 'negative lookbehind'],
  ['(', 'capturing group'], [')', 'end group'], ['[^', 'negated class'], ['[', 'character class'], [']', 'end class'],
  ['\\d', 'digit'], ['\\D', 'non-digit'], ['\\w', 'word char'], ['\\W', 'non-word char'], ['\\s', 'whitespace'], ['\\S', 'non-whitespace'],
  ['\\b', 'word boundary'], ['\\B', 'non-boundary'], ['.*', 'any chars (greedy)'], ['.+', 'one or more chars'], ['.', 'any char'],
  ['*?', 'zero+ (lazy)'], ['+?', 'one+ (lazy)'], ['*', 'zero or more'], ['+', 'one or more'], ['??', 'optional (lazy)'], ['?', 'optional'],
  ['^', 'start anchor'], ['$', 'end anchor'], ['|', 'alternation'], ['{', 'repetition {n,m}'],
];

export function flagsString(flags) {
  return Object.keys(flags).filter((flag) => flags[flag]).join('');
}

/** A predicate over "title labels #iid" text; plain substring or regex. */
export function issueMatcher(search, regexMode) {
  if (!search) return { test: () => true, error: false };
  if (!regexMode) {
    const needle = search.toLowerCase();
    return { test: (text) => text.toLowerCase().includes(needle), error: false };
  }
  try {
    const re = new RegExp(search, 'i');
    return { test: (text) => re.test(text), error: false };
  } catch (_error) {
    return { test: () => true, error: true };
  }
}

export function issueSearchText(issue) {
  return `${issue.title} ${issue.labels.join(' ')} #${issue.iid}`;
}

export function explainPattern(pattern, limit = 24) {
  const tokens = [];
  let rest = pattern;
  while (rest.length && tokens.length < limit) {
    const hit = EXPLAIN_DICTIONARY.find(([token]) => rest.startsWith(token));
    if (hit) {
      tokens.push({ tok: hit[0], desc: hit[1] });
      rest = rest.slice(hit[0].length);
    } else {
      let literal = '';
      while (rest.length && !EXPLAIN_DICTIONARY.some(([token]) => rest.startsWith(token))) {
        literal += rest[0];
        rest = rest.slice(1);
      }
      if (literal) tokens.push({ tok: literal.slice(0, 8), desc: `literal "${literal}"` });
    }
  }
  return tokens;
}

/**
 * Evaluates a draft pattern against the sample test text (for highlighting)
 * and against the real issue list (for the "matches in issues" preview).
 * Delegates syntax validity and sample matches to the shared RegexBuilder.
 */
export function evaluateRegexDraft({ pattern, flags, testText, issues }) {
  const flagStr = flagsString(flags);
  const empty = {
    valid: true,
    errorMessage: '',
    segments: [{ text: testText, matched: false }],
    captureGroups: [],
    preview: [],
    matchCount: '0',
    explain: [],
  };
  if (!pattern) return empty;

  const builder = new RegexBuilder({
    pattern,
    sample: testText,
    flags: flagStr.includes('g') ? flagStr : `${flagStr}g`,
    regex: true,
  });
  const state = builder.snapshot();
  if (!state.syntax.valid) {
    return { ...empty, valid: false, errorMessage: state.syntax.message, explain: explainPattern(pattern) };
  }

  const segments = [];
  let cursor = 0;
  state.matches.forEach((match) => {
    if (match.index > cursor) segments.push({ text: testText.slice(cursor, match.index), matched: false });
    segments.push({ text: match.value || '∅', matched: true });
    cursor = match.index + (match.value ? match.value.length : 1);
  });
  segments.push({ text: testText.slice(cursor), matched: false });

  let captureGroups = [];
  try {
    const first = new RegExp(pattern, flagStr).exec(testText);
    if (first && first.length > 1) {
      captureGroups = first.slice(1).map((value, index) => ({ n: `$${index + 1}`, val: value === undefined ? '—' : value }));
    }
  } catch (_error) {
    // Already reported as invalid above; nothing further to capture.
  }

  let preview = [];
  let matchCount = '';
  try {
    const testRe = new RegExp(pattern, flagStr);
    preview = issues
      .filter((issue) => {
        testRe.lastIndex = 0;
        return testRe.test(issueSearchText(issue));
      })
      .map((issue) => `#${issue.iid}  ${issue.title}`)
      .slice(0, 5);
    matchCount = `${preview.length} of ${issues.length}`;
  } catch (_error) {
    // Handled by the validity check above.
  }

  return {
    valid: true,
    errorMessage: '',
    segments,
    captureGroups,
    preview,
    matchCount,
    explain: explainPattern(pattern),
  };
}
