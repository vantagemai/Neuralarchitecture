#!/usr/bin/env python3
"""
externalize-data.py

1. Writes each data block as a .js file in public/data/
   (plain var assignment so <script src> loads it synchronously)
2. Removes the inline data from vantagem-portal.html
3. Inserts <script src="/data/*.js"> tags before the main script block
"""
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
HTML_PATH = os.path.join(ROOT, 'public/vantagem-portal.html')
DATA_DIR  = os.path.join(ROOT, 'public/data')

# ── 1. Write .js data files from extracted JSON ────────────────────────────────
js_files = {
    'SETTER_FASES':       'setter.js',
    'PARTNER_FASES':      'partner.js',
    'BUILDER_FASES':      'builder.js',
    'VANTAGEM_TUTORIALS': 'vantagemsys.js',
    'WARROOM_LIBRARY':    'warroom.js',
}
json_files = {
    'SETTER_FASES':       'setter.json',
    'PARTNER_FASES':      'partner.json',
    'BUILDER_FASES':      'builder.json',
    'VANTAGEM_TUTORIALS': 'vantagemsys.json',
    'WARROOM_LIBRARY':    'warroom.json',
}

os.makedirs(DATA_DIR, exist_ok=True)

for varname, jsfile in js_files.items():
    src = os.path.join(DATA_DIR, json_files[varname])
    dst = os.path.join(DATA_DIR, jsfile)
    data = json.load(open(src, encoding='utf-8'))
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(f'var {varname} = {json.dumps(data, ensure_ascii=False)};\n')
    size_kb = os.path.getsize(dst) / 1024
    print(f'✓ {jsfile}  ({size_kb:.1f} KB)')

# ── 2. Transform the portal HTML ─────────────────────────────────────────────
with open(HTML_PATH, encoding='utf-8') as f:
    lines = f.readlines()

# Ranges to REMOVE (1-based, inclusive).
# These are the inline data declaration lines.
remove_ranges = [
    (25251, 25354),   # const SETTER_FASES = [...];
    (27258, 27343),   # var PARTNER_FASES = [...];
    (27720, 27819),   # var BUILDER_FASES = [...];
    (28202, 28266),   # var VANTAGEM_TUTORIALS = {...};
    (28528, 28539),   # var WARROOM_LIBRARY = [...];
]

# Build a set of 0-based line indices to skip
skip = set()
for start, end in remove_ranges:
    for i in range(start - 1, end):  # 0-based
        skip.add(i)

# Line to INSERT <script src> tags BEFORE (0-based index).
# The main script block starts at line 15941 (1-based) → index 15940.
INSERT_BEFORE_IDX = 15940

inject = (
    '<script src="/data/setter.js"></script>\n'
    '<script src="/data/partner.js"></script>\n'
    '<script src="/data/builder.js"></script>\n'
    '<script src="/data/vantagemsys.js"></script>\n'
    '<script src="/data/warroom.js"></script>\n'
)

new_lines = []
for i, line in enumerate(lines):
    if i == INSERT_BEFORE_IDX:
        new_lines.append(inject)
    if i not in skip:
        new_lines.append(line)

out = ''.join(new_lines)
with open(HTML_PATH, 'w', encoding='utf-8') as f:
    f.write(out)

removed = sum(end - start + 1 for start, end in remove_ranges)
print(f'\n✓ Portal HTML updated')
print(f'  Removed {removed} lines of inline data')
print(f'  Added 5 <script src="/data/*.js"> tags before line {INSERT_BEFORE_IDX+1}')
print(f'  New line count: {len(new_lines)} (was {len(lines)})')
