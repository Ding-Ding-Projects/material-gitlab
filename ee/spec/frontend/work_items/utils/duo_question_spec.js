import { parseDuoQuestion } from 'ee/work_items/utils/duo_question';

const fenced = (payload) => `Some prose above the block.

\`\`\`json:duo-question
${payload}
\`\`\``;

const marker = (content) => `Some prose above the marker.

<!-- duo:options ${content} -->`;

const CLOSED_PAYLOAD = JSON.stringify({
  type: 'closed',
  question: 'Which cutover approach should we use?',
  options: [
    { id: 'hard_removal', label: 'Hard removal', description: 'One patch.', recommended: false },
    { id: 'staged', label: 'Staged deprecation', description: 'Slower.', recommended: true },
  ],
});

describe('parseDuoQuestion', () => {
  describe('when the body carries no question', () => {
    it.each([
      ['no argument at all', undefined],
      ['an empty string', ''],
      ['plain prose', 'Just an ordinary comment.'],
      ['a fenced block with a different info string', '```json\n{"type":"closed"}\n```'],
      ['an unrelated HTML comment', '<!-- nothing to see -->'],
      [
        'prose mentions the fence mid-line rather than opening one',
        'the flow emits ```json:duo-question\n{"type":"open","question":"?"}\n``` blocks',
      ],
    ])('reports nothing to render for %s', (_, body) => {
      expect(parseDuoQuestion(body)).toEqual({ status: 'none' });
    });
  });

  describe('with a fenced payload', () => {
    it('returns the question, its options and the recommendation', () => {
      expect(parseDuoQuestion(fenced(CLOSED_PAYLOAD))).toEqual({
        status: 'ok',
        diagnostics: [],
        question: {
          type: 'closed',
          question: 'Which cutover approach should we use?',
          multiple: false,
          options: [
            {
              id: 'hard_removal',
              label: 'Hard removal',
              description: 'One patch.',
              recommended: false,
            },
            {
              id: 'staged',
              label: 'Staged deprecation',
              description: 'Slower.',
              recommended: true,
            },
          ],
        },
      });
    });

    it('defaults a missing question and description, and only trusts a boolean recommendation', () => {
      const body = fenced(
        JSON.stringify({ type: 'closed', options: [{ id: 'a', label: 'A', recommended: 'yes' }] }),
      );
      const { question } = parseDuoQuestion(body);

      expect(question.question).toBe('');
      expect(question.options[0]).toEqual({
        id: 'a',
        label: 'A',
        description: '',
        recommended: false,
      });
    });

    it('reports a question that accepts more than one answer', () => {
      const body = fenced(
        JSON.stringify({
          type: 'closed',
          multiple: true,
          options: [{ id: 'a', label: 'A' }],
        }),
      );

      expect(parseDuoQuestion(body).question.multiple).toBe(true);
    });

    it('renders the usable options and reports the ones it dropped', () => {
      const body = fenced(
        JSON.stringify({
          type: 'closed',
          question: 'Which?',
          options: [
            { id: 'keep', label: 'Keep me' },
            { id: 'no-label' },
            { label: 'No id' },
            { id: '  ', label: 'Blank id' },
            'not an object',
          ],
        }),
      );
      const { status, question, diagnostics } = parseDuoQuestion(body);

      expect(status).toBe('ok');
      expect(question.options).toEqual([
        { id: 'keep', label: 'Keep me', description: '', recommended: false },
      ]);
      expect(diagnostics).toEqual([
        { path: 'options[1].label', message: 'required' },
        { path: 'options[2].id', message: 'required' },
        { path: 'options[3].id', message: 'required' },
        { path: 'options[4]', message: 'not an object' },
      ]);
    });

    it.each([
      ['invalid JSON', '{not json at all'],
      ['a JSON array', '[1, 2, 3]'],
      ['a JSON string', '"just a string"'],
      ['JSON null', 'null'],
    ])('reports the payload as invalid for %s', (_, payload) => {
      expect(parseDuoQuestion(fenced(payload))).toEqual({
        status: 'invalid',
        diagnostics: [{ path: 'payload', message: 'not a JSON object' }],
      });
    });

    it.each([
      ['the type is open', { type: 'open', question: 'What should it say?' }],
      ['the type is unrecognised', { type: 'nonsense', question: 'What?' }],
      [
        'usable options came along anyway',
        { type: 'open', question: 'What?', options: [{ id: 'a', label: 'A' }] },
      ],
      [
        'the options are unusable',
        { type: 'open', question: 'What?', options: [{ label: 'no id' }, 'junk'] },
      ],
      [
        'it claims to accept more than one answer',
        { type: 'open', question: 'What?', multiple: true },
      ],
    ])('returns a plain open question when %s', (_, payload) => {
      const { status, question, diagnostics } = parseDuoQuestion(fenced(JSON.stringify(payload)));

      expect(status).toBe('ok');
      expect(question.type).toBe('open');
      expect(question.options).toEqual([]);
      // Options and `multiple` mean nothing without choices to pick from, so an
      // open question reports neither — including no complaints about options
      // it never intended to render.
      expect(question.multiple).toBe(false);
      expect(diagnostics).toEqual([]);
    });

    it.each([
      ['options are missing', { type: 'closed', question: 'What?' }],
      ['options are empty', { type: 'closed', question: 'What?', options: [] }],
      [
        'every option is unusable',
        { type: 'closed', question: 'What?', options: [{ label: 'No id' }] },
      ],
    ])('reports a closed question as invalid when %s', (_, payload) => {
      const { status, diagnostics } = parseDuoQuestion(fenced(JSON.stringify(payload)));

      expect(status).toBe('invalid');
      expect(diagnostics[0]).toEqual({
        path: 'options',
        message: 'closed question has no usable options',
      });
    });
  });

  describe('with an HTML comment marker', () => {
    it('normalises to the same shape, using labels as ids', () => {
      const body = marker('["Okta", "Entra ID"] duo:recommended 2');

      expect(parseDuoQuestion(body)).toEqual({
        status: 'ok',
        diagnostics: [],
        question: {
          type: 'closed',
          question: '',
          multiple: false,
          options: [
            { id: 'Okta', label: 'Okta', description: '', recommended: false },
            { id: 'Entra ID', label: 'Entra ID', description: '', recommended: true },
          ],
        },
      });
    });

    it('reports a question that accepts more than one answer', () => {
      expect(parseDuoQuestion(marker('["A", "B"] duo:multiple')).question.multiple).toBe(true);
    });

    it.each([
      ['no index is given', '["A", "B"]'],
      ['the index is out of range', '["A", "B"] duo:recommended 9'],
      ['the index points at a dropped entry', '["Okta", "", "Entra ID"] duo:recommended 2'],
    ])('recommends nothing when %s', (_, content) => {
      const { question } = parseDuoQuestion(marker(content));

      expect(question.options.every((option) => option.recommended === false)).toBe(true);
    });

    // The index counts the array as the flow wrote it, so dropping unusable
    // entries must not shift the recommendation onto a neighbour.
    it('drops unusable entries while still recommending the intended one', () => {
      const { question } = parseDuoQuestion(
        marker('["", "   ", "Okta", 42, "Entra ID", null] duo:recommended 3'),
      );

      expect(question.options).toEqual([
        { id: 'Okta', label: 'Okta', description: '', recommended: true },
        { id: 'Entra ID', label: 'Entra ID', description: '', recommended: false },
      ]);
    });

    it.each([
      ['there is no array', 'duo:recommended 1', 'not a JSON array'],
      ['the array is invalid JSON', '["unterminated', 'not a JSON array'],
      ['the array is not an array', '{"a": 1}', 'not a JSON array'],
      ['the array is empty', '[]', 'closed question has no usable options'],
      ['no entry is usable', '["", 42]', 'closed question has no usable options'],
    ])('reports the marker as invalid when %s', (_, content, message) => {
      const { status, diagnostics } = parseDuoQuestion(marker(content));

      expect(status).toBe('invalid');
      expect(diagnostics[0]).toEqual({ path: 'options', message });
    });
  });

  describe('when the body carries both shapes', () => {
    it('prefers the fenced payload, which is the richer one', () => {
      const body = `${fenced(CLOSED_PAYLOAD)}\n\n${marker('["Ignored"]')}`;

      expect(parseDuoQuestion(body).question.options.map((option) => option.id)).toEqual([
        'hard_removal',
        'staged',
      ]);
    });
  });
});
