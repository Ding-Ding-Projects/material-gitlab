export const REGEX_LIMITS = Object.freeze({ pattern: 2048, sample: 10000, matches: 1000 });

export const REGEX_FRAGMENTS = Object.freeze({
  literal: (value = '') => escapeRegExp(String(value)),
  characterClass: (value = '') => `[${String(value).replace(/([\\\]])/g, '\\$1')}]`,
  startAnchor: () => '^',
  endAnchor: () => '$',
  group: (value = '') => `(${value})`,
  nonCapturingGroup: (value = '') => `(?:${value})`,
  alternation: (...values) => values.join('|'),
  optional: (value = '') => `(?:${value})?`,
  oneOrMore: (value = '') => `(?:${value})+`,
  zeroOrMore: (value = '') => `(?:${value})*`,
});

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const bounded = (value, limit) => String(value ?? '').slice(0, limit);

/** A plain-data regex builder model suitable for an anchored popover or inline editor. */
export class RegexBuilder {
  constructor({
    pattern = '',
    sample = '',
    flags = '',
    regex = false,
    limits = REGEX_LIMITS,
  } = {}) {
    this.limits = limits;
    this.state = {
      pattern: bounded(pattern, limits.pattern),
      sample: bounded(sample, limits.sample),
      flags: String(flags),
      regex: Boolean(regex),
      syntax: { valid: true, message: '' },
      matches: [],
      captures: [],
      copied: false,
      exported: false,
    };
    this.evaluate();
  }

  snapshot() {
    return {
      ...this.state,
      syntax: { ...this.state.syntax },
      matches: [...this.state.matches],
      captures: [...this.state.captures],
    };
  }

  update(changes = {}) {
    if ('pattern' in changes) this.state.pattern = bounded(changes.pattern, this.limits.pattern);
    if ('sample' in changes) this.state.sample = bounded(changes.sample, this.limits.sample);
    if ('flags' in changes) this.state.flags = String(changes.flags);
    if ('regex' in changes) this.state.regex = Boolean(changes.regex);
    return this.evaluate();
  }

  evaluate() {
    const source = this.state.regex ? this.state.pattern : escapeRegExp(this.state.pattern);
    let expression;
    try {
      expression = new RegExp(source, this.state.flags);
      this.state.syntax = { valid: true, message: '' };
    } catch (error) {
      this.state.syntax = { valid: false, message: error.message };
      this.state.matches = [];
      this.state.captures = [];
      return this.snapshot();
    }
    const matches = [];
    const captures = [];
    const input = this.state.sample;
    if (input && (this.state.flags.includes('g') || this.state.flags.includes('y'))) {
      let match;
      while ((match = expression.exec(input)) && matches.length < this.limits.matches) {
        matches.push({
          value: match[0],
          index: match.index,
          groups: match.groups ? { ...match.groups } : {},
        });
        captures.push(match.slice(1));
        if (match[0] === '') expression.lastIndex += 1;
      }
    } else if (input) {
      const match = expression.exec(input);
      if (match) {
        matches.push({
          value: match[0],
          index: match.index,
          groups: match.groups ? { ...match.groups } : {},
        });
        captures.push(match.slice(1));
      }
    }
    this.state.matches = matches;
    this.state.captures = captures;
    return this.snapshot();
  }

  setPlainText(value) {
    return this.update({ pattern: value, regex: false });
  }

  setRegex(value, flags = this.state.flags) {
    return this.update({ pattern: value, flags, regex: true });
  }

  copy() {
    this.state.copied = true;
    return this.state.regex ? `/${this.state.pattern}/${this.state.flags}` : this.state.pattern;
  }

  exportState() {
    this.state.exported = true;
    return JSON.stringify({
      pattern: this.state.pattern,
      sample: this.state.sample,
      flags: this.state.flags,
      regex: this.state.regex,
    });
  }

  appendFragment(fragment) {
    return this.update({ pattern: `${this.state.pattern}${String(fragment ?? '')}`, regex: true });
  }
}

export const createRegexBuilderState = (options) => new RegexBuilder(options);

export function evaluateRegex({
  pattern = '',
  sample = '',
  flags = '',
  regex = true,
  limits = REGEX_LIMITS,
} = {}) {
  return new RegexBuilder({ pattern, sample, flags, regex, limits }).snapshot();
}

export default RegexBuilder;
