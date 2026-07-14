# -*- coding: utf-8 -*-
import os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

print('DEBUG: script started')

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(BASE, '路线坐标.txt')
dst = os.path.join(BASE, 'frontend_new', 'src', 'map', 'scenicRouteData.ts')

with open(src, 'r', encoding='utf-8') as f:
    lines = f.readlines()

NAME_TO_ID = {
    '\u7075\u5c71\u5927\u7167\u58c1': 'LS-001',
    '\u4e94\u660e\u6865': 'LS-002',
    '\u4f5b\u8db3\u575b': 'LS-003',
    '\u4e94\u667a\u95e8': 'LS-004',
    '\u83e9\u63d0\u5927\u9053': 'LS-005',
    '\u4e5d\u9f99\u704c\u6d74': 'LS-006',
    '\u964d\u9b54\u6d6e\u96d5': 'LS-007',
    '\u963f\u80b2\u738b\u67f1': 'LS-008',
    '\u767e\u5b50\u620f\u5f25\u52d2': 'LS-009',
    '\u7965\u7b26\u7985\u5bfa': 'LS-010',
    '\u7075\u5c71\u5927\u4f5b': 'LS-011',
    '\u4f5b\u6559\u77e5\u8bc6\u957f\u5eca': 'LS-012',
    '\u7075\u5c71\u68b5\u5bab': 'LS-013',
    '\u4e94\u5370\u575b\u57ce': 'LS-014',
    '\u66fc\u98de\u9f99\u5854': 'LS-015',
    '\u65e0\u5c3d\u610f\u658b': 'LS-016',
}

walk_routes = {}
drive_routes = {}
seen = set()

i = 0
while i < len(lines):
    line = lines[i].strip()
    i += 1
    if not line:
        continue
    if '\u2192' not in line:
        continue

    # Extract names
    # Split by →
    parts = line.split('\u2192')
    if len(parts) < 2:
        continue

    # First part: "1.灵山大照壁" or "1.  灵山大照壁" 
    from_part = parts[0].strip()
    from_part = re.sub(r'^\d+\.\s*', '', from_part)
    # Handle trailing colon
    to_part = parts[1].strip().rstrip('\uff1a: ')

    from_id = NAME_TO_ID.get(from_part)
    to_id = NAME_TO_ID.get(to_part)
    if not from_id or not to_id:
        print(f'  SKIP: [{from_part}] -> [{to_part}]')
        continue

    # Collect coordinates from following lines until next header or end
    coords = []
    while i < len(lines):
        cl = lines[i].strip()
        # Debug: show header detection attempts
        if len(coords) > 380:
            mh = re.match(r'^(\d+\.\s*)\u4e00', cl)
            if mh:
                print(f'    BREAK CHECK i={i}: num={mh.group(1)!r} cl={cl[:40]}')
            else:
                print(f'    NO MATCH i={i}: cl={cl[:40]}')
        if not cl:
            i += 1
            continue
        # Next header? starts with digit(s). followed by Chinese chars
        m_header = re.match(r'^(\d+\.\s*)(?:灵|五|佛|菩|九|降|阿|百|祥|无|曼|佛|文|香)', cl)
        if m_header:
            # Must be a small section number like 2., not a coord like 120.
            num_part = m_header.group(1)
            if not num_part.startswith(('100', '120', '110', '130', '140', '150', '200')):
                break
            break
        nums = re.findall(r'[-+]?\d+\.\d+', cl)
        if len(nums) >= 2:
            coords.append([round(float(nums[0]), 6), round(float(nums[1]), 6)])
        i += 1

    if len(coords) < 2:
        print(f'  SKIP: {from_part}->{to_part} ({len(coords)} coords)')
        continue

    key = f'{from_id}_{to_id}'
    if key in seen:
        # Duplicate, skip
        continue
    seen.add(key)

    if from_part == '\u7075\u5c71\u5927\u7167\u58c1' and to_part == '\u7075\u5c71\u5927\u4f5b':
        drive_routes[key] = coords
        print(f'  DRIVE: {from_part}->{to_part} ({len(coords)} pts)')
    else:
        walk_routes[key] = coords
        print(f'  WALK:  {from_part}->{to_part} ({len(coords)} pts)')

ts_lines = [
    '/**',
    ' * \u7075\u5c71\u80dc\u5883\u666f\u533a\u5185\u90e8\u9053\u8def\u5750\u6807\u6570\u636e',
    ' * \u91c7\u96c6\u5de5\u5177\uff1a\u9ad8\u5fb7\u5750\u6807\u62fe\u53d6\u5668',
    ' * \u91c7\u96c6\u65e5\u671f\uff1a2026-07-13',
    ' */',
    '',
    'export type PathMap = Record<string, [number, number][]>;',
    '',
    'export const WALK_PATHS: PathMap = {',
]
for key in sorted(walk_routes.keys()):
    pts = walk_routes[key]
    ts_lines.append(f'  {key!r}: [')
    for p in pts:
        ts_lines.append(f'    [{p[0]}, {p[1]}],')
    ts_lines.append('  ],')
ts_lines.append('};')
ts_lines.append('')
ts_lines.append('export const DRIVE_PATHS: PathMap = {')
for key in sorted(drive_routes.keys()):
    pts = drive_routes[key]
    ts_lines.append(f'  {key!r}: [')
    for p in pts:
        ts_lines.append(f'    [{p[0]}, {p[1]}],')
    ts_lines.append('  ],')
ts_lines.append('};')
ts_lines.append('')

with open(dst, 'w', encoding='utf-8') as f:
    f.write('\n'.join(ts_lines))

print(f'\nDone: {len(walk_routes)} walk + {len(drive_routes)} drive routes')
