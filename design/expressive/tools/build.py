import json, sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from common import page
from surfaces import SURFACES
out = sys.argv[1]; mode = 'public'
os.makedirs(out + '/project', exist_ok=True)
boards, order, notes = {}, [], {}
rows = [SURFACES[0:4], SURFACES[4:8], SURFACES[8:12], SURFACES[12:16], SURFACES[16:20], SURFACES[20:24], SURFACES[24:]]
row_names_uh = None
row_names_pub = ['Shell, sidebar, sign in', 'Overlays and issues', 'Plan, merge, code', 'Build and ship', 'Monitor, secure, insight', 'Manage, settings, admin, memory', 'Tokens and mobile']
y = 0
for ri, r in enumerate(rows):
    x = 0; maxh = 0
    notes[f'row{ri}'] = {"x": 0, "y": y - 260, "text": row_names_pub[ri], "kind": "title1", "maxW": 5000}
    for f, tu, tp, fn, w, h, kind, dark in r:
        html = page(tp, fn(), w, h, dark=dark, fixed=(kind == 'fixed'))
        open(f'{out}/project/{f}', 'w').write(html)
        b = {"x": x, "y": y, "w": w, "h": h, "title": tp}
        if kind == 'page': b["expand"] = "fill"
        boards[f] = b; order.append(f)
        x += w + 80; maxh = max(maxh, h)
    y += maxh + 120 + 260
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}, "title": "Material GitLab Expressive",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order, "notes": notes, "designSystems": []}
json.dump(canvas, open(f'{out}/project/canvas.json', 'w'), indent=1)
print(len(order), 'boards')
