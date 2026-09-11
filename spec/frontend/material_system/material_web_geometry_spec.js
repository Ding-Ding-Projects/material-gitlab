import fs from 'fs';
import path from 'path';

// This spec reads SCSS source as text, never the compiled output, and its
// selector/declaration boundaries are hand-written data below -- discovery
// (scanning the tree for "anything that looks like a Material Web class")
// cannot prove a control that disappears entirely was ever checked. See
// doc/development/material_web_geometry.md for how this list was derived
// (control-inventory.json per surface, components/inventory.js's shell
// inventory, and a direct read of every surface .vue template).

const root = path.resolve(__dirname, '../../..');
const stylesheetsRoot = path.join(root, 'app/assets/stylesheets');
const surfacesRoot = path.join(root, 'app/assets/javascripts/material_system/surfaces');

const readStylesheet = (relative) => fs.readFileSync(path.join(stylesheetsRoot, relative), 'utf8');
const readSurface = (relative) => fs.readFileSync(path.join(surfacesRoot, relative), 'utf8');

// ---------------------------------------------------------------------------
// Parsing: strip comments, then walk braces with a depth counter. A selector
// is matched by exact string equality against the hand-written lists below,
// never by a descendant search or a substring test, and a declaration is
// attributed only to the rule that directly contains it -- a nested block's
// text is excluded from its parent's own declaration text before that parent
// is checked. No lazy `[\s\S]*?` span is used anywhere in this file: every
// rule body is found by counting braces, one character at a time.
// ---------------------------------------------------------------------------

function stripComments(text) {
  // Block comments: a standard, non-catastrophic pattern that cannot run past
  // the next real `*/` (it is not the lazy "span until the next rule" pattern
  // this file is required to avoid -- comments are self-terminating).
  let out = text.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '');
  // Line comments. None of the files this spec reads put `//` inside a quoted
  // string or a url(), so a plain end-of-line strip is safe here.
  out = out.replace(/\/\/[^\n]*/g, '');
  return out;
}

function splitTopLevelComma(text) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

// Walks already-comment-free `text` and returns every rule block found at any
// nesting depth: `{ selectors: string[], ownText: string }`. `selectors` is
// this exact block's own comma-split, `&`-resolved selector list (a nested
// selector with no `&`, such as a bare tag name nested under a class, is kept
// as written so it can still be matched by that bare name). `ownText` is this
// block's own declarations only, with every direct child block's full span
// (selector text through its own closing brace) blanked out first.
function parseRules(text) {
  const rules = [];
  const stack = [];
  let selectorStart = 0;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < n && text[i] !== quote) {
        if (text[i] === '\\') i += 1;
        i += 1;
      }
      i += 1;
      continue;
    }
    if (ch === ';') {
      // A declaration just ended. Whatever comes next -- another declaration
      // or a nested rule's own selector -- starts fresh from here, so a
      // completed `color: red;` is never dragged along as part of the next
      // nested selector's text.
      i += 1;
      selectorStart = i;
      continue;
    }
    if (ch === '{') {
      const rawSelector = text.slice(selectorStart, i).trim();
      const parentSelectors = stack.length ? stack[stack.length - 1].selectors : [''];
      const resolved = [];
      splitTopLevelComma(rawSelector).forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        if (trimmed.includes('&')) {
          parentSelectors.forEach((parent) => resolved.push(trimmed.split('&').join(parent).trim()));
        } else {
          resolved.push(trimmed);
        }
      });
      stack.push({ selectors: resolved, bodyStart: i + 1, childSpans: [], selectorTextStart: selectorStart });
      i += 1;
      selectorStart = i;
      continue;
    }
    if (ch === '}') {
      const frame = stack.pop();
      if (frame) {
        let ownText = text.slice(frame.bodyStart, i);
        frame.childSpans
          .slice()
          .sort((a, b) => b.start - a.start)
          .forEach(({ start, end }) => {
            const relStart = start - frame.bodyStart;
            const relEnd = end - frame.bodyStart;
            ownText = `${ownText.slice(0, relStart)}${' '.repeat(relEnd - relStart)}${ownText.slice(relEnd)}`;
          });
        rules.push({ selectors: frame.selectors, ownText });
        const fullSpanEnd = i + 1;
        if (stack.length) {
          stack[stack.length - 1].childSpans.push({ start: frame.selectorTextStart, end: fullSpanEnd });
        }
      }
      i += 1;
      selectorStart = i;
      continue;
    }
    i += 1;
  }
  return rules;
}

function parseScss(text) {
  return parseRules(stripComments(text));
}

const BANNED_HOST_PROPERTIES = ['width', 'height', 'padding', 'font-size', 'font-family', 'white-space'];

// Matches `prop:` only when `prop` begins right at a declaration boundary
// (the start of the block, or immediately after `;`/`{`), so `padding-left`,
// `min-height`, `max-width` and `--md-text-button-label-text-size` can never
// satisfy a check for `padding`, `height`, `width` or `font-size`.
function bannedDeclarationsIn(ownText) {
  return BANNED_HOST_PROPERTIES.filter((prop) => {
    const re = new RegExp(`(?:^|[;{])[ \\t\\r\\n]*${prop.replace('-', '\\-')}[ \\t\\r\\n]*:`);
    return re.test(ownText);
  });
}

function findRuleExact(rules, selector) {
  return rules.filter((rule) => rule.selectors.includes(selector));
}

// ---------------------------------------------------------------------------
// Self-test: prove the parser itself behaves before trusting it against real
// files. Each case is deliberately narrow so a regression in the parser (not
// in the surfaces it checks) shows up here first.
// ---------------------------------------------------------------------------

describe('the SCSS rule-boundary parser this guard is built on', () => {
  it('finds a banned property declared directly on the matched selector', () => {
    const rules = parseScss('.foo { width: 10px; color: red; }');
    expect(bannedDeclarationsIn(findRuleExact(rules, '.foo')[0].ownText)).toEqual(['width']);
  });

  it('does not confuse padding-left/min-height/max-width with the banned exact property names', () => {
    const rules = parseScss('.foo { padding-left: 4px; min-height: 4px; max-width: 4px; }');
    expect(bannedDeclarationsIn(findRuleExact(rules, '.foo')[0].ownText)).toEqual([]);
  });

  it('does not attribute a nested child rule\'s declaration to its parent', () => {
    const rules = parseScss(".foo { color: red; &--bar { width: 10px; } }");
    expect(bannedDeclarationsIn(findRuleExact(rules, '.foo')[0].ownText)).toEqual([]);
    expect(bannedDeclarationsIn(findRuleExact(rules, '.foo--bar')[0].ownText)).toEqual(['width']);
  });

  it('resolves a bare nested selector (no &) by its own name regardless of ancestor', () => {
    const rules = parseScss('.mr-app { md-filled-text-field { padding: 0; } }');
    expect(findRuleExact(rules, 'md-filled-text-field')).toHaveLength(1);
    expect(bannedDeclarationsIn(findRuleExact(rules, 'md-filled-text-field')[0].ownText)).toEqual(['padding']);
  });

  it('never matches a selector as a substring or descendant of a different one', () => {
    const rules = parseScss('.mr-icon-btn--lg { width: 40px; } .mr-icon-btn { color: red; }');
    expect(bannedDeclarationsIn(findRuleExact(rules, '.mr-icon-btn')[0].ownText)).toEqual([]);
    expect(bannedDeclarationsIn(findRuleExact(rules, '.mr-icon-btn--lg')[0].ownText)).toEqual(['width']);
  });

  it('does not use a lazy span that would jump from one rule into the next', () => {
    const rules = parseScss('.a { color: red; } .b { width: 10px; }');
    expect(bannedDeclarationsIn(findRuleExact(rules, '.a')[0].ownText)).toEqual([]);
    expect(bannedDeclarationsIn(findRuleExact(rules, '.b')[0].ownText)).toEqual(['width']);
  });

  it('finds an unqualified overflow: hidden but not overflow-y/overflow-x or a non-hidden value', () => {
    const rules = parseScss('.a { overflow: hidden; } .b { overflow-y: hidden; } .c { overflow: auto; }');
    const hasHidden = (selector) =>
      /(?:^|[;{])[ \t\r\n]*overflow[ \t\r\n]*:[ \t\r\n]*hidden\b/.test(findRuleExact(rules, selector)[0].ownText);
    expect(hasHidden('.a')).toBe(true);
    expect(hasHidden('.b')).toBe(false);
    expect(hasHidden('.c')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (a) Every Material Web host selector, per file, sized only through official
// tokens -- never through width/height/padding/font-size/font-family/
// white-space on the host itself.
// ---------------------------------------------------------------------------

// Hand-written: derived from each surface's control-inventory.json, the shell
// inventory in components/inventory.js (SHELL_MATERIAL_CONTROLS), and a direct
// read of every <material-*>/<Material*> usage's class list across this
// surface's .vue templates. A selector belongs here only if it is declared in
// this exact stylesheet (a class styled solely inside a Vue SFC's own <style
// scoped> block is out of this stylesheet's reach and is not listed).
const MATERIAL_WEB_HOST_SELECTORS_BY_FILE = {
  'shared-shell.scss': [
    '.material-shell__brand', // md-text-button (ShellA.vue/ShellB.vue)
    '.material-shell__search', // md-filled-text-field
    '.material-shell__menu', // md-icon-button (sidebar toggle)
    '.material-shell__icon-button', // md-icon-button (palette + theme)
    '.material-shell__regex', // md-icon-button
  ],
  'MergeRequests/mergerequests.scss': [
    '.mr-topbar__search-input', // md-filled-text-field
    '.mr-icon-btn', // md-text-button rendered icon-only
    '.mr-icon-btn--lg', // md-text-button rendered icon-only
    '.mr-topbar__regex-toggle', // md-text-button
    '.mr-list-header__new-btn', // md-filled-button
    '.mr-list-item__open', // md-text-button
    '.mr-list__invert-btn', // md-text-button
    '.mr-thread__resolve-btn', // md-text-button
    '.mr-comment-composer__submit', // md-filled-button
    '.mr-btn', // md-text-button
    '.mr-bulk-bar__btn', // md-text-button
    'md-filled-text-field',
    'md-text-button',
    'md-filled-button',
    'md-outlined-button',
    'md-filled-tonal-button',
    'md-elevated-button',
  ],
  'Issues/issues.scss': [
    'md-filled-text-field',
    'md-text-button',
    'md-filled-button',
    'md-outlined-button',
    'md-filled-tonal-button',
    'md-elevated-button',
  ],
  'Settings/settings.scss': [
    '.st-btn', // MaterialButton
    '.st-btn--compact', // MaterialButton
    'md-filled-text-field',
    'md-text-button',
    'md-filled-button',
    'md-outlined-button',
    'md-filled-tonal-button',
    'md-elevated-button',
  ],
  'Plan/plan.scss': [
    'md-filled-text-field',
    'md-text-button',
    'md-filled-button',
    'md-outlined-button',
    'md-filled-tonal-button',
    'md-elevated-button',
  ],
  'Epics/epics.scss': [
    '.gl-mds-epics__btn', // material-button
    '.gl-mds-epics__btn--filled', // material-button variant="filled"
    '.gl-mds-epics__bulkbar-btn', // material-button variant="text"
    '.gl-mds-epics__textarea', // material-text-field type="textarea"
    'md-filled-text-field',
    'md-text-button',
    'md-filled-button',
    'md-outlined-button',
    'md-filled-tonal-button',
    'md-elevated-button',
  ],
};

describe('Material Web hosts are sized only through official custom properties', () => {
  Object.entries(MATERIAL_WEB_HOST_SELECTORS_BY_FILE).forEach(([relativeFile, selectors]) => {
    describe(relativeFile, () => {
      const rules = parseScss(readSurface(relativeFile));

      selectors.forEach((selector) => {
        it(`\`${selector}\` declares no width/height/padding/font-size/font-family/white-space`, () => {
          const matches = findRuleExact(rules, selector);
          expect(matches.length).toBeGreaterThan(0); // the selector must still exist in the file
          const offenders = matches.flatMap((rule) => bannedDeclarationsIn(rule.ownText));
          expect(offenders).toEqual([]);
        });
      });
    });
  });
});

// ---------------------------------------------------------------------------
// (b) Overlay-hosting containers keep no unqualified overflow: hidden.
// ---------------------------------------------------------------------------

const OVERFLOW_HIDDEN_FORBIDDEN_SELECTORS_BY_FILE = {
  'shared-shell.scss': ['.material-analyze'],
  'Plan/plan.scss': ['.gl-mds-plan'],
};

describe('overlay-hosting containers do not clip a position: fixed overlay with overflow: hidden', () => {
  Object.entries(OVERFLOW_HIDDEN_FORBIDDEN_SELECTORS_BY_FILE).forEach(([relativeFile, selectors]) => {
    describe(relativeFile, () => {
      const rules = parseScss(readSurface(relativeFile));

      selectors.forEach((selector) => {
        it(`\`${selector}\` does not declare overflow: hidden`, () => {
          const matches = findRuleExact(rules, selector);
          expect(matches.length).toBeGreaterThan(0);
          const hasHidden = matches.some((rule) =>
            /(?:^|[;{])[ \t\r\n]*overflow[ \t\r\n]*:[ \t\r\n]*hidden\b/.test(rule.ownText),
          );
          expect(hasHidden).toBe(false);
        });
      });
    });
  });

  it('operations.scss\'s .material-live-surface__card does not declare overflow: hidden', () => {
    const opsSource = fs.readFileSync(
      path.join(surfacesRoot, 'operations.scss'),
      'utf8',
    );
    const rules = parseScss(opsSource);
    const matches = findRuleExact(rules, '.material-live-surface__card');
    expect(matches.length).toBeGreaterThan(0);
    const hasHidden = matches.some((rule) =>
      /(?:^|[;{])[ \t\r\n]*overflow[ \t\r\n]*:[ \t\r\n]*hidden\b/.test(rule.ownText),
    );
    expect(hasHidden).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (c) The geometry partial reaches both compiled entries and every surface
// that uses a registered Material Web element.
// ---------------------------------------------------------------------------

describe('the Material Web geometry partial reaches every compiled entry', () => {
  it('exists at md3/_material_web_geometry.scss', () => {
    expect(fs.existsSync(path.join(stylesheetsRoot, 'md3/_material_web_geometry.scss'))).toBe(true);
  });

  it('is imported by md3/index.scss', () => {
    expect(readStylesheet('md3/index.scss')).toMatch(/@import\s+'material_web_geometry';/);
  });

  it('reaches application.scss via color_modes/md3 -> md3/index', () => {
    expect(readStylesheet('application.scss')).toMatch(/@import\s+'\.\/color_modes\/md3';/);
    expect(readStylesheet('color_modes/_md3.scss')).toMatch(/@import\s+'\.\.\/md3\/index';/);
  });

  it('reaches application_dark.scss via color_modes/md3 -> md3/index', () => {
    expect(readStylesheet('application_dark.scss')).toMatch(/@import\s+'\.\/color_modes\/md3';/);
    expect(readStylesheet('color_modes/_md3.scss')).toMatch(/@import\s+'\.\.\/md3\/index';/);
  });

  // Every surface stylesheet that uses the mixins below must import the
  // partial directly (config/webpack/loaders/material_scss_loader.js compiles
  // each surface stylesheet independently, so it never inherits application's
  // import chain).
  Object.keys(MATERIAL_WEB_HOST_SELECTORS_BY_FILE).forEach((relativeFile) => {
    it(`${relativeFile} imports md3/material_web_geometry directly`, () => {
      expect(readSurface(relativeFile)).toMatch(/@import\s+'md3\/material_web_geometry';/);
    });
  });
});
