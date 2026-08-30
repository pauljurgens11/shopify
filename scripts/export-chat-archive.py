#!/usr/bin/env python3
"""Export Claude Code session transcripts for this project into readable Markdown."""
import json, os, re, glob, sys
from datetime import datetime, timezone

HOME = os.path.expanduser("~")
PROJ_ROOT = os.path.join(HOME, ".claude", "projects")
PREFIX = "-Users-pauljurgens-Downloads-projects-shopify"
OUT = sys.argv[1]
META = json.load(open(sys.argv[2]))
# The app's session ids differ from transcript filenames; the app-visible title is the
# only reliable join key, so ambiguous (repeated) titles are dropped rather than guessed.
_seen_titles = {}
for m in META:
    _seen_titles[m[1]] = _seen_titles.get(m[1], 0) + 1
metamap = {m[1]: {"pr": m[2], "prState": m[3], "archived": m[4]}
           for m in META if _seen_titles[m[1]] == 1}

TOOL_IN_MAX = 600
TOOL_OUT_MAX = 700
TEXT_MAX = 12000


# Transcripts capture whatever scrolled past in a terminal, including secrets that leaked
# into test output. Everything written out goes through this first.
SECRETS = [
    (re.compile(r"sk-ant-[A-Za-z0-9_\-]{6,}"), "[REDACTED anthropic-api-key]"),
    (re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"), "[REDACTED github-token]"),
    (re.compile(r"github_pat_[A-Za-z0-9_]{20,}"), "[REDACTED github-token]"),
    (re.compile(r"\b(sk|rk)_live_[A-Za-z0-9]{10,}"), "[REDACTED stripe-key]"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[REDACTED aws-key-id]"),
    (re.compile(r"xox[baprs]-[A-Za-z0-9\-]{10,}"), "[REDACTED slack-token]"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S), "[REDACTED private-key]"),
    # Fragments of the ANTHROPIC_API_KEY that leaked into one session's test output. They
    # survive without their `sk-ant-` prefix wherever a later session grepped for them.
    (re.compile(r"i92zMbhL\w*|X77QEl8\w*|kuxJ874S\w*|vpv1lAAA"), "[REDACTED key-fragment]"),
    (re.compile(r"(postgres(?:ql)?|redis|amqp|mongodb)://([^:@\s/]+):([^@\s/]+)@"), r"\1://\2:[REDACTED]@"),
    (re.compile(r"\b(ANTHROPIC_API_KEY|SESSION_SECRET|JWT_SECRET|AWS_SECRET_ACCESS_KEY|STRIPE_SECRET_KEY|WEBHOOK_SECRET)\s*[=:]\s*[\"']?([^\s\"'&]{12,})"), r"\1=[REDACTED]"),
]

def redact(text):
    for pat, sub in SECRETS:
        text = pat.sub(sub, text)
    return text

def clean(t):
    if not t: return ""
    t = re.sub(r"<system-reminder>.*?</system-reminder>", "", t, flags=re.S)
    t = re.sub(r"<command-message>.*?</command-message>", "", t, flags=re.S)
    t = re.sub(r"<local-command-stdout>.*?</local-command-stdout>", "", t, flags=re.S)
    return t.strip()

def trunc(s, n):
    s = s.strip()
    if len(s) <= n: return s
    return s[:n].rstrip() + f"\n… [truncated, {len(s) - n:,} more chars]"

def blocks(msg):
    c = msg.get("content")
    if isinstance(c, str): return [{"type": "text", "text": c}]
    return c if isinstance(c, list) else []

def tool_summary(b):
    name = b.get("name", "tool")
    inp = b.get("input", {}) or {}
    if name == "Bash": detail = inp.get("command", "")
    elif name in ("Read", "Write"): detail = inp.get("file_path", "")
    elif name == "Edit": detail = inp.get("file_path", "")
    elif name in ("Grep", "Glob"): detail = f"{inp.get('pattern','')}  {inp.get('path','')}".strip()
    elif name in ("Agent", "Task"): detail = inp.get("description") or inp.get("prompt", "")
    elif name == "TodoWrite": detail = "; ".join(t.get("content", "") for t in (inp.get("todos") or [])[:8])
    else:
        detail = json.dumps(inp, ensure_ascii=False)
    return name, trunc(str(detail), TOOL_IN_MAX)

def result_text(b):
    c = b.get("content")
    if isinstance(c, str): return c
    if isinstance(c, list):
        out = []
        for p in c:
            if isinstance(p, dict):
                if p.get("type") == "text": out.append(p.get("text", ""))
                elif p.get("type") == "image": out.append("[image]")
            else: out.append(str(p))
        return "\n".join(out)
    return "" if c is None else str(c)

def render(path):
    sid = os.path.basename(path)[:-6]
    recs = []
    for line in open(path, errors="replace"):
        line = line.strip()
        if not line: continue
        try: recs.append(json.loads(line))
        except Exception: pass
    if not recs: return None

    meta = {}
    title = None
    cwd = branch = None
    version = model = None
    times = []
    for r in recs:
        if r.get("type") == "custom-title": title = r.get("customTitle")  # user-set title wins
        if not title and r.get("type") == "ai-title": title = r.get("aiTitle")
        cwd = r.get("cwd") or cwd
        branch = r.get("gitBranch") or branch
        version = r.get("version") or version
        ts = r.get("timestamp")
        if ts: times.append(ts)
        if r.get("type") == "assistant":
            model = (r.get("message") or {}).get("model") or model
    meta = metamap.get(title, {})
    turns = [r for r in recs if r.get("type") in ("user", "assistant") and not r.get("isSidechain")]
    side = sum(1 for r in recs if r.get("type") in ("user", "assistant") and r.get("isSidechain"))
    if not turns: return None
    if not title:
        for r in turns:
            if r.get("type") == "user":
                t = clean("".join(b.get("text", "") for b in blocks(r.get("message") or {}) if b.get("type") == "text"))
                if t:
                    title = " ".join(t.split())[:60]; break
    title = title or f"Session {sid[:8]}"
    times.sort()
    start, end = (times[0], times[-1]) if times else ("", "")

    L = []
    L.append(f"# {title}\n")
    rows = [("Session", f"`{sid}`"), ("Started", start), ("Ended", end)]
    if cwd: rows.append(("Working dir", f"`{cwd.replace(HOME, '~')}`"))
    if branch: rows.append(("Branch", f"`{branch}`"))
    if meta.get("pr"): rows.append(("Pull request", f"#{meta['pr']} ({meta.get('prState')})"))
    if model: rows.append(("Model", f"`{model}`"))
    if version: rows.append(("Claude Code", version))
    rows.append(("Archived", "yes" if meta.get("archived") else "no"))
    if side: rows.append(("Subagent messages", f"{side} (omitted below)"))
    L.append("| | |\n|---|---|")
    for k, v in rows: L.append(f"| **{k}** | {v} |")
    L.append("\n---\n")

    n_user = 0
    n_asst = sum(1 for r in turns if r.get("type") == "assistant")
    for r in turns:
        msg = r.get("message") or {}
        bs = blocks(msg)
        if r.get("type") == "user":
            # tool results come back as user messages
            texts, results = [], []
            for b in bs:
                if not isinstance(b, dict): continue
                if b.get("type") == "text": texts.append(clean(b.get("text", "")))
                elif b.get("type") == "tool_result": results.append(result_text(b))
            for res in results:
                res = clean(res)
                if res: L.append(f"> **↳ result**\n> ```\n> " + trunc(res, TOOL_OUT_MAX).replace("\n", "\n> ") + "\n> ```\n")
            body = "\n\n".join(t for t in texts if t)
            if body:
                n_user += 1
                L.append(f"### 👤 User\n\n{trunc(body, TEXT_MAX)}\n")
        else:
            for b in bs:
                if not isinstance(b, dict): continue
                t = b.get("type")
                if t == "text":
                    txt = clean(b.get("text", ""))
                    if txt: L.append(f"### 🤖 Claude\n\n{trunc(txt, TEXT_MAX)}\n")
                elif t == "tool_use":
                    name, detail = tool_summary(b)
                    if detail:
                        L.append(f"🔧 **{name}**\n```\n{detail}\n```\n")
                    else:
                        L.append(f"🔧 **{name}**\n")
    return {"sid": sid, "title": title, "start": start, "end": end, "branch": branch,
            "cwd": cwd, "meta": meta, "md": "\n".join(L), "user_turns": n_user,
            "prompts": n_user, "replies": n_asst, "side": side}

def slug(s):
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return (s or "session")[:52]

files = sorted(glob.glob(os.path.join(PROJ_ROOT, PREFIX, "*.jsonl")) +
               glob.glob(os.path.join(PROJ_ROOT, PREFIX + "--claude-worktrees-*", "*.jsonl")))
os.makedirs(os.path.join(OUT, "sessions"), exist_ok=True)
entries = []
for f in files:
    r = render(f)
    if not r: continue
    entries.append(r)

entries.sort(key=lambda e: e["start"])
seen = {}
for i, e in enumerate(entries, 1):
    day = (e["start"] or "")[:10] or "undated"
    base = f"{day}-{slug(e['title'])}"
    if base in seen:
        seen[base] += 1; base = f"{base}-{seen[base]}"
    else: seen[base] = 1
    e["file"] = f"{base}.md"
    with open(os.path.join(OUT, "sessions", e["file"]), "w") as fh:
        fh.write(redact(e["md"]))

# index — grouped by day, so the build reads day by day
days = {}
for e in entries:
    days.setdefault(e["start"][:10], []).append(e)

n_arch = sum(1 for e in entries if e["meta"].get("archived"))
idx = ["# Chat archive", "",
    "Every Claude Code session behind this repo, exported to Markdown — the whole build,",
    "from the first spec conversation to the last fix on the live demo.", "",
    f"**{len(entries)} sessions** · {entries[0]['start'][:10]} – {entries[-1]['start'][:10]} · "
    f"{n_arch} archived · main checkout + every agent worktree", "",
    "## What's in each file", "",
    "One Markdown file per session, chronological, with a metadata header (session id, times,",
    "worktree, branch, PR, model). The body is the conversation as it happened:", "",
    "- every prompt and every reply, in full;",
    "- one compact line per tool call (`🔧 **Bash**` + the command, `🔧 **Edit**` + the file), with",
    "  its output quoted and truncated — enough to follow the work without pasting whole file dumps;",
    "- sub-agent (sidechain) traffic counted in the header, not inlined, so the main thread stays readable.", "",
    "Secrets are stripped on export (API keys, tokens, connection-string passwords) and appear as",
    "`[REDACTED …]`. Regenerate with:", "", "```bash",
    "python3 scripts/export-chat-sessions-meta.py docs/chat-archive/sessions.json",
    "python3 scripts/export-chat-archive.py docs/chat-archive docs/chat-archive/sessions.json",
    "```", "",
    "`sessions.json` holds the sidebar titles, PR numbers and archived flags, which live in the",
    "Claude Code app rather than in the transcripts themselves — the first command reads them out",
    "of the app\'s session store, the second writes the Markdown. Existing files are rewritten in",
    "place, so a refresh after new sessions or a landed PR is just those two commands.", "",
    "## Sessions", ""]

n = 0
for day, es in days.items():
    idx += [f"### {day}", "", "| # | Session | Prompts | PR | Branch / worktree |", "|---:|---|---:|---|---|"]
    for e in es:
        n += 1
        m = e["meta"]
        pr = f"#{m['pr']} ({m['prState']})" if m.get("pr") else "—"
        star = " 🗄️" if m.get("archived") else ""
        br = f"`{e['branch']}`" if e.get("branch") else "`main`"
        idx.append(f"| {n} | [{e['title']}{star}](sessions/{e['file']}) | {e['prompts']} | {pr} | {br} |")
    idx.append("")
idx += ["🗄️ = archived in the Claude Code sidebar. Archived sessions are included here on purpose —",
        "they are the earliest planning conversations and the first workstream runs.", ""]
with open(os.path.join(OUT, "README.md"), "w") as fh:
    fh.write("\n".join(idx))

print(f"{len(entries)} sessions exported")
