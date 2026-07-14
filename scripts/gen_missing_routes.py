# -*- coding: utf-8 -*-
"""Generate missing route paths by concatenating existing segments"""
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(BASE, 'frontend_new', 'src', 'map', 'scenicRouteData.ts')

with open(src, 'r', encoding='utf-8') as f:
    content = f.read()

# parse WALK_PATHS
def parse_paths(text: str, section_name: str):
    """Extract route dict from TS source"""
    pattern = re.compile(rf"export const {section_name}: PathMap = \{{\n(.+?)\}};", re.DOTALL)
    m = pattern.search(text)
    if not m:
        return {}
    block = m.group(1)
    routes = {}
    # Match each key: [ [lng,lat], ... ]
    for entry in re.finditer(r"  '([^']+)': \[\n(.*?)\n  \],", block, re.DOTALL):
        key = entry.group(1)
        coords = []
        for pt in re.finditer(r'\[([-\d.]+),\s*([-\d.]+)\]', entry.group(2)):
            coords.append([float(pt.group(1)), float(pt.group(2))])
        if coords:
            routes[key] = coords
    return routes

WALK_PATHS = parse_paths(content, 'WALK_PATHS')
DRIVE_PATHS = parse_paths(content, 'DRIVE_PATHS')
print(f'Parsed: {len(WALK_PATHS)} walk + {len(DRIVE_PATHS)} drive routes')

def merge(ids: list[str]) -> list[list[float]]:
    result = []
    for i in range(len(ids) - 1):
        key = f'{ids[i]}_{ids[i+1]}'
        rev = f'{ids[i+1]}_{ids[i]}'
        seg = WALK_PATHS.get(key) or WALK_PATHS.get(rev) or DRIVE_PATHS.get(key) or DRIVE_PATHS.get(rev)
        if not seg:
            print(f'  MISSING base segment: {key}')
            return []
        if result and result[-1] == seg[0]:
            result.extend(seg[1:])
        else:
            result.extend(seg)
    deduped = []
    for p in result:
        if not deduped or p != deduped[-1]:
            deduped.append(p)
    return deduped

missing = {
    'LS-003_LS-005': merge(['LS-003', 'LS-004', 'LS-005']),
    'LS-006_LS-011': merge(['LS-006', 'LS-007', 'LS-008', 'LS-009', 'LS-010', 'LS-011']),
    'LS-011_LS-015': merge(['LS-011', 'LS-013', 'LS-015']),
}

insert_lines = []
for key, pts in missing.items():
    if len(pts) < 2:
        print(f'  FAILED: {key} ({len(pts)} pts)')
        continue
    insert_lines.append(f"  '{key}': [")
    for p in pts:
        insert_lines.append(f'    [{p[0]:.6f}, {p[1]:.6f}],')
    insert_lines.append('  ],')
    print(f'  ADDED: {key} ({len(pts)} pts)')

if insert_lines:
    insert = '\n'.join(insert_lines) + '\n'
    marker = '};\n\nexport const DRIVE_PATHS'
    new_content = content.replace(marker, insert + marker)
    with open(src, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'\nWritten to {src}')
else:
    print('\nNothing to add')
