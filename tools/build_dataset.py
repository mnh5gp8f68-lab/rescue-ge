"""Baut data/dataset.json aus der Kompendium-Textfassung, den lokalen Dokumenten und den kuratierten Dateien.

Aufruf (im Projektordner):  python3 -I tools/build_dataset.py
Bricht ab, wenn ein Zitat einer Rechenregel nicht wörtlich in der Quelle steht.
"""
import json, os, re, subprocess, sys, datetime, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'data')
SRC = os.path.join(D, 'sources', 'GemKompRD2026.pdf.txt')
RAW = os.path.join(D, 'raw')
subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'tools', 'extract_kompendium.py'), SRC, RAW], check=True)
J = lambda *p: json.load(open(os.path.join(*p), encoding='utf-8'))
meta, toc, meds_raw, inv_raw, blocks, pages = (J(RAW, n + '.json') for n in ['meta', 'toc', 'medications_raw', 'saa_invasive_raw', 'ge_blocks', 'pages'])
cur = {n: J(D, 'curated', n + '.json') for n in ['med_competence', 'calc_rules', 'issues', 'local', 'synonyms', 'hospitals']}
text = open(SRC, encoding='utf-8').read(); L = text.split('\n')
norm = lambda s: re.sub(r'\s+', ' ', s).strip()
NT = norm(text)
KOMP = 'kompendium-2026'
errors = []

def slug(s):
    s = s.lower()
    for a, b in [('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss')]: s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

# Seitennummern der Kapitel-/Randseiten ergänzen (Reihenfolge der Textfassung = Seitenfolge)
for i, p in enumerate(pages):
    if p['printedPage'] is None: p['printedPage'] = i + 1
page_text = {p['printedPage']: p['text'] for p in pages}

LV = r'(?:RS|RettAss|NotSan|Notsan|Notarzt|TNA ?/ ?NA|TNA\+NotSan|►|▶)'
CODE = r'(?:TNA - Bergisches Land|SR AC|E-3A|RKN|HSK|HAM|HER|BOT|KLE|VIE|REK|MH|MG|DN|AC|EU|BO|UN|DO|GL|GE|HS|DU|KR|OB|HA|D|E)'
ROWISH = re.compile(r'^(?:' + CODE + r')(?:\s|·|$)')
GE_RE = re.compile(r'(?:^|\s)GE(?: ?·)?(?: (' + LV + r'))?(\*{0,3})( ?[｜|]? ?★)?(\*{0,3}⁺?)')
FOOT = re.compile(r'^(\d{1,3}) erstellt:|^erstellt:.*\s\d{1,3}\s*$')

def page_of_line(n):
    for p in pages:
        if p['lines'][0] <= n <= p['lines'][1]: return p['printedPage']

def competence_at(line):
    """Kompetenzzeilen ab Zeile `line` (1-basiert) und Kastentext darüber."""
    i = line - 1; rows = []
    while i < len(L) and len(rows) < 12:
        s = L[i].strip()
        if ROWISH.match(s) or re.match(r'^\*{1,3}\S', s): rows.append(s); i += 1
        else: break
    j = line - 2; box = []; pre_foot = []
    while j >= 0 and re.match(r'^\*{1,3}[A-ZÄÖÜa-z]', L[j].strip()):   # Fußnoten direkt über den Zeilen
        pre_foot.insert(0, L[j].strip()); j -= 1
    while j >= 0 and len(box) < 10:
        s = L[j].strip()
        if not s or FOOT.match(s) or ROWISH.match(s) or re.match(r'^\*{1,3}[A-ZÄÖÜa-z]', s): break
        box.insert(0, s); j -= 1
    ge = None; mentioned = False
    for r in rows:
        if r.startswith('*'): continue
        m = GE_RE.search(r)
        if m:
            mentioned = True
            lvl = (m.group(1) or '').replace('Notsan', 'NotSan').replace('TNA/NA', 'TNA / NA') or None
            ge = {'level': lvl, 'star': bool(m.group(3)), 'mark': ((m.group(2) or '') + (m.group(4) or '')).strip()}
    foot = pre_foot + [r for r in rows if r.startswith('*')]
    ge_foot = [f for f in foot if re.search(r'Gelsenkirchen|\bGE\b', f)]
    return {'line': line, 'page': page_of_line(line), 'box': box, 'rows': rows, 'footnotes': foot, 'geFootnotes': ge_foot, 'ge': ge}

def src(page, extra=None):
    d = {'sourceId': KOMP, 'printedPage': page, 'pdfPage': page, 'pdfPageDerived': True}
    if extra: d.update(extra)
    return d

ISSUE_BY_PAGE = {}
for q in cur['issues']['issues']:
    for p in q['pages']: ISSUE_BY_PAGE.setdefault(p, []).append(q['id'])
syn = cur['synonyms']

# ---------- SAA invasive Maßnahmen ----------
SAA_CAT = {27: 'Grundlagen', 28: 'Zugänge', 29: 'Zugänge', 30: 'Atemwegsmanagement', 31: 'Atemwegsmanagement', 32: 'Atemwegsmanagement',
           33: 'Atemwegsmanagement', 34: 'Atemwegsmanagement', 35: 'CPAP / NIV', 36: 'Blutstillung', 37: 'Immobilisation',
           38: 'Immobilisation', 39: 'Weitere Maßnahmen', 40: 'Defibrillation', 41: 'Kardioversion', 42: 'Schrittmacher',
           43: 'Atemwegsmanagement', 44: 'Medikamentengabe', 45: 'Medikamentengabe'}
saa = []
for s in inv_raw:
    ge = s['GE']
    status = 'Teilweise geprüft' if ge and ge['level'] else 'GE-Gültigkeit noch zu prüfen'
    if s['printedPage'] == 27: status = 'Unvollständige Quelle'
    sid = 'saa-' + slug(s['title'])[:40]
    saa.append({'id': sid, 'kind': 'saa', 'title': s['title'], 'category': SAA_CAT.get(s['printedPage'], 'Weitere Maßnahmen'),
                'sections': [{'heading': k, 'items': v} for k, v in s['sections'].items()],
                'ge': ge and {'level': norm_lvl if (norm_lvl := (ge['level'] or '').replace('Notsan', 'NotSan')) else None, 'star': ge['star'], 'mark': ge['mark'], 'rowText': ge['rowText']},
                'competenceRows': s['kompetenzZeilen'], 'footnotes': s['fussnoten'], 'rawText': page_text.get(s['printedPage'], s['rawText']),
                'status': status, 'issues': ISSUE_BY_PAGE.get(s['printedPage'], []), 'source': src(s['printedPage']),
                'synonyms': syn['saa'].get(str(s['printedPage']), []), 'isFlowchart': s['printedPage'] == 27})

# ---------- Medikamente ----------
comp_by_med = {}
for e in cur['med_competence']['entries']:
    c = competence_at(e['line']); c['label'] = e['label']
    if c['page'] is None: errors.append('Kompetenzzeile nicht gefunden: %s' % e)
    comp_by_med.setdefault(e['med'], []).append(c)
NOT_BRANDS = {'MAD®', 'EZ-IO®', 'Cook®', 'BIG®', 'LTS-D®', 'PediaTape®'}  # Geräte, keine Handelsnamen von Arzneimitteln
CONFLICT = {'glucose': 'Q03', 'butylscopolamin': 'Q04', 'esketamin': 'Q05', 'fentanyl': 'Q06', 'amiodaron': 'Q07'}
meds = []
for m in meds_raw:
    mid = slug(m['name'])
    comps = comp_by_med.get(mid, [])
    if m['geSAA']:
        comps.insert(0, {'label': 'SAA ' + m['name'], 'line': m['lines'][0], 'page': m['printedPage'], 'box': [], 'rows': m['kompetenzZeilen'],
                         'footnotes': [], 'geFootnotes': [], 'ge': {'level': m['geSAA']['level'], 'star': m['geSAA']['star'], 'mark': m['geSAA']['mark']}})
    anyge = any(c['ge'] and c['ge']['level'] for c in comps)
    status = 'Widersprüchliche Quellen' if mid in CONFLICT else ('Teilweise geprüft' if anyge else 'GE-Gültigkeit noch zu prüfen')
    raw_all = m['rawText'] + '\n' + '\n'.join(' '.join(c['box']) for c in comps)
    brands = sorted(set(b for b in re.findall(r'([A-ZÄÖÜ][\w\-]*(?: [A-Z]{1,3})?®)', raw_all) if b not in NOT_BRANDS))
    issues = sorted(set(ISSUE_BY_PAGE.get(m['printedPage'], []) + ([CONFLICT[mid]] if mid in CONFLICT else []) +
                        [q for c in comps for q in ISSUE_BY_PAGE.get(c['page'], []) if q in ('Q09', 'Q03', 'Q05', 'Q06', 'Q12')]))
    meds.append({'id': mid, 'kind': 'medication', 'name': m['name'], 'wirkstoff': m['wirkstoff'] or m['name'], 'handelsnamen': brands,
                 'konzentration': m['konzentration'] or [], 'gruppe': m['gruppe'], 'indikationen': m['indikationen'],
                 'keineAnwendung': m['keineAnwendung'], 'altersbegrenzung': m['altersbegrenzung'] or [], 'nutzenRisiko': m['nutzenRisiko'],
                 'primaereMassnahmen': m['primaereMassnahmen'] or [], 'dosierungHinweis': m['dosierungHinweis'], 'dosierung': m['dosierung'],
                 'uaw': m['uaw'], 'ueberdosierung': m['ueberdosierung'] or [], 'besonderheiten': m['besonderheiten'],
                 'geCompetence': comps, 'status': status, 'issues': issues, 'rawText': m['rawText'],
                 'source': src(m['printedPage']), 'synonyms': syn['medications'].get(mid, []), 'hasSAA': True})
for e in cur['med_competence']['nichtImSAAVerzeichnis']:
    c = competence_at(e['line']); c['label'] = e['label']
    meds.append({'id': slug(e['name']), 'kind': 'medication', 'name': e['name'], 'wirkstoff': e['name'], 'handelsnamen': sorted(set(re.findall(r'([A-ZÄÖÜ][\w\-]*(?: [A-Z]{1,3})?®)', ' '.join(c['box'])))),
                 'konzentration': [], 'gruppe': None, 'indikationen': [], 'keineAnwendung': [], 'altersbegrenzung': [], 'nutzenRisiko': [],
                 'primaereMassnahmen': [], 'dosierungHinweis': None, 'dosierung': [], 'uaw': [], 'ueberdosierung': [], 'besonderheiten': [],
                 'geCompetence': [c], 'status': 'Unvollständige Quelle', 'issues': ['Q10'], 'rawText': '\n'.join(c['box']),
                 'source': src(c['page'], {'note': 'nur im BPR-Kasten genannt, keine eigene SAA'}), 'synonyms': syn['medications'].get(slug(e['name']), []), 'hasSAA': False})

# ---------- Rechenregeln ----------
calc = []
for r in cur['calc_rules']['rules']:
    for q in r['quotes']:
        if norm(q) not in NT: errors.append('Zitat nicht in Quelle (%s): %s' % (r['id'], q))
    c = competence_at(r['competenceLine'])
    r = dict(r); r['ge'] = c['ge']; r['competencePage'] = c['page']; r['competenceBox'] = c['box']
    saa_page = next((m['source']['printedPage'] for m in meds if m['id'] == r['med']), None)
    extra = [48] if r['id'] == 'naloxon-kind' else []
    r['pages'] = sorted(set(x for x in [c['page'], saa_page] + extra if x))
    if not (c['ge'] and c['ge']['level']):
        r['locked'] = True; r['lockReason'] = r.get('lockReason') or 'Kein GE-Feld in der Kompetenzzeile: GE-Gültigkeit noch zu prüfen.'
    r['status'] = 'Widersprüchliche Quellen' if r.get('locked') and 'Widersprüch' in r.get('lockReason', '') else ('GE-Gültigkeit noch zu prüfen' if r.get('locked') else 'Teilweise geprüft')
    if r['med'] not in {m['id'] for m in meds}: errors.append('Rechenregel ohne Medikament: ' + r['id'])
    calc.append(r)

# ---------- Themen: Grundlagen, Herangehensweise, Reanimation, Leitsymptome, Krankheitsbilder, Trauma ----------
def cat_of(p):
    if p <= 25 or p in (46, 47, 48): return 'Grundlagen'
    if 81 <= p <= 89: return 'Herangehensweise'
    if 91 <= p <= 101: return 'Reanimation'
    if 103 <= p <= 114: return 'Leitsymptome'
    if 115 <= p <= 155: return 'Krankheitsbilder'
    if 157 <= p <= 174: return 'Trauma, MANV und Sonstiges'
    return None
tl = sorted(toc, key=lambda t: t['page'])
topics = []
for k, t in enumerate(tl):
    c = cat_of(t['page'])
    if c is None: continue
    nxt = next((x['page'] for x in tl[k + 1:] if x['page'] > t['page']), 175)
    if t['title'].startswith('Kapitel') or t['title'].startswith('Behandlungspfade'): continue
    pr = list(range(t['page'], max(nxt, t['page'] + 1)))
    comps = [competence_at(b['line']) for b in blocks if b.get('printedPage') in pr and b['geMentioned']]
    for b in blocks:
        if b.get('printedPage') in pr and not b['geMentioned']:
            cc = competence_at(b['line']); cc['noGE'] = True; comps.append(cc)
    comps.sort(key=lambda x: x['line'])
    title = t['title'].replace('"', '').strip()
    tid = 'thema-' + slug(title)[:48]
    topics.append({'id': tid, 'kind': 'topic', 'title': title, 'category': c, 'pages': pr,
                   'pageTexts': [{'printedPage': p, 'text': page_text.get(p, '')} for p in pr],
                   'measures': comps, 'status': 'Unvollständige Quelle' if c != 'Grundlagen' else 'Teilweise geprüft',
                   'statusNote': 'Flussdiagramm nur als maschineller Textauszug; Reihenfolge, Verzweigungen und Farben nicht visuell geprüft.' if c != 'Grundlagen' else 'Textauszug; Gültigkeit für GE laut Vorwort für alle Projektpartner, Sichtprüfung ausstehend.',
                   'issues': sorted(set(q for p in pr for q in ISSUE_BY_PAGE.get(p, []))), 'source': src(t['page']),
                   'synonyms': syn['topics'].get(tid, [])})

# ---------- Lokales Wissen ----------
local = []
for s in cur['local']['sources']:
    body = open(os.path.join(D, 'sources', s['id'] + '.txt'), encoding='utf-8').read()
    local.append({'id': 'lokal-' + s['id'], 'kind': 'local', 'title': s['title'], 'category': s['kind'], 'text': body,
                  'status': 'Teilweise geprüft', 'source': {'sourceId': s['id'], 'printedPage': None}, 'synonyms': syn['local'].get(s['id'], [])})

sources = [{'id': KOMP, 'title': 'Gemeinsames Kompendium Rettungsdienst 2026', 'document': 'GemKompRD2026.pdf (Textfassung GemKompRD2026.pdf.txt)',
            'version': '2026', 'date': '2026', 'issuer': 'Projektpartner Gemeinsames Kompendium Rettungsdienst', 'scope': 'mehrere Gebietskörperschaften NRW; Auswertung nur für GE',
            'kind': 'Kompendium', 'sha256': meta['sha256'], 'priority': 2}]
for s in cur['local']['sources']:
    sources.append(dict(s, sha256=hashlib.sha256(open(os.path.join(D, 'sources', s['id'] + '.txt'), 'rb').read()).hexdigest(), priority=1))

if errors:
    print('\n'.join('FEHLER: ' + e for e in errors)); sys.exit(1)
now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
ds = {'schema': 1, 'meta': {'datasetVersion': now[:10].replace('-', '.') + '-1', 'generatedAt': now, 'kompendiumVersion': '2026',
                           'localDataDate': '10/2026', 'disclaimer': 'Nicht durch die Ärztliche Leitung Rettungsdienst freigegeben. Keine offizielle Freigabe oder Zertifizierung.',
                           'rounding': cur['calc_rules']['rounding']},
      'sources': sources, 'saa': saa, 'medications': meds, 'calcRules': calc, 'calcOhneGE': cur['calc_rules']['ohneGE'], 'topics': topics,
      'local': local, 'hospitals': cur['hospitals']['hospitals'], 'hospitalNotes': cur['hospitals']['notes'], 'issues': cur['issues']['issues'],
      'searchSynonyms': syn['global']}
json.dump(ds, open(os.path.join(D, 'dataset.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('dataset.json: saa %d, meds %d, calc %d, topics %d, local %d, hospitals %d, issues %d, %d KB' % (
    len(saa), len(meds), len(calc), len(topics), len(local), len(ds['hospitals']), len(ds['issues']), os.path.getsize(os.path.join(D, 'dataset.json')) // 1024))
