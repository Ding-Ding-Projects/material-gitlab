from common import I, shell, sidebar, topbar

def hd(title, sub, acts=''):
    return f'<div class="hd"><div><h1 class="h1">{title}</h1><div class="sub" style="margin-top:4px">{sub}</div></div><div class="acts">{acts}</div></div>'

def row(icon_html, title, meta, right=''):
    return f'<div class="row">{icon_html}<div class="grow"><div class="rt">{title}</div><div class="rm">{meta}</div></div>{right}</div>'

def st(kind, text, ic=None):
    return f'<span class="st st-{kind}">{I(ic,"ico ico-s") if ic else ""}{text}</span>'

def lbl(text, bg, fg):
    return f'<span class="lbl" style="background:var(--{bg});color:var(--{fg})">{text}</span>'

def chips(items, on=0):
    return '<div class="chips">' + ''.join(f'<button class="chip{" on" if i==on else ""}" type="button">{I("check","ico ico-s") if i==on else ""}{t}</button>' for i, t in enumerate(items)) + '</div>'

def tabs(items, on=0):
    out = []
    for i, it in enumerate(items):
        t, n = (it if isinstance(it, tuple) else (it, None))
        out.append(f'<button class="tab{" on" if i==on else ""}" type="button" role="tab" aria-selected="{"true" if i==on else "false"}">{t}{f"<span class=\"n\">{n}</span>" if n else ""}</button>')
    return '<div class="tabs" role="tablist">' + ''.join(out) + '</div>'

def ic_badge(name, bg, fg, size=40, r=12):
    return f'<span style="width:{size}px;height:{size}px;border-radius:{r}px;background:var(--{bg});color:var(--{fg});display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto">{I(name)}</span>'

ISSUE_OPEN = lambda: ic_badge('issue','success-container','on-success-container',36,999)
FB = f'<a class="b b-f" href="#">{I("plus")}New issue</a>'

# ---------------------------------------------------------------- surfaces

def overview():
    body = hd('Material GitLab', 'Material Design 3 overlay for GitLab CE and EE, built as a reviewable fork.',
              f'<button class="b b-o" type="button">{I("star")}Star</button><div class="bg"><button class="b b-t" type="button">{I("code")}Code</button><button class="b b-t" type="button" aria-label="Clone options">{I("chevd")}</button></div><a class="b b-f" href="#">{I("plus")}New</a>')
    body += '<div class="grid4" style="margin-bottom:20px">' + ''.join(
        f'<div class="card"><div class="sub" style="display:flex;gap:8px;align-items:center">{I(i,"ico ico-s")}{l}</div><div class="kpi" style="margin-top:6px">{v}</div></div>'
        for i, l, v in [('commit','Commits','[count]'),('branch','Branches','[count]'),('tag','Releases','[count]'),('issue','Open issues','[count]')]) + '</div>'
    body += f'''<div class="grid2">
<section class="card-o" style="padding:0;overflow:hidden">
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:16px 20px;background:var(--row)">
<button class="chip on" type="button">{I("branch","ico ico-s")}main{I("chevd","ico ico-s")}</button>
<span class="av av-s">DC</span><span class="mono" style="flex:1;min-width:160px">Fix Omnibus package output ownership</span><span class="mono sub">32cd3e4d</span>
</div>
<div style="padding:8px 8px 12px">
''' + ''.join(f'<a href="#" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;color:inherit;text-decoration:none">{I(ic,"ico ico-s")}<span style="flex:1">{n}</span><span class="sub" style="font-size:12.5px">{m}</span></a>'
             for ic, n, m in [('folder','app','overlay surfaces'),('folder','design','canvas source'),('folder','doc','feature docs'),('folder','scripts','build and package'),('folder','site','landing page'),('file','AGENTS.md','agent rules'),('file','README.md','project index')]) + f'''
</div>
</section>
<section style="display:flex;flex-direction:column;gap:16px">
<div class="card"><h2 class="h3">Languages</h2><div class="bar" style="height:12px;margin:14px 0 12px"><span style="width:44%;background:var(--primary)"></span><span style="width:24%;background:var(--tertiary)"></span><span style="width:18%;background:var(--success)"></span><span style="width:14%;background:var(--warning)"></span></div>
<div class="chips" style="font-size:12.5px;gap:16px"><span style="display:inline-flex;gap:6px;align-items:center"><span class="dot" style="background:var(--primary)"></span>Ruby</span><span style="display:inline-flex;gap:6px;align-items:center"><span class="dot" style="background:var(--tertiary)"></span>Vue</span><span style="display:inline-flex;gap:6px;align-items:center"><span class="dot" style="background:var(--success)"></span>JavaScript</span><span style="display:inline-flex;gap:6px;align-items:center"><span class="dot" style="background:var(--warning)"></span>SCSS</span></div></div>
<div class="card"><h2 class="h3" style="margin-bottom:10px">Latest pipeline</h2><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">{st("ok","Passed","check")}<span class="mono">#[id]</span><span class="sub">on main, [duration]</span></div></div>
<div class="card"><h2 class="h3" style="margin-bottom:10px">Project information</h2><div class="list">
{row(I("file"),"README","Overview, install routes, line counts")}
{row(I("history"),"CHANGELOG","Every release with commit links")}
{row(I("globe"),"Landing page","Material 3 documentation site")}
</div></div>
</section>
</div>'''
    return shell('overview', body, ['Ding-Ding-Projects', 'Material GitLab'])

def issues():
    rows = [
        ('Package build cannot write checksum file beside root-owned output', '#3', 'opened by DingDingChae', [lbl('packaging','tertiary-container','on-tertiary-container'), lbl('priority::1','error-container','on-error-container')], st('run','In progress','clock')),
        ('Board view drops focus ring after drag and drop', '#[id]', 'opened by DingDingChae', [lbl('accessibility','primary-container','on-primary-container')], st('n','To do')),
        ('Bilingual mode clips long settings captions at 360 px', '#[id]', 'opened by DingDingChae', [lbl('clipping','warning-container','on-warning-container'), lbl('i18n','secondary-container','on-secondary-container')], st('n','To do')),
        ('Command palette should jump to the exact control', '#[id]', 'opened by DingDingChae', [lbl('feature','success-container','on-success-container')], st('p','Planned')),
        ('Regex builder explanation pane overflows dialog', '#[id]', 'opened by DingDingChae', [lbl('clipping','warning-container','on-warning-container')], st('ok','Done','check')),
    ]
    lst = '<div class="list">' + ''.join(row(ISSUE_OPEN(), t, f'<span class="mono">{n}</span><span>{o}</span>' + ''.join(l), f'{s}<span class="av av-s">DC</span>') for t, n, o, l, s in rows) + '</div>'
    body = hd('Issues', 'Plain-text search by default. Regex is one tap away, never the default.',
              f'<div class="bg"><button class="b b-t" type="button" aria-pressed="true">{I("list","ico ico-s")}List</button><button class="b b-o" type="button" aria-pressed="false">{I("board","ico ico-s")}Board</button></div><button class="b b-o" type="button">{I("download","ico ico-s")}Export</button>{FB}')
    body += tabs([('Open','24'),('Closed','[n]'),('All','[n]')])
    body += f'<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:16px"><label class="search" style="height:44px;max-width:480px;background:var(--row)">{I("filter","ico ico-s")}<input type="search" placeholder="Filter issues" aria-label="Filter issues"><button class="rx" type="button">.*</button></label>{chips(["Assigned to me","Author","Label","Milestone","Weight"],-1)}<span class="sub" style="margin-left:auto;font-size:12.5px">Select all on this page</span></div>'
    body += lst
    return shell('issues', body, ['Ding-Ding-Projects', 'Material GitLab', 'Issues'])

def epics():
    months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
    bars = [('Shell foundation', 0, 2, 'primary'), ('Surface parity: Plan and Code', 1, 3, 'tertiary'), ('Package publication', 1, 2, 'success'), ('Accessibility sweep', 2, 4, 'warning'), ('Landing site expansion', 3, 3, 'primary')]
    head = '<div style="display:grid;grid-template-columns:240px repeat(6,minmax(0,1fr));gap:2px;font-size:12px;color:var(--on-surface-variant);margin-bottom:6px"><span></span>' + ''.join(f'<span style="padding:6px 8px">{m}</span>' for m in months) + '</div>'
    rows = ''.join(f'<div style="display:grid;grid-template-columns:240px repeat(6,minmax(0,1fr));gap:2px;align-items:center;min-height:52px;background:var(--row);border-radius:8px;margin-bottom:2px"><span style="padding:0 16px;font-weight:600;display:flex;gap:10px;align-items:center">{I("epic","ico ico-s")}{n}</span><span style="grid-column:{s+2}/span {d};height:28px;border-radius:999px;background:var(--{c}-container);color:var(--on-{c}-container);display:flex;align-items:center;padding:0 12px;font-size:12px;font-weight:650;margin:0 4px">{d} months</span></div>' for n, s, d, c in bars)
    body = hd('Epics', 'Roadmap view. Drag a bar edge to change dates; arrow keys work too.', f'{chips(["Roadmap","Tree","List"],0)}<a class="b b-f" href="#">{I("plus")}New epic</a>')
    body += '<div class="card" style="padding:12px"><div class="scroll"><div style="min-width:900px">' + head + rows + '</div></div></div>'
    body += '<div class="grid3" style="margin-top:16px">' + ''.join(f'<div class="card"><div class="sub" style="font-size:12.5px">{a}</div><div class="h2" style="margin:4px 0 12px">{b}</div><div class="bar"><span style="width:{c}%;background:var(--primary)"></span></div><div class="sub" style="font-size:12px;margin-top:8px">{c}% of child issues closed</div></div>' for a, b, c in [('Epic','Shell foundation',72),('Epic','Package publication',40),('Epic','Accessibility sweep',15)]) + '</div>'
    return shell('epics', body, ['Ding-Ding-Projects', 'Epics'])

def plan():
    cols = [('Open', 'surface-container-highest', ['Bilingual mode clips settings captions', 'Tab strip overflow menu', 'Export presets as JSON']),
            ('Doing', 'tertiary-container', ['Package checksum ownership', 'Focus ring after drag']),
            ('Review', 'primary-container', ['Regex builder explanation pane']),
            ('Done', 'success-container', ['Command palette shortcut', 'Density setting reader'])]
    body = hd('Issue boards', 'Drag cards between lists, or use the move menu on any card.', f'{chips(["Development","Design","Release"],0)}<a class="b b-f" href="#">{I("plus")}Add list</a>')
    body += '<div class="scroll"><div style="display:grid;grid-template-columns:repeat(4,minmax(260px,1fr));gap:12px;min-width:1080px">'
    for name, c, cards in cols:
        body += f'<section style="background:var(--row);border-radius:24px;padding:12px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:center;gap:8px;padding:6px 8px"><span class="dot" style="background:var(--{c});box-shadow:inset 0 0 0 1px var(--outline)"></span><h2 class="h3">{name}</h2><span class="sub" style="margin-left:auto">{len(cards)}</span><button class="ib" type="button" aria-label="Add to {name}" style="width:36px;height:36px">{I("plus","ico ico-s")}</button></div>'
        for t in cards:
            body += f'<article style="background:var(--pane);border-radius:16px;padding:14px;box-shadow:var(--shadow-1)"><div class="rt" style="font-size:14px">{t}</div><div class="rm" style="margin-top:10px">{lbl("frontend","primary-container","on-primary-container")}<span class="mono">#[id]</span><span class="av av-s" style="margin-left:auto">DC</span></div></article>'
        body += '</section>'
    body += '</div></div>'
    return shell('plan', body, ['Ding-Ding-Projects', 'Material GitLab', 'Issue boards'])

def mrs():
    body = f'''<div class="hd"><div style="max-width:760px"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">{st("p","Open","mr")}<span class="mono sub">!{"[id]"}</span><span class="sub">DingDingChae wants to merge</span><span class="mono" style="padding:2px 8px;border-radius:6px;background:var(--surface-container-high)">feature/expressive-chrome</span><span class="sub">into</span><span class="mono" style="padding:2px 8px;border-radius:6px;background:var(--surface-container-high)">main</span></div><h1 class="h1">Adopt Material 3 Expressive tokens across the shell</h1></div><div class="acts"><button class="b b-o" type="button">{I("code","ico ico-s")}Code</button><button class="b b-t" type="button">Mark as draft</button></div></div>'''
    body += tabs([('Overview', None), ('Commits', '[n]'), ('Pipelines', '[n]'), ('Changes', '[n]')])
    body += f'''<div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start">
<div style="flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px">
<section class="card" style="padding:0;overflow:hidden">
<div class="list" style="padding:8px">
{row(ic_badge("pipe","success-container","on-success-container",36,999), "Pipeline passed", '<span class="mono">#[id]</span><span>[n] jobs, [duration]</span>', '<button class="b b-x" type="button">View</button>')}
{row(ic_badge("check","primary-container","on-primary-container",36,999), "Approved by 1 of 1 required reviewers", '<span>Code owners satisfied</span>', '<span class="av av-s">DC</span>')}
{row(ic_badge("shield","surface-container-highest","on-surface-variant",36,999), "Security scan: no new findings", '<span>Compared with main</span>')}
</div>
<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:16px 20px;background:var(--surface-container-high)">
<label style="display:flex;gap:10px;align-items:center"><button class="sw on" type="button" role="switch" aria-checked="true" aria-label="Delete source branch"></button>Delete source branch</label>
<label style="display:flex;gap:10px;align-items:center"><button class="sw" type="button" role="switch" aria-checked="false" aria-label="Squash commits"></button>Squash commits</label>
<div class="acts"><button class="b b-f b-l" type="button">{I("mr")}Merge</button></div>
</div>
</section>
<section class="card"><h2 class="h3" style="margin-bottom:12px">Activity</h2>
<div style="display:flex;gap:12px"><span class="av">DC</span><div style="flex:1;background:var(--pane);border-radius:4px 20px 20px 20px;padding:14px 16px"><div style="font-weight:650">DingDingChae <span class="sub" style="font-weight:400">commented</span></div><div style="margin-top:6px">Contrast checks pass in both themes. The shape morph on press respects reduced motion.</div></div></div>
<div style="display:flex;gap:12px;margin-top:12px"><span class="av">DC</span><label style="flex:1"><span class="sub" style="font-size:12.5px">Reply</span><textarea class="input" style="width:100%;height:96px;padding:12px 16px;resize:vertical;margin-top:6px" aria-label="Reply"></textarea></label></div>
</section>
</div>
<aside style="flex:1 1 260px;display:flex;flex-direction:column;gap:2px">
''' + ''.join(f'<div style="background:var(--row);padding:14px 16px;border-radius:{r}"><div class="sub" style="font-size:12px;font-weight:650">{a}</div><div style="margin-top:4px;display:flex;gap:8px;align-items:center">{b}</div></div>' for a, b, r in [
        ('Assignee', '<span class="av av-s">DC</span>DingDingChae', '20px 20px 6px 6px'), ('Reviewers', '<span class="av av-s">DC</span>DingDingChae', '6px'),
        ('Labels', lbl('frontend', 'primary-container', 'on-primary-container') + lbl('design', 'tertiary-container', 'on-tertiary-container'), '6px'),
        ('Milestone', 'Expressive refresh', '6px'), ('Time tracking', 'No estimate', '6px 6px 20px 20px')]) + '</aside></div>'
    return shell('mrs', body, ['Ding-Ding-Projects', 'Material GitLab', 'Merge requests', '![id]'])

def code():
    lines = ['// Material 3 Expressive tokens for the GitLab shell.', ':root {', '  --gl-md3-prim: #6e1aff;', '  --gl-md3-primc: #e9ddff;', '  --gl-md3-shape-xl: 28px;', '  --gl-md3-motion-spatial-fast:', '    cubic-bezier(0.42, 1.67, 0.21, 0.9);', '}', '', '.super-sidebar .nav-item.active {', '  border-radius: 999px;', '  background: var(--gl-md3-sec);', '}']
    code_html = ''.join(f'<div style="display:flex;gap:16px;padding:0 16px;{"background:var(--success-container);color:var(--on-success-container)" if i in (2,3) else ""}"><span class="sub" style="width:28px;text-align:right;user-select:none">{i+1}</span><span style="white-space:pre">{l}</span></div>' for i, l in enumerate(lines))
    tree = ''.join(f'<a href="#" style="display:flex;align-items:center;gap:8px;padding:7px 10px;margin-left:{d*14}px;border-radius:10px;color:inherit;text-decoration:none;{"background:var(--secondary-container);color:var(--on-secondary-container);font-weight:650" if on else ""}">{I(ic,"ico ico-s")}{n}</a>' for ic, n, d, on in [('folder','app',0,0),('folder','assets',1,0),('folder','stylesheets',2,0),('folder','md3',3,0),('file','_tokens.scss',4,1),('file','_tokens_dark.scss',4,0),('file','_shape.scss',4,0),('file','_motion.scss',4,0),('folder','components',4,0)])
    body = f'''<div class="hd"><div><div style="display:flex;gap:8px;margin-bottom:8px"><button class="chip on" type="button">{I("branch","ico ico-s")}main{I("chevd","ico ico-s")}</button><span class="mono sub" style="align-self:center">app / assets / stylesheets / md3 / _tokens.scss</span></div><h1 class="h1">_tokens.scss</h1></div><div class="acts"><div class="bg"><button class="b b-t" type="button">Blame</button><button class="b b-o" type="button">History</button><button class="b b-o" type="button">Raw</button></div><button class="b b-f" type="button">Edit</button></div></div>
<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">
<nav class="card" style="flex:1 1 240px;padding:10px" aria-label="Files"><label class="search" style="height:40px;background:var(--pane);margin-bottom:8px">{I("search","ico ico-s")}<input type="search" placeholder="Go to file" aria-label="Go to file"></label>{tree}</nav>
<section style="flex:999 1 560px;min-width:0;border-radius:24px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--outline-variant)">
<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 16px;background:var(--row)"><span class="av av-s">DC</span><span style="flex:1;min-width:200px">Adopt expressive color roles</span><span class="mono sub">[sha]</span><span class="sub">[n] lines</span></div>
<div class="mono scroll" style="padding:12px 0;line-height:24px">{code_html}</div>
</section></div>'''
    return shell('code', body, ['Material GitLab', 'Code'])

def repo():
    commits = [('Fix Omnibus package output ownership', 'DingDingChae', '32cd3e4d'), ('Retry network-only build steps', 'DingDingChae', '[sha]'), ('Rewrite package verifier', 'DingDingChae', '[sha]'), ('Register Material Web tags used by contracts', 'DingDingChae', '[sha]')]
    body = hd('Repository', 'Commits, branches, tags and compare in one place.', f'{chips(["Commits","Branches","Tags","Compare","Graph"],0)}')
    body += f'<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px"><button class="chip on" type="button">{I("branch","ico ico-s")}main{I("chevd","ico ico-s")}</button><label class="search" style="height:40px;max-width:420px;background:var(--row)">{I("search","ico ico-s")}<input type="search" placeholder="Search by message" aria-label="Search commits"><button class="rx" type="button">.*</button></label></div>'
    body += '<div class="h3 sub" style="margin:8px 4px">Today</div><div class="list">' + ''.join(row(f'<span class="av">{a[:2].upper()}</span>', t, f'<span>{a} authored</span>', f'<span class="mono" style="padding:4px 10px;border-radius:8px;background:var(--surface-container-high)">{s}</span><button class="ib" type="button" aria-label="Copy SHA">{I("file","ico ico-s")}</button><button class="ib" type="button" aria-label="Browse files">{I("folder","ico ico-s")}</button>') for t, a, s in commits) + '</div>'
    return shell('repo', body, ['Material GitLab', 'Repository', 'Commits'])

def pipelines():
    stages = [('Prepare', [('bootstrap', 'ok'), ('fetch-deps', 'ok')]), ('Build', [('webpack', 'ok'), ('omnibus', 'run')]), ('Package', [('verify-package', 'n'), ('checksums', 'n')]), ('Release', [('publish', 'n')])]
    graph = '<div class="scroll"><div style="display:flex;gap:16px;min-width:820px">' + ''.join(
        f'<div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="sub" style="font-weight:650;font-size:12.5px;padding:0 6px">{n}</div>' + ''.join(
            f'<button type="button" style="height:48px;border:0;border-radius:999px;padding:0 16px 0 8px;display:flex;align-items:center;gap:10px;font:inherit;font-weight:600;background:var(--pane);color:var(--on-surface);box-shadow:var(--shadow-1)"><span class="st st-{s}" style="width:32px;height:32px;padding:0;justify-content:center">{I({"ok":"check","run":"clock","n":"more"}[s],"ico ico-s")}</span>{j}</button>' for j, s in jobs) + '</div>' for n, jobs in stages) + '</div></div>'
    body = hd('Pipeline #[id]', 'Triggered on main by a push, running for [duration].', f'<button class="b b-o" type="button">{I("x","ico ico-s")}Cancel</button><button class="b b-t" type="button">{I("retry","ico ico-s")}Retry failed</button><a class="b b-f" href="#">{I("play","ico ico-s")}Run pipeline</a>')
    body += f'<div class="chips" style="margin-bottom:16px">{st("run","Running","clock")}<span class="sub">[n] jobs</span><span class="sub">·</span><span class="mono sub">32cd3e4d</span></div>'
    body += tabs(['Pipeline', ('Jobs', '[n]'), 'Failed jobs', 'Tests'])
    body += f'<div class="card" style="padding:20px">{graph}</div>'
    body += '<h2 class="h2" style="margin:24px 0 12px">Recent pipelines</h2><div class="list">' + ''.join(row(f'<span class="st st-{k}">{I(i,"ico ico-s")}{t}</span>', f'#[id] on {b}', f'<span class="mono">[sha]</span><span>[duration]</span>', '<button class="b b-x" type="button">Open</button>') for k, i, t, b in [('ok','check','Passed','main'),('err','x','Failed','feature/expressive-chrome'),('ok','check','Passed','main')]) + '</div>'
    return shell('pipelines', body, ['Material GitLab', 'Build', 'Pipelines'])

def build():
    log = ['$ scripts/omnibus/build-package.sh', 'Pulling builder image', 'Compiling assets with webpack', 'material helpers in package: 11 of 11', 'compiled webpack files in package: [n]', 'Returning pkg ownership to runner user', 'Job succeeded']
    body = hd('Job: omnibus', 'Build stage of pipeline #[id], runner [hosted Linux].', f'<button class="b b-o" type="button">{I("download","ico ico-s")}Artifacts</button><button class="b b-t" type="button">{I("retry","ico ico-s")}Retry</button>')
    body += f'''<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">
<section style="flex:999 1 560px;min-width:0;border-radius:24px;background:var(--inverse-surface);color:var(--inverse-on-surface);overflow:hidden">
<div style="display:flex;gap:8px;align-items:center;padding:12px 16px;background:rgb(255 255 255/.06)"><span class="mono">job log</span><label class="search" style="height:36px;max-width:320px;margin-left:auto;background:rgb(255 255 255/.08);color:inherit">{I("search","ico ico-s")}<input type="search" placeholder="Search log" aria-label="Search log" style="color:inherit"><button class="rx" type="button" style="color:inherit">.*</button></label></div>
<div class="mono" style="padding:16px;line-height:24px">''' + ''.join(f'<div style="display:flex;gap:16px"><span style="opacity:.55;width:24px;text-align:right">{i+1}</span><span>{l}</span></div>' for i, l in enumerate(log)) + f'''</div></section>
<aside style="flex:1 1 260px;display:flex;flex-direction:column;gap:2px">''' + ''.join(f'<div style="background:var(--row);padding:14px 16px;border-radius:{r}"><div class="sub" style="font-size:12px;font-weight:650">{a}</div><div style="margin-top:4px">{b}</div></div>' for a, b, r in [('Status', st('ok','Passed','check'), '20px 20px 6px 6px'), ('Duration', '[duration]', '6px'), ('Queued', '[duration]', '6px'), ('Runner', 'Hosted Linux, pinned image', '6px'), ('Artifacts', 'omnibus-deb, expires in 14 days', '6px 6px 20px 20px')]) + '</aside></div>'
    return shell('build', body, ['Material GitLab', 'Build', 'Jobs', 'omnibus'])

def deploy():
    envs = [('production', 'ok', 'Deployed', 'v[version]'), ('staging', 'run', 'Deploying', 'main @ [sha]'), ('review/expressive-chrome', 'ok', 'Deployed', 'feature/expressive-chrome')]
    body = hd('Environments', 'Every deployment, its commit, and a guarded rollback.', f'<a class="b b-t" href="#">Releases</a><a class="b b-f" href="#">{I("plus")}New environment</a>')
    body += tabs([('Active', '3'), ('Stopped', '[n]')])
    body += '<div class="list">' + ''.join(row(ic_badge('rocket', 'secondary-container', 'on-secondary-container', 40, 12), e, f'{st(k, t)}<span class="mono">{v}</span><span>[time] ago</span>', f'<button class="b b-o" type="button">Open</button><button class="b b-x" type="button">Rollback</button>') for e, k, t, v in envs) + '</div>'
    body += f'''<div class="dlg" style="max-width:560px;margin-top:24px">
<div style="display:flex;gap:12px;align-items:center">{ic_badge("alert","error-container","on-error-container",44,14)}<h2 class="h2">Roll back production?</h2></div>
<p style="margin:12px 0 0">This redeploys <span class="mono">v[previous]</span> to <strong>production</strong> and replaces the running <span class="mono">v[version]</span>. Users see the older build until the next deploy.</p>
<div class="field" style="margin-top:16px"><label for="confirm-env">Type <span class="mono">production</span> to confirm</label><input id="confirm-env" class="input" type="text"></div>
<div class="acts" style="margin-top:20px"><button class="b b-x" type="button">Cancel</button><button class="b b-e" type="button" disabled style="opacity:.38">Roll back</button></div>
<div class="sub" style="font-size:12px;margin-top:8px;text-align:right">Roll back stays disabled until the name matches.</div>
</div>'''
    return shell('deploy', body, ['Material GitLab', 'Deploy', 'Environments'])

def operate():
    body = hd('Operate', 'Kubernetes agents, Terraform states and feature flags.', f'<a class="b b-f" href="#">{I("plus")}Connect agent</a>')
    body += '<div class="grid3" style="margin-bottom:20px">' + ''.join(f'<div class="card"><div style="display:flex;gap:12px;align-items:center">{ic_badge(i,b,f,44,14)}<div><div class="h3">{t}</div><div class="sub" style="font-size:12.5px">{s}</div></div></div></div>' for i, b, f, t, s in [('server','primary-container','on-primary-container','Kubernetes agents','[n] connected'),('cloud','tertiary-container','on-tertiary-container','Terraform states','[n] tracked'),('tag','success-container','on-success-container','Feature flags','[n] active')]) + '</div>'
    body += '<div class="scroll"><table class="tbl"><thead><tr><th>Agent</th><th>Connection</th><th>Version</th><th>Last contact</th><th><span style="position:absolute;left:-9999px">Actions</span></th></tr></thead><tbody>' + ''.join(f'<tr><td><strong>{a}</strong></td><td>{st(k,t)}</td><td class="mono">[version]</td><td>[time] ago</td><td style="text-align:right"><button class="ib" type="button" aria-label="More for {a}">{I("more")}</button></td></tr>' for a, k, t in [('primary-cluster','ok','Connected'),('review-apps','ok','Connected'),('lab-cluster','warn','Not seen recently')]) + '</tbody></table></div>'
    return shell('operate', body, ['Material GitLab', 'Operate'])

def spark(points, color):
    w, h = 560, 140
    mx = max(points)
    pts = ' '.join(f'{i*w/(len(points)-1):.0f},{h - p/mx*(h-12):.0f}' for i, p in enumerate(points))
    return f'<svg viewBox="0 0 {w} {h}" style="width:100%;height:{h}px" role="img" aria-label="Trend chart, sample data"><polyline points="{pts}" fill="none" stroke="var(--{color})" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'

def monitor():
    body = hd('Monitor', 'Alerts and incidents, newest first.', f'{chips(["Alerts","Incidents","Error tracking"],0)}<a class="b b-f" href="#">{I("plus")}Create incident</a>')
    body += f'<div class="card" style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;align-items:center"><h2 class="h3">Alert volume</h2><span class="sub" style="font-size:12px">Sample data</span></div>{spark([3,5,4,7,6,9,5,4,6,3,2,4],"primary")}</div>'
    body += '<div class="list">' + ''.join(row(f'<span class="st st-{k}">{s}</span>', t, f'<span>{src}</span><span>[time] ago</span>', '<button class="b b-x" type="button">Acknowledge</button>') for k, s, t, src in [('err','Critical','Package publish job exceeded timeout','Pipeline monitor'),('warn','High','Runner queue time above threshold','Runner metrics'),('n','Low','Docs site build warning','Pages')]) + '</div>'
    return shell('monitor', body, ['Material GitLab', 'Monitor', 'Alerts'])

def secure():
    body = hd('Vulnerability report', 'Findings on the default branch. Triage with bulk actions.', f'<button class="b b-o" type="button">{I("download","ico ico-s")}Export</button>')
    body += '<div class="grid4" style="margin-bottom:16px">' + ''.join(f'<button type="button" class="card" style="border:0;text-align:left;font:inherit;color:inherit;cursor:pointer"><span class="st st-{k}">{s}</span><div class="kpi" style="margin-top:8px">[n]</div></button>' for k, s in [('err','Critical'),('err','High'),('warn','Medium'),('n','Low')]) + '</div>'
    body += f'<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:12px;padding:8px 12px;border-radius:16px;background:var(--secondary-container);color:var(--on-secondary-container)"><strong>2 selected</strong><span>of this page</span><span class="acts"><button class="b b-x" type="button" style="color:inherit">Dismiss</button><button class="b b-f" type="button">Change status</button></span></div>'
    body += '<div class="list">' + ''.join(row(f'<input type="checkbox" aria-label="Select {t}" {"checked" if c else ""} style="width:18px;height:18px;accent-color:var(--primary)"><span class="st st-{k}">{s}</span>', t, f'<span>{tool}</span><span class="mono">{loc}</span>', st('n', 'Needs triage')) for c, k, s, t, tool, loc in [(1,'err','High','Prototype pollution in a transitive package','Dependency scanning','yarn.lock'),(1,'warn','Medium','Missing Content-Security-Policy on docs site','DAST','site/'),(0,'n','Low','Verbose error page in development mode','SAST','config/')]) + '</div>'
    return shell('secure', body, ['Material GitLab', 'Secure', 'Vulnerability report'])

def security():
    body = hd('Security dashboard', 'Trends across every project in the group.', chips(['30 days', '60 days', '90 days'], 0))
    body += f'''<div class="grid2">
<div class="card"><h2 class="h3">Open findings over time</h2><div class="sub" style="font-size:12px">Sample data</div>{spark([12,11,13,10,9,9,8,7,8,6,5,5],"error")}</div>
<div class="card"><h2 class="h3" style="margin-bottom:12px">Project grades</h2><div class="list">''' + ''.join(row(f'<span class="st st-{k}" style="width:36px;justify-content:center">{g}</span>', p, f'<span>{d}</span>') for k, g, p, d in [('ok','A','Material GitLab','No open high findings'),('warn','C','Docs site','One medium finding'),('ok','A','Packaging','Clean')]) + '</div></div></div>'
    return shell('secure', body, ['Ding-Ding-Projects', 'Security dashboard'])

def analyze():
    stages = [('Issue', '[d]'), ('Plan', '[d]'), ('Code', '[d]'), ('Test', '[d]'), ('Review', '[d]'), ('Staging', '[d]')]
    body = hd('Value stream', 'Median time in each stage. Select a stage to see its items.', chips(['Last 30 days', 'Last 90 days'], 0))
    body += '<div class="scroll"><div style="display:flex;gap:4px;min-width:840px;margin-bottom:20px">' + ''.join(f'<button type="button" style="flex:1;border:0;font:inherit;color:{"var(--on-primary)" if i==2 else "inherit"};background:{"var(--primary)" if i==2 else "var(--row)"};padding:16px;border-radius:{"24px 6px 6px 24px" if i==0 else ("6px 24px 24px 6px" if i==len(stages)-1 else "6px")};text-align:left;cursor:pointer"><div style="font-weight:650">{n}</div><div class="kpi" style="font-size:28px;line-height:36px">{v}</div></button>' for i, (n, v) in enumerate(stages)) + '</div></div>'
    body += '<div class="grid2"><div class="card"><h2 class="h3">Deployment frequency</h2><div class="sub" style="font-size:12px">Sample data</div>' + spark([1,2,2,3,2,4,3,5,4,5,6,5], 'tertiary') + '</div><div class="card"><h2 class="h3">Lead time for changes</h2><div class="sub" style="font-size:12px">Sample data</div>' + spark([9,8,8,7,7,6,6,5,5,4,4,3], 'success') + '</div></div>'
    return shell('analyze', body, ['Material GitLab', 'Analyze', 'Value stream'])

def manage():
    body = hd('Members', 'Who can do what in this project.', f'<button class="b b-o" type="button">Import from project</button><a class="b b-f" href="#">{I("plus")}Invite members</a>')
    body += tabs([('Members', '[n]'), ('Groups', '[n]'), ('Invited', '0'), ('Access requests', '0')])
    body += '<div class="list">' + ''.join(row(f'<span class="av">{i}</span>', n, f'<span>@{h}</span><span>Joined [date]</span>', f'<button class="chip" type="button">{r}{I("chevd","ico ico-s")}</button><button class="ib" type="button" aria-label="Remove {n}">{I("x","ico ico-s")}</button>') for i, n, h, r in [('DC','DingDingChae','dingdingchae','Owner')]) + '</div>'
    return shell('manage', body, ['Material GitLab', 'Manage', 'Members'])

def settings():
    groups = [('Appearance', [('Theme', 'Light, dark, or follow the system.', 'seg'), ('Seed color', 'Every color role is generated from this one color.', 'color'), ('Density', 'Spacing for lists and toolbars.', 'seg2'), ('Reduce motion', 'Replace spring motion with simple fades.', 'sw0')]),
              ('Language', [('Language mode', 'English, Cantonese, or both side by side.', 'seg3'), ('English funny level', 'Changes voice only. Facts always stay plain.', 'range'), ('Cantonese funny level', 'Changes voice only. Facts always stay plain.', 'range')])]
    def ctl(kind):
        if kind == 'seg': return '<div class="bg"><button class="b b-t" type="button" aria-pressed="false">Light</button><button class="b b-o" type="button">Dark</button><button class="b b-o" type="button">System</button></div>'
        if kind == 'seg2': return '<div class="bg"><button class="b b-o" type="button">Compact</button><button class="b b-t" type="button">Comfortable</button><button class="b b-o" type="button">Spacious</button></div>'
        if kind == 'seg3': return '<div class="bg"><button class="b b-o" type="button">English</button><button class="b b-o" type="button">廣東話</button><button class="b b-t" type="button">Both</button></div>'
        if kind == 'color': return '<button type="button" class="chip" aria-label="Seed color #6E49CB"><span class="dot" style="width:20px;height:20px;background:#6e49cb"></span><span class="mono">#6E49CB</span></button>'
        if kind == 'range': return '<input type="range" min="1" max="5" value="5" aria-label="Funny level" style="width:180px;accent-color:var(--primary)">'
        return '<button class="sw" type="button" role="switch" aria-checked="false" aria-label="Reduce motion"></button>'
    body = hd('Settings', 'Search finds any setting and jumps straight to its control.', f'<label class="search" style="height:44px;width:320px;background:var(--row)">{I("search","ico ico-s")}<input type="search" placeholder="Search settings" aria-label="Search settings"></label>')
    body += tabs(['General', 'Appearance', 'Language', 'Integrations', 'CI/CD', 'Repository', 'Members'], 1)
    for g, items in groups:
        body += f'<h2 class="h2" style="margin:20px 4px 10px">{g}</h2><div class="list">' + ''.join(row('', f'{n} <button class="ib" type="button" aria-label="About {n}" style="width:28px;height:28px;vertical-align:middle">{I("eye","ico ico-s")}</button>', f'<span>{d}</span><span class="lbl" style="background:var(--surface-container-highest);color:var(--on-surface-variant)">default</span>', ctl(kind)) for n, d, kind in items) + '</div>'
    return shell('settings', body, ['Material GitLab', 'Settings', 'Appearance'])

def admin():
    body = hd('Admin area', 'Instance health and the numbers that need attention.', f'<a class="b b-t" href="#">{I("server","ico ico-s")}System info</a>')
    body += '<div class="grid4" style="margin-bottom:20px">' + ''.join(f'<div class="card"><div class="sub" style="display:flex;gap:8px;align-items:center">{I(i,"ico ico-s")}{l}</div><div class="kpi" style="margin-top:6px">[n]</div><a href="#" style="font-size:12.5px;font-weight:600">{a}</a></div>' for i, l, a in [('folder','Projects','View all'),('users','Users','Manage users'),('users','Groups','View all'),('server','Runners','View runners')]) + '</div>'
    body += '<div class="grid2"><div class="card"><h2 class="h3" style="margin-bottom:12px">Components</h2><div class="list">' + ''.join(row('', c, f'<span class="mono">[version]</span>', st('ok', 'Up to date')) for c in ['GitLab', 'Gitaly', 'GitLab Shell', 'Workhorse']) + '</div></div><div class="card"><h2 class="h3" style="margin-bottom:12px">Background jobs</h2><div class="list">' + ''.join(row('', q, '<span>[n] queued</span>', st(k, s)) for q, k, s in [('default', 'ok', 'Healthy'), ('mailers', 'ok', 'Healthy'), ('pipeline_processing', 'warn', 'Busy')]) + '</div></div></div>'
    return shell('settings', body, ['Admin area', 'Overview'])

def todos():
    items = [('mr','DingDingChae requested your review','Adopt Material 3 Expressive tokens across the shell','[time]'),('issue','You were assigned','Package build cannot write checksum file beside root-owned output','[time]'),('msg','DingDingChae mentioned you','Regex builder explanation pane overflows dialog','[time]')]
    body = hd('To-Do list', 'Mark items done one by one or in bulk.', f'<button class="b b-o" type="button">{I("check","ico ico-s")}Mark all as done</button>')
    body += tabs([('To do', '5'), ('Snoozed', '0'), ('Done', '[n]')])
    body += '<div class="list">' + ''.join(row(ic_badge(i, 'primary-container', 'on-primary-container', 40, 999), b, f'<span>{a}</span><span>{t} ago</span>', f'<button class="b b-x" type="button">Snooze</button><button class="b b-t" type="button">{I("check","ico ico-s")}Done</button>') for i, a, b, t in items) + '</div>'
    return shell('todos', body, ['Your work', 'To-Do list'])

def memory():
    body = hd('Agent memory', 'Shared instructions, skills and their sync state, with history you can restore.', f'<button class="b b-o" type="button">{I("history","ico ico-s")}History</button><button class="b b-f" type="button">{I("sync","ico ico-s")}Sync now</button>')
    body += f'<div class="card" style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-bottom:16px;background:var(--success-container);color:var(--on-success-container)">{I("check")}<div style="flex:1;min-width:220px"><div style="font-weight:700">In sync</div><div style="font-size:12.5px">Last attested [time] ago against commit [sha]</div></div><button class="b b-o" type="button" style="color:inherit;box-shadow:inset 0 0 0 1px currentColor">View attestation</button></div>'
    body += tabs([('Instructions', '[n]'), ('Skills', '[n]'), ('Status hub', None), ('Vocabulary', None)])
    body += '<div class="list">' + ''.join(row(ic_badge('file', 'secondary-container', 'on-secondary-container', 40, 12), n, f'<span>{d}</span><span class="mono">{s}</span>', '<button class="b b-x" type="button">Open</button>') for n, d, s in [('Shared instructions', 'Main rule set', '[size]'), ('Workflow details', 'On-demand rules', '[size]'), ('UI contract', 'Interface requirements', '[size]'), ('Feature catalogue', 'Required features', '[size]')]) + '</div>'
    body += f'<div class="card-o" style="margin-top:16px;display:flex;flex-wrap:wrap;gap:16px;align-items:center">{ic_badge("download","tertiary-container","on-tertiary-container",44,14)}<div style="flex:1;min-width:220px"><div class="h3">Upload a vocabulary file</div><div class="sub" style="font-size:12.5px">JSON only. Nothing is uploaded until you confirm.</div></div><button class="b b-t" type="button">Choose file</button></div>'
    return shell('memory', body, ['Your work', 'Agent memory'])

def login():
    return f'''<div class="app" style="align-items:center;justify-content:center;padding:32px;gap:48px;background:var(--bg)">
<section style="flex:1 1 420px;max-width:520px">
<div class="brand" style="padding:0 0 32px;font-size:20px"><span class="mark" aria-hidden="true">M</span>Material GitLab</div>
<h1 style="margin:0;font-size:57px;line-height:64px;font-weight:780;letter-spacing:-.035em">Code, review and ship from one place.</h1>
<p class="sub" style="font-size:16px;line-height:24px;margin:16px 0 0">Sign in to your instance. Self-hosted, Material 3, bilingual.</p>
</section>
<section class="dlg" style="flex:1 1 380px;max-width:440px;background:var(--pane);padding:32px">
<h2 class="h2" style="font-size:24px;margin-bottom:20px">Sign in</h2>
<div class="field" style="margin-bottom:16px"><label for="u">Username or email</label><input id="u" class="input" type="text" autocomplete="username"></div>
<div class="field" style="margin-bottom:8px"><label for="p">Password</label><input id="p" class="input" type="password" autocomplete="current-password"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 20px"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" style="width:18px;height:18px;accent-color:var(--primary)">Remember me</label><a href="#" style="font-weight:600">Forgot password?</a></div>
<button class="b b-f b-l" type="button" style="width:100%;justify-content:center">Sign in</button>
<div style="display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--on-surface-variant);font-size:12.5px"><span style="flex:1;height:1px;background:var(--outline-variant)"></span>or<span style="flex:1;height:1px;background:var(--outline-variant)"></span></div>
<button class="b b-o b-l" type="button" style="width:100%;justify-content:center">{I("key")}Sign in with a passkey</button>
<div class="chips" style="justify-content:center;margin-top:20px"><button class="chip on" type="button">English</button><button class="chip" type="button">廣東話</button><button class="chip" type="button">Both</button></div>
</section>
</div>'''

def palette():
    items = [('Pages', [('issue', 'Issues', 'G I'), ('mr', 'Merge requests', 'G M'), ('pipe', 'Pipelines', 'G P')]), ('Settings', [('palette', 'Appearance › Seed color', ''), ('globe', 'Language › Funny level', '')]), ('Actions', [('plus', 'New issue', 'N'), ('moon', 'Switch theme', '')])]
    lst = ''
    first = True
    for g, its in items:
        lst += f'<div class="sec" style="margin:12px 12px 4px">{g}</div>'
        for ic, t, kb in its:
            on = 'background:var(--secondary-container);color:var(--on-secondary-container);' if first else ''
            first = False
            lst += f'<a href="#" style="display:flex;align-items:center;gap:12px;min-height:48px;padding:0 14px;border-radius:14px;color:inherit;text-decoration:none;{on}">{I(ic)}<span style="flex:1">{t}</span>{f"<span class=\"kbd\">{kb}</span>" if kb else ""}</a>'
    return f'''<div style="position:relative;min-height:900px">
<div aria-hidden="true">{shell("issues", "<div style=\"height:640px\"></div>", ["Material GitLab","Issues"])}</div>
<div class="scrim"></div>
<div role="dialog" aria-modal="true" aria-label="Command palette" class="dlg" style="position:absolute;left:50%;top:96px;transform:translateX(-50%);width:min(640px,92%);padding:12px">
<label class="search" style="background:var(--surface-container-highest);max-width:none">{I("search")}<input type="search" value="se" aria-label="Command"><button class="rx" type="button">.*</button></label>
<div style="max-height:520px;overflow:auto;padding:4px">{lst}</div>
<div class="sub" style="display:flex;gap:16px;font-size:12px;padding:10px 14px 4px"><span><span class="kbd">↑ ↓</span> move</span><span><span class="kbd">Enter</span> open</span><span><span class="kbd">Esc</span> close</span></div>
</div></div>'''

def regex():
    toks = [('.', 'any character'), ('\\d', 'digit'), ('\\w', 'word character'), ('\\s', 'whitespace'), ('^', 'start of line'), ('$', 'end of line'), ('( )', 'group'), ('[ ]', 'character set'), ('+', 'one or more'), ('?', 'optional')]
    return f'''<div style="position:relative;min-height:900px">
<div aria-hidden="true">{shell("issues", "<div style=\"height:640px\"></div>", ["Material GitLab","Issues"])}</div>
<div class="scrim"></div>
<div role="dialog" aria-modal="true" aria-labelledby="rxh" class="dlg" style="position:absolute;left:50%;top:72px;transform:translateX(-50%);width:min(880px,94%)">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">{ic_badge("regex","primary-container","on-primary-container",44,14)}<h2 id="rxh" class="h2">Regex builder</h2><button class="ib" type="button" aria-label="Close" style="margin-left:auto">{I("x")}</button></div>
<div class="field"><label for="rxp">Pattern</label><input id="rxp" class="input mono" value="^#(\\d+)\\s+(.+)$" style="font-size:15px;background:var(--pane)"></div>
<div class="chips" style="margin:10px 0 16px"><button class="chip on" type="button">i  ignore case</button><button class="chip" type="button">m  multiline</button><button class="chip" type="button">g  all matches</button></div>
<div style="display:flex;flex-wrap:wrap;gap:16px">
<section style="flex:1 1 320px"><h3 class="h3" style="margin-bottom:8px">Insert</h3><div class="grid4" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px">''' + ''.join(f'<button type="button" class="chip" style="height:44px;justify-content:flex-start"><span class="mono" style="font-weight:700;color:var(--primary);min-width:28px">{t}</span><span style="font-size:12px">{d}</span></button>' for t, d in toks) + '''</div></section>
<section style="flex:1 1 320px"><h3 class="h3" style="margin-bottom:8px">Live matches</h3><div class="card mono" style="background:var(--pane);line-height:26px"><div><mark style="background:var(--primary-container);color:var(--on-primary-container);border-radius:4px;padding:0 2px">#3 Package build cannot write checksum</mark></div><div class="sub">Board view drops focus ring</div><div><mark style="background:var(--primary-container);color:var(--on-primary-container);border-radius:4px;padding:0 2px">#12 Command palette jump</mark></div></div>
<h3 class="h3" style="margin:12px 0 8px">Explanation</h3><div class="list" style="font-size:13px"><div class="row" style="min-height:40px;padding:8px 14px"><span class="mono" style="color:var(--primary);font-weight:700">^#</span>line starts with #</div><div class="row" style="min-height:40px;padding:8px 14px"><span class="mono" style="color:var(--primary);font-weight:700">(\\d+)</span>group 1: one or more digits</div><div class="row" style="min-height:40px;padding:8px 14px"><span class="mono" style="color:var(--primary);font-weight:700">(.+)$</span>group 2: the rest of the line</div></div></section>
</div>
<div class="acts" style="margin-top:20px"><button class="b b-x" type="button">Cancel</button><button class="b b-f" type="button">Use pattern</button></div>
</div></div>'''

def sidebar_states():
    rail = '<nav style="width:96px;display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px 0" aria-label="Collapsed navigation">' + ''.join(f'<a href="#" style="display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;font-weight:{700 if on else 500};color:{"var(--on-secondary-container)" if on else "var(--on-surface-variant)"};text-decoration:none"><span style="width:56px;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center;{"background:var(--secondary-container)" if on else ""}">{I(i)}</span>{t}</a>' for i, t, on in [('home','Home',0),('issue','Issues',1),('mr','Merge',0),('pipe','Build',0),('shield','Secure',0),('rocket','Deploy',0),('chart','Analyze',0),('gear','Settings',0)]) + '</nav>'
    return f'''<div class="app" style="gap:48px;padding:24px;align-items:flex-start">
<div><div class="sec" style="margin:0 0 8px">Expanded drawer</div><div style="background:var(--bg);border-radius:28px;box-shadow:inset 0 0 0 1px var(--outline-variant)">{sidebar("issues")}</div></div>
<div><div class="sec" style="margin:0 0 8px">Collapsed rail</div><div style="background:var(--bg);border-radius:28px;box-shadow:inset 0 0 0 1px var(--outline-variant)">{rail}</div></div>
<div style="max-width:360px"><div class="sec" style="margin:0 0 8px">Hover flyout from rail</div><div class="dlg" style="padding:8px;width:280px"><div class="sec">Build</div><a class="nav on" href="#">{I("pipe")}Pipelines</a><a class="nav" href="#">{I("build")}Jobs</a><a class="nav" href="#">{I("server")}Runners</a><a class="nav" href="#">{I("file")}Pipeline editor</a></div>
<p class="sub" style="font-size:13px;margin-top:16px">Active item: secondary container pill, bold label, count badge flips to primary. Hover: highest container. Rail labels never truncate; long names wrap to two lines.</p></div>
</div>'''

def tokens():
    from common import S
    roles = ['primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'secondaryContainer', 'onSecondaryContainer', 'tertiary', 'tertiaryContainer', 'error', 'errorContainer', 'success', 'successContainer', 'warning', 'warningContainer', 'surface', 'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'onSurface', 'onSurfaceVariant', 'outline', 'outlineVariant']
    def sw(mode):
        return '<div class="grid4" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">' + ''.join(f'<div style="border-radius:16px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--outline-variant)"><div style="height:56px;background:{S[mode][r]}"></div><div style="padding:8px 10px;font-size:12px"><div style="font-weight:650">{r}</div><div class="mono sub">{S[mode][r]}</div></div></div>' for r in roles) + '</div>'
    shapes = [('xs', 4), ('s', 8), ('m', 12), ('l', 16), ('l+', 20), ('xl', 28), ('xl+', 32), ('xxl', 48), ('full', 999)]
    types = [('Display', 57, 780), ('Headline', 32, 720), ('Title', 20, 680), ('Body', 14, 400), ('Label', 12.5, 650)]
    return f'''<div style="padding:40px;display:flex;flex-direction:column;gap:32px">
<div><h1 class="h1">Material GitLab Expressive tokens</h1><p class="sub" style="margin:6px 0 0">Seed #6E49CB, vibrant scheme; tertiary from GitLab orange #FC6D26; success and warning are custom tonal palettes. Font: Inter (the base of GitLab Sans), JetBrains Mono for code.</p></div>
<section><h2 class="h2" style="margin-bottom:12px">Light</h2>{sw("light")}</section>
<section><h2 class="h2" style="margin-bottom:12px">Dark</h2>{sw("dark")}</section>
<section><h2 class="h2" style="margin-bottom:12px">Shape</h2><div style="display:flex;flex-wrap:wrap;gap:16px">''' + ''.join(f'<div style="text-align:center"><div style="width:88px;height:88px;border-radius:{r}px;background:var(--primary-container)"></div><div class="mono" style="margin-top:6px">{n} {r if r<999 else "pill"}</div></div>' for n, r in shapes) + '''</div></section>
<section><h2 class="h2" style="margin-bottom:12px">Type</h2><div class="list">''' + ''.join(f'<div class="row"><span style="font-size:{s}px;line-height:1.2;font-weight:{w};letter-spacing:{-0.03 if s>30 else 0}em;flex:1">{n}</span><span class="mono sub">{s}px / {w}</span></div>' for n, s, w in types) + '''</div></section>
<section><h2 class="h2" style="margin-bottom:12px">Motion</h2><div class="list">''' + ''.join(f'<div class="row"><span style="flex:1;font-weight:650">{n}</span><span class="mono sub">{v}</span></div>' for n, v in [('Spatial fast (shape morph, small moves)', 'cubic-bezier(0.42, 1.67, 0.21, 0.90) 350ms'), ('Spatial default (drawers, sheets)', 'cubic-bezier(0.38, 1.21, 0.22, 1.00) 500ms'), ('Effects (color, opacity)', 'cubic-bezier(0.34, 0.80, 0.34, 1.00) 200ms'), ('Reduced motion', 'all of the above become 0.01ms')]) + '''</div></section>
<section><h2 class="h2" style="margin-bottom:12px">Components</h2><div class="chips" style="gap:12px"><button class="b b-f" type="button">Filled</button><button class="b b-t" type="button">Tonal</button><button class="b b-o" type="button">Outlined</button><button class="b b-x" type="button">Text</button><button class="b b-e" type="button">Destructive</button><div class="bg"><button class="b b-t" type="button">Day</button><button class="b b-o" type="button">Week</button><button class="b b-o" type="button">Month</button></div><button class="chip on" type="button">Selected</button><button class="chip" type="button">Chip</button><button class="sw on" type="button" role="switch" aria-checked="true" aria-label="Sample switch"></button><span class="st st-ok">Passed</span><span class="st st-run">Running</span><span class="st st-err">Failed</span><span class="st st-warn">Warning</span><button class="fab" type="button">''' + I('plus') + '''New</button></div></section>
</div>'''

def mobile_issues():
    rows = ['Package build cannot write checksum file', 'Board view drops focus ring', 'Bilingual mode clips long captions', 'Command palette exact jump']
    return f'''<div style="width:390px;height:844px;display:flex;flex-direction:column;background:var(--bg);position:relative">
<header style="display:flex;align-items:center;gap:4px;padding:8px 8px 4px"><button class="ib" type="button" aria-label="Open navigation">{I("menu")}</button><h1 class="h2" style="flex:1">Issues</h1><button class="ib" type="button" aria-label="Search">{I("search")}</button><span class="av">DC</span></header>
<div style="padding:4px 16px 12px;overflow-x:auto">{chips(["Open 24","Assigned","Label","Milestone"],0)}</div>
<main style="flex:1;overflow:auto;padding:0 12px 96px"><div class="list">''' + ''.join(f'<div class="row" style="align-items:flex-start;padding:14px 16px">{ISSUE_OPEN()}<div class="grow" style="flex-basis:200px"><div class="rt">{t}</div><div class="rm"><span class="mono">#[id]</span>{lbl("frontend","primary-container","on-primary-container")}</div></div></div>' for t in rows) + f'''</div></main>
<button class="fab" type="button" style="position:absolute;right:16px;bottom:96px">{I("plus")}New issue</button>
<nav style="position:absolute;left:0;right:0;bottom:0;height:80px;display:flex;justify-content:space-around;align-items:center;background:var(--surface-container)" aria-label="Primary">''' + ''.join(f'<a href="#" style="display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;font-weight:{700 if on else 500};color:{"var(--on-secondary-container)" if on else "var(--on-surface-variant)"};text-decoration:none"><span style="width:56px;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center;{"background:var(--secondary-container)" if on else ""}">{I(i)}</span>{t}</a>' for i, t, on in [('home','Home',0),('issue','Issues',1),('mr','Merge',0),('todo','To-Do',0)]) + '</nav></div>'

def mobile_mr():
    return f'''<div style="width:390px;height:844px;display:flex;flex-direction:column;background:var(--bg)">
<header style="display:flex;align-items:center;gap:4px;padding:8px"><button class="ib" type="button" aria-label="Back">{I("chev")}</button><span class="mono sub" style="flex:1">!{"[id]"}</span><button class="ib" type="button" aria-label="More">{I("more")}</button></header>
<main style="flex:1;overflow:auto;padding:0 16px 24px">
<div style="margin-bottom:8px">{st("p","Open","mr")}</div>
<h1 class="h2" style="font-size:24px;line-height:32px">Adopt Material 3 Expressive tokens across the shell</h1>
<div class="sub" style="font-size:13px;margin:8px 0 16px">feature/expressive-chrome into main</div>
<div class="list">
{row(ic_badge("pipe","success-container","on-success-container",36,999),"Pipeline passed","<span>[n] jobs</span>")}
{row(ic_badge("check","primary-container","on-primary-container",36,999),"Approved","<span>1 of 1</span>")}
</div>
<div class="card" style="margin-top:12px;display:flex;flex-direction:column;gap:12px"><label style="display:flex;gap:10px;align-items:center;justify-content:space-between">Delete source branch<button class="sw on" type="button" role="switch" aria-checked="true" aria-label="Delete source branch"></button></label><label style="display:flex;gap:10px;align-items:center;justify-content:space-between">Squash commits<button class="sw" type="button" role="switch" aria-checked="false" aria-label="Squash commits"></button></label><button class="b b-f b-l" type="button" style="justify-content:center">{I("mr")}Merge</button></div>
</main></div>'''

def shell_dark():
    return overview()

SURFACES = [
    # file, canvas title, page title, func, w, h, kind, dark
    ('Main.dc.html', 'Shell and project overview', 'Shell and project overview', overview, 1440, 1180, 'page', False),
    ('Shell-Dark.dc.html', 'Shell and project overview, dark', 'Shell and project overview, dark', shell_dark, 1440, 1180, 'page', True),
    ('Sidebar.dc.html', 'Sidebar states', 'Sidebar states', sidebar_states, 1180, 1080, 'fixed', False),
    ('Login.dc.html', 'Sign in', 'Sign in', login, 1440, 900, 'page', False),
    ('Command-Palette.dc.html', 'Command palette', 'Command palette', palette, 1440, 900, 'page', False),
    ('Regex-Builder.dc.html', 'Regex builder', 'Regex builder', regex, 1440, 900, 'page', False),
    ('Issues.dc.html', 'Issues list', 'Issues list', issues, 1440, 1000, 'page', False),
    ('Plan.dc.html', 'Issue boards', 'Issue boards', plan, 1440, 1000, 'page', False),
    ('Epics.dc.html', 'Epics roadmap', 'Epics roadmap', epics, 1440, 1000, 'page', False),
    ('Merge-Requests.dc.html', 'Merge request', 'Merge request', mrs, 1440, 1180, 'page', False),
    ('Code.dc.html', 'Code viewer', 'Code viewer', code, 1440, 1000, 'page', False),
    ('Repository.dc.html', 'Repository commits', 'Repository commits', repo, 1440, 1000, 'page', False),
    ('Pipelines.dc.html', 'Pipelines', 'Pipelines', pipelines, 1440, 1100, 'page', False),
    ('Build.dc.html', 'Job log', 'Job log', build, 1440, 1000, 'page', False),
    ('Deploy.dc.html', 'Deploy environments', 'Deploy environments', deploy, 1440, 1180, 'page', False),
    ('Operate.dc.html', 'Operate', 'Operate', operate, 1440, 1000, 'page', False),
    ('Monitor.dc.html', 'Monitor alerts', 'Monitor alerts', monitor, 1440, 1000, 'page', False),
    ('Secure.dc.html', 'Vulnerability report', 'Vulnerability report', secure, 1440, 1000, 'page', False),
    ('Security.dc.html', 'Security dashboard', 'Security dashboard', security, 1440, 1000, 'page', False),
    ('Analyze.dc.html', 'Value stream', 'Value stream', analyze, 1440, 1000, 'page', False),
    ('Manage.dc.html', 'Members', 'Members', manage, 1440, 1000, 'page', False),
    ('Settings.dc.html', 'Settings', 'Settings', settings, 1440, 1180, 'page', False),
    ('Admin.dc.html', 'Admin area', 'Admin area', admin, 1440, 1000, 'page', False),
    ('Todos.dc.html', 'To-Do list', 'To-Do list', todos, 1440, 1000, 'page', False),
    ('Agent-Memory.dc.html', 'Agent memory', 'Agent memory', memory, 1440, 1100, 'page', False),
    ('Tokens.dc.html', 'Material 3 Expressive tokens', 'Material 3 Expressive tokens', tokens, 1440, 2200, 'fixed', False),
    ('Mobile-Issues.dc.html', 'Mobile issues', 'Mobile issues', mobile_issues, 390, 844, 'fixed', False),
    ('Mobile-MR.dc.html', 'Mobile merge request', 'Mobile merge request', mobile_mr, 390, 844, 'fixed', True),
]
