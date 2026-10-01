import { bindLocalizedFields, describeWith, localizedText, normalizeLanguage, renderLocalizedText, uniqueId } from './localization.js';

/**
 * Product copy and small, framework-free Material 3 field helpers.
 *
 * The catalogue is the source of truth for labels and supporting text.  It is
 * deliberately data-first so the page can switch language without duplicating
 * markup or letting a placeholder become the only instruction.
 */

export const CONTENT_CATALOG = Object.freeze({
  brand: {
    name: { en: 'Material GitLab', 'zh-Hant': 'Material GitLab' },
    tagline: {
      en: 'Clearer GitLab workflows, one page at a time.',
      'zh-Hant': '一頁一頁，令 GitLab 工作流程更清晰。',
    },
  },
  navigation: {
    overview: { en: 'Overview', 'zh-Hant': '總覽' },
    guides: { en: 'Guides', 'zh-Hant': '指南' },
    reference: { en: 'Reference', 'zh-Hant': '參考資料' },
    settings: { en: 'Settings', 'zh-Hant': '設定' },
    library: { en: 'Library', 'zh-Hant': '文件庫' },
  },
  home: {
    eyebrow: { en: 'Material Design 3 · GitLab', 'zh-Hant': 'Material Design 3 · GitLab' },
    title: {
      en: 'A calmer way to navigate GitLab.',
      'zh-Hant': '用更從容的方式瀏覽 GitLab。',
    },
    description: {
      en: 'Use focused guides, live feature status, and offline reference material to move from question to next step without guesswork.',
      'zh-Hant': '用聚焦指南、即時功能狀態和離線參考資料，清楚地由問題走到下一步。',
    },
    primaryAction: { en: 'Explore guides', 'zh-Hant': '探索指南' },
    secondaryAction: { en: 'View reference', 'zh-Hant': '查看參考資料' },
    quickStart: { en: 'Start with a question', 'zh-Hant': '由一條問題開始' },
    quickStartDescription: {
      en: 'Search the library or choose a guide. Every page keeps the next action visible.',
      'zh-Hant': '搜尋文件庫或選擇指南。每一頁都會清楚顯示下一個動作。',
    },
  },
  sections: {
    guides: {
      eyebrow: { en: 'Start here', 'zh-Hant': '由這裡開始' },
      title: { en: 'Guides for the work in front of you', 'zh-Hant': '為眼前工作而設的指南' },
      description: {
        en: 'Short, practical paths for setting up, designing, and checking a GitLab workflow.',
        'zh-Hant': '用簡短而實用的步驟，完成設定、設計和檢查 GitLab 工作流程。',
      },
    },
    reference: {
      eyebrow: { en: 'Reference', 'zh-Hant': '參考資料' },
      title: { en: 'The decisions behind the interface', 'zh-Hant': '介面背後的設計決定' },
      description: {
        en: 'Find the tokens, states, and interaction rules that keep the experience consistent.',
        'zh-Hant': '查找令整個體驗保持一致的設計 token、狀態和互動規則。',
      },
    },
    settings: {
      eyebrow: { en: 'Preferences', 'zh-Hant': '偏好設定' },
      title: { en: 'Make the reading experience yours', 'zh-Hant': '自訂你的閱讀體驗' },
      description: {
        en: 'Choose a language, adjust the tone, and keep your local preferences on this device.',
        'zh-Hant': '選擇語言、調整語氣，並將偏好設定保留在這部裝置。',
      },
    },
    library: {
      eyebrow: { en: 'Live library', 'zh-Hant': '即時文件庫' },
      title: { en: 'Features and articles in one place', 'zh-Hant': '功能和文章集中一處' },
      description: {
        en: 'Review the implementation status, then open the article that explains the detail.',
        'zh-Hant': '先查看實作狀態，再開啟解釋細節的文章。',
      },
    },
    install: {
      eyebrow: { en: 'Deployment', 'zh-Hant': '部署' },
      title: { en: 'Install Material GitLab', 'zh-Hant': '安裝 Material GitLab' },
      description: {
        en: 'The package, the container image, and the WSL route, each read from the same verified release manifest.',
        'zh-Hant': '套件、容器映像和 WSL 途徑，全部讀取自同一份已驗證的發佈清單。',
      },
    },
  },
  guides: [
    {
      id: 'workspace',
      category: { en: 'Foundations', 'zh-Hant': '基礎' },
      title: { en: 'Set up your workspace', 'zh-Hant': '設定你的工作區' },
      description: {
        en: 'Orient the project, choose a starting point, and keep the first pass lightweight.',
        'zh-Hant': '先了解專案、選擇起點，讓第一輪工作保持輕巧。',
      },
      action: { en: 'Read setup guide', 'zh-Hant': '閱讀設定指南' },
    },
    {
      id: 'momentum',
      category: { en: 'Patterns', 'zh-Hant': '模式' },
      title: { en: 'Design for momentum', 'zh-Hant': '為持續前進而設計' },
      description: {
        en: 'Use clear hierarchy, feedback, and states so every action feels deliberate.',
        'zh-Hant': '用清晰的層次、回饋和狀態，令每個動作都更有把握。',
      },
      action: { en: 'Read interaction guide', 'zh-Hant': '閱讀互動指南' },
    },
    {
      id: 'details',
      category: { en: 'Reference', 'zh-Hant': '參考資料' },
      title: { en: 'Check the details', 'zh-Hant': '檢查細節' },
      description: {
        en: 'Find the tokens, components, and decisions that keep the experience coherent.',
        'zh-Hant': '查找令整個體驗保持一致的 token、元件和設計決定。',
      },
      action: { en: 'Open reference', 'zh-Hant': '開啟參考資料' },
    },
  ],
  states: {
    empty: {
      en: 'Nothing matches this search yet.',
      'zh-Hant': '目前沒有符合此搜尋的內容。',
    },
    loading: { en: 'Loading the latest information…', 'zh-Hant': '正在載入最新資料…' },
    offline: {
      en: 'Showing the information saved on this device.',
      'zh-Hant': '目前顯示這部裝置上已儲存的資料。',
    },
    saved: { en: 'Saved on this device.', 'zh-Hant': '已儲存於這部裝置。' },
    installUnavailable: {
      en: 'No package has been published yet; the first build is in progress. Watch the releases page.',
      'zh-Hant': '目前尚未發佈任何套件，第一次建置正在進行中。請留意發佈頁面。',
    },
    installManifestInvalid: {
      en: 'The install information could not be read from the release manifest. Watch the releases page for updates.',
      'zh-Hant': '無法從發佈清單讀取安裝資訊。請留意發佈頁面以取得最新消息。',
    },
  },
});

export const TEXT_FIELD_SPECS = Object.freeze({
  siteSearch: {
    label: { en: 'Search the library', 'zh-Hant': '搜尋文件庫' },
    supporting: {
      en: 'Search guide titles, feature names, and article summaries.',
      'zh-Hant': '搜尋指南標題、功能名稱和文章摘要。',
    },
    placeholder: { en: 'Try “workspace” or “accessibility”', 'zh-Hant': '試試「工作區」或「無障礙」' },
    errors: { empty: { en: 'Enter a word or phrase to search.', 'zh-Hant': '輸入字詞或短語以開始搜尋。' } },
  },
  tabSearch: {
    label: { en: 'Search pages', 'zh-Hant': '搜尋頁面' },
    supporting: { en: 'Filter the visible pages without changing their order.', 'zh-Hant': '篩選目前頁面，不會改變頁面次序。' },
    placeholder: { en: 'Filter pages', 'zh-Hant': '篩選頁面' },
    errors: { empty: { en: 'Enter a page name.', 'zh-Hant': '輸入頁面名稱。' } },
  },
  regexPattern: {
    label: { en: 'Pattern', 'zh-Hant': '模式' },
    supporting: { en: 'Optional JavaScript regular expression for this search.', 'zh-Hant': '此搜尋可選用 JavaScript 正規表示式。' },
    placeholder: { en: 'Optional pattern', 'zh-Hant': '可選模式' },
    errors: { invalid: { en: 'This pattern is not valid JavaScript syntax.', 'zh-Hant': '此模式不是有效的 JavaScript 語法。' } },
  },
  regexFlags: {
    label: { en: 'Regular expression flags', 'zh-Hant': '正規表示式旗標' },
    supporting: { en: 'Optional ECMAScript flags such as i, m, u, or s.', 'zh-Hant': '可選用 i、m、u 或 s 等 ECMAScript 旗標。' },
    placeholder: { en: 'Optional flags', 'zh-Hant': '可選旗標' },
    errors: { invalid: { en: 'Use only supported ECMAScript flags.', 'zh-Hant': '只可使用支援的 ECMAScript 旗標。' } },
  },
  vocabularyUpload: {
    label: { en: 'Personal vocabulary file', 'zh-Hant': '個人詞彙檔案' },
    supporting: { en: 'Choose a local JSON file. Nothing is uploaded.', 'zh-Hant': '選擇本機 JSON 檔案；檔案不會上載。' },
    placeholder: { en: 'No file selected', 'zh-Hant': '未選擇檔案' },
    errors: { invalid: { en: 'Choose a valid JSON file under the documented size limit.', 'zh-Hant': '請選擇符合文件大小限制的有效 JSON 檔案。' } },
  },
});

const DEFAULT_LANGUAGE = 'en';

export const getContent = localizedText;

export function getFieldSpec(name) {
  return Object.hasOwn(TEXT_FIELD_SPECS, name) ? TEXT_FIELD_SPECS[name] : null;
}

export function createTextField({
  id,
  name = id,
  type = 'text',
  language = DEFAULT_LANGUAGE,
  value = '',
  state = 'default',
  describedBy,
  spec = getFieldSpec(name),
  document = globalThis.document,
} = {}) {
  if (!id) throw new TypeError('createTextField requires an id');
  if (!document) throw new Error('createTextField requires a browser document');

  const field = document.createElement('div');
  field.className = 'm3-field';
  field.dataset.copyKey = name;
  const label = document.createElement('label');
  label.className = 'm3-field__label';
  label.htmlFor = id;
  const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  input.className = 'm3-field__control';
  input.id = id;
  input.name = name;
  if (type !== 'textarea') input.type = type;
  input.value = value;
  const supporting = document.createElement('span');
  supporting.className = 'm3-field__supporting';
  supporting.id = uniqueId(document, `${id}-supporting`);
  if (describedBy) input.setAttribute('aria-describedby', describedBy);
  describeWith(input, supporting.id);
  field.append(label, input, supporting);

  let currentState = state;
  let currentMessage;
  const render = () => {
    field.dataset.language = language;
    field.dataset.fieldState = currentState;
    input.setAttribute('aria-invalid', String(currentState === 'error'));
    renderLocalizedText(label, spec?.label ?? name, language);
    input.placeholder = getContent(spec?.placeholder, language);
    const message = currentMessage ?? (currentState === 'error'
      ? spec?.errors?.invalid ?? spec?.errors?.empty ?? spec?.supporting
      : spec?.supporting);
    renderLocalizedText(supporting, message, language);
  };
  const setState = (nextState = 'default', message) => {
    currentState = nextState;
    currentMessage = message;
    render();
  };
  const setLanguage = (nextLanguage) => { language = normalizeLanguage(nextLanguage); render(); };
  setLanguage(language);
  return { element: field, input, label, supporting, setState, setLanguage };
}

/** Upgrade only registered fields, keeping controls, values and external error descriptions. */
export function initProductContent(root = document, language) {
  return bindLocalizedFields(root, TEXT_FIELD_SPECS, [
    ['#site-search', 'siteSearch'],
    ['#tab-search', 'tabSearch'],
    ['#tab-regex', 'regexPattern'],
    ['[data-tools-search]', 'siteSearch'],
    ['[data-offline-doc-search]', 'siteSearch'],
    ['[data-command-search]', 'siteSearch'],
    ['[data-tab-regex-flags]', 'regexFlags'],
    ['[data-vocabulary-upload]', 'vocabularyUpload'],
  ], language);
}
