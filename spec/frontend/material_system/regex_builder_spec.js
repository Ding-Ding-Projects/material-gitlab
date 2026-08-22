import {
  REGEX_FRAGMENTS,
  REGEX_LIMITS,
  RegexBuilder,
  createRegexBuilderState,
  evaluateRegex,
} from '~/material_system';

describe('Material System regex builder', () => {
  it('keeps plain text as the default and escapes regex metacharacters', () => {
    const builder = new RegexBuilder({ pattern: 'issue[1]', sample: 'issue1 issue[1]' });

    expect(builder.snapshot()).toMatchObject({ regex: false, syntax: { valid: true } });
    expect(builder.snapshot().matches).toEqual([
      expect.objectContaining({ value: 'issue[1]', index: 7 }),
    ]);
  });

  it('reports invalid syntax without retaining stale matches or captures', () => {
    const builder = new RegexBuilder({
      pattern: '(issue)',
      sample: 'issue',
      flags: 'g',
      regex: true,
    });

    expect(builder.snapshot().captures).toEqual([['issue']]);

    const state = builder.setRegex('(');

    expect(state.syntax.valid).toBe(false);
    expect(state.matches).toEqual([]);
    expect(state.captures).toEqual([]);
  });

  it('handles zero-width global matches without looping forever', () => {
    const builder = new RegexBuilder({ pattern: '^|$', sample: 'ab', flags: 'g', regex: true });

    expect(builder.snapshot().matches).toEqual([
      expect.objectContaining({ value: '', index: 0 }),
      expect.objectContaining({ value: '', index: 2 }),
    ]);
  });

  it('bounds patterns, samples, and result counts', () => {
    const builder = new RegexBuilder({
      pattern: 'x'.repeat(REGEX_LIMITS.pattern + 5),
      sample: 'x'.repeat(REGEX_LIMITS.sample + 5),
      flags: 'g',
      regex: true,
      limits: { pattern: 4, sample: 6, matches: 2 },
    });

    expect(builder.snapshot()).toMatchObject({ pattern: 'xxxx', sample: 'xxxxxx' });
    expect(builder.snapshot().matches).toHaveLength(1);

    builder.setRegex('x', 'g');

    expect(builder.snapshot().matches).toHaveLength(2);
  });

  it('exports only the bounded serializable state', () => {
    const builder = new RegexBuilder({
      pattern: '(?<id>issue-\\d+)',
      sample: 'issue-42',
      flags: 'g',
      regex: true,
    });

    expect(builder.copy()).toBe('/(?<id>issue-\\d+)/g');
    expect(JSON.parse(builder.exportState())).toEqual({
      pattern: '(?<id>issue-\\d+)',
      sample: 'issue-42',
      flags: 'g',
      regex: true,
    });
  });

  it('provides guided fragments and functional evaluation through named exports', () => {
    const pattern = [
      REGEX_FRAGMENTS.startAnchor(),
      REGEX_FRAGMENTS.group(REGEX_FRAGMENTS.literal('issue-')),
      REGEX_FRAGMENTS.oneOrMore(REGEX_FRAGMENTS.characterClass('0-9')),
      REGEX_FRAGMENTS.endAnchor(),
    ].join('');
    const builder = createRegexBuilderState({ pattern, sample: 'issue-42', regex: true });

    expect(builder).toBeInstanceOf(RegexBuilder);
    expect(evaluateRegex({ pattern, sample: 'issue-42', regex: true })).toMatchObject({
      syntax: { valid: true },
      matches: [expect.objectContaining({ value: 'issue-42', index: 0 })],
      captures: [['issue-']],
    });
  });
});
