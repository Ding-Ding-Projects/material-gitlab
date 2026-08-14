const DATA_URL = new URL('../data/changelog.json', import.meta.url);

export async function loadChangelog(url = DATA_URL) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Unable to load changelog (${response.status})`);
  const data = await response.json();
  return Array.isArray(data) ? data : Array.isArray(data.entries) ? data.entries : [];
}

export function filterChangelog(entries = [], { query = '', from = '', to = '' } = {}) {
  const needle = String(query).trim().toLowerCase();
  return entries.filter((entry) => {
    const date = String(entry.date || '').slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return !needle || JSON.stringify(entry).toLowerCase().includes(needle);
  });
}

export function changelogCommitUrl(entry, repository = '') {
  if (!entry?.commit || !repository) return '';
  return `https://github.com/${repository.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '')}/commit/${encodeURIComponent(entry.commit)}`;
}

export function renderChangelog(entries, container, options = {}) {
  if (!container) return;
  const repository = options.repository || '';
  container.replaceChildren(...entries.map((entry) => {
    const article = document.createElement('article');
    article.className = 'changelog-entry';
    const title = document.createElement('h3');
    title.textContent = `${entry.version || 'Unversioned'}${entry.date ? ` · ${entry.date}` : ''}`;
    article.append(title);
    if (entry.summary) { const summary = document.createElement('p'); summary.textContent = entry.summary; article.append(summary); }
    if (Array.isArray(entry.changes) && entry.changes.length) {
      const list = document.createElement('ul');
      entry.changes.forEach((change) => { const item = document.createElement('li'); item.textContent = change; list.append(item); });
      article.append(list);
    }
    const href = changelogCommitUrl(entry, repository);
    if (href) { const link = document.createElement('a'); link.href = href; link.textContent = `Commit ${entry.commit.slice(0, 7)}`; link.rel = 'noreferrer'; article.append(link); }
    return article;
  }));
}
