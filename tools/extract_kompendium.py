"""Extrahiert strukturierte Rohdaten aus der Textfassung des Gemeinsamen Kompendiums Rettungsdienst 2026.

Aufruf:  python3 -I tools/extract_kompendium.py <GemKompRD2026.pdf.txt> <ausgabeordner>

Die Ausgabe ist ein maschineller Textauszug (Status: nicht visuell geprüft).
Sie enthält vertrauliche Inhalte und gehört NICHT in ein öffentliches Repository.
"""
import json, re, sys, os, hashlib

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
raw = open(SRC, encoding='utf-8').read()
L = raw.split('\n')
SHA = hashlib.sha256(raw.encode()).hexdigest()

# ---------- Kompetenzzeilen (farbige Gültigkeitsfelder als Text) ----------
CODES = r'(?:TNA - Bergisches Land|TNA - BL|SR AC|E-3A|RKN|HSK|HAM|HER|BOT|KLE|VIE|REK|MH|MG|DN|AC|EU|BO|UN|DO|GL|GE|HS|DU|KR|OB|HA|E|D)'
LVL = r'(?:RS|RettAss|NotSan|Notsan|Notarzt|TNA ?/ ?NA|TNA\+NotSan|►|▶)'
TOK = CODES + r'(?: ?·)?(?: ' + LVL + r')?\*{0,3}(?: ?[｜|] ?★| ?★)?\*{0,3}⁺?'
ROW = re.compile(r'^\s*' + TOK + r'(?:\s+' + TOK + r')*\s*$')
GE_RE = re.compile(r'(?:^|\s)GE(?: ?·)?(?: (' + LVL + r'))?(\*{0,3})( ?[｜|]? ?★)?(\*{0,3}⁺?)')

def is_row(l):
    s = l.strip()
    return len(s) > 3 and bool(ROW.match(s)) and (('·' in s) or re.search(LVL, s) is not None) and ' ' in s

def ge_of(rows):
    for r in rows:
        if 'TNA - BL GE' in r:
            continue
        m = GE_RE.search(r)
        if m:
            lvl = (m.group(1) or '').replace('Notsan', 'NotSan').replace('TNA/NA', 'TNA / NA')
            return {'level': lvl or None, 'star': bool(m.group(3)),
                    'mark': ((m.group(2) or '') + (m.group(4) or '')).strip(), 'rowText': r.strip()}
    return None

def norm_level(s):
    return None if s is None else s.replace('Notsan', 'NotSan')

# ---------- Seitenfüße ----------
P1 = re.compile(r'^(\d{1,3}) erstellt:(.*)$'); P2 = re.compile(r'^erstellt:(.*?)\s(\d{1,3})\s*$')
footers = []
for i, l in enumerate(L):
    s = l.strip(); m = P1.match(s)
    if m: footers.append((i, int(m.group(1)), m.group(2).strip())); continue
    m = P2.match(s)
    if m: footers.append((i, int(m.group(2)), m.group(1).strip()))
def page_after(i):
    return next((n for fi, n, _ in footers if fi >= i), None)

# ---------- Inhaltsverzeichnis ----------
toc = []
for l in L[45:180]:
    m = re.match(r'^(.*\S)\s+(\d{1,3})\s*$', l.strip())
    if m and not l.strip().startswith('erstellt'):
        toc.append({'title': m.group(1).strip(), 'page': int(m.group(2))})
toc.sort(key=lambda x: x['page'])

# ---------- Abschnittsparser ----------
def sections(lines, heads):
    out, cur = {}, None
    hre = re.compile(r'^(' + '|'.join(re.escape(h) for h in heads) + r')\s*:?\s*(.*)$')
    for l in lines:
        s = l.rstrip()
        m = hre.match(s.strip())
        if m:
            cur = m.group(1); out.setdefault(cur, [])
            rest = m.group(2).strip()
            if rest: out[cur].append(rest)
        elif cur and s.strip():
            out[cur].append(s.strip())
    return out

def bullets(lines):
    """Zerlegt ' - a - b' Zeilen in Einzelpunkte, ohne Inhalte zu verändern."""
    items = []
    for l in lines:
        parts = re.split(r'(?:^|\s)[-⁃]\s+(?=\S)', ' ' + l)
        parts = [p.strip() for p in parts if p.strip()]
        if l.strip().startswith(('-', '⁃')):
            items.extend(parts)
        elif items and not re.match(r'^[A-ZÄÖÜ]', l.strip()) and len(parts) == 1:
            items[-1] += ' ' + parts[0]
        else:
            items.extend(parts)
    return items

# ---------- Medikamenten-SAA (S. 49 - 79) ----------
MED_TOC = [t for t in toc if 49 <= t['page'] <= 79]
MED_HEADS = ['Wirkstoff', 'Konzentration', 'Arzneimittelgruppe', 'Indikationen', 'Keine Anwendung, wenn',
             'Altersbegrenzung', 'Anwendung nach sorgfältiger Nutzen-Risiko-Abwägung, wenn', 'Primäre Maßnahmen',
             'Durchführung / Dosierung (buccale, nasalen und intravenöse und intramuskuläre Applikation stellen Alternativen dar)',
             'Durchführung / Dosierung', 'Unerwünschte Arzneimittelwirkungen (UAW) / Risiken', 'Überdosierung / Gegenmaßnahmen',
             'Besonderheiten', 'Besondere Hinweise zur Anwendung']
starts = [i for i in range(2440, 3500) if L[i].startswith('Wirkstoff:')]
vel = next(i for i in range(3440, 3500) if L[i].strip() == 'Vollelektrolytlösung')
starts.append(vel)
starts.sort()
ends = starts[1:] + [next(i for i in range(vel, 3520) if L[i].startswith('erstellt: SAA/BPR 6L-AG 79'))]
MED_TITLES = {t['title'].replace('SAA ', '') for t in MED_TOC}
meds = []
for k, (a, b) in enumerate(zip(starts, ends)):
    seg = L[a:b]
    t = MED_TOC[k]
    name = t['title'].replace('SAA ', '')
    # Rohtext ohne Fußzeilen und ohne Titelzeilen anderer Seiten
    clean = [x for x in seg if not P1.match(x.strip()) and not P2.match(x.strip())
             and x.strip().rstrip('*') not in MED_TITLES]  # Seitentitel entfernen
    rows = [x for x in clean if is_row(x)]
    sec = sections([x for x in clean if not is_row(x)], MED_HEADS)
    dose_key = next((h for h in sec if h.startswith('Durchführung / Dosierung')), None)
    meds.append({
        'name': name, 'printedPage': t['page'], 'lines': [a + 1, b],
        'wirkstoff': ' '.join(sec.get('Wirkstoff', [])) or None,
        'konzentration': sec.get('Konzentration'), 'gruppe': ' '.join(sec.get('Arzneimittelgruppe', [])) or None,
        'indikationen': bullets(sec.get('Indikationen', [])),
        'keineAnwendung': bullets(sec.get('Keine Anwendung, wenn', [])),
        'altersbegrenzung': sec.get('Altersbegrenzung'),
        'nutzenRisiko': bullets(sec.get('Anwendung nach sorgfältiger Nutzen-Risiko-Abwägung, wenn', [])),
        'primaereMassnahmen': sec.get('Primäre Maßnahmen'),
        'dosierungHinweis': dose_key[len('Durchführung / Dosierung'):].strip() or None if dose_key else None,
        'dosierung': sec.get(dose_key, []) if dose_key else [],
        'uaw': bullets(sec.get('Unerwünschte Arzneimittelwirkungen (UAW) / Risiken', [])),
        'ueberdosierung': sec.get('Überdosierung / Gegenmaßnahmen'),
        'besonderheiten': bullets(sec.get('Besonderheiten', []) + sec.get('Besondere Hinweise zur Anwendung', [])),
        'kompetenzZeilen': rows, 'geSAA': ge_of(rows),
        'rawText': '\n'.join(clean),
    })

# ---------- Invasive SAA (S. 27 - 45) ----------
INV_HEADS = ['Indikationen / Symptome', 'Indikationen', 'Kontraindikationen', 'Alternativen', 'Aufklärung / Risiken',
             'Einwilligung', 'Durchführung', 'Erfolgsprüfung', 'Gegenmaßnahmen', 'Verlaufskontrolle', 'Anmerkungen',
             'Abbruchkriterien']
foot_by_page = {}
for fi, n, a in footers:
    foot_by_page.setdefault(n, fi)
inv = []
for t in [t for t in toc if 27 <= t['page'] <= 45]:
    n = t['page']; end = foot_by_page[n]
    prev = max(fi for fi, pn, _ in footers if fi < end)
    seg = L[prev + 2:end]
    rows = [x for x in seg if is_row(x)]
    foot = [x.strip() for x in seg if re.match(r'^\s*\*[A-ZÄÖÜ]', x)]
    sec = sections([x for x in seg if not is_row(x) and not re.match(r'^\s*\*[A-ZÄÖÜ]', x) and not re.match(r'^[A-Z][A-Z\-]{0,3}(?: AC)? · ', x.strip())], INV_HEADS)
    inv.append({'tocTitle': t['title'], 'title': L[end + 1].strip(), 'printedPage': n, 'lines': [prev + 3, end],
                'sections': {k: bullets(v) for k, v in sec.items()},
                'kompetenzZeilen': rows, 'fussnoten': foot, 'GE': ge_of(rows), 'rawText': '\n'.join(seg)})

# ---------- Kompetenzblöcke in BPR (Medikamenten-/Maßnahmenkästen) ----------
blocks = []; i = 0; last = 0
while i < len(L):
    if is_row(L[i]):
        j = i
        while j + 1 < len(L) and (is_row(L[j + 1]) or re.match(r'^\s*\*{1,3}[A-ZÄÖÜa-zäöü]', L[j + 1])):
            j += 1
        ctx = [x.strip() for x in L[max(last, i - 10):i] if x.strip() and not P1.match(x.strip()) and not P2.match(x.strip())]
        rows = [x.strip() for x in L[i:j + 1]]
        blocks.append({'line': i + 1, 'printedPageApprox': page_after(i), 'context': ctx, 'rows': rows, 'GE': ge_of(rows),
                       'geMentioned': any(re.search(r'(?:^|\s)GE(?:\s|·|$)', r) for r in rows if 'TNA - BL GE' not in r)})
        last = j + 1; i = j + 1
    else:
        i += 1

# ---------- Seiten (Seiten sind in der Textfassung durch Leerzeilen getrennt) ----------
chunks, cur, start = [], [], 0
for i, l in enumerate(L):
    if l.strip() == '':
        if cur: chunks.append([start, i])
        cur = []; start = i + 1
    else:
        cur.append(l)
if cur: chunks.append([start, len(L)])
pages, pending = [], None
for a, b in chunks:
    if pending is not None:
        a = pending; pending = None
    seg = L[a:b]
    num, title, author = None, None, None
    for k, x in enumerate(seg):
        m = P1.match(x.strip()) or P2.match(x.strip())
        if m:
            num = int(m.group(1)) if P1.match(x.strip()) else int(m.group(2))
            author = (m.group(2) if P1.match(x.strip()) else m.group(1)).strip()
            title = seg[k + 1].strip() if k + 1 < len(seg) else None
    if num is None and len(seg) <= 5 and re.match(r'^\d{1,3}$', seg[-1].strip()):
        num = int(seg[-1].strip()); title = ' '.join(x.strip() for x in seg[:-1]); author = 'Kapitelseite'
    if num is None and a > 100 and b < len(L) - 40:
        pending = a; continue  # Teilstück ohne Seitenfuß -> mit folgendem Abschnitt zusammenführen
    pages.append({'printedPage': num, 'author': author, 'footerTitle': title, 'lines': [a + 1, b],
                  'text': '\n'.join(x for x in seg if not (P1.match(x.strip()) or P2.match(x.strip())))})
def page_of_line(n):
    for p in pages:
        if p['lines'][0] <= n <= p['lines'][1]: return p['printedPage']
    return None
for bl in blocks: bl['printedPage'] = page_of_line(bl['line'])

meta = {'source': 'Gemeinsames Kompendium Rettungsdienst 2026', 'file': os.path.basename(SRC), 'sha256': SHA,
        'version': '2026', 'extractionMethod': 'Textfassung (.pdf.txt), keine visuelle Prüfung', 'lines': len(L)}
for name, obj in [('meta', meta), ('toc', toc), ('medications_raw', meds), ('saa_invasive_raw', inv), ('ge_blocks', blocks), ('pages', pages)]:
    json.dump(obj, open(os.path.join(OUT, name + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('toc', len(toc), 'meds', len(meds), 'inv', len(inv), 'blocks', len(blocks), 'GE blocks', sum(1 for b in blocks if b['GE']))
