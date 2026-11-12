// Strings for the Material feature layer in English and playful Hong Kong Cantonese.
// `t(key, language)` returns one string; in bilingual mode it returns "English · 廣東話".
// Funny level changes voice only: every entry keeps the same facts at every level.

const STRINGS = {
  language: ['Language', '語言'],
  english: ['English', '英文'],
  cantonese: ['廣東話', '廣東話'],
  both: ['Both', '兩樣都要'],
  accessibility: ['Accessibility', '無障礙'],
  textSize: ['Text size', '字體大小'],
  smaller: ['Smaller text', '細啲'],
  larger: ['Larger text', '大啲'],
  highContrast: ['High contrast', '高對比'],
  reduceMotion: ['Reduce motion', '減少動畫'],
  focusRing: ['Always show focus ring', '一直顯示焦點框'],
  largerTargets: ['Larger targets', '大啲嘅掣'],
  keyboardHelp: ['Keyboard help', '鍵盤說明'],
  hideMenu: ['Hide this menu', '收埋呢個選單'],
  hideMenuHint: ['Settings brings it back', '喺設定可以攞返出嚟'],
  adhdModes: ['ADHD modes', 'ADHD 模式'],
  adhdIntro: [
    'Five separate modes. Each is off until you turn it on, and none turns on another.',
    '五個獨立模式，預設全部熄，開一個唔會連累其他。',
  ],
  focus: ['Focus', '專注'],
  focusHelp: [
    'Dims navigation and everything but the page you are on.',
    '除咗而家呢頁，其他全部調暗。',
  ],
  lowStimulation: ['Low stimulation', '低刺激'],
  lowStimulationHelp: [
    'Removes motion and non-status color accents.',
    '冇晒動畫同唔係狀態用嘅顏色。',
  ],
  timeAwareness: ['Time awareness', '時間感'],
  timeAwarenessHelp: ['Shows how long you have been on this page.', '顯示你喺呢頁逗留咗幾耐。'],
  oneThing: ['One thing at a time', '一次一樣嘢'],
  oneThingHelp: [
    'Shows one suggested next step from your To-Do List.',
    '由待辦清單揀一樣下一步俾你。',
  ],
  momentum: ['Momentum', '順勢'],
  momentumHelp: [
    'On the To-Do List, marking one done moves you straight to the next.',
    '喺待辦清單剔完一樣，即刻跳去下一樣。',
  ],
  whatsNext: ["What's next: your To-Do List", '下一步：睇吓待辦清單'],
  elapsed: ['Time on this page', '喺呢頁嘅時間'],
  features: ['Material features', 'Material 功能'],
  setup: ['Setup', '設定精靈'],
  dimSum: ['Dim sum surprise', '點心驚喜'],
  dimSumAlwaysOn: ['Always on. About 1 in 10 page loads.', '永遠開住，大約十次有一次。'],
  dimSumNiceTry: [
    'Nice try. Dim sum surprise cannot be turned off.',
    '想熄？冇得熄㗎，點心驚喜係永久嘅。',
  ],
  dimSumHello: ['Dim sum surprise', '飲茶時間到！'],
  dimSumImageUnavailable: [
    'Photo unavailable offline. It loads from the public dim sum catalog.',
    '離線睇唔到相，相係由公開點心目錄載入。',
  ],
  notifications: ['Notifications', '通知'],
  notificationCentre: ['Notification centre', '通知中心'],
  noNotifications: ['Nothing yet. Dismissed messages land here.', '暫時冇嘢，閂咗嘅訊息會留喺度。'],
  clearAll: ['Clear all', '全部清除'],
  exportSettings: ['Export settings', '匯出設定'],
  exportHelp: [
    'Downloads your Material settings as JSON (UTF-8). Locks and secrets are never included.',
    '下載你嘅 Material 設定（JSON，UTF-8），唔會包鎖同秘密。',
  ],
  funnyEnglish: ['English funny level', '英文搞笑程度'],
  funnyCantonese: ['Cantonese funny level', '廣東話搞笑程度'],
  funnyHelp: [
    '1 fully serious, 5 maximum playfulness. Facts never change.',
    '1 最正經，5 最搞笑，事實唔會變。',
  ],
  theme: ['Theme', '主題'],
  light: ['Light', '淺色'],
  dark: ['Dark', '深色'],
  system: ['System', '跟系統'],
  density: ['Density', '密度'],
  compact: ['Compact', '緊湊'],
  comfortable: ['Comfortable', '舒適'],
  spacious: ['Spacious', '寬鬆'],
  seedColor: ['Seed color', '主色'],
  defaultValue: ['Default', '預設'],
  setByYou: ['Set by you', '你設定嘅'],
  back: ['Back', '上一步'],
  next: ['Next', '下一步'],
  skip: ['Skip this step', '跳過呢步'],
  saveLater: ['Save and finish later', '儲存，遲啲再做'],
  finish: ['Open my workspace', '打開我嘅工作區'],
  stepOf: ['Step %{n} of %{total}', '第 %{n} 步，共 %{total} 步'],
  optional: ['optional', '可選'],
  setupTitleLanguage: [
    'How should Material GitLab talk to you?',
    'Material GitLab 應該點同你講嘢？',
  ],
  setupTitleAppearance: ['Pick a look', '揀個樣'],
  setupTitleAccess: ['Make it comfortable', '用得舒服啲'],
  setupTitleDone: ['All set', '搞掂晒'],
  setupDoneBody: [
    'Your choices are saved on this device. Change them any time from the features rail.',
    '設定已經儲咗喺呢部機，隨時喺底部功能列改。',
  ],
  resumeSetup: ['Resume setup', '繼續設定'],
  close: ['Close', '關閉'],
  saved: ['Saved', '已儲存'],
  saveFailed: [
    'Could not save. Your browser storage may be full or blocked.',
    '儲存唔到，瀏覽器儲存空間可能滿咗或者被封鎖。',
  ],
  ctrlShiftF: ['Ctrl Shift F: command palette', 'Ctrl Shift F：指令面板'],
  history: ['Local history', '本機紀錄'],
  historyCount: ['%{n} saved changes', '%{n} 個已儲存變更'],
  open: ['Open', '打開'],
};

export const LANGUAGES = Object.freeze(['en', 'yue', 'bilingual']);

const fill = (text, vars) =>
  text.replace(/%\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));

export function t(key, language = 'en', vars = {}) {
  const entry = STRINGS[key];
  if (!entry) return key;
  const [en, yue] = entry.map((text) => fill(text, vars));
  if (language === 'yue') return yue;
  if (language === 'bilingual') return en === yue ? en : `${en} · ${yue}`;
  return en;
}

export const hasString = (key) => Object.prototype.hasOwnProperty.call(STRINGS, key);
