import json

import os
S = json.load(open(os.path.join(os.path.dirname(__file__), 'scheme.json')))

def k(name):
    out = []
    for i, ch in enumerate(name):
        out.append('-' + ch.lower() if ch.isupper() else ch)
    return ''.join(out)

def theme_vars(mode):
    d = S[mode]
    lines = [f'--{k(n)}:{v};' for n, v in d.items()]
    if mode == 'light':
        lines += ['--bg:var(--surface-container);', '--pane:var(--surface-container-lowest);', '--row:var(--surface-container-low);',
                  '--shadow-1:0 1px 2px rgb(29 26 36/.10),0 1px 3px 1px rgb(29 26 36/.06);',
                  '--shadow-3:0 4px 8px 3px rgb(29 26 36/.10),0 1px 3px rgb(29 26 36/.14);']
    else:
        lines += ['--bg:var(--surface);', '--pane:var(--surface-container-low);', '--row:var(--surface-container);',
                  '--shadow-1:0 1px 2px rgb(0 0 0/.30),0 1px 3px 1px rgb(0 0 0/.15);',
                  '--shadow-3:0 4px 8px 3px rgb(0 0 0/.15),0 1px 3px rgb(0 0 0/.30);']
    return ''.join(lines)

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap">'

CSS = """
body{margin:0}
a{color:#6e1aff}a:hover{color:#5300cc}
.th-light{%LIGHT%}
.th-dark{%DARK%}
.root{font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:20px;color:var(--on-surface);background:var(--bg);-webkit-font-smoothing:antialiased;font-feature-settings:'cv11','ss01'}
.root *{box-sizing:border-box}
.mono{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12.5px}
.ico{width:20px;height:20px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ico-s{width:16px;height:16px}
.app{display:flex;flex-wrap:wrap;align-items:stretch;min-height:960px}
.side{flex:0 0 272px;display:flex;flex-direction:column;gap:2px;padding:12px 12px 16px}
.brand{display:flex;align-items:center;gap:12px;padding:6px 8px 14px;font-weight:750;font-size:17px;letter-spacing:-.01em}
.mark{width:36px;height:36px;border-radius:12px 12px 12px 4px;background:var(--primary);color:var(--on-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px}
.ctx{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:20px;background:var(--pane);border:0;color:inherit;font:inherit;text-align:left;margin-bottom:10px;box-shadow:var(--shadow-1);width:100%;cursor:pointer}
.ctx-av{width:36px;height:36px;border-radius:10px;background:var(--tertiary-container);color:var(--on-tertiary-container);display:flex;align-items:center;justify-content:center;font-weight:750}
.ctx-t{font-weight:650;font-size:14px;line-height:18px}
.ctx-s{font-size:12px;line-height:16px;color:var(--on-surface-variant)}
.sec{margin:12px 16px 4px;font-size:11.5px;font-weight:650;letter-spacing:.04em;color:var(--on-surface-variant)}
.nav{display:flex;align-items:center;gap:12px;min-height:40px;padding:0 14px;border-radius:999px;color:var(--on-surface-variant);text-decoration:none;font-weight:500}
.nav:hover{background:var(--surface-container-highest);color:var(--on-surface)}
.nav.on{background:var(--secondary-container);color:var(--on-secondary-container);font-weight:700}
.nav .n{margin-left:auto;min-width:24px;height:20px;padding:0 7px;border-radius:999px;background:var(--surface-container-highest);font-size:11.5px;font-weight:650;display:flex;align-items:center;justify-content:center}
.nav.on .n{background:var(--primary);color:var(--on-primary)}
.main{flex:999 1 640px;min-width:0;display:flex;flex-direction:column}
.top{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 16px 12px 8px}
.search{flex:1 1 320px;max-width:720px;display:flex;align-items:center;gap:10px;height:48px;padding:0 6px 0 18px;border-radius:999px;background:var(--surface-container-highest);color:var(--on-surface-variant)}
.search input{flex:1;min-width:0;border:0;background:transparent;font:inherit;color:var(--on-surface);outline:0}
.rx{height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--outline-variant);background:transparent;color:var(--on-surface-variant);font:600 12px/1 'JetBrains Mono',monospace;cursor:pointer}
.kbd{font:500 11px/1 'JetBrains Mono',monospace;padding:4px 6px;border-radius:6px;background:var(--surface-container);color:var(--on-surface-variant)}
.ib{width:44px;height:44px;border-radius:999px;border:0;background:transparent;color:var(--on-surface-variant);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.ib:hover{background:var(--surface-container-highest)}
.av{width:36px;height:36px;border-radius:999px;background:var(--primary-container);color:var(--on-primary-container);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:0 0 auto}
.av-s{width:24px;height:24px;font-size:10.5px}
.pane{flex:1;margin:0 12px 12px 0;padding:24px 32px 40px;border-radius:28px;background:var(--pane);box-shadow:var(--shadow-1);min-width:0}
.crumb{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12.5px;color:var(--on-surface-variant);margin-bottom:10px}
.crumb a{color:inherit;text-decoration:none}
.hd{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px;margin-bottom:20px}
.h1{margin:0;font-size:32px;line-height:40px;font-weight:720;letter-spacing:-.025em}
.h2{margin:0;font-size:20px;line-height:28px;font-weight:680;letter-spacing:-.01em}
.h3{margin:0;font-size:15px;line-height:22px;font-weight:650}
.sub{color:var(--on-surface-variant)}
.acts{margin-left:auto;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.b{height:40px;padding:0 20px;border-radius:999px;border:0;font:inherit;font-weight:650;display:inline-flex;align-items:center;gap:8px;cursor:pointer;text-decoration:none;transition:border-radius .35s cubic-bezier(.42,1.67,.21,.9)}
.b:active{border-radius:12px}
.b-f{background:var(--primary);color:var(--on-primary)}
.b-t{background:var(--secondary-container);color:var(--on-secondary-container)}
.b-o{background:transparent;color:var(--on-surface-variant);box-shadow:inset 0 0 0 1px var(--outline-variant)}
.b-x{background:transparent;color:var(--primary);padding:0 12px}
.b-e{background:var(--error);color:var(--on-error)}
.b-l{height:56px;padding:0 28px;font-size:16px;border-radius:999px}
.bg{display:inline-flex;gap:2px}
.bg .b{border-radius:6px}
.bg .b:first-child{border-radius:999px 6px 6px 999px}
.bg .b:last-child{border-radius:6px 999px 999px 6px}
.chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.chip{height:32px;padding:0 12px;border-radius:8px;border:0;box-shadow:inset 0 0 0 1px var(--outline-variant);background:transparent;color:var(--on-surface-variant);font:inherit;font-weight:550;font-size:13px;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.chip.on{box-shadow:none;background:var(--secondary-container);color:var(--on-secondary-container)}
.tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--outline-variant);margin-bottom:16px}
.tab{position:relative;height:48px;padding:0 16px;display:inline-flex;align-items:center;gap:8px;color:var(--on-surface-variant);font-weight:600;text-decoration:none;border:0;background:transparent;font:inherit;font-weight:600;cursor:pointer}
.tab.on{color:var(--primary)}
.tab.on::after{content:'';position:absolute;left:12px;right:12px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--primary)}
.tab .n{font-size:12px;padding:1px 8px;border-radius:999px;background:var(--surface-container-high)}
.list{display:flex;flex-direction:column;gap:2px}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:14px 18px;background:var(--row);border-radius:6px;min-height:64px}
.list .row:first-child{border-radius:20px 20px 6px 6px}
.list .row:last-child{border-radius:6px 6px 20px 20px}
.list .row:only-child{border-radius:20px}
.row:hover{background:var(--surface-container-high)}
.rt{font-weight:620;font-size:14.5px;line-height:20px}
.rm{font-size:12.5px;color:var(--on-surface-variant);display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;margin-top:2px}
.grow{flex:1 1 280px;min-width:0}
.st{height:26px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:650;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.st-ok{background:var(--success-container);color:var(--on-success-container)}
.st-run{background:var(--tertiary-container);color:var(--on-tertiary-container)}
.st-err{background:var(--error-container);color:var(--on-error-container)}
.st-warn{background:var(--warning-container);color:var(--on-warning-container)}
.st-p{background:var(--primary-container);color:var(--on-primary-container)}
.st-n{background:var(--surface-container-highest);color:var(--on-surface-variant)}
.lbl{height:22px;padding:0 8px;border-radius:6px;font-size:11.5px;font-weight:650;display:inline-flex;align-items:center}
.card{background:var(--row);border-radius:24px;padding:20px}
.card-o{background:transparent;border-radius:24px;padding:20px;box-shadow:inset 0 0 0 1px var(--outline-variant)}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px}
.grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px}
.kpi{font-size:36px;line-height:44px;font-weight:760;letter-spacing:-.03em}
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:12.5px;font-weight:600;color:var(--on-surface-variant)}
.input{height:48px;padding:0 16px;border-radius:12px;border:0;box-shadow:inset 0 0 0 1px var(--outline);background:transparent;color:var(--on-surface);font:inherit;outline:0}
.input:focus{box-shadow:inset 0 0 0 2px var(--primary)}
.sw{position:relative;width:52px;height:32px;border-radius:999px;background:var(--surface-container-highest);box-shadow:inset 0 0 0 2px var(--outline);flex:0 0 auto;border:0;cursor:pointer}
.sw::after{content:'';position:absolute;left:8px;top:8px;width:16px;height:16px;border-radius:999px;background:var(--outline)}
.sw.on{background:var(--primary);box-shadow:none}
.sw.on::after{left:24px;top:4px;width:24px;height:24px;background:var(--on-primary)}
.divider{height:1px;background:var(--outline-variant);margin:16px 0}
.dot{width:10px;height:10px;border-radius:999px;flex:0 0 auto}
.bar{height:8px;border-radius:999px;background:var(--surface-container-highest);overflow:hidden;display:flex}
.scrim{position:absolute;inset:0;background:rgb(0 0 0/.32)}
.dlg{position:relative;background:var(--surface-container-high);border-radius:28px;box-shadow:var(--shadow-3);padding:24px}
.tbl{width:100%;border-collapse:separate;border-spacing:0 2px;font-size:13.5px}
.tbl th{text-align:left;font-size:12px;font-weight:650;color:var(--on-surface-variant);padding:6px 16px}
.tbl td{background:var(--row);padding:12px 16px}
.tbl tr td:first-child{border-radius:10px 0 0 10px}
.tbl tr td:last-child{border-radius:0 10px 10px 0}
.scroll{overflow-x:auto}
.fab{height:56px;padding:0 20px;border-radius:16px;border:0;background:var(--primary-container);color:var(--on-primary-container);font:inherit;font-weight:700;display:inline-flex;align-items:center;gap:10px;box-shadow:var(--shadow-3)}
"""

def css():
    return CSS.replace('%LIGHT%', theme_vars('light')).replace('%DARK%', theme_vars('dark'))

P = {
 'home': '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
 'issue': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
 'mr': '<circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="M6 7.2v9.6"/><path d="M18 16.8V10a3 3 0 0 0-3-3h-4"/><path d="M13 4.5L10.5 7 13 9.5"/>',
 'todo': '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>',
 'code': '<path d="M9 7l-5 5 5 5"/><path d="M15 7l5 5-5 5"/>',
 'branch': '<circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="7" r="2.2"/><path d="M6 7.2v9.6"/><path d="M18 9.2c0 4-6 3-11 7"/>',
 'commit': '<circle cx="12" cy="12" r="3.2"/><path d="M3 12h5.8M15.2 12H21"/>',
 'pipe': '<circle cx="5" cy="12" r="2.4"/><circle cx="12" cy="12" r="2.4"/><circle cx="19" cy="12" r="2.4"/><path d="M7.4 12h2.2M14.4 12h2.2"/>',
 'build': '<path d="M14 6l4 4-9 9H5v-4z"/><path d="M12.5 7.5l4 4"/>',
 'shield': '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
 'rocket': '<path d="M5 15c-1 1-1.5 3.5-1.5 5.5 2 0 4.5-.5 5.5-1.5"/><path d="M9 15l-2-2c1.5-5 5-9.5 13-10-.5 8-5 11.5-10 13z"/><circle cx="15" cy="9" r="1.6"/>',
 'cloud': '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>',
 'pulse': '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
 'chart': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 'users': '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.8-3.4 3.2-5 6-5s5.2 1.6 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.2 0 3.6 1.4 4 4"/>',
 'gear': '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
 'brain': '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
 'search': '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
 'bell': '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
 'moon': '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
 'plus': '<path d="M12 5v14M5 12h14"/>',
 'cmd': '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
 'chev': '<path d="M9 6l6 6-6 6"/>',
 'chevd': '<path d="M6 9l6 6 6-6"/>',
 'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 'x': '<path d="M6 6l12 12M18 6L6 18"/>',
 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'star': '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z"/>',
 'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
 'file': '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
 'folder': '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/>',
 'filter': '<path d="M4 6h16M7 12h10M10 18h4"/>',
 'board': '<rect x="3" y="4" width="5" height="16" rx="2"/><rect x="9.5" y="4" width="5" height="10" rx="2"/><rect x="16" y="4" width="5" height="13" rx="2"/>',
 'list': '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
 'epic': '<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/>',
 'lock': '<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
 'key': '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
 'tag': '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
 'server': '<rect x="3" y="4" width="18" height="7" rx="3"/><rect x="3" y="13" width="18" height="7" rx="3"/><path d="M7 7.5h.01M7 16.5h.01"/>',
 'alert': '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
 'eye': '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 'download': '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
 'sync': '<path d="M20 7a8 8 0 0 0-14.5 1M4 17a8 8 0 0 0 14.5-1"/><path d="M20 3v4h-4M4 21v-4h4"/>',
 'history': '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
 'regex': '<path d="M17 4v8M13.5 6l7 4M20.5 6l-7 4"/><rect x="4" y="15" width="5" height="5" rx="1.2"/>',
 'palette': '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
 'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
 'more': '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
 'msg': '<path d="M4 5h16v11H9l-5 4z"/>',
 'play': '<path d="M7 5l12 7-12 7z"/>',
 'retry': '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4.5h4.5"/>',
 'mail': '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/>',
}

def I(name, cls='ico'):
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true">{P[name]}</svg>'

NAV = [
 (None, [('home','Project overview','overview',None),('issue','Issues','issues','24'),('mr','Merge requests','mrs','7'),('todo','To-Do list','todos','5')]),
 ('Plan', [('board','Issue boards','plan',None),('epic','Epics','epics',None)]),
 ('Code', [('folder','Repository','repo',None),('code','Code','code',None)]),
 ('Build', [('pipe','Pipelines','pipelines',None),('build','Jobs','build',None)]),
 ('Ship', [('shield','Secure','secure',None),('rocket','Deploy','deploy',None),('cloud','Operate','operate',None),('pulse','Monitor','monitor',None)]),
 ('Insight', [('chart','Analyze','analyze',None),('users','Manage','manage',None),('brain','Agent memory','memory',None),('gear','Settings','settings',None)]),
]

def sidebar(active, project=('MG','Material GitLab','Ding-Ding-Projects')):
    h = ['<nav class="side" aria-label="Primary">',
         f'<div class="brand"><span class="mark" aria-hidden="true">M</span><span>Material GitLab</span></div>',
         f'<button class="ctx" type="button"><span class="ctx-av">{project[0]}</span><span style="flex:1;min-width:0"><span class="ctx-t" style="display:block">{project[1]}</span><span class="ctx-s" style="display:block">{project[2]}</span></span>{I("chevd","ico ico-s")}</button>']
    for sec, items in NAV:
        if sec:
            h.append(f'<div class="sec">{sec}</div>')
        for ic, label, key, n in items:
            on = ' on' if key == active else ''
            cur = ' aria-current="page"' if on else ''
            cnt = f'<span class="n">{n}</span>' if n else ''
            h.append(f'<a class="nav{on}" href="#"{cur}>{I(ic)}<span>{label}</span>{cnt}</a>')
    h.append('</nav>')
    return '\n'.join(h)

def topbar(q='Search or jump to…'):
    return f'''<header class="top">
<button class="ib" type="button" aria-label="Collapse sidebar">{I("menu")}</button>
<label class="search">{I("search")}<input type="search" placeholder="{q}" aria-label="Search"><button class="rx" type="button" aria-pressed="false" title="Regex builder">.*</button><span class="kbd">Ctrl Shift F</span></label>
<span style="margin-left:auto"></span>
<button class="ib" type="button" aria-label="Command palette">{I("cmd")}</button>
<button class="ib" type="button" aria-label="Notifications">{I("bell")}</button>
<button class="ib" type="button" aria-label="Switch theme">{I("moon")}</button>
<span class="av" aria-label="Signed in as DingDingChae">DC</span>
</header>'''

def shell(active, body, crumbs, q='Search or jump to…'):
    cr = ' <span aria-hidden="true">/</span> '.join(f'<a href="#">{c}</a>' for c in crumbs)
    return f'''<div class="app">
{sidebar(active)}
<div class="main">
{topbar(q)}
<main class="pane">
<div class="crumb">{cr}</div>
{body}
</main>
</div>
</div>'''

def page(title, inner, w, h, dark=False, fixed=False):
    props = {"dark": {"editor": "boolean", "default": dark}, "$preview": {"width": w, "height": h}}
    style = f'width:{w}px;height:{h}px;overflow:hidden;position:relative' if fixed else 'width:100%;min-height:100%;position:relative'
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>{css()}</style>
</helmet>
<div class="root {{{{themeClass}}}}" style="{style}">
{inner}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{json.dumps(props)}'>
class Component extends DCLogic {{
  renderVals() {{
    const dark = this.props.dark ?? {str(dark).lower()};
    return {{ themeClass: dark ? 'th-dark' : 'th-light' }};
  }}
}}
</script>
</body>
</html>
'''
