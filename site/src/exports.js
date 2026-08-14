const OMITTED = 'Private vocabulary data, credentials, source paths, and file contents are omitted.';

const asRecords = (value) => Array.isArray(value) ? value : [value];
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/secret|token|password|credential|contents?|payload|path|file/i.test(key)).map(([key, item]) => [key, clean(item)]));
};

export function exportRecords(records, format = 'json') {
  const data = asRecords(clean(records));
  const normalized = String(format).toLowerCase();
  let body;
  let mime = 'text/plain;charset=utf-8';
  if (normalized === 'json') { body = JSON.stringify({ version: 1, records: data, omissions: OMITTED }, null, 2); mime = 'application/json;charset=utf-8'; }
  else if (normalized === 'jsonl' || normalized === 'ndjson') { body = data.map((row) => JSON.stringify(row)).join('\n') + `\n# ${OMITTED}`; mime = 'application/x-ndjson;charset=utf-8'; }
  else if (normalized === 'csv' || normalized === 'tsv') {
    const delimiter = normalized === 'tsv' ? '\t' : ',';
    const keys = [...new Set(data.flatMap((row) => Object.keys(row || {})))];
    const quote = (value) => { const text = String(value ?? ''); return normalized === 'tsv' ? text.replace(/[\t\r\n]/g, ' ') : `"${text.replace(/"/g, '""')}"`; };
    body = [keys.join(delimiter), ...data.map((row) => keys.map((key) => quote(row?.[key])).join(delimiter)), `# ${OMITTED}`].join('\n'); mime = 'text/' + normalized + ';charset=utf-8';
  } else if (normalized === 'markdown' || normalized === 'md') { body = `# Export\n\n${data.map((row) => `- ${JSON.stringify(row)}`).join('\n')}\n\n> ${OMITTED}`; mime = 'text/markdown;charset=utf-8'; }
  else if (normalized === 'html') { body = `<!doctype html><meta charset="utf-8"><title>Export</title><pre>${JSON.stringify(data, null, 2)}</pre><p>${OMITTED}</p>`; mime = 'text/html;charset=utf-8'; }
  else throw new Error(`Unsupported export format: ${format}`);
  return { body, mime, filename: `material-gitlab-export.${normalized === 'md' ? 'md' : normalized}` };
}

export function downloadExport(records, format = 'json', filename) {
  const result = exportRecords(records, format);
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([result.body], { type: result.mime })); link.download = filename || result.filename; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
  return result;
}

export { OMITTED };
