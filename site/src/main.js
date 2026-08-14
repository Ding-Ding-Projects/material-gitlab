/* Material GitLab site runtime.  The shell owns markup; this module owns data and behaviour. */
import { createNavigationState, setTabQuery, setTabRegex, toggleCommandPalette, bindNavigationKeyboard, filterTabs } from './navigation.js';
import { loadPreferences, updatePreferences, readVocabularyFile, cacheVocabulary, vocabularyStatus } from './preferences.js';
import { getStatusHubState, registerStatusHubProject } from './status-hub.js';
(function () {
  'use strict';

  const root = document.documentElement;
  const base = new URL('./', document.baseURI);
  const state = { docs: [], features: [], query: '', activeTab: 'overview' };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const text = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

  async function loadJson(path) {
    const response = await fetch(new URL(path, base), { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  async function loadText(path) {
    const response = await fetch(new URL(path, base), { headers: { Accept: 'text/plain' } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.text();
  }

  function markdownToHtml(markdown) {
    return text(markdown)
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^(?:- |\* )(.+)$/gm, '<li>$1</li>')
      .replace(/(?:<li>.*<\/li>\n?)+/g, (list) => `<ul>${list}</ul>`)
      .split(/\n{2,}/)
      .map((paragraph) => /^(<h[234]|<ul>)/.test(paragraph.trim()) ? paragraph : `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function renderDocs() {
    const container = $('[data-documents], #documents, .documents-list');
    if (!container || !state.docs.length) return;
    container.innerHTML = state.docs.map((doc, index) => `<article class="doc-card" data-search="${text(`${doc.title} ${doc.path}`.toLowerCase())}"><h3>${text(doc.title)}</h3><p>${text(doc.summary || doc.path)}</p><button type="button" data-doc-index="${index}">Read article</button></article>`).join('');
    container.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-doc-index]');
      if (!button) return;
      const doc = state.docs[Number(button.dataset.docIndex)];
      const panel = $('[data-document-viewer], #document-viewer') || container;
      try { panel.innerHTML = `<article class="document-view"><h2>${text(doc.title)}</h2>${markdownToHtml(await loadText(doc.path))}</article>`; }
      catch (error) { panel.innerHTML = `<p role="alert">Unable to load this article: ${text(error.message)}</p>`; }
    }, { once: true });
  }

  function renderInventory() {
    const container = $('[data-inventory], #inventory, .inventory-list');
    if (!container || !state.features.length) return;
    container.innerHTML = state.features.map((feature) => `<li data-search="${text(`${feature.id} ${feature.label} ${feature.status}`.toLowerCase())}"><span>${text(feature.label)}</span><span class="status-chip status-${text(feature.status)}">${text(feature.status)}</span></li>`).join('');
  }

  function wireSearch() {
    $$('[data-site-search], #site-search, input[type="search"]').forEach((input) => input.addEventListener('input', () => {
      state.query = input.value.trim().toLowerCase();
      $$('[data-search]').forEach((item) => { item.hidden = Boolean(state.query && !item.dataset.search.includes(state.query)); });
    }));
  }

  function wireTabs() {
    $$('[role="tab"], [data-tab-target]').forEach((tab) => tab.addEventListener('click', () => {
      const target = tab.getAttribute('aria-controls') || tab.dataset.tabTarget;
      state.activeTab = target;
      $$('[role="tab"]').forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
      $$('[role="tabpanel"], [data-tab-panel]').forEach((panel) => { panel.hidden = panel.id !== target && panel.dataset.tabPanel !== target; });
    }));
  }

  function wireNavigationFoundation() {
    let navigation = createNavigationState({ tabs: [{ id: 'overview', label: 'Overview' }, { id: 'guides', label: 'Guides' }, { id: 'reference', label: 'Reference' }, { id: 'settings', label: 'Settings' }] });
    const tabSearch = $('[data-tab-search]');
    const regexBuilder = $('[data-regex-builder]');
    const regexToggle = $('[data-regex-toggle]');
    const regexPattern = $('[data-tab-regex]');
    const regexFlags = $('[data-tab-regex-flags]');
    const regexFeedback = $('[data-regex-feedback]');
    const commandDialog = $('[data-command-dialog]');
    const commandSearch = $('[data-command-search]');
    const commandResults = $('[data-command-results]');
    const renderTabMatches = () => {
      const matches = filterTabs(navigation).map((tab) => tab.id);
      $$('[data-nav-tab]').forEach((tab) => { tab.hidden = !matches.includes(tab.dataset.navTab); });
    };
    tabSearch?.addEventListener('input', () => { navigation = setTabQuery(navigation, tabSearch.value); renderTabMatches(); });
    regexToggle?.addEventListener('click', () => { const open = regexBuilder.hidden; regexBuilder.hidden = !open; regexToggle.setAttribute('aria-expanded', String(open)); });
    const syncRegex = () => { navigation = setTabRegex(navigation, { enabled: Boolean(regexPattern.value), pattern: regexPattern.value, flags: regexFlags.value }); regexFeedback.textContent = navigation.tabRegex.error || 'Pattern ready.'; renderTabMatches(); };
    regexPattern?.addEventListener('input', syncRegex); regexFlags?.addEventListener('input', syncRegex);
    $('[data-command-palette]')?.addEventListener('click', () => { commandDialog?.showModal(); commandSearch?.focus(); });
    commandSearch?.addEventListener('input', () => { navigation = toggleCommandPalette(navigation, true); const query = commandSearch.value.toLowerCase(); const items = ['Overview', 'Guides', 'Reference', 'Settings', 'Feature inventory', 'Documentation']; commandResults.innerHTML = items.filter((item) => item.toLowerCase().includes(query)).map((item) => `<li>${text(item)}</li>`).join(''); });
    bindNavigationKeyboard(document, () => navigation, (next) => { navigation = next; commandDialog?.showModal(); commandSearch?.focus(); });
    renderTabMatches();
  }

  function wirePreferencesFoundation() {
    let preferences = loadPreferences();
    const status = $('[data-preferences-status]');
    const render = () => {
      $$('[data-preference]').forEach((control) => { const key = control.dataset.preference; control.type === 'checkbox' ? (control.checked = preferences[key]) : (control.value = preferences[key]); });
      $$('[data-level-output]').forEach((output) => { output.value = preferences[output.dataset.levelOutput]; output.textContent = preferences[output.dataset.levelOutput]; });
      status.textContent = `Language: ${preferences.language}; vocabulary: ${vocabularyStatus().state}.`;
    };
    $$('[data-preference]').forEach((control) => control.addEventListener('input', () => { const key = control.dataset.preference; preferences = updatePreferences({ [key]: control.type === 'checkbox' ? control.checked : control.value }); render(); }));
    $('[data-vocabulary-upload]')?.addEventListener('change', async (event) => { try { cacheVocabulary(await readVocabularyFile(event.target.files[0])); status.textContent = 'Personal vocabulary loaded locally.'; } catch (error) { status.textContent = error.message; } });
    $('[data-register-status]')?.addEventListener('click', () => { const state = registerStatusHubProject({ repository: 'Ding-Ding-Projects/material-gitlab', defaultBranch: 'main', releaseChannel: 'unreleased' }); $('[data-status-hub-state]').textContent = `${state.state}: local registration recorded; remote delivery is unverified.`; });
    const existing = getStatusHubState(); $('[data-status-hub-state]').textContent = `${existing.state}: ${existing.delivery.reason}`; render();
  }

  async function init() {
    try {
      const [inventory, manifest] = await Promise.all([
        loadJson('data/universal-features.json'),
        loadJson('data/docs-manifest.json').catch(() => ({ documents: [] })),
      ]);
      state.features = inventory.features || [];
      state.docs = manifest.documents || [];
    } catch (error) {
      root.dataset.dataError = 'true';
      const status = $('[data-runtime-status]');
      if (status) status.textContent = `Documentation data unavailable: ${error.message}`;
    }
    renderInventory(); renderDocs(); wireSearch(); wireTabs(); wireNavigationFoundation(); wirePreferencesFoundation();
    document.dispatchEvent(new CustomEvent('material-site-ready', { detail: { basePath: base.href, state } }));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
