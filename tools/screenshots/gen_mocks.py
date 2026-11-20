#!/usr/bin/env python3
"""Generates mock-feed.html and mock-activity.html (fictional users, static HTML)."""
import html, pathlib

HERE = pathlib.Path(__file__).parent
BANNER = "<!-- mock page with fictional users for documentation screenshots. Not Threads; no real people or posts. -->"
CSS = """
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#101010;font:15px/1.4 -apple-system,'Segoe UI',system-ui,Roboto,Arial,sans-serif}
.col{width:620px;margin:0 auto;border-left:1px solid #e6e6e6;border-right:1px solid #e6e6e6;min-height:100vh}
.top{height:56px;display:flex;align-items:center;justify-content:center;font-weight:600;border-bottom:1px solid #e6e6e6}
.post{display:flex;gap:12px;padding:16px 20px 10px;border-bottom:1px solid #e6e6e6;position:relative}
.av{flex:none;width:40px;height:40px;border-radius:50%;color:#fff;font-weight:600;font-size:14px;display:flex;align-items:center;justify-content:center}
.body{flex:1;min-width:0}
.head{display:flex;align-items:center;gap:8px;height:24px}
.handle{font-weight:600;color:#101010;text-decoration:none}
.head time{color:#999;font-size:14px}
.head time a{color:#999;text-decoration:none}
.sp{flex:1}
.ib{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#777;cursor:pointer}
.txt{margin:2px 0 4px}
.tr{color:#999;font-size:13px;display:block;margin-bottom:4px}
.acts{display:flex;gap:4px;margin:6px 0 0 -8px}
.act{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:18px;color:#555;font-size:13px;cursor:pointer}
.act svg,.ib svg{flex:none}
.thumb{width:44px;height:44px;border-radius:8px}
.badge{position:absolute;right:-3px;bottom:-3px;width:18px;height:18px;border-radius:50%;border:2px solid #fff}
.avw{position:relative;flex:none;width:40px;height:40px}
.row{display:flex;gap:12px;align-items:center;padding:14px 20px;border-bottom:1px solid #e6e6e6;position:relative}
.row .body{display:flex;flex-direction:column;flex:1}
.who{font-weight:600}.who small{font-weight:400;color:#999;font-size:14px;margin-left:6px}
.prev{color:#666}
"""
DOTS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>'
PENCIL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg>'
def ico(d): return f'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{d}</svg>'
HEART=ico('<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/>')
COMMENT=ico('<path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.5A7.5 7.5 0 1 1 20 11.5z"/>')
REPOST=ico('<path d="M5 11V9.5A2.5 2.5 0 0 1 7.5 7H19"/><path d="M16 4l3 3-3 3"/><path d="M19 13v1.5a2.5 2.5 0 0 1-2.5 2.5H5"/><path d="M8 20l-3-3 3-3"/>')
SHARE=ico('<path d="M21 4L10 14"/><path d="M21 4l-6.5 17-4.5-7-7-4.5z"/>')

POSTS = [
 ("maya.writes","MW","#7c4dff","2026-11-19T08:12:00Z","Q7mWr01","Draft one is the ugliest draft. That is its whole job. Ship it to the folder and fix it tomorrow.",False,("1.2K","94","27","4")),
 ("tomas.codes","TC","#0a7cff","2026-11-18T19:40:00Z","Tc9xK22","Small habit that paid off: write the failing test before the coffee gets cold. Future you says thanks.",True,("864","41","9","2")),
 ("lin.bakes","LB","#e8590c","2026-11-18T07:05:00Z","Lb4nP33","Sourdough update: 78% hydration, long cold rest, and a crust that sings when it cools. Recipe in my notes.",False,("2.3K","132","58","11")),
 ("dev.priya","DP","#12b886","2026-11-17T16:22:00Z","Dp2sQ44","Reading list for the weekend: one novel, one field guide, one very long essay about maps.",False,("310","18","6","1")),
 ("ari.travels","AT","#d6336c","2026-11-16T11:30:00Z","At8vL55","Night train from the coast, window seat, tea in a paper cup. Slow travel is underrated.",True,("1.8K","76","40","9")),
 ("sam.reads.slow.books","SR","#495057","2026-11-15T21:15:00Z","Sr5hT66","Finished a book that I did not want to end, so now I am rereading the first chapter on purpose.",False,("527","33","12","3")),
]

def post(h,ini,col,dt,code,text,tr,counts):
    l,c,r,s = counts
    trx = '<span dir="auto" class="tr">Translate</span>' if tr else ''
    return f'''<div class="post" data-pressable-container="true">
 <div class="av" style="background:{col}">{ini}</div>
 <div class="body">
  <div class="head"><a class="handle" href="/@{h}"><span dir="auto">{h}</span></a><time datetime="{dt}"><a href="/@{h}/post/{code}">{dt[5:10].replace('-','/')}</a></time><div class="sp"></div>
   <div class="ib" role="button" tabindex="0" aria-label="Edit">{PENCIL}</div>
   <div class="ib" role="button" tabindex="0" aria-label="More">{DOTS}</div></div>
  <div class="txt"><span dir="auto">{html.escape(text)}</span></div>
  {trx}
  <div class="acts">
   <div class="act" role="button" tabindex="0">{HEART}<span>{l}</span></div>
   <div class="act" role="button" tabindex="0">{COMMENT}<span>{c}</span></div>
   <div class="act" role="button" tabindex="0">{REPOST}<span>{r}</span></div>
   <div class="act" role="button" tabindex="0">{SHARE}<span>{s}</span></div>
  </div>
 </div>
</div>'''

def page(title, body):
    return f'<!doctype html>\n{BANNER}\n<html lang="en"><head><meta charset="utf-8"><title>{title}</title><style>{CSS}</style></head><body><div class="col">{body}</div></body></html>\n'

feed = '<div class="top">Home</div>' + "\n".join(post(*p) for p in POSTS)
(HERE/"mock-feed.html").write_text(page("Mock feed", feed))

def grad(a,b,mode='img'):
    import urllib.parse
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs><rect width="44" height="44" rx="8" fill="url(#g)"/></svg>'
    if mode == 'svg':   # inline <svg> thumbnail (not an <img>)
        return svg.replace('<svg ', '<svg class="thumb" width="44" height="44" ', 1).replace('id="g"', f'id="g{a[1:]}"').replace('url(#g)', f'url(#g{a[1:]})')
    if mode == 'bg':    # <div> with a CSS background-image
        return f'<div class="thumb" style="background:url(&quot;data:image/svg+xml,{urllib.parse.quote(svg)}&quot;) center/cover"></div>'
    return f'<img class="thumb" alt="" width="44" height="44" src="data:image/svg+xml,{urllib.parse.quote(svg)}">'
ACT = [
 ("maya.writes","MW","#7c4dff","#e03131","5m","liked your reply: \"Draft one is the ugliest draft\"","A1mw01","none"),
 ("tomas.codes","TC","#0a7cff","#12b886","12m","replied: \"Writing the test first changed how I design.\"","A2tc02","thumb:#74c0fc:#364fc9:svg"),
 ("lin.bakes","LB","#e8590c","#e03131","27m","liked your post about slow mornings","A3lb03","none"),
 ("dev.priya","DP","#12b886","#0a7cff","1h","reposted your list of weekend books","A4dp04","pencil"),
 ("ari.travels","AT","#d6336c","#7c4dff","3h","mentioned you: \"Ask nora about the night train.\"","A5at05","thumb:#ffd43b:#f76707:bg"),
 ("nora.draws","ND","#862e9c","#e03131","1d","liked your photo of the harbor sketch","A6nd06","none"),
]
rows=[]
for h,ini,col,bc,t,prev,code,extra in ACT:
    ex=''
    if extra.startswith('thumb'):
        _,a,b,mode=(extra.split(':')+['img'])[:4]; ex=grad(a,b,mode)
    elif extra=='pencil': ex=f'<div class="ib" role="button" tabindex="0" aria-label="Edit">{PENCIL}</div>'
    rows.append(f'''<div class="row" data-pressable-container="true">
 <div class="avw"><div class="av" style="background:{col}">{ini}</div><div class="badge" style="background:{bc}"></div></div>
 <div class="body"><div><span dir="auto" class="who">{h}</span><span dir="auto" class="who"><small>and 29 others</small></span><time datetime="2026-11-20T09:00:00Z"><a href="/@{h}/post/{code}" style="color:#999;text-decoration:none;font-size:14px;margin-left:6px">{t}</a></time></div>
 <span dir="auto" class="prev">{html.escape(prev)}</span></div>
 {ex}
 <div class="ib" role="button" tabindex="0" aria-label="More">{DOTS}</div>
</div>''')
(HERE/"mock-activity.html").write_text(page("Mock activity", '<div class="top">Activity</div>'+"\n".join(rows)))
