#!/usr/bin/env python3
"""Rebuild docs/chat-archive/sessions.json from the Claude Code app's session store.

Same 5-tuple shape the archive exporter expects: [sessionId, title, pr, prState, archived].
"""
import json, glob, os, sys

D = os.path.expanduser('~/Library/Application Support/Claude/claude-code-sessions')
OUT = sys.argv[1]

rows = []
for f in glob.glob(D + '/*/*/local_*.json'):
    d = json.load(open(f))
    cwd = d.get('originCwd') or d.get('cwd') or ''
    if 'projects/shopify' not in cwd:
        continue
    prs = d.get('prs') or []
    pr = prs[0] if prs else None
    rows.append((d.get('lastActivityAt') or '', [
        d['sessionId'], d.get('title'),
        pr['prNumber'] if pr else None,
        pr['state'] if pr else None,
        bool(d.get('isArchived')),
    ]))

rows.sort(key=lambda r: r[0], reverse=True)
out = [r[1] for r in rows]


def biome_json(rows):
    """Match Biome's JSON formatter: 2-space indent, arrays inline up to lineWidth 100."""
    lines = ['[']
    for i, r in enumerate(rows):
        tail = ',' if i < len(rows) - 1 else ''
        parts = [json.dumps(v, ensure_ascii=False) for v in r]
        inline = '  [' + ', '.join(parts) + ']' + tail
        if len(inline) <= 100:
            lines.append(inline)
        else:
            lines.append('  [')
            for j, p in enumerate(parts):
                lines.append('    ' + p + (',' if j < len(parts) - 1 else ''))
            lines.append('  ]' + tail)
    lines.append(']')
    return '\n'.join(lines) + '\n'


with open(OUT, 'w') as fh:
    fh.write(biome_json(out))

titles = [r[1] for r in out]
dup = sorted({t for t in titles if titles.count(t) > 1})
print(f"{len(out)} entries · {sum(1 for r in out if r[2])} with a PR · "
      f"{sum(1 for r in out if r[4])} archived")
print("ambiguous titles (dropped from the title join):", dup)
