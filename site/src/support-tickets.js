const KEY = 'material-gitlab.support-tickets.v1';
function read() { try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
function write(value) { localStorage.setItem(KEY, JSON.stringify(value)); return value; }
export function listSupportTickets() { return read().map((ticket) => ({ ...ticket })); }
export function createSupportTicket({ category = 'lockout', description = '', severity = 'normal' } = {}) {
  const ticket = { id: `LOCAL-${Date.now().toString(36).toUpperCase()}`, category: String(category).slice(0, 64), description: String(description).slice(0, 2000), severity: String(severity).slice(0, 32), status: 'received', createdAt: new Date().toISOString(), localOnly: true };
  write([ticket, ...read()].slice(0, 200)); return { ...ticket };
}
export function advanceSupportTicket(id) { const tickets = read(); const ticket = tickets.find((item) => item.id === id); if (!ticket) return null; ticket.status = ticket.status === 'received' ? 'reviewed' : 'resolved'; write(tickets); return { ...ticket }; }
export function supportDisclosure() { return 'Nothing is sent anywhere. This ticket exists only on this device; no network request is made and nobody is reading it.'; }
export function openRecoveryFolder(onOpen = () => {}) { const detail = { action: 'open-local-application-data', disclosure: supportDisclosure() }; onOpen(detail); return detail; }
export function bindSupportTickets(root = document, { onOpenFolder = openRecoveryFolder } = {}) {
  const form = root.querySelector('[data-support-ticket-form]'); const list = root.querySelector('[data-support-ticket-list]');
  const render = () => { if (list) list.innerHTML = listSupportTickets().map((ticket) => `<li data-ticket-id="${ticket.id}"><strong>${ticket.id}</strong> · ${ticket.status} · ${ticket.category}</li>`).join(''); };
  form?.addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(form); createSupportTicket({ category: data.get('category'), severity: data.get('severity'), description: data.get('description') }); render(); form.reset(); });
  root.querySelectorAll('[data-open-recovery-folder]').forEach((button) => button.addEventListener('click', () => onOpenFolder())); render();
  return { render, createSupportTicket, listSupportTickets };
}
