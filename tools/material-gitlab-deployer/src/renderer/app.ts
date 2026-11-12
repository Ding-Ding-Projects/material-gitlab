// Material GitLab Host window. Plain DOM, no framework, no network except the dim sum photo
// from the public catalog (with a labelled placeholder when it cannot load).

interface HostApi {
  info(): Promise<AppInfo>;
  run(action: Action, consent: boolean): Promise<RunResult>;
  cancel(): Promise<boolean>;
  readSettings(): Promise<{ exists: boolean; value?: HostSettings }>;
  writeSettings(value: HostSettings): Promise<{ ok: boolean; errors?: string[] }>;
  openExternal(url: string): Promise<boolean>;
  openWorkDir(): Promise<string>;
  exportLog(text: string): Promise<boolean>;
  checkUpdate(): Promise<UpdateState>;
  restartToUpdate(): Promise<boolean>;
  windowControl(what: 'minimize' | 'maximize' | 'close'): void;
  onOutput(cb: (p: unknown) => void): () => void;
  onDone(cb: (p: unknown) => void): () => void;
  onUpdate(cb: (p: unknown) => void): () => void;
  onMaximized(cb: (p: unknown) => void): () => void;
}
type Action = 'start' | 'stop' | 'health' | 'status' | 'logs';
type HostSettings = { hostname: string; httpPort: number; sshPort: number; memoryGb: number; cpus: number };
type UpdateState = { state: 'idle' | 'checking' | 'current' | 'unavailable' | 'ready'; version?: string; detail?: string };
type AppInfo = { version: string; platform: string; workDir: string; hasEnv: boolean; running: Action | null; update: UpdateState };
type Health = { docker: string; container: string; address: string | null };
type RunResult = { ok: boolean; code?: number; error?: string; health?: Health };

const host = (window as unknown as { host: HostApi }).host;

// ---- Storage -------------------------------------------------------------------------------
const STORE = 'material-gitlab-host.v1';
type Prefs = {
  lang: 'en' | 'yue' | 'both';
  funnyEn: number;
  funnyYue: number;
  theme: 'system' | 'light' | 'dark';
  density: 'comfortable' | 'compact';
  seed: string;
  fontScale: number;
  displayName: string;
  adhd: { focus: boolean; lowStim: boolean; timer: boolean; next: boolean };
  a11y: { contrast: boolean; largeTargets: boolean; reduceMotion: boolean; focusRing: boolean };
  setup: { done: boolean; step: number; installDocker: boolean; firewall: boolean };
  tabs: { order: string[]; closed: string[]; seen: string[]; pinned: string[]; active: string };
  logRegex: boolean;
  bannerDismissed: string;
};
const DEFAULTS: Prefs = {
  lang: 'en',
  funnyEn: 5,
  funnyYue: 5,
  theme: 'system',
  density: 'comfortable',
  seed: '#e2725b',
  fontScale: 100,
  displayName: '',
  adhd: { focus: false, lowStim: false, timer: false, next: false },
  a11y: { contrast: false, largeTargets: false, reduceMotion: false, focusRing: false },
  setup: { done: false, step: 0, installDocker: true, firewall: true },
  tabs: { order: [], closed: [], seen: [], pinned: [], active: 'overview' },
  logRegex: false,
  bannerDismissed: '',
};
function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || '{}');
    return {
      ...DEFAULTS,
      ...raw,
      adhd: { ...DEFAULTS.adhd, ...(raw.adhd || {}) },
      a11y: { ...DEFAULTS.a11y, ...(raw.a11y || {}) },
      setup: { ...DEFAULTS.setup, ...(raw.setup || {}) },
      tabs: { ...DEFAULTS.tabs, ...(raw.tabs || {}) },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}
const prefs = loadPrefs();
const userSet = new Set<string>(JSON.parse(localStorage.getItem(`${STORE}.set`) || '[]'));
function save(key?: string): void {
  if (key) userSet.add(key);
  try {
    localStorage.setItem(STORE, JSON.stringify(prefs));
    localStorage.setItem(`${STORE}.set`, JSON.stringify([...userSet]));
  } catch {
    /* Storage can be full or blocked; the window keeps working with in-memory values. */
  }
}

// ---- Language and funny levels -------------------------------------------------------------
// Each entry is [English serious, English playful, Cantonese serious, Cantonese playful]. The
// playful wording is used from funny level 3 upward. Facts never change between the two.
type Entry = [string, string, string, string];
const S: Record<string, Entry> = {
  'palette.open': ['Search everything', 'Find anything', '搜尋全部', '乜都搵得到'],
  'window.minimize': ['Minimize', 'Minimize', '縮細', '縮細'],
  'window.maximize': ['Maximize', 'Maximize', '放大', '放大'],
  'window.close': ['Close', 'Close', '關閉', '關閉'],
  'tab.overview': ['Overview', 'Overview', '總覽', '總覽'],
  'tab.setup': ['Setup', 'Setup', '設定精靈', '設定精靈'],
  'tab.logs': ['Logs', 'Logs', '記錄', '記錄'],
  'tab.settings': ['Host settings', 'Host settings', '主機設定', '主機設定'],
  'tab.preferences': ['Preferences', 'Preferences', '偏好', '偏好'],
  'tab.appearance': ['Appearance', 'Appearance', '外觀', '外觀'],
  'tab.changelog': ['Changelog', 'Changelog', '更新紀錄', '更新紀錄'],
  'group.host': ['Host', 'Host', '主機', '主機'],
  'group.app': ['App', 'App', '程式', '程式'],
  'strip.openEvery': ['Open every tab', 'Open every tab', '打開全部分頁', '打開全部分頁'],
  'strip.filter': ['Filter tabs', 'Filter tabs', '篩選分頁', '篩選分頁'],
  'strip.closeMatching': ['Close tabs containing text', 'Close tabs containing text', '關閉包含文字嘅分頁', '關閉包含文字嘅分頁'],
  'strip.closeOthers': ['Close tabs not containing text', 'Close tabs not containing text', '關閉唔包含文字嘅分頁', '關閉唔包含文字嘅分頁'],
  'strip.preview': ['These tabs will close ({n}). Pinned tabs stay.', 'Waving goodbye to {n} tabs. Pinned ones stay put.', '會關閉 {n} 個分頁，釘住嘅唔郁。', '同 {n} 個分頁講拜拜，釘住嘅照留。'],
  'strip.nothing': ['No unpinned tab matches.', 'Nobody matches. The tabs are safe.', '冇未釘住嘅分頁符合。', '冇分頁中招，安全晒。'],
  'strip.confirmClose': ['Close them', 'Close them', '關閉', '關閉'],
  'strip.cancel': ['Cancel', 'Never mind', '取消', '算吧'],
  'tab.close': ['Close {name} tab', 'Close {name} tab', '關閉 {name} 分頁', '關閉 {name} 分頁'],
  'tab.pin': ['Pin', 'Pin', '釘住', '釘住'],
  'tab.unpin': ['Unpin', 'Unpin', '取消釘住', '取消釘住'],
  'ov.title': ['Your GitLab host', 'Your very own GitLab clubhouse', '你嘅 GitLab 主機', '你自己嘅 GitLab 會所'],
  'ov.lead': [
    'One click starts Material GitLab in Docker on this PC and makes it reachable from your network.',
    'One click and GitLab is up in Docker, open to every device on your network.',
    '撳一下就喺呢部電腦用 Docker 開 Material GitLab，同一網絡嘅裝置都入得到。',
    '撳一下，GitLab 就喺 Docker 開工，全屋裝置都入得到。',
  ],
  'ov.start': ['Start GitLab', 'Start GitLab', '開啟 GitLab', '開工'],
  'ov.stop': ['Stop GitLab', 'Stop GitLab', '停止 GitLab', '收工'],
  'ov.open': ['Open GitLab', 'Open GitLab', '打開 GitLab', '入去睇睇'],
  'ov.check': ['Check health', 'Check health', '檢查狀態', '睇下佢精唔精神'],
  'ov.cancel': ['Cancel', 'Cancel', '取消', '唔做住'],
  'ov.docker': ['Docker', 'Docker', 'Docker', 'Docker'],
  'ov.container': ['Container', 'Container', '容器', '容器'],
  'ov.address': ['Address', 'Address', '網址', '網址'],
  'ov.unknown': ['Not checked yet', 'Not checked yet', '未檢查', '未檢查'],
  'ov.noAddress': ['Appears once GitLab is running', 'Shows up once GitLab wakes up', 'GitLab 開咗之後會顯示', 'GitLab 起身之後就見到'],
  'ov.openDisabled': ['Open is available once health reports an address.', 'Open unlocks once there is an address to open.', '檢查到網址之後先可以打開。', '有網址先打得開。'],
  'ov.busy': ['Running: {action}', 'Busy with: {action}', '執行緊：{action}', '忙緊：{action}'],
  'ov.windowsOnly': ['Hosting runs on Windows. This window is showing a preview on {platform}.', 'Hosting needs Windows; on {platform} this is look but do not touch.', '只可以喺 Windows 主機運行，而家喺 {platform} 只係預覽。', '要 Windows 先開到工，{platform} 淨係睇得。'],
  'ov.firstStart': ['First start can take 5 to 15 minutes while the image downloads and GitLab configures itself.', 'First start takes 5 to 15 minutes: download, unpack, configure, then coffee.', '第一次開啟要 5 至 15 分鐘下載同設定。', '第一次要等 5 至 15 分鐘，沖杯奶茶先。'],
  'ov.next': ['What is next: {step}', 'Next up: {step}', '下一步：{step}', '跟住：{step}'],
  'next.setup': ['finish the setup wizard', 'finish the setup wizard', '完成設定精靈', '完成設定精靈'],
  'next.start': ['start GitLab', 'press Start', '開啟 GitLab', '撳開工'],
  'next.open': ['open GitLab and sign in', 'open GitLab and sign in', '打開 GitLab 登入', '入去登入'],
  'consent.title': ['Before the first start', 'Quick check before we start', '第一次開啟之前', '開工前問兩句'],
  'consent.docker': [
    'If Docker Desktop is missing, install it with winget. Windows shows its own administrator prompt; you approve it there.',
    'If Docker Desktop is missing, fetch it with winget. Windows asks for admin approval itself; you click yes there.',
    '如果冇 Docker Desktop，就用 winget 安裝。Windows 會自己問管理員批准，你喺嗰度確認。',
    '冇 Docker Desktop 就用 winget 裝，Windows 會自己彈出問管理員，你自己撳。',
  ],
  'consent.firewall': [
    'Allow the HTTP and SSH ports through Windows Firewall so other devices on the network can connect.',
    'Open the two ports in Windows Firewall so phones and laptops on the network can visit.',
    '喺 Windows 防火牆開放 HTTP 同 SSH 埠，等網絡上其他裝置連得到。',
    '喺防火牆開兩個埠，等手機同電腦都入得嚟。',
  ],
  'consent.note': [
    'Unticked steps are skipped and logged. Nothing here deletes data or volumes.',
    'Untick to skip; the log says what was skipped. Nothing deletes data or volumes.',
    '冇剔嘅步驟會跳過並記錄。呢度唔會刪除任何資料或者 volume。',
    '唔剔就跳過，記錄會寫低。唔會刪任何資料。',
  ],
  'setup.title': ['Set up your host', 'Set up your host', '設定你嘅主機', '設定你嘅主機'],
  'setup.step': ['Step {n} of {total}', 'Step {n} of {total}', '第 {n} 步，共 {total} 步', '第 {n} 步，共 {total} 步'],
  'setup.s1': ['What happens', 'What happens', '會做咩', '會做咩'],
  'setup.s1.body': [
    'This app runs the Material GitLab container with Docker Desktop. Your settings and data live in {dir} and in Docker volumes, so updates and restarts keep them.',
    'This app runs Material GitLab in Docker Desktop. Settings live in {dir}, data lives in Docker volumes, and both survive updates.',
    '呢個程式用 Docker Desktop 運行 Material GitLab 容器。設定放喺 {dir}，資料放喺 Docker volume，更新同重開都會保留。',
    '程式用 Docker Desktop 跑 Material GitLab。設定喺 {dir}，資料喺 Docker volume，更新都唔會唔見。',
  ],
  'setup.s2': ['Permissions', 'Permissions', '權限', '權限'],
  'setup.s3': ['Start', 'Start', '開啟', '開工'],
  'setup.s3.body': ['Start GitLab now. You can follow progress here and in Logs.', 'Start GitLab now and watch it boot here or in Logs.', '而家開啟 GitLab，可以喺呢度或者記錄睇進度。', '而家開工，喺度或者記錄睇住佢起身。'],
  'setup.s4': ['Done', 'Done', '完成', '搞掂'],
  'setup.s4.body': ['GitLab is set up. Open it and sign in as root; the first password is in your GitLab data folder, never shown here.', 'All set. Open GitLab and sign in as root; the first password stays in your GitLab data folder, never in this window.', '設定完成。打開 GitLab 用 root 登入；第一次密碼喺 GitLab 資料夾，呢度唔會顯示。', '搞掂！打開 GitLab 用 root 登入，第一次密碼喺資料夾，呢度唔會出。'],
  'setup.back': ['Back', 'Back', '上一步', '上一步'],
  'setup.next': ['Next', 'Next', '下一步', '下一步'],
  'setup.skip': ['Skip for now', 'Skip for now', '暫時跳過', '遲啲先'],
  'setup.finish': ['Open the workspace', 'Open the workspace', '打開工作區', '入去開工'],
  'setup.resume': ['Your place is saved; you can leave and come back.', 'Your place is saved; wander off and come back any time.', '進度已儲存，走開再返嚟都得。', '進度記住咗，行開陣都得。'],
  'setup.needsRun': ['Start needs to finish successfully before Next.', 'Start has to finish first.', '要成功開啟先可以下一步。', '要開到工先可以下一步。'],
  'logs.title': ['Logs', 'Logs', '記錄', '記錄'],
  'logs.search': ['Search the log', 'Search the log', '搜尋記錄', '搜尋記錄'],
  'logs.regex': ['Regex', 'Regex', '正則', '正則'],
  'logs.builder': ['Regex builder', 'Regex builder', '正則工具', '正則工具'],
  'logs.fetch': ['Fetch container log', 'Fetch container log', '攞容器記錄', '攞容器記錄'],
  'logs.export': ['Export log', 'Export log', '匯出記錄', '匯出記錄'],
  'logs.clear': ['Clear view', 'Clear view', '清除畫面', '清除畫面'],
  'logs.empty': ['Nothing logged yet. Start GitLab or fetch the container log.', 'Quiet so far. Start GitLab or fetch the container log.', '未有記錄。開啟 GitLab 或者攞容器記錄。', '靜英英。開工或者攞容器記錄。'],
  'logs.matches': ['{n} matching lines', '{n} matching lines', '{n} 行符合', '{n} 行符合'],
  'logs.badRegex': ['That pattern is not valid: {why}', 'The pattern tripped over itself: {why}', '呢個 pattern 唔啱：{why}', 'pattern 跌親：{why}'],
  'logs.exportNote': ['Exports UTF-8 plain text with the lines currently shown.', 'Exports UTF-8 plain text of what you see.', '匯出而家顯示嘅行，UTF-8 純文字。', '匯出你見到嘅嘢，UTF-8 純文字。'],
  'rx.title': ['Build a pattern', 'Build a pattern', '砌 pattern', '砌 pattern'],
  'rx.test': ['Test text', 'Test text', '測試文字', '測試文字'],
  'rx.use': ['Use this pattern', 'Use this pattern', '用呢個', '用呢個'],
  'rx.flags': ['Ignore case', 'Ignore case', '唔理大細階', '唔理大細階'],
  'set.title': ['Host settings', 'Host settings', '主機設定', '主機設定'],
  'set.lead': ['These go into the .env file next to the compose file. Restart GitLab after saving.', 'Saved to .env beside the compose file. Restart GitLab to apply.', '會寫入 compose 旁邊嘅 .env，儲存後要重開 GitLab。', '寫入 .env，儲存之後重開 GitLab 先生效。'],
  'set.noEnv': ['The .env file is created by the first start with this PC\'s network address. Start GitLab once, then edit it here.', 'The first start writes .env with this PC\'s network address. Start once, then tweak here.', '第一次開啟會用呢部電腦嘅網絡地址建立 .env，開咗一次再嚟改。', '第一次開工會整好 .env，之後先嚟改。'],
  'set.hostname': ['Hostname or address', 'Hostname or address', '主機名或者地址', '主機名或者地址'],
  'set.hostname.info': ['The name or IP other devices type to reach GitLab. It becomes GitLab\'s external URL.', 'What phones and laptops type to reach GitLab; GitLab uses it in every link.', '其他裝置用嚟連 GitLab 嘅名或者 IP，會成為 GitLab 嘅外部網址。', '其他裝置打嚟入 GitLab 嘅名，所有連結都用佢。'],
  'set.httpPort': ['HTTP port', 'HTTP port', 'HTTP 埠', 'HTTP 埠'],
  'set.httpPort.info': ['The port on this PC that serves the GitLab web page, 1024 to 65535.', 'Where the web page lives on this PC, 1024 to 65535.', '呢部電腦提供 GitLab 網頁嘅埠，1024 至 65535。', '網頁住喺邊個埠，1024 至 65535。'],
  'set.sshPort': ['SSH port', 'SSH port', 'SSH 埠', 'SSH 埠'],
  'set.sshPort.info': ['The port for git over SSH, 1024 to 65535, different from the HTTP port.', 'Port for git over SSH; must differ from HTTP.', 'git over SSH 用嘅埠，要同 HTTP 唔同。', 'SSH 用嘅埠，唔可以同 HTTP 撞。'],
  'set.memory': ['Memory limit (GB)', 'Memory limit (GB)', '記憶體上限 (GB)', '記憶體上限 (GB)'],
  'set.memory.info': ['The most memory the container may use, 4 to 256 GB. GitLab needs at least 4.', 'Memory ceiling for the container, 4 to 256 GB. GitLab wants at least 4.', '容器最多用幾多記憶體，4 至 256 GB，GitLab 最少要 4。', '容器食幾多記憶體，最少 4 GB。'],
  'set.cpus': ['CPU limit (cores)', 'CPU limit (cores)', 'CPU 上限 (核心)', 'CPU 上限 (核心)'],
  'set.cpus.info': ['The most CPU cores the container may use, 1 to 64.', 'How many cores GitLab may borrow, 1 to 64.', '容器最多用幾多核心，1 至 64。', 'GitLab 可以借幾多核心，1 至 64。'],
  'set.save': ['Save settings', 'Save settings', '儲存設定', '儲存設定'],
  'set.saved': ['Saved. Stop and start GitLab to apply.', 'Saved. Stop and start GitLab to apply.', '已儲存，停咗再開 GitLab 先生效。', '儲存咗，停咗再開就生效。'],
  'set.invalid': ['Check the highlighted fields.', 'A few fields need another look.', '請檢查標示咗嘅欄位。', '有幾格要再睇下。'],
  'set.fromFile': ['Value from your .env file', 'Value from your .env file', '數值來自你嘅 .env', '數值來自你嘅 .env'],
  'set.openFolder': ['Open host folder', 'Open host folder', '打開主機資料夾', '打開主機資料夾'],
  'err.hostname': ['Use letters, digits, dots and hyphens, starting and ending with a letter or digit.', 'Letters, digits, dots and hyphens only, no edge punctuation.', '只可以用字母、數字、點同連字號，頭尾要係字母或數字。', '只准字母、數字、點同連字號。'],
  'err.port': ['Use a whole number from 1024 to 65535.', 'Pick a whole number from 1024 to 65535.', '請用 1024 至 65535 嘅整數。', '揀 1024 至 65535 嘅整數。'],
  'err.samePorts': ['HTTP and SSH need different ports.', 'HTTP and SSH cannot share a port.', 'HTTP 同 SSH 要用唔同嘅埠。', 'HTTP 同 SSH 唔可以共用埠。'],
  'err.memory': ['Use a whole number from 4 to 256.', 'Pick a whole number from 4 to 256.', '請用 4 至 256 嘅整數。', '揀 4 至 256 嘅整數。'],
  'err.cpus': ['Use a whole number from 1 to 64.', 'Pick a whole number from 1 to 64.', '請用 1 至 64 嘅整數。', '揀 1 至 64 嘅整數。'],
  'pref.title': ['Preferences', 'Preferences', '偏好', '偏好'],
  'pref.search': ['Search settings', 'Search settings', '搜尋設定', '搜尋設定'],
  'pref.lang': ['Language', 'Language', '語言', '語言'],
  'pref.lang.info': ['Shows the window in English, Hong Kong Cantonese, or both side by side.', 'English, Hong Kong Cantonese, or both at once.', '用英文、廣東話，或者兩樣一齊顯示。', '英文、廣東話或者兩樣齊。'],
  'pref.funnyEn': ['English funny level', 'English funny level', '英文搞笑程度', '英文搞笑程度'],
  'pref.funnyYue': ['Cantonese funny level', 'Cantonese funny level', '廣東話搞笑程度', '廣東話搞笑程度'],
  'pref.funny.info': ['1 is fully serious, 5 is most playful. Playful wording starts at 3. It changes the voice of every message, including errors and warnings, never the facts.', '1 is all business, 5 is full play. From 3 up, messages (errors and warnings too) get playful wording; facts never change.', '1 係完全認真，5 係最搞笑，3 或以上用搞笑字眼，包括錯誤同警告，事實唔會變。', '1 好正經，5 最搞笑，3 起就變搞笑，事實唔變。'],
  'pref.name': ['Window name', 'Window name', '視窗名稱', '視窗名稱'],
  'pref.name.info': ['Changes only the name shown in this window. The installed app, its data folder and update feed keep their real name.', 'Renames the title only; the installed app, data folder and updates keep the real name.', '只改視窗顯示嘅名，安裝、資料夾同更新都用返真名。', '淨係改標題，真身唔變。'],
  'pref.adhd': ['Focus helpers', 'Focus helpers', '專注小幫手', '專注小幫手'],
  'pref.adhd.focus': ['Focus view: dim everything except the current tab', 'Focus view: dim everything except the current tab', '專注模式：淡化目前分頁以外嘅嘢', '專注模式：淡化目前分頁以外嘅嘢'],
  'pref.adhd.lowStim': ['Lower stimulation: calmer colours, no motion', 'Lower stimulation: calmer colours, no motion', '低刺激：柔和顏色，冇動畫', '低刺激：柔和顏色，冇動畫'],
  'pref.adhd.timer': ['Show elapsed time', 'Show elapsed time', '顯示經過時間', '顯示經過時間'],
  'pref.adhd.next': ['Show one "what is next" prompt', 'Show one "what is next" prompt', '顯示「下一步」提示', '顯示「下一步」提示'],
  'pref.adhd.info': ['Each helper is separate and off by default. Turn on only the ones you like.', 'All separate, all off by default. Pick and mix.', '每個都獨立，預設關閉，鍾意邊個開邊個。', '逐個揀，預設全關。'],
  'pref.a11y': ['Accessibility', 'Accessibility', '無障礙', '無障礙'],
  'pref.a11y.contrast': ['High contrast', 'High contrast', '高對比', '高對比'],
  'pref.a11y.large': ['Larger click targets', 'Larger click targets', '較大點擊範圍', '較大點擊範圍'],
  'pref.a11y.motion': ['Reduce motion', 'Reduce motion', '減少動畫', '減少動畫'],
  'pref.a11y.ring': ['Always show focus ring', 'Always show focus ring', '永遠顯示焦點框', '永遠顯示焦點框'],
  'pref.a11y.info': ['These apply to the whole window immediately and are remembered.', 'They apply to the whole window right away and stick.', '即時套用到成個視窗，會記住。', '即刻生效，會記住。'],
  'pref.export': ['Export preferences', 'Export preferences', '匯出偏好', '匯出偏好'],
  'pref.import': ['Import preferences', 'Import preferences', '匯入偏好', '匯入偏好'],
  'pref.exportNote': ['Exports JSON (UTF-8) with every preference. Host settings stay in .env and are not included.', 'JSON (UTF-8) of every preference; .env host settings are not included.', '匯出所有偏好嘅 JSON (UTF-8)，.env 主機設定唔包括。', '匯出偏好 JSON，.env 唔包。'],
  'pref.default': ['Using the shipped default', 'Using the shipped default', '用緊預設值', '用緊預設值'],
  'pref.user': ['Set by you', 'Set by you', '你設定嘅', '你設定嘅'],
  'pref.none': ['No setting matches.', 'No setting matches.', '冇設定符合。', '冇設定符合。'],
  'ap.title': ['Appearance', 'Appearance', '外觀', '外觀'],
  'ap.theme': ['Theme', 'Theme', '主題', '主題'],
  'ap.theme.info': ['Light, dark, or follow Windows.', 'Light, dark, or whatever Windows says.', '淺色、深色或者跟 Windows。', '淺、深或者跟 Windows。'],
  'ap.system': ['System', 'System', '跟系統', '跟系統'],
  'ap.light': ['Light', 'Light', '淺色', '淺色'],
  'ap.dark': ['Dark', 'Dark', '深色', '深色'],
  'ap.density': ['Density', 'Density', '密度', '密度'],
  'ap.density.info': ['Compact tightens spacing so more fits on screen.', 'Compact squeezes more onto the screen.', '緊湊會收窄間距，顯示更多。', '緊湊啲，塞多啲。'],
  'ap.comfortable': ['Comfortable', 'Comfortable', '舒適', '舒適'],
  'ap.compact': ['Compact', 'Compact', '緊湊', '緊湊'],
  'ap.seed': ['Accent colour', 'Accent colour', '主色', '主色'],
  'ap.seed.info': ['Pick any colour; buttons, highlights and the tab strip follow it. The values below translate it between formats.', 'Pick any colour and the window follows. Below, the same colour in every format.', '揀任何顏色，按鈕同分頁會跟住變，下面有唔同格式。', '揀隻色，全個視窗跟住變。'],
  'ap.font': ['Text size', 'Text size', '字體大小', '字體大小'],
  'ap.font.info': ['Scales all text from 85% to 140%. The preview shows it live.', 'Scales text from 85% to 140%, with a live preview.', '由 85% 至 140% 縮放所有文字，即時預覽。', '85% 至 140%，即睇即知。'],
  'ap.preview': ['The quick brown fox pushes to main. 敏捷嘅狐狸推送咗。', 'The quick brown fox pushes to main. 敏捷嘅狐狸推送咗。', 'The quick brown fox pushes to main. 敏捷嘅狐狸推送咗。', 'The quick brown fox pushes to main. 敏捷嘅狐狸推送咗。'],
  'ap.reset': ['Reset appearance', 'Reset appearance', '重設外觀', '重設外觀'],
  'ap.undo': ['Undo', 'Undo', '復原', '復原'],
  'ap.preset': ['Export preset', 'Export preset', '匯出預設', '匯出預設'],
  'ch.title': ['Changelog', 'Changelog', '更新紀錄', '更新紀錄'],
  'ch.search': ['Search the changelog', 'Search the changelog', '搜尋更新紀錄', '搜尋更新紀錄'],
  'ch.from': ['From date', 'From date', '由日期', '由日期'],
  'ch.commit': ['View commit', 'View commit', '睇 commit', '睇 commit'],
  'ch.none': ['No entry matches.', 'No entry matches.', '冇紀錄符合。', '冇紀錄符合。'],
  'up.ready': [
    'Version {v} is ready. The package is unsigned; its SHA-1 matched the release index. Restart to update.',
    'Version {v} is downloaded and checked. Unsigned package, SHA-1 matched. Restart when you are ready.',
    '{v} 版已經準備好。安裝包冇簽署，SHA-1 同發佈索引吻合。重開就會更新。',
    '{v} 版下載好晒，冇簽署但 SHA-1 對得上，得閒重開就得。',
  ],
  'up.restart': ['Restart to update', 'Restart to update', '重開更新', '重開更新'],
  'up.later': ['Later', 'Later', '遲啲', '遲啲'],
  'up.check': ['Check for updates', 'Check for updates', '檢查更新', '檢查更新'],
  'up.current': ['You have the newest version.', 'Already the newest version.', '已經係最新版本。', '已經最新。'],
  'up.unavailable': ['Could not check for updates right now ({why}). The app keeps working.', 'Update check did not get through ({why}). Everything else still works.', '暫時檢查唔到更新（{why}），程式照用得。', '檢查唔到更新（{why}），照用冇問題。'],
  'run.ok': ['{action} finished.', '{action} finished. Nice.', '{action} 完成。', '{action} 搞掂。'],
  'run.fail': ['{action} failed with exit code {code}. See Logs for the exact step.', '{action} hit a snag (exit {code}). Logs shows exactly where.', '{action} 失敗，退出碼 {code}，詳情睇記錄。', '{action} 撞板（退出碼 {code}），記錄有晒。'],
  'run.busy': ['Another action is still running. Wait for it or cancel it.', 'Something is already running. Let it finish or cancel it.', '仲有其他動作執行緊，等佢完或者取消。', '仲做緊嘢，等陣或者取消。'],
  'run.platform': ['Hosting needs Windows.', 'Hosting needs Windows.', '要 Windows 先可以運行。', '要 Windows 先得。'],
  'run.cancelled': ['Cancelled. Docker keeps what it already finished; nothing was deleted.', 'Cancelled. Docker keeps what it already did; nothing deleted.', '已取消。Docker 保留已完成嘅部分，冇刪除任何嘢。', '取消咗，冇刪嘢。'],
  'act.start': ['Start', 'Start', '開啟', '開工'],
  'act.stop': ['Stop', 'Stop', '停止', '收工'],
  'act.health': ['Health check', 'Health check', '狀態檢查', '健康檢查'],
  'act.status': ['Status', 'Status', '狀況', '狀況'],
  'act.logs': ['Container log', 'Container log', '容器記錄', '容器記錄'],
  'dim.title': ['Dim sum break', 'Surprise dim sum!', '點心時間', '驚喜點心！'],
  'dim.close': ['Dismiss dim sum', 'Dismiss dim sum', '收起點心', '收起點心'],
  'dim.noImage': ['Photo unavailable offline', 'Photo stayed at the tea house', '離線睇唔到相', '相留咗喺茶樓'],
  'toast.close': ['Dismiss', 'Dismiss', '關閉', '關閉'],
  'pal.placeholder': ['Type a command, tab or setting', 'Type a command, tab or setting', '輸入指令、分頁或者設定', '輸入指令、分頁或者設定'],
  'pal.none': ['Nothing matches.', 'Nothing matches.', '冇嘢符合。', '冇嘢符合。'],
  'pal.label': ['Command palette', 'Command palette', '指令面板', '指令面板'],
  'info': ['About this setting', 'About this setting', '關於呢個設定', '關於呢個設定'],
};

function pick(entry: Entry, which: 'en' | 'yue'): string {
  if (which === 'en') return prefs.funnyEn >= 3 ? entry[1] : entry[0];
  return prefs.funnyYue >= 3 ? entry[3] : entry[2];
}
function t(key: string, vars: Record<string, string | number> = {}): string {
  const entry = S[key];
  if (!entry) return key;
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? ''));
  if (prefs.lang === 'en') return fill(pick(entry, 'en'));
  if (prefs.lang === 'yue') return fill(pick(entry, 'yue'));
  const en = fill(pick(entry, 'en'));
  const yue = fill(pick(entry, 'yue'));
  return en === yue ? en : `${en} · ${yue}`;
}

// ---- Tiny DOM helpers ----------------------------------------------------------------------
type Child = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value as EventListener);
    else if (key === 'class') el.className = String(value);
    else if (key === 'value') (el as HTMLInputElement).value = String(value);
    else if (key === 'checked') (el as HTMLInputElement).checked = Boolean(value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

// ---- Toasts --------------------------------------------------------------------------------
function toast(message: string, kind: 'info' | 'ok' | 'error' = 'info'): void {
  const box = $('#toasts');
  const item = h(
    'div',
    { class: `toast toast--${kind}` },
    h('span', {}, message),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('toast.close'), onclick: () => item.remove() }, '×'),
  );
  box.append(item);
  setTimeout(() => item.remove(), kind === 'error' ? 12000 : 6000);
}

// ---- State ---------------------------------------------------------------------------------
const state = {
  info: null as AppInfo | null,
  health: null as Health | null,
  running: null as Action | null,
  log: [] as string[],
  logFilter: '',
  settings: null as { exists: boolean; value?: HostSettings } | null,
  settingsErrors: [] as string[],
  setupRan: false,
  startedAt: Date.now(),
  update: { state: 'idle' } as UpdateState,
  maximized: false,
  appearanceUndo: [] as Array<Pick<Prefs, 'theme' | 'density' | 'seed' | 'fontScale'>>,
};

// ---- Tabs ----------------------------------------------------------------------------------
type TabDef = { id: string; group: 'host' | 'app'; icon: string; render: () => HTMLElement };
const TABS: TabDef[] = [
  { id: 'overview', group: 'host', icon: 'M3 12l9-8 9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', render: renderOverview },
  { id: 'setup', group: 'host', icon: 'M12 2l2.4 6.9H22l-6 4.6 2.3 7-6.3-4.5-6.3 4.5 2.3-7-6-4.6h7.6z', render: renderSetup },
  { id: 'logs', group: 'host', icon: 'M4 5h16M4 10h16M4 15h10M4 20h7', render: renderLogs },
  { id: 'settings', group: 'host', icon: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4', render: renderHostSettings },
  { id: 'preferences', group: 'app', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 13a4 4 0 0 0 8 0', render: renderPreferences },
  { id: 'appearance', group: 'app', icon: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 4 0 5-1 2-3 2-4a9 9 0 0 0-9-8z', render: renderAppearance },
  { id: 'changelog', group: 'app', icon: 'M6 3h9l4 4v14H6zM9 12h7M9 16h7M9 8h4', render: renderChangelog },
];
const ALL_IDS = TABS.map((tab) => tab.id);

function reconcileTabs(): void {
  const tabs = prefs.tabs;
  // Fresh install: everything open in page order. Update: only never-seen tabs open.
  const known = new Set(tabs.seen);
  tabs.order = [...tabs.order.filter((id) => ALL_IDS.includes(id)), ...ALL_IDS.filter((id) => !tabs.order.includes(id))];
  tabs.closed = tabs.closed.filter((id) => ALL_IDS.includes(id) && known.has(id));
  tabs.seen = [...ALL_IDS];
  tabs.pinned = tabs.pinned.filter((id) => ALL_IDS.includes(id));
  if (!openTabs().includes(tabs.active)) tabs.active = openTabs()[0] || 'overview';
  save();
}
function openTabs(): string[] {
  return prefs.tabs.order.filter((id) => !prefs.tabs.closed.includes(id));
}
function tabLabel(id: string): string {
  return t(`tab.${id}`);
}
function activate(id: string, focusSelector?: string): void {
  if (prefs.tabs.closed.includes(id)) prefs.tabs.closed = prefs.tabs.closed.filter((x) => x !== id);
  prefs.tabs.active = id;
  save();
  render();
  if (focusSelector) {
    const el = document.querySelector<HTMLElement>(focusSelector);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: prefs.a11y.reduceMotion ? 'auto' : 'smooth' });
      el.focus();
      el.classList.add('teleported');
      setTimeout(() => el.classList.remove('teleported'), 1600);
    }
  } else {
    $('#main').focus();
  }
}
function closeTab(id: string): void {
  if (!prefs.tabs.closed.includes(id)) prefs.tabs.closed.push(id);
  const open = openTabs();
  if (prefs.tabs.active === id) prefs.tabs.active = open[0] || '';
  save();
  render();
}
function moveTab(id: string, delta: number): void {
  const order = prefs.tabs.order;
  const i = order.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  save();
  render();
  document.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.focus();
}

let stripFilter = '';
let bulk: { mode: 'containing' | 'notContaining'; text: string } | null = null;

function renderStrip(): void {
  const strip = $('#strip');
  strip.replaceChildren();
  const filterInput = h('input', {
    type: 'search',
    class: 'strip__filter',
    placeholder: t('strip.filter'),
    'aria-label': t('strip.filter'),
    value: stripFilter,
    oninput: (e: Event) => {
      stripFilter = (e.target as HTMLInputElement).value;
      renderStripList();
    },
  });
  const list = h('div', { class: 'strip__list', role: 'tablist', 'aria-orientation': 'vertical', id: 'strip-list' });
  const tools = h(
    'div',
    { class: 'strip__tools' },
    h('button', { type: 'button', class: 'text-btn', id: 'open-every', onclick: () => { prefs.tabs.closed = []; save(); render(); } }, t('strip.openEvery')),
    h('button', { type: 'button', class: 'text-btn', onclick: () => { bulk = { mode: 'containing', text: stripFilter }; renderStrip(); } }, t('strip.closeMatching')),
    h('button', { type: 'button', class: 'text-btn', onclick: () => { bulk = { mode: 'notContaining', text: stripFilter }; renderStrip(); } }, t('strip.closeOthers')),
  );
  strip.append(filterInput, list);
  const dim = renderDimSum();
  if (dim) strip.append(dim);
  strip.append(tools);
  if (bulk) strip.append(renderBulkPreview());
  renderStripList();
}

function bulkTargets(): string[] {
  if (!bulk) return [];
  const needle = bulk.text.trim().toLowerCase();
  return openTabs().filter((id) => {
    if (prefs.tabs.pinned.includes(id)) return false;
    const has = needle !== '' && tabLabel(id).toLowerCase().includes(needle);
    return bulk!.mode === 'containing' ? has : !has;
  });
}

function renderBulkPreview(): HTMLElement {
  const box = h('div', { class: 'bulk', role: 'group', 'aria-label': t(bulk!.mode === 'containing' ? 'strip.closeMatching' : 'strip.closeOthers') });
  const input = h('input', {
    type: 'text',
    value: bulk!.text,
    'aria-label': t('strip.filter'),
    oninput: (e: Event) => {
      bulk!.text = (e.target as HTMLInputElement).value;
      const next = renderBulkPreview();
      box.replaceWith(next);
      (next.querySelector('input') as HTMLInputElement).focus();
      const field = next.querySelector('input') as HTMLInputElement;
      field.setSelectionRange(field.value.length, field.value.length);
    },
  });
  const targets = bulkTargets();
  box.append(
    input,
    h('p', { class: 'muted' }, targets.length ? t('strip.preview', { n: targets.length }) : t('strip.nothing')),
    h('ul', {}, ...targets.map((id) => h('li', {}, tabLabel(id)))),
    h(
      'div',
      { class: 'row' },
      h('button', { type: 'button', class: 'text-btn', onclick: () => { bulk = null; renderStrip(); } }, t('strip.cancel')),
      h('button', {
        type: 'button',
        class: 'tonal-btn',
        disabled: targets.length === 0,
        onclick: () => {
          targets.forEach((id) => { if (!prefs.tabs.closed.includes(id)) prefs.tabs.closed.push(id); });
          if (!openTabs().includes(prefs.tabs.active)) prefs.tabs.active = openTabs()[0] || '';
          bulk = null;
          save();
          render();
        },
      }, t('strip.confirmClose')),
    ),
  );
  return box;
}

function renderStripList(): void {
  const list = $('#strip-list');
  list.replaceChildren();
  const needle = stripFilter.trim().toLowerCase();
  const pinned = prefs.tabs.order.filter((id) => prefs.tabs.pinned.includes(id));
  const rest = prefs.tabs.order.filter((id) => !prefs.tabs.pinned.includes(id));
  const sections: Array<[string, string[]]> = [
    ['pinned', pinned],
    ['host', rest.filter((id) => TABS.find((x) => x.id === id)!.group === 'host')],
    ['app', rest.filter((id) => TABS.find((x) => x.id === id)!.group === 'app')],
  ];
  for (const [group, ids] of sections) {
    const visible = ids.filter((id) => !prefs.tabs.closed.includes(id) && (!needle || tabLabel(id).toLowerCase().includes(needle)));
    if (!visible.length) continue;
    if (group !== 'pinned') list.append(h('div', { class: `strip__group strip__group--${group}`, role: 'presentation' }, t(`group.${group}`)));
    for (const id of visible) {
      const def = TABS.find((x) => x.id === id)!;
      const active = prefs.tabs.active === id;
      const isPinned = prefs.tabs.pinned.includes(id);
      const tab = h(
        'div',
        { class: `tab${active ? ' tab--active' : ''}${isPinned ? ' tab--pinned' : ''}` },
        h(
          'button',
          {
            type: 'button',
            role: 'tab',
            class: 'tab__main',
            'data-tab': id,
            'aria-selected': active ? 'true' : 'false',
            'aria-controls': 'main',
            tabindex: active ? '0' : '-1',
            onclick: () => activate(id),
            onkeydown: (e: KeyboardEvent) => onTabKey(e, id),
            oncontextmenu: (e: MouseEvent) => {
              e.preventDefault();
              togglePin(id);
            },
          },
          h('span', { class: 'tab__icon-wrap', 'aria-hidden': 'true' }),
          h('span', { class: 'tab__label' }, tabLabel(id)),
        ),
        h('button', {
          type: 'button',
          class: 'tab__pin icon-btn',
          'aria-label': `${isPinned ? t('tab.unpin') : t('tab.pin')}: ${tabLabel(id)}`,
          'aria-pressed': isPinned ? 'true' : 'false',
          'aria-keyshortcuts': 'Control+P',
          onclick: () => togglePin(id),
        }),
        isPinned
          ? null
          : h('button', {
              type: 'button',
              class: 'tab__close icon-btn',
              'aria-label': t('tab.close', { name: tabLabel(id) }),
              'aria-keyshortcuts': 'Delete',
              onclick: () => closeTab(id),
            }, '×'),
      );
      (tab.querySelector('.tab__pin') as HTMLElement).innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3h6l-1 6 4 4H6l4-4zM12 13v8"/></svg>';
      (tab.querySelector('.tab__icon-wrap') as HTMLElement).innerHTML =
        `<svg class="tab__icon" viewBox="0 0 24 24"><path d="${def.icon}" /></svg>`;
      list.append(tab);
    }
  }
}

function togglePin(id: string): void {
  const pins = prefs.tabs.pinned;
  prefs.tabs.pinned = pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id];
  save();
  renderStrip();
  document.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.focus();
}

function onTabKey(e: KeyboardEvent, id: string): void {
  const ids = [...document.querySelectorAll<HTMLElement>('[data-tab]')].map((el) => el.dataset.tab as string);
  const i = ids.indexOf(id);
  if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    moveTab(id, e.key === 'ArrowUp' ? -1 : 1);
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const next = ids[(i + (e.key === 'ArrowDown' ? 1 : ids.length - 1)) % ids.length];
    document.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
  } else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault();
    document.querySelector<HTMLElement>(`[data-tab="${ids[e.key === 'Home' ? 0 : ids.length - 1]}"]`)?.focus();
  } else if (e.key === 'Delete' && !prefs.tabs.pinned.includes(id)) {
    e.preventDefault();
    closeTab(id);
    document.querySelector<HTMLElement>('[data-tab]')?.focus();
  } else if (e.key.toLowerCase() === 'p' && e.ctrlKey) {
    e.preventDefault();
    togglePin(id);
  }
}

// ---- Shared bits ---------------------------------------------------------------------------
function infoButton(key: string, id: string): HTMLElement[] {
  const panelId = `${id}-info`;
  const panel = h('p', { class: 'info', id: panelId, hidden: true }, t(key));
  const button = h('button', {
    type: 'button',
    class: 'info-btn icon-btn',
    'aria-label': t('info'),
    'aria-expanded': 'false',
    'aria-controls': panelId,
    onclick: () => {
      panel.hidden = !panel.hidden;
      button.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    },
  }, 'i');
  return [button, panel];
}
function originNote(key: string): HTMLElement {
  return h('span', { class: 'origin' }, userSet.has(key) ? t('pref.user') : t('pref.default'));
}
function segmented(name: string, value: string, options: Array<[string, string]>, onPick: (v: string) => void, id: string): HTMLElement {
  return h(
    'div',
    { class: 'seg', role: 'radiogroup', 'aria-label': name, id },
    ...options.map(([v, label]) =>
      h('button', {
        type: 'button',
        role: 'radio',
        'aria-checked': v === value ? 'true' : 'false',
        class: v === value ? 'seg__item seg__item--on' : 'seg__item',
        onclick: () => onPick(v),
      }, label),
    ),
  );
}
function switchRow(label: string, checked: boolean, onChange: (v: boolean) => void, id: string): HTMLElement {
  return h(
    'label',
    { class: 'switch-row', for: id },
    h('span', {}, label),
    h('input', {
      type: 'checkbox',
      role: 'switch',
      id,
      class: 'switch',
      checked,
      onchange: (e: Event) => onChange((e.target as HTMLInputElement).checked),
    }),
  );
}
function actionLabel(action: Action): string {
  return t(`act.${action}`);
}

// ---- Running actions -----------------------------------------------------------------------
async function run(action: Action, consent = false): Promise<RunResult> {
  if (state.running) {
    toast(t('run.busy'), 'error');
    return { ok: false, error: 'busy' };
  }
  state.running = action;
  state.log.push(`\n> ${actionLabel(action)} (${new Date().toLocaleTimeString()})\n`);
  render();
  const result = await host.run(action, consent);
  state.running = null;
  if (result.error === 'platform') toast(t('run.platform'), 'error');
  else if (result.error === 'busy') toast(t('run.busy'), 'error');
  else if (result.ok) toast(t('run.ok', { action: actionLabel(action) }), 'ok');
  else toast(t('run.fail', { action: actionLabel(action), code: result.code ?? '?' }), 'error');
  if (result.health) state.health = result.health;
  if (action === 'start' && result.ok) {
    state.setupRan = true;
    await refreshInfo();
    await run('health');
    return result;
  }
  render();
  return result;
}

async function refreshInfo(): Promise<void> {
  state.info = await host.info();
  state.settings = await host.readSettings();
}

host.onOutput((payload) => {
  const { text } = payload as { text: string };
  state.log.push(text);
  if (state.log.length > 5000) state.log.splice(0, state.log.length - 5000);
  const live = document.querySelector('#live-line');
  if (live) live.textContent = lastLine();
  if (prefs.tabs.active === 'logs') renderLogLines();
});
host.onUpdate((payload) => {
  state.update = payload as UpdateState;
  renderBanner();
});
host.onMaximized((payload) => {
  state.maximized = Boolean(payload);
  const btn = document.querySelector('[data-wc="maximize"]');
  btn?.setAttribute('aria-label', state.maximized ? 'Restore' : t('window.maximize'));
});

function lastLine(): string {
  const lines = state.log.join('').split(/\r?\n/).filter((l) => l.trim());
  return lines[lines.length - 1] || '';
}
function steps(): string[] {
  return state.log
    .join('')
    .split(/\r?\n/)
    .filter((l) => l.startsWith('== '))
    .map((l) => l.slice(3));
}

// ---- Overview ------------------------------------------------------------------------------
function nextStep(): string {
  if (!prefs.setup.done) return t('next.setup');
  if (!state.health || state.health.container.indexOf('running') !== 0) return t('next.start');
  return t('next.open');
}

function renderOverview(): HTMLElement {
  const health = state.health;
  const isWin = state.info?.platform === 'win32';
  const busy = state.running;
  const address = health?.address || null;
  const stat = (key: string, value: string, tone: string) =>
    h('div', { class: `stat stat--${tone}` }, h('span', { class: 'stat__label' }, t(key)), h('span', { class: 'stat__value' }, value));
  const dockerTone = health?.docker === 'running' ? 'ok' : health?.docker === 'not running' ? 'bad' : 'idle';
  const containerTone = health?.container.startsWith('running') ? 'ok' : health ? 'warn' : 'idle';
  return h(
    'section',
    { class: 'page', 'aria-labelledby': 'ov-title' },
    h('h1', { id: 'ov-title' }, t('ov.title')),
    h('p', { class: 'lead' }, t('ov.lead')),
    !isWin && state.info ? h('p', { class: 'note' }, t('ov.windowsOnly', { platform: state.info.platform })) : null,
    prefs.adhd.next ? h('p', { class: 'next-chip', id: 'whats-next' }, t('ov.next', { step: nextStep() })) : null,
    h(
      'div',
      { class: 'stats' },
      stat('ov.docker', health ? health.docker : t('ov.unknown'), dockerTone),
      stat('ov.container', health ? health.container : t('ov.unknown'), containerTone),
      stat('ov.address', address || t('ov.noAddress'), address ? 'ok' : 'idle'),
    ),
    !prefs.setup.done ? renderConsent() : null,
    h(
      'div',
      { class: 'actions' },
      h('button', {
        type: 'button',
        class: 'filled-btn big',
        id: 'start-btn',
        disabled: Boolean(busy),
        'aria-describedby': 'first-start-note',
        onclick: () => run('start', prefs.setup.installDocker || prefs.setup.firewall),
      }, t('ov.start')),
      h('button', { type: 'button', class: 'tonal-btn', id: 'stop-btn', disabled: Boolean(busy), onclick: () => run('stop') }, t('ov.stop')),
      h('button', {
        type: 'button',
        class: 'tonal-btn',
        id: 'open-btn',
        disabled: !address,
        'aria-describedby': address ? undefined : 'open-why',
        onclick: () => address && host.openExternal(address),
      }, t('ov.open')),
      h('button', { type: 'button', class: 'text-btn', id: 'health-btn', disabled: Boolean(busy), onclick: () => run('health') }, t('ov.check')),
    ),
    !address ? h('p', { class: 'muted small', id: 'open-why' }, t('ov.openDisabled')) : null,
    h('p', { class: 'muted small', id: 'first-start-note' }, t('ov.firstStart')),
    busy ? renderProgress(busy) : null,
  );
}

function renderConsent(): HTMLElement {
  return h(
    'fieldset',
    { class: 'consent', id: 'consent' },
    h('legend', {}, t('consent.title')),
    switchRow(t('consent.docker'), prefs.setup.installDocker, (v) => { prefs.setup.installDocker = v; save('setup.installDocker'); }, 'consent-docker'),
    switchRow(t('consent.firewall'), prefs.setup.firewall, (v) => { prefs.setup.firewall = v; save('setup.firewall'); }, 'consent-firewall'),
    h('p', { class: 'muted small' }, t('consent.note')),
  );
}

function renderProgress(action: Action): HTMLElement {
  const done = steps();
  return h(
    'div',
    { class: 'progress', role: 'group', 'aria-label': t('ov.busy', { action: actionLabel(action) }) },
    h('div', { class: 'progress__head' },
      h('span', { class: 'spinner', 'aria-hidden': 'true' }),
      h('strong', {}, t('ov.busy', { action: actionLabel(action) })),
      h('button', { type: 'button', class: 'text-btn', onclick: async () => { if (await host.cancel()) toast(t('run.cancelled')); } }, t('ov.cancel')),
    ),
    done.length ? h('ol', { class: 'steps' }, ...done.map((s, i) => h('li', { class: i === done.length - 1 ? 'steps__now' : '' }, s))) : null,
    h('code', { class: 'live', id: 'live-line' }, lastLine()),
  );
}

// ---- Setup wizard --------------------------------------------------------------------------
function renderSetup(): HTMLElement {
  const total = 4;
  const step = Math.min(Math.max(prefs.setup.step, 0), total - 1);
  const go = (n: number) => { prefs.setup.step = n; save(); render(); $('#setup-title').focus(); };
  const titles = ['setup.s1', 'setup.s2', 'setup.s3', 'setup.s4'];
  let body: HTMLElement;
  if (step === 0) body = h('p', {}, t('setup.s1.body', { dir: state.info?.workDir || '%LOCALAPPDATA%\\MaterialGitLabHost' }));
  else if (step === 1) body = renderConsent();
  else if (step === 2) body = h('div', {},
    h('p', {}, t('setup.s3.body')),
    h('button', { type: 'button', class: 'filled-btn', disabled: Boolean(state.running), onclick: () => run('start', prefs.setup.installDocker || prefs.setup.firewall) }, t('ov.start')),
    state.running ? renderProgress(state.running) : null,
    !state.setupRan ? h('p', { class: 'muted small', id: 'needs-run' }, t('setup.needsRun')) : null,
  );
  else body = h('p', {}, t('setup.s4.body'));
  const canNext = step !== 2 || state.setupRan;
  return h(
    'section',
    { class: 'page wizard', 'aria-labelledby': 'setup-title' },
    h('p', { class: 'muted' }, t('setup.step', { n: step + 1, total })),
    h('ol', { class: 'wizard__dots', 'aria-hidden': 'true' }, ...titles.map((_k, i) => h('li', { class: i < step ? 'done' : i === step ? 'now' : '' }))),
    h('h1', { id: 'setup-title', tabindex: '-1' }, t(titles[step])),
    body,
    h('p', { class: 'muted small' }, t('setup.resume')),
    h(
      'div',
      { class: 'actions' },
      h('button', { type: 'button', class: 'text-btn', disabled: step === 0, onclick: () => go(step - 1) }, t('setup.back')),
      step === 2 ? h('button', { type: 'button', class: 'text-btn', onclick: () => go(3) }, t('setup.skip')) : null,
      step < total - 1
        ? h('button', { type: 'button', class: 'filled-btn', disabled: !canNext, 'aria-describedby': canNext ? undefined : 'needs-run', onclick: () => go(step + 1) }, t('setup.next'))
        : h('button', { type: 'button', class: 'filled-btn', onclick: () => { prefs.setup.done = true; save(); activate('overview'); } }, t('setup.finish')),
    ),
  );
}

// ---- Logs and regex builder ----------------------------------------------------------------
let builderOpen = false;
function compileFilter(): { test: (line: string) => boolean; error?: string } {
  const q = state.logFilter;
  if (!q) return { test: () => true };
  if (!prefs.logRegex) {
    const needle = q.toLowerCase();
    return { test: (l) => l.toLowerCase().includes(needle) };
  }
  try {
    const rx = new RegExp(q, 'i');
    return { test: (l) => rx.test(l) };
  } catch (e) {
    return { test: () => true, error: (e as Error).message };
  }
}
function visibleLines(): string[] {
  const filter = compileFilter();
  return state.log.join('').split(/\r?\n/).filter((l) => l.length && filter.test(l));
}
function renderLogLines(): void {
  const box = document.querySelector('#log-lines');
  if (!box) return;
  const lines = visibleLines();
  const filter = compileFilter();
  box.textContent = lines.join('\n') || t('logs.empty');
  const count = document.querySelector('#log-count');
  if (count) count.textContent = filter.error ? t('logs.badRegex', { why: filter.error }) : state.logFilter ? t('logs.matches', { n: lines.length }) : '';
  box.scrollTop = box.scrollHeight;
}
function renderLogs(): HTMLElement {
  const page = h(
    'section',
    { class: 'page page--wide', 'aria-labelledby': 'logs-title' },
    h('h1', { id: 'logs-title' }, t('logs.title')),
    h(
      'div',
      { class: 'searchbar' },
      h('input', {
        type: 'search',
        id: 'log-search',
        placeholder: t('logs.search'),
        'aria-label': t('logs.search'),
        value: state.logFilter,
        oninput: (e: Event) => { state.logFilter = (e.target as HTMLInputElement).value; renderLogLines(); },
      }),
      h('button', {
        type: 'button',
        class: prefs.logRegex ? 'chip chip--on' : 'chip',
        id: 'log-regex',
        'aria-pressed': prefs.logRegex ? 'true' : 'false',
        onclick: () => { prefs.logRegex = !prefs.logRegex; save('logRegex'); render(); },
      }, '.* ', t('logs.regex')),
      h('button', { type: 'button', class: 'chip', id: 'log-builder', 'aria-expanded': builderOpen ? 'true' : 'false', onclick: () => { builderOpen = !builderOpen; render(); } }, t('logs.builder')),
    ),
    h('p', { class: 'muted small', id: 'log-count', 'aria-live': 'polite' }),
    builderOpen ? renderRegexBuilder() : null,
    h(
      'div',
      { class: 'actions' },
      h('button', { type: 'button', class: 'tonal-btn', id: 'log-fetch', disabled: Boolean(state.running), onclick: () => run('logs') }, t('logs.fetch')),
      h('button', { type: 'button', class: 'text-btn', id: 'log-export', 'aria-describedby': 'export-note', onclick: () => host.exportLog(visibleLines().join('\r\n')) }, t('logs.export')),
      h('button', { type: 'button', class: 'text-btn', onclick: () => { state.log = []; renderLogLines(); } }, t('logs.clear')),
    ),
    h('p', { class: 'muted small', id: 'export-note' }, t('logs.exportNote')),
    h('pre', { class: 'log', id: 'log-lines', tabindex: '0', 'aria-label': t('logs.title') }),
  );
  queueMicrotask(renderLogLines);
  return page;
}

const RX_PIECES: Array<[string, string, string]> = [
  ['^', 'start of line', '行頭'],
  ['$', 'end of line', '行尾'],
  ['\\d+', 'one or more digits', '一個或以上數字'],
  ['\\w+', 'a word', '一個字'],
  ['\\s+', 'spaces', '空格'],
  ['.*', 'anything', '任何嘢'],
  ['(error|fail)', 'error or fail', 'error 或者 fail'],
  ['[A-Z]{2,}', 'two or more capitals', '兩個或以上大階'],
];
function explainRegex(pattern: string): string[] {
  const out: string[] = [];
  for (const [piece, en, yue] of RX_PIECES) {
    if (pattern.includes(piece)) out.push(`${piece}  ${prefs.lang === 'yue' ? yue : prefs.lang === 'both' ? `${en} · ${yue}` : en}`);
  }
  return out;
}
function renderRegexBuilder(): HTMLElement {
  let pattern = prefs.logRegex ? state.logFilter : '';
  let sample = lastLine() || 'Step Docker: found, engine 27.3.1';
  let ignoreCase = true;
  const box = h('div', { class: 'rx', role: 'group', 'aria-label': t('rx.title') });
  const draw = () => {
    let result: string;
    try {
      const rx = new RegExp(pattern, ignoreCase ? 'i' : '');
      const m = sample.match(rx);
      result = m ? `✓ ${m[0]}` : '✗';
    } catch (e) {
      result = t('logs.badRegex', { why: (e as Error).message });
    }
    const patternInput = h('input', { type: 'text', id: 'rx-pattern', value: pattern, 'aria-label': t('rx.title'), oninput: (e: Event) => { pattern = (e.target as HTMLInputElement).value; drawKeep('#rx-pattern'); } });
    box.replaceChildren(
      h('h2', {}, t('rx.title')),
      h('div', { class: 'rx__pieces' }, ...RX_PIECES.map(([piece, en, yue]) =>
        h('button', { type: 'button', class: 'chip', title: prefs.lang === 'yue' ? yue : en, onclick: () => { pattern += piece; drawKeep('#rx-pattern'); } }, piece))),
      patternInput,
      h('label', { class: 'switch-row', for: 'rx-case' }, h('span', {}, t('rx.flags')), h('input', { type: 'checkbox', role: 'switch', class: 'switch', id: 'rx-case', checked: ignoreCase, onchange: (e: Event) => { ignoreCase = (e.target as HTMLInputElement).checked; drawKeep(); } })),
      h('label', { for: 'rx-sample' }, t('rx.test')),
      h('input', { type: 'text', id: 'rx-sample', value: sample, oninput: (e: Event) => { sample = (e.target as HTMLInputElement).value; drawKeep('#rx-sample'); } }),
      h('p', { class: 'rx__result', 'aria-live': 'polite' }, result),
      h('ul', { class: 'rx__explain' }, ...explainRegex(pattern).map((line) => h('li', {}, h('code', {}, line)))),
      h('button', { type: 'button', class: 'tonal-btn', onclick: () => { prefs.logRegex = true; state.logFilter = pattern; builderOpen = false; save('logRegex'); render(); } }, t('rx.use')),
    );
  };
  const drawKeep = (sel?: string) => {
    draw();
    if (sel) {
      const el = box.querySelector<HTMLInputElement>(sel);
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  };
  draw();
  return box;
}

// ---- Host settings (.env) ------------------------------------------------------------------
function renderHostSettings(): HTMLElement {
  const s = state.settings;
  const page = h('section', { class: 'page', 'aria-labelledby': 'set-title' },
    h('h1', { id: 'set-title' }, t('set.title')),
    h('p', { class: 'lead' }, t('set.lead')),
  );
  if (!s || !s.exists || !s.value) {
    page.append(h('p', { class: 'note', id: 'no-env' }, t('set.noEnv')), h('button', { type: 'button', class: 'filled-btn', onclick: () => activate('overview', '#start-btn') }, t('ov.start')));
    return page;
  }
  const v = { ...s.value };
  const fields: Array<[keyof HostSettings, string, string, string, Record<string, unknown>]> = [
    ['hostname', 'set.hostname', 'set.hostname.info', 'err.hostname', { type: 'text', autocomplete: 'off', spellcheck: 'false' }],
    ['httpPort', 'set.httpPort', 'set.httpPort.info', 'err.port', { type: 'number', min: 1024, max: 65535 }],
    ['sshPort', 'set.sshPort', 'set.sshPort.info', 'err.port', { type: 'number', min: 1024, max: 65535 }],
    ['memoryGb', 'set.memory', 'set.memory.info', 'err.memory', { type: 'number', min: 4, max: 256 }],
    ['cpus', 'set.cpus', 'set.cpus.info', 'err.cpus', { type: 'number', min: 1, max: 64 }],
  ];
  const form = h('form', {
    class: 'form',
    novalidate: true,
    onsubmit: async (e: Event) => {
      e.preventDefault();
      const result = await host.writeSettings(v);
      state.settingsErrors = result.errors || [];
      if (result.ok) {
        toast(t('set.saved'), 'ok');
        state.settings = await host.readSettings();
      } else toast(t('set.invalid'), 'error');
      render();
    },
  });
  for (const [key, label, info, err, attrs] of fields) {
    const id = `env-${key}`;
    const invalid = state.settingsErrors.includes(key) || (state.settingsErrors.includes('samePorts') && (key === 'httpPort' || key === 'sshPort'));
    const errText = state.settingsErrors.includes(key) ? t(err) : t('err.samePorts');
    form.append(
      h('div', { class: `field${invalid ? ' field--bad' : ''}`, 'data-search': `${t(label)} ${t(info)}` },
        h('div', { class: 'field__head' }, h('label', { for: id }, t(label)), ...infoButton(info, id)),
        h('input', {
          id,
          ...attrs,
          value: v[key],
          'aria-invalid': invalid ? 'true' : 'false',
          'aria-describedby': invalid ? `${id}-err` : `${id}-origin`,
          oninput: (e: Event) => {
            const raw = (e.target as HTMLInputElement).value;
            (v as Record<string, unknown>)[key] = key === 'hostname' ? raw.trim() : Number(raw);
          },
        }),
        invalid ? h('p', { class: 'field__err', id: `${id}-err` }, errText) : h('span', { class: 'origin', id: `${id}-origin` }, t('set.fromFile')),
      ),
    );
  }
  form.append(h('div', { class: 'actions' },
    h('button', { type: 'submit', class: 'filled-btn', id: 'env-save' }, t('set.save')),
    h('button', { type: 'button', class: 'text-btn', onclick: () => host.openWorkDir() }, t('set.openFolder')),
  ));
  page.append(form);
  return page;
}

// ---- Preferences ---------------------------------------------------------------------------
let prefSearch = '';
function renderPreferences(): HTMLElement {
  const block = (search: string, ...children: Child[]) => h('div', { class: 'pref', 'data-search': search.toLowerCase() }, ...children);
  const funny = (key: 'funnyEn' | 'funnyYue', labelKey: string) =>
    block(`${t(labelKey)} ${t('pref.funny.info')}`,
      h('div', { class: 'field__head' }, h('label', { for: `pref-${key}` }, `${t(labelKey)}: ${prefs[key]}`), ...infoButton('pref.funny.info', `pref-${key}`)),
      h('input', { type: 'range', id: `pref-${key}`, min: 1, max: 5, step: 1, value: prefs[key], 'aria-valuetext': String(prefs[key]), oninput: (e: Event) => { prefs[key] = Number((e.target as HTMLInputElement).value); save(key); render(); document.getElementById(`pref-${key}`)?.focus(); } }),
      originNote(key));
  const blocks = [
    block(`${t('pref.lang')} ${t('pref.lang.info')}`,
      h('div', { class: 'field__head' }, h('span', { id: 'pref-lang-label' }, t('pref.lang')), ...infoButton('pref.lang.info', 'pref-lang')),
      segmented(t('pref.lang'), prefs.lang, [['en', 'English'], ['yue', '廣東話'], ['both', 'English · 廣東話']], (v) => { prefs.lang = v as Prefs['lang']; save('lang'); render(); }, 'pref-lang'),
      originNote('lang')),
    funny('funnyEn', 'pref.funnyEn'),
    funny('funnyYue', 'pref.funnyYue'),
    block(`${t('pref.name')} ${t('pref.name.info')}`,
      h('div', { class: 'field__head' }, h('label', { for: 'pref-name' }, t('pref.name')), ...infoButton('pref.name.info', 'pref-name')),
      h('input', { type: 'text', id: 'pref-name', maxlength: 60, value: prefs.displayName, placeholder: 'Material GitLab Host', onchange: (e: Event) => { prefs.displayName = (e.target as HTMLInputElement).value.trim(); save('displayName'); render(); } }),
      originNote('displayName')),
    block(`${t('pref.adhd')} ${t('pref.adhd.focus')} ${t('pref.adhd.lowStim')} ${t('pref.adhd.timer')} ${t('pref.adhd.next')}`,
      h('div', { class: 'field__head' }, h('h2', {}, t('pref.adhd')), ...infoButton('pref.adhd.info', 'pref-adhd')),
      ...(['focus', 'lowStim', 'timer', 'next'] as const).map((k) =>
        switchRow(t(`pref.adhd.${k}`), prefs.adhd[k], (v) => { prefs.adhd[k] = v; save(`adhd.${k}`); applyDocument(); render(); }, `adhd-${k}`)),
      originNote('adhd.focus')),
    block(`${t('pref.a11y')} ${t('pref.a11y.contrast')} ${t('pref.a11y.large')} ${t('pref.a11y.motion')} ${t('pref.a11y.ring')}`,
      h('div', { class: 'field__head' }, h('h2', {}, t('pref.a11y')), ...infoButton('pref.a11y.info', 'pref-a11y')),
      switchRow(t('pref.a11y.contrast'), prefs.a11y.contrast, (v) => { prefs.a11y.contrast = v; save('a11y.contrast'); applyDocument(); }, 'a11y-contrast'),
      switchRow(t('pref.a11y.large'), prefs.a11y.largeTargets, (v) => { prefs.a11y.largeTargets = v; save('a11y.largeTargets'); applyDocument(); }, 'a11y-large'),
      switchRow(t('pref.a11y.motion'), prefs.a11y.reduceMotion, (v) => { prefs.a11y.reduceMotion = v; save('a11y.reduceMotion'); applyDocument(); }, 'a11y-motion'),
      switchRow(t('pref.a11y.ring'), prefs.a11y.focusRing, (v) => { prefs.a11y.focusRing = v; save('a11y.focusRing'); applyDocument(); }, 'a11y-ring')),
    block(`${t('pref.export')} ${t('pref.import')} export import json`,
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'tonal-btn', id: 'pref-export', 'aria-describedby': 'pref-export-note', onclick: () => download('material-gitlab-host-preferences.json', JSON.stringify(prefs, null, 2)) }, t('pref.export')),
        h('label', { class: 'text-btn file-btn' }, t('pref.import'), h('input', { type: 'file', accept: 'application/json', class: 'visually-hidden', onchange: importPrefs })),
        h('button', { type: 'button', class: 'text-btn', 'aria-describedby': 'up-status', onclick: async () => { const s = await host.checkUpdate(); state.update = s; renderBanner(); if (s.state === 'current') toast(t('up.current'), 'ok'); else if (s.state === 'unavailable') toast(t('up.unavailable', { why: s.detail || '?' })); } }, t('up.check')),
      ),
      h('p', { class: 'muted small', id: 'pref-export-note' }, t('pref.exportNote')),
      h('p', { class: 'muted small', id: 'up-status' }, `v${state.info?.version || '?'}`)),
  ];
  const needle = prefSearch.trim().toLowerCase();
  const shown = blocks.filter((b) => !needle || (b.dataset.search || '').includes(needle));
  return h('section', { class: 'page', 'aria-labelledby': 'pref-title' },
    h('h1', { id: 'pref-title' }, t('pref.title')),
    h('input', { type: 'search', id: 'pref-search', placeholder: t('pref.search'), 'aria-label': t('pref.search'), value: prefSearch, oninput: (e: Event) => { prefSearch = (e.target as HTMLInputElement).value; render(); const el = $('#pref-search') as HTMLInputElement; el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }),
    ...(shown.length ? shown : [h('p', { class: 'muted' }, t('pref.none'))]),
  );
}
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const a = h('a', { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importPrefs(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    localStorage.setItem(STORE, JSON.stringify({ ...prefs, ...parsed }));
    Object.assign(prefs, loadPrefs());
    save();
    applyDocument();
    render();
    toast(t('set.saved'), 'ok');
  } catch (err) {
    toast(t('logs.badRegex', { why: (err as Error).message }), 'error');
  }
}

// ---- Appearance ----------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue *= 60;
  return [Math.round(hue), Math.round(s * 100), Math.round(l * 100)];
}
function snapshotAppearance(): void {
  state.appearanceUndo.push({ theme: prefs.theme, density: prefs.density, seed: prefs.seed, fontScale: prefs.fontScale });
  if (state.appearanceUndo.length > 30) state.appearanceUndo.shift();
}
function renderAppearance(): HTMLElement {
  const rgb = hexToRgb(prefs.seed);
  const hsl = rgbToHsl(rgb);
  const set = (fn: () => void, key: string) => { snapshotAppearance(); fn(); save(key); applyDocument(); render(); };
  return h('section', { class: 'page', 'aria-labelledby': 'ap-title' },
    h('h1', { id: 'ap-title' }, t('ap.title')),
    h('div', { class: 'pref' },
      h('div', { class: 'field__head' }, h('span', {}, t('ap.theme')), ...infoButton('ap.theme.info', 'ap-theme')),
      segmented(t('ap.theme'), prefs.theme, [['system', t('ap.system')], ['light', t('ap.light')], ['dark', t('ap.dark')]], (v) => set(() => { prefs.theme = v as Prefs['theme']; }, 'theme'), 'ap-theme'),
      originNote('theme')),
    h('div', { class: 'pref' },
      h('div', { class: 'field__head' }, h('span', {}, t('ap.density')), ...infoButton('ap.density.info', 'ap-density')),
      segmented(t('ap.density'), prefs.density, [['comfortable', t('ap.comfortable')], ['compact', t('ap.compact')]], (v) => set(() => { prefs.density = v as Prefs['density']; }, 'density'), 'ap-density'),
      originNote('density')),
    h('div', { class: 'pref' },
      h('div', { class: 'field__head' }, h('label', { for: 'ap-seed' }, t('ap.seed')), ...infoButton('ap.seed.info', 'ap-seed')),
      h('div', { class: 'row' },
        h('input', { type: 'color', id: 'ap-seed', value: prefs.seed, onchange: (e: Event) => set(() => { prefs.seed = (e.target as HTMLInputElement).value; }, 'seed') }),
        h('dl', { class: 'color-formats' },
          h('dt', {}, 'HEX'), h('dd', {}, h('input', { type: 'text', 'aria-label': 'HEX', value: prefs.seed.toUpperCase(), pattern: '#[0-9A-Fa-f]{6}', onchange: (e: Event) => { const v = (e.target as HTMLInputElement).value.trim(); if (/^#[0-9a-f]{6}$/i.test(v)) set(() => { prefs.seed = v.toLowerCase(); }, 'seed'); } })),
          h('dt', {}, 'RGB'), h('dd', {}, h('code', {}, `rgb(${rgb.join(', ')})`)),
          h('dt', {}, 'HSL'), h('dd', {}, h('code', {}, `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`)),
        )),
      originNote('seed')),
    h('div', { class: 'pref' },
      h('div', { class: 'field__head' }, h('label', { for: 'ap-font' }, `${t('ap.font')}: ${prefs.fontScale}%`), ...infoButton('ap.font.info', 'ap-font')),
      h('input', { type: 'range', id: 'ap-font', min: 85, max: 140, step: 5, value: prefs.fontScale, onchange: (e: Event) => set(() => { prefs.fontScale = Number((e.target as HTMLInputElement).value); }, 'fontScale') }),
      h('p', { class: 'preview' }, t('ap.preview')),
      originNote('fontScale')),
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'text-btn', disabled: state.appearanceUndo.length === 0, onclick: () => { const last = state.appearanceUndo.pop(); if (last) { Object.assign(prefs, last); save(); applyDocument(); render(); } } }, t('ap.undo')),
      h('button', { type: 'button', class: 'text-btn', onclick: () => set(() => { prefs.theme = DEFAULTS.theme; prefs.density = DEFAULTS.density; prefs.seed = DEFAULTS.seed; prefs.fontScale = DEFAULTS.fontScale; ['theme', 'density', 'seed', 'fontScale'].forEach((k) => userSet.delete(k)); }, '') }, t('ap.reset')),
      h('button', { type: 'button', class: 'tonal-btn', onclick: () => download('material-gitlab-host-appearance.json', JSON.stringify({ theme: prefs.theme, density: prefs.density, seed: prefs.seed, fontScale: prefs.fontScale }, null, 2)) }, t('ap.preset')),
    ),
  );
}

// ---- Changelog -----------------------------------------------------------------------------
const CHANGELOG: Array<{ version: string; date: string; commit: string; en: string; yue: string }> = [
  {
    version: '0.2.0',
    date: '2026-11-12',
    commit: 'main',
    en: 'One-click host: starts Material GitLab in Docker, health and status, host settings, live logs with regex search, setup wizard, unsigned Squirrel updates.',
    yue: '一鍵主機：用 Docker 開 Material GitLab、狀態檢查、主機設定、即時記錄同正則搜尋、設定精靈、冇簽署 Squirrel 更新。',
  },
  {
    version: '0.1.0',
    date: '2026-10-01',
    commit: 'main',
    en: 'Preview shell that only described a deployment plan.',
    yue: '淨係講部署計劃嘅預覽版。',
  },
];
let changelogSearch = '';
let changelogFrom = '';
function renderChangelog(): HTMLElement {
  const needle = changelogSearch.trim().toLowerCase();
  const rows = CHANGELOG.filter((e) => (!changelogFrom || e.date >= changelogFrom) && (!needle || `${e.version} ${e.en} ${e.yue}`.toLowerCase().includes(needle)));
  return h('section', { class: 'page', 'aria-labelledby': 'ch-title' },
    h('h1', { id: 'ch-title' }, t('ch.title')),
    h('div', { class: 'searchbar' },
      h('input', { type: 'search', id: 'ch-search', placeholder: t('ch.search'), 'aria-label': t('ch.search'), value: changelogSearch, oninput: (e: Event) => { changelogSearch = (e.target as HTMLInputElement).value; render(); const el = $('#ch-search') as HTMLInputElement; el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }),
      h('label', { for: 'ch-from', class: 'muted small' }, t('ch.from')),
      h('input', { type: 'date', id: 'ch-from', value: changelogFrom, onchange: (e: Event) => { changelogFrom = (e.target as HTMLInputElement).value; render(); } }),
    ),
    rows.length
      ? h('ol', { class: 'changelog' }, ...rows.map((e) => h('li', {},
          h('h2', {}, `v${e.version}`, h('span', { class: 'muted small' }, ` ${e.date}`)),
          prefs.lang !== 'yue' ? h('p', {}, e.en) : null,
          prefs.lang !== 'en' ? h('p', { lang: 'yue' }, e.yue) : null,
          h('button', { type: 'button', class: 'text-btn', onclick: () => host.openExternal(`https://github.com/Ding-Ding-Projects/material-gitlab/commits/${e.commit}/tools/material-gitlab-deployer`) }, t('ch.commit')))))
      : h('p', { class: 'muted' }, t('ch.none')),
  );
}

// ---- Update banner -------------------------------------------------------------------------
function renderBanner(): void {
  const banner = $('#update-banner');
  const u = state.update;
  if (u.state !== 'ready' || prefs.bannerDismissed === u.version) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  banner.replaceChildren(
    h('span', {}, t('up.ready', { v: u.version || '' })),
    h('button', { type: 'button', class: 'filled-btn', onclick: () => host.restartToUpdate() }, t('up.restart')),
    h('button', { type: 'button', class: 'text-btn', onclick: () => { prefs.bannerDismissed = u.version || ''; save(); renderBanner(); } }, t('up.later')),
  );
}

// ---- Command palette -----------------------------------------------------------------------
type Command = { label: string; run: () => void; hint?: string };
function commands(): Command[] {
  const list: Command[] = [];
  for (const tab of TABS) list.push({ label: tabLabel(tab.id), hint: '⇥', run: () => activate(tab.id) });
  list.push(
    { label: t('ov.start'), run: () => activate('overview', '#start-btn') },
    { label: t('ov.stop'), run: () => activate('overview', '#stop-btn') },
    { label: t('ov.open'), run: () => activate('overview', '#open-btn') },
    { label: t('ov.check'), run: () => activate('overview', '#health-btn') },
    { label: t('logs.fetch'), run: () => activate('logs', '#log-fetch') },
    { label: t('logs.export'), run: () => activate('logs', '#log-export') },
    { label: t('logs.builder'), run: () => { builderOpen = true; activate('logs', '#rx-pattern'); } },
    { label: t('strip.openEvery'), run: () => { prefs.tabs.closed = []; save(); render(); } },
    { label: t('up.check'), run: () => void host.checkUpdate() },
  );
  const settingCmds: Array<[string, string, string]> = [
    ['set.hostname', 'settings', '#env-hostname'],
    ['set.httpPort', 'settings', '#env-httpPort'],
    ['set.sshPort', 'settings', '#env-sshPort'],
    ['set.memory', 'settings', '#env-memoryGb'],
    ['set.cpus', 'settings', '#env-cpus'],
    ['pref.lang', 'preferences', '#pref-lang [aria-checked="true"]'],
    ['pref.funnyEn', 'preferences', '#pref-funnyEn'],
    ['pref.funnyYue', 'preferences', '#pref-funnyYue'],
    ['pref.name', 'preferences', '#pref-name'],
    ['pref.adhd.focus', 'preferences', '#adhd-focus'],
    ['pref.adhd.lowStim', 'preferences', '#adhd-lowStim'],
    ['pref.adhd.timer', 'preferences', '#adhd-timer'],
    ['pref.adhd.next', 'preferences', '#adhd-next'],
    ['pref.a11y.contrast', 'preferences', '#a11y-contrast'],
    ['pref.a11y.large', 'preferences', '#a11y-large'],
    ['pref.a11y.motion', 'preferences', '#a11y-motion'],
    ['pref.a11y.ring', 'preferences', '#a11y-ring'],
    ['ap.theme', 'appearance', '#ap-theme [aria-checked="true"]'],
    ['ap.density', 'appearance', '#ap-density [aria-checked="true"]'],
    ['ap.seed', 'appearance', '#ap-seed'],
    ['ap.font', 'appearance', '#ap-font'],
  ];
  for (const [key, tab, sel] of settingCmds) {
    list.push({ label: `${t(key)}  ·  ${tabLabel(tab)}`, run: () => { prefSearch = ''; activate(tab, sel); } });
  }
  // Live controls in results: the language and theme can be flipped right here.
  for (const [lang, label] of [['en', 'English'], ['yue', '廣東話'], ['both', 'English · 廣東話']] as const) {
    list.push({ label: `${t('pref.lang')}: ${label}`, hint: prefs.lang === lang ? '●' : '', run: () => { prefs.lang = lang; save('lang'); render(); } });
  }
  for (const theme of ['system', 'light', 'dark'] as const) {
    list.push({ label: `${t('ap.theme')}: ${t(`ap.${theme}`)}`, hint: prefs.theme === theme ? '●' : '', run: () => { prefs.theme = theme; save('theme'); applyDocument(); render(); } });
  }
  return list;
}
let paletteReturn: HTMLElement | null = null;
function openPalette(): void {
  const box = $('#palette');
  paletteReturn = document.activeElement as HTMLElement;
  box.hidden = false;
  let query = '';
  let index = 0;
  const input = h('input', { type: 'text', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'palette-list', 'aria-autocomplete': 'list', placeholder: t('pal.placeholder'), 'aria-label': t('pal.label') });
  const list = h('ul', { role: 'listbox', id: 'palette-list', 'aria-label': t('pal.label') });
  const matches = () => commands().filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
  const draw = () => {
    const items = matches();
    index = Math.min(index, Math.max(items.length - 1, 0));
    list.replaceChildren(...(items.length ? items.map((c, i) => h('li', {
      role: 'option',
      id: `pal-${i}`,
      'aria-selected': i === index ? 'true' : 'false',
      class: i === index ? 'on' : '',
      onmousedown: (e: Event) => { e.preventDefault(); closePalette(false); c.run(); },
    }, h('span', {}, c.label), c.hint ? h('span', { class: 'muted' }, c.hint) : null)) : [h('li', { class: 'muted' }, t('pal.none'))]));
    input.setAttribute('aria-activedescendant', items.length ? `pal-${index}` : '');
    list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  };
  input.addEventListener('input', () => { query = input.value; index = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    const items = matches();
    if (e.key === 'ArrowDown') { e.preventDefault(); index = (index + 1) % Math.max(items.length, 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); index = (index - 1 + items.length) % Math.max(items.length, 1); draw(); }
    else if (e.key === 'Enter' && items[index]) { e.preventDefault(); closePalette(false); items[index].run(); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(true); }
    else if (e.key === 'Tab') e.preventDefault();
  });
  const dialog = h('div', { class: 'palette__card', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('pal.label') }, input, list);
  box.replaceChildren(h('div', { class: 'palette__scrim', onclick: () => closePalette(true) }), dialog);
  draw();
  input.focus();
}
function closePalette(restore: boolean): void {
  const box = $('#palette');
  box.hidden = true;
  box.replaceChildren();
  if (restore) paletteReturn?.focus();
}

// ---- Dim sum surprise ----------------------------------------------------------------------
type Dish = { id: string; en: string; zh: string; file: string; altEn: string; altYue: string };
async function maybeDimSum(): Promise<void> {
  if (Math.random() >= 0.1) return;
  let dishes: Dish[] = [];
  try {
    dishes = await (await fetch('dimsum.json')).json();
  } catch {
    return;
  }
  const dish = dishes[Math.floor(Math.random() * dishes.length)];
  if (!dish) return;
  dimSumDish = dish;
  renderStrip();
}

// The card sits in the tab strip's own flow, so it never covers the page or steals focus.
let dimSumDish: Dish | null = null;
function renderDimSum(): HTMLElement | null {
  const dish = dimSumDish;
  if (!dish) return null;
  const img = h('img', {
    src: `https://github.com/Ding-Ding-Projects/dim-sum-photos/releases/download/catalog-v1/${dish.file}`,
    alt: prefs.lang === 'yue' ? dish.altYue : dish.altEn,
    width: 64,
    height: 64,
    referrerpolicy: 'no-referrer',
  });
  const fallback = () => {
    if (img.isConnected && !img.complete) img.dispatchEvent(new Event('error'));
  };
  img.addEventListener('error', () => img.replaceWith(h('div', { class: 'dimsum__ph', role: 'img', 'aria-label': t('dim.noImage') }, h('span', {}, t('dim.noImage')))), { once: true });
  // An offline PC never fires error for a stalled request; give up after eight seconds.
  setTimeout(fallback, 8000);
  return h('aside', { class: 'dimsum', id: 'dimsum', 'aria-label': t('dim.title') },
    img,
    h('div', { class: 'dimsum__text' }, h('strong', {}, t('dim.title')), h('p', {}, dish.en), h('p', { lang: 'zh-HK' }, dish.zh)),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('dim.close'), onclick: () => { dimSumDish = null; renderStrip(); } }, '×'),
  );
}

// ---- Document-level settings ---------------------------------------------------------------
function applyDocument(): void {
  const root = document.documentElement;
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.density = prefs.density;
  root.dataset.focus = String(prefs.adhd.focus);
  root.dataset.lowStim = String(prefs.adhd.lowStim);
  root.dataset.contrast = String(prefs.a11y.contrast);
  root.dataset.large = String(prefs.a11y.largeTargets);
  root.dataset.motion = prefs.a11y.reduceMotion || prefs.adhd.lowStim ? 'reduce' : 'full';
  root.dataset.ring = String(prefs.a11y.focusRing);
  root.lang = prefs.lang === 'yue' ? 'zh-HK' : 'en';
  root.style.setProperty('--seed', prefs.seed);
  root.style.fontSize = `${prefs.fontScale}%`;
  const name = prefs.displayName || 'Material GitLab Host';
  $('#display-name').textContent = name;
  document.title = name;
  const timer = $('#timer');
  timer.hidden = !prefs.adhd.timer;
}

function render(): void {
  applyDocument();
  document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t as string); });
  document.querySelectorAll<HTMLElement>('[data-t-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.tLabel as string)));
  renderStrip();
  const main = $('#main');
  const def = TABS.find((tab) => tab.id === prefs.tabs.active);
  main.setAttribute('aria-labelledby', '');
  main.replaceChildren(def ? def.render() : h('section', { class: 'page' }, h('p', {}, t('strip.nothing')), h('button', { type: 'button', class: 'filled-btn', onclick: () => { prefs.tabs.closed = []; save(); render(); } }, t('strip.openEvery'))));
  renderBanner();
}

// ---- Boot ----------------------------------------------------------------------------------
document.querySelectorAll<HTMLElement>('[data-wc]').forEach((btn) =>
  btn.addEventListener('click', () => host.windowControl(btn.dataset.wc as 'minimize' | 'maximize' | 'close')),
);
$('#titlebar').addEventListener('dblclick', (e) => { if ((e.target as HTMLElement).closest('button')) return; host.windowControl('maximize'); });
$('#palette-open').addEventListener('click', openPalette);
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    if ($('#palette').hidden) openPalette();
    else closePalette(true);
  }
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDocument);
setInterval(() => {
  if (!prefs.adhd.timer) return;
  const s = Math.floor((Date.now() - state.startedAt) / 1000);
  $('#timer').textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}, 1000);

reconcileTabs();
if (!prefs.setup.done && prefs.tabs.active === 'overview' && !userSet.has('tabs.active')) prefs.tabs.active = 'setup';
render();
void (async () => {
  await refreshInfo();
  state.update = state.info?.update || state.update;
  if (state.info?.running) state.running = state.info.running;
  render();
  if (state.info?.platform === 'win32' && state.info.hasEnv) void run('health');
  setTimeout(() => void maybeDimSum(), 1200);
})();
