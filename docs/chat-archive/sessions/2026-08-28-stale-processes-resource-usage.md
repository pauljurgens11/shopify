# Stale processes resource usage

| | |
|---|---|
| **Session** | `e0f81bf9-a6d1-4651-9a06-07b4fc2eb5da` |
| **Started** | 2026-08-28T15:42:36.263Z |
| **Ended** | 2026-08-28T15:48:20.539Z |
| **Working dir** | `~/Downloads/projects/shopify` |
| **Branch** | `main` |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.246 |
| **Archived** | no |

---

### 👤 User

pc quite slow. is ther any stale processes running that is eating up resources? i have many agents running so make sure not to affect them

### 🤖 Claude

I'll look at what's actually running and eating resources, without touching anything.

🔧 **Bash**
```
echo "=== LOAD / CPU ==="; uptime; sysctl -n hw.ncpu hw.memsize; echo; echo "=== MEMORY PRESSURE ==="; memory_pressure 2>/dev/null | tail -8; echo; echo "=== TOP CPU (20) ==="; ps -Ao pid,ppid,%cpu,%mem,rss,etime,user,comm -r | head -21
```

🔧 **Bash**
```
echo "=== TOP MEM (20) ==="; ps -Ao pid,ppid,%cpu,%mem,rss,etime,comm -m | head -21; echo; echo "=== SWAP ==="; sysctl vm.swapusage
```

> **↳ result**
> ```
> === LOAD / CPU ===
> 18:43  up  3:57, 1 user, load averages: 38.46 24.38 21.84
> 8
> 8589934592
> 
> === MEMORY PRESSURE ===
> Pages decompressed: 1346587292 
> Pages compressed: 1417844898 
> 
> File I/O:
> Pageins: 29834725 
> Pageouts: 211080 
> 
> System-wide memory free percentage: 29%
> 
> === TOP CPU (20) ===
>   PID  PPID  %CPU %MEM    RSS  ELAPSED USER             COMM
> 84514 84511  85.3  0.9  76512    00:27 pauljurgens      node
> 11625     1  84.0  3.2 269664 03:53:01 pauljurgens      /System/Library/Frameworks/Virtualization.framework/Versions/A/XPCServices/com.apple.Virtualization.VirtualMachine.xpc/Contents/MacOS/com.apple.Virtualization.VirtualMachine
>   337     1  43.0  0.1   6992 03:56:47 root             /Sys
> … [truncated, 2,227 more chars]
> ```

> **↳ result**
> ```
> === TOP MEM (20) ===
>   PID  PPID  %CPU %MEM    RSS  ELAPSED COMM
> 11625     1  73.7  2.6 220960 03:53:07 /System/Library/Frameworks/Virtualization.framework/Versions/A/XPCServices/com.apple.Virtualization.VirtualMachine.xpc/Contents/MacOS/com.apple.Virtualization.VirtualMachine
> 83584 83583  16.3  2.0 163856    00:52 /Users/pauljurgens/Library/Application Support/Claude/claude-code/2.1.246/claude.app/Contents/MacOS/claude
> 74286 74285  10.9  1.8 154112    11:47 /Users/pauljurgens/Library/Application Support/Claude/claude-code/2.1.246/claude.app/Contents/MacOS/claude
> 85254 85251  51.6  1.6 137376    00:11 node
> 26774 26773   8.2  1.6 133856 01:12:42 /Users/pauljurgens/Library/Application Support/
> … [truncated, 1,585 more chars]
> ```

### 🤖 Claude

Machine is badly overloaded — let me find what's stale vs. actually in use.

🔧 **Bash**
```
echo "=== NODE PROCS (full cmd, oldest first) ==="; ps -Ao pid,ppid,%cpu,rss,lstart,command | grep -E "node|next-server|tsx|vitest|esbuild|turbo|playwright" | grep -v grep | sed 's/\(.\{240\}\).*/\1…/'
```

> **↳ result**
> ```
> === NODE PROCS (full cmd, oldest first) ===
> 29769 57004   0.0  17600 Fri Aug 28 15:13:51 2026     /Applications/Claude.app/Contents/Frameworks/Claude Helper.app/Contents/MacOS/Claude Helper --type=utility --utility-sub-type=node.mojom.NodeService --lang=en-GB --service-sandbox-type=n…
> 29778 57004   0.0  16624 Fri Aug 28 15:13:51 2026     /Applications/Claude.app/Contents/Frameworks/Claude Helper.app/Contents/MacOS/Claude Helper --type=utility --utility-sub-type=node.mojom.NodeService --lang=en-GB --service-sandbox-type=n…
> 30024 57004   0.0  14864 Fri Aug 28 15:14:04 2026     /Applications/Claude.app/Contents/Frameworks/Claude Helper.app/Contents/MacOS/Claude Helper --type=utility --utility-s
> … [truncated, 8,204 more chars]
> ```

🔧 **Bash**
```
echo "=== LISTENERS on dev ports ==="; lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | grep -E ":(3000|3001|3002|3003|5432|6379|9000|9001|8025|1025|5173|4000)\b"; echo; echo "=== DOCKER ==="; docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' 2>&1 | head -20; echo; echo "=== WORKTREES ==="; git -C /Users/pauljurgens/Downloads/projects/shopify worktree list
```

> **↳ result**
> ```
> === LISTENERS on dev ports ===
> com.docke 11535 pauljurgens  149u  IPv6 0x660dd676989f5ed3      0t0  TCP *:1025 (LISTEN)
> com.docke 11535 pauljurgens  151u  IPv6  0xf5f499fe3958ba3      0t0  TCP *:6379 (LISTEN)
> com.docke 11535 pauljurgens  158u  IPv6 0x878f9bc8be79ed76      0t0  TCP *:8025 (LISTEN)
> com.docke 11535 pauljurgens  177u  IPv6 0xf75615eb54af314b      0t0  TCP *:9000 (LISTEN)
> com.docke 11535 pauljurgens  178u  IPv6 0x9f32eab362580fec      0t0  TCP *:9001 (LISTEN)
> node      36239 pauljurgens   13u  IPv6 0x47bc8c26a3c27ca2      0t0  TCP *:3002 (LISTEN)
> node      36240 pauljurgens   13u  IPv6 0x36e8d3833e18d8d3      0t0  TCP *:3000 (LISTEN)
> node      65666 pauljurgens   24u  IPv4 0xbae7
> … [truncated, 3,317 more chars]
> ```

### 🤖 Claude

Let me map the orphans precisely before recommending anything.

🔧 **Bash**
```
echo "=== ALL non-system LISTENERS ==="; lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk '$3=="pauljurgens"' | sort -k9; echo; echo "=== ORPHANS (PPID 1) node/pnpm ==="; ps -Ao pid,ppid,%cpu,rss,time,lstart,command | awk '$2==1' | grep -E "pnpm|node|next" | grep -v grep | cut -c1-200
```

🔧 **Bash**
```
echo "=== LIVE claude CLI sessions (pid, cwd) ==="; for p in $(pgrep -f "claude-code/2.1.246/claude.app/Contents/MacOS/claude"); do cwd=$(lsof -a -p $p -d cwd -Fn 2>/dev/null | grep ^n | cut -c2-); et=$(ps -o etime= -p $p | tr -d ' '); echo "$p  up=$et  $cwd"; done
```

> **↳ result**
> ```
> === ALL non-system LISTENERS ===
> com.docke 11535 pauljurgens  149u  IPv6 0x660dd676989f5ed3      0t0  TCP *:1025 (LISTEN)
> node      36240 pauljurgens   13u  IPv6 0x36e8d3833e18d8d3      0t0  TCP *:3000 (LISTEN)
> node      65666 pauljurgens   24u  IPv4 0xbae7500504be9814      0t0  TCP *:3001 (LISTEN)
> node      36239 pauljurgens   13u  IPv6 0x47bc8c26a3c27ca2      0t0  TCP *:3002 (LISTEN)
> node      52884 pauljurgens   12u  IPv6  0x960e81ef070572d      0t0  TCP *:3100 (LISTEN)
> node      52562 pauljurgens   24u  IPv4 0x24e2ac96d10500b4      0t0  TCP *:3101 (LISTEN)
> node      40221 pauljurgens   12u  IPv6 0xff62134a340cc14b      0t0  TCP *:3102 (LISTEN)
> node      79868 pauljurgens   24u  IPv4 0xc6
> … [truncated, 2,475 more chars]
> ```

> **↳ result**
> ```
> === LIVE claude CLI sessions (pid, cwd) ===
> 26773  up=01:13:17  /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/find-available-issue-a2501f
> 26774  up=01:13:17  /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/find-available-issue-a2501f
> 33054  up=01:06:50  /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/h2-issue-completion-2d6711
> 33055  up=01:06:50  /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/h2-issue-completion-2d6711
> 42454  up=56:54  /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/a5-deps-readiness-29b49e
> 42455  up=56:54  /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/a5-deps-readiness-29b49
> … [truncated, 659 more chars]
> ```

🔧 **Bash**
```
echo "=== CPU TIME accumulated, stale suspects ==="; ps -o pid,ppid,%cpu,rss,time,command -p 72299,72314,76996,77010,36039,36239,36240,65653,65666,40203,40221,52882,52884,68574,11625 2>/dev/null | cut -c1-140
echo; echo "=== fseventsd / watcher pressure ==="; ps -o pid,%cpu,time,comm -p 337,362
echo; echo "=== docker resource use ==="; docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' 2>&1 | head
```

🔧 **Bash**
```
echo "=== total RSS by group (MB) ==="; ps -Ao rss,command | awk '
/claude-code\/2\.1\.246/ {c+=$1; next}
/Applications\/Claude.app/ {d+=$1; next}
/Virtualization.VirtualMachine/ {v+=$1; next}
/next-server|tsx|turbo|esbuild|tsc|node/ {n+=$1; next}
{o+=$1}
END{printf "claude-code CLI: %d\nClaude desktop: %d\nDocker VM: %d\nnode/dev: %d\nother: %d\n", c/1024,d/1024,v/1024,n/1024,o/1024}'
echo; echo "=== live claude session count ==="; pgrep -fc "claude-code/2.1.246/claude.app/Contents/MacOS/claude"
```

> **↳ result**
> ```
> === CPU TIME accumulated, stale suspects ===
>   PID  PPID  %CPU    RSS      TIME COMMAND
> 11625     1 122.3 344016  78:36.57 /System/Library/Frameworks/Virtualization.framework/Versions/A/XPCServices/com.apple.Virtualization.Virtu
> 36039 36038   0.0    912   0:00.36 node /opt/homebrew/bin/pnpm dev:localhost
> 36239 36160   0.1  15120   2:19.82 next-server (v15.5.24) 
> 36240 36181   0.1  11312   3:01.30 next-server (v15.5.24) 
> 40203     1   0.0   1296   0:00.46 node /opt/homebrew/bin/pnpm --filter @merchant/storefront exec next start --port 3102
> 40221 40203   0.0   2624   0:10.88 next-server (v15.5.24)    
> 52882     1   0.0   1296   0:00.48 node /opt/homebrew/bin/pnpm --filter @merchant/admin exec
> … [truncated, 1,641 more chars]
> ```

> **↳ result**
> ```
> Exit code 2
> === total RSS by group (MB) ===
> claude-code CLI: 740
> Claude desktop: 459
> Docker VM: 370
> node/dev: 649
> other: 1238
> 
> === live claude session count ===
> usage: pgrep [-Lfilnoqvx] [-d delim] [-F pidfile] [-G gid]
>              [-P ppid] [-U uid] [-g pgrp] [-t tty] [-u euid]
>              pattern ...
> ```

### 🤖 Claude

MinIO is spinning hot. Let me confirm that's sustained, not a sampling blip.

🔧 **Bash**
```
docker stats --no-stream --format '{{.Name}} {{.CPUPerc}}' 2>/dev/null; echo "--- 5s later ---"; sleep 5; docker stats --no-stream --format '{{.Name}} {{.CPUPerc}}' 2>/dev/null; echo; echo "=== minio recent logs ==="; docker logs --tail 15 merchant-minio-1 2>&1 | cut -c1-160
```

🔧 **Bash**
```
echo "=== iti0302 container (unrelated project?) ==="; docker inspect iti0302-2023-backend-database-1 --format '{{.Created}} | {{.Config.Labels}}' 2>&1 | cut -c1-300; echo; echo "=== live claude session count ==="; ps -Ao command | grep -c "claude-code/2.1.246/claude.app/Contents/MacOS/claude"; echo; echo "=== who owns port 3001 stack (resolve-docs-issue-3f28ad) — any live session? ==="; ps -Ao pid,command | grep -c "resolve-docs-issue-3f28ad"
```

> **↳ result**
> ```
> merchant-minio-1 0.00%
> merchant-postgres-1 13.59%
> merchant-mailpit-1 0.00%
> merchant-redis-1 2.97%
> iti0302-2023-backend-database-1 0.14%
> --- 5s later ---
> merchant-minio-1 38.83%
> merchant-postgres-1 48.41%
> merchant-mailpit-1 0.00%
> merchant-redis-1 13.32%
> iti0302-2023-backend-database-1 0.33%
> 
> === minio recent logs ===
> Time: 15:36:05 UTC 08/28/2026
> DeploymentID: d87d2a41-6040-4c78-bf04-4ed46b898295
> Error: .minio.sys/buckets/merchant-assets/.usage-cache.bin has incomplete body (cmd.IncompleteBody)
>        3: internal/logger/logger.go:271:logger.LogIf()
>        2: cmd/logging.go:136:cmd.scannerLogIf()
>        1: cmd/erasure.go:563:cmd.erasureObjects.nsScanner.func2()
> 
> API: SYSTEM.scanner
> Time: 15:37
> … [truncated, 406 more chars]
> ```

> **↳ result**
> ```
> === iti0302 container (unrelated project?) ===
> 2024-01-05T15:41:17.542803133Z | map[com.docker.compose.config-hash:d67a449a6589c13bec74a1030c583f10e8063c3e601410a1a622c904163cf546 com.docker.compose.container-number:1 com.docker.compose.depends_on: com.docker.compose.image:sha256:d3a121fb3e20776dd8dc2e74f3fe5453b9209fb8e68f132eff38dc70188bcc86 c
> 
> === live claude session count ===
> 16
> 
> === who owns port 3001 stack (resolve-docs-issue-3f28ad) — any live session? ===
> 10
> ```

🔧 **Bash**
```
echo "=== 3f28ad orphan stack total RSS (MB) ==="; ps -Ao rss,command | grep "resolve-docs-issue-3f28ad" | grep -v grep | awk '{s+=$1} END{print s/1024}'
ps -o pid,rss,command -p 36239,36240,65653,65666 | cut -c1-90
echo; echo "=== last request served by 3f28ad stack? (port 3000/3001/3002 established conns) ==="; lsof -nP -iTCP:3000,3001,3002 -sTCP:ESTABLISHED 2>/dev/null | head
echo; echo "=== ws-b orphan total RSS (MB) ==="; ps -Ao rss,command | grep "ws-b-collections-inventory-ui" | grep -v grep | awk '{s+=$1} END{print s/1024}'
echo; echo "=== memory summary ==="; vm_stat | head -6
```

> **↳ result**
> ```
> === 3f28ad orphan stack total RSS (MB) ===
> 30.75
>   PID    RSS COMMAND
> 36239  11312 next-server (v15.5.24) 
> 36240  11184 next-server (v15.5.24) 
> 65653  18800 /Users/pauljurgens/.nvm/versions/node/v22.23.2/bin/node --require /Users/paul
> 65666   4464 /Users/pauljurgens/.nvm/versions/node/v22.23.2/bin/node --require /Users/paul
> 
> === last request served by 3f28ad stack? (port 3000/3001/3002 established conns) ===
> 
> === ws-b orphan total RSS (MB) ===
> 1.75
> 
> === memory summary ===
> Mach Virtual Memory Statistics: (page size of 16384 bytes)
> Pages free:                                3716.
> Pages active:                             74066.
> Pages inactive:                           66490.
> Pages speculative
> … [truncated, 80 more chars]
> ```

### 🤖 Claude

Diagnosis done. Here's what's actually going on.

## The headline: it's not stale processes, it's memory

Your Mac has **8 GB RAM** and is using **8.9 GB of 10 GB swap**. Free memory is down to ~58 MB, with 1.4 *billion* pages compressed. Load average is **38 on 8 cores**.

That's why everything is slow: the machine is thrashing. Resident sizes in `ps` look tiny only because nearly everything has been paged out to disk.

The cause is scale, not leaks — **8 live Claude Code sessions** (16 processes) plus **4 concurrent dev stacks** plus Docker on an 8 GB machine.

## Live — do not touch

| Worktree | Session | Servers |
|---|---|---|
| `find-available-issue-a2501f` | up 1h13m | api :3201 |
| `h2-issue-completion-2d6711` | up 1h07m | api :3101, admin :3100, storefront :3102 — *mid `pnpm verify`* |
| `a5-deps-readiness-29b49e` | up 57m | — |
| `e5-issue-deps-571a87` | up 57m | api :4001, storefront :4002 |
| `completed-workstreams-query-9d6ee2` | up 12m | *mid `pnpm typecheck`* |
| `optimistic-nightingale-a17409` | up 5m | — |

Several of these show `PPID 1`, which looks orphaned but isn't — they're backgrounded by live sessions. I checked each session's cwd rather than trusting the parent pid.

## Genuinely stale

**1. Two duplicate API servers from a dead worktree** — `ws-b-collections-inventory-ui`, started 16:09 and 16:14 (2.5 h ago). No live session owns that worktree, and neither is bound to a port — they lost the race for :3001 and have been sitting there running file watchers over the whole monorepo ever since.

**2. An abandoned 4-app dev stack** — `resolve-docs-issue-3f28ad` ran `pnpm dev:localhost` at 17:38; its session is gone. It holds **:3000, :3001 and :3002** — the shared ports. There are currently zero established connections to it. This is precisely the trap CLAUDE.md documents: an orphan holding the shared ports is what logs agents out mid-test with a stale-session 401.

**3. `iti0302-2023-backend-database-1`** — a postgres container from an unrelated 2024 project, up 4 hours.

MinIO briefly showed 153% CPU but that's its periodic scanner, not a pinned spin. It does log a corrupt `.usage-cache.bin` for `merchant-assets` on every pass — cosmetic, but it makes the scanner work harder than it should.

## What I'd do

I haven't killed anything — agents are in flight and that's your call. The safe set:

```bash
kill 72299 72314 76996 77010 && docker stop iti0302-2023-backend-database-1
```

The bigger win, if no agent is currently driving the admin at `localhost:3000`:

```bash
kill 36039 36057 36064 36127 36128 36129 36130 36160 36181 36190 36204
```

That frees :3000/:3001/:3002 and removes four monorepo-wide file watchers.

Honestly though, reclaiming these gets you maybe 200–300 MB against a ~9 GB overdraft. The thing that will actually make the machine responsive is **running fewer agents at once** — on 8 GB, three or four concurrent sessions with one shared dev stack is about the ceiling. Right now you have eight sessions and four stacks.

Want me to run the safe cleanup, or check whether anything is actively using :3000 before clearing the abandoned stack too?

### 👤 User

clean the 3 stale stings you listed

### 🤖 Claude

Re-checking liveness before I kill anything — state may have shifted in the last few minutes.

🔧 **Bash**
```
echo "=== live session cwds NOW ==="; for p in $(ps -Ao pid,command | grep "claude-code/2.1.246/claude.app/Contents/MacOS/claude" | grep -v grep | awk '{print $1}'); do lsof -a -p $p -d cwd -Fn 2>/dev/null | grep ^n | cut -c2-; done | sort -u
echo; echo "=== established conns on 3000/3001/3002 ==="; lsof -nP -iTCP:3000,3001,3002 -sTCP:ESTABLISHED 2>/dev/null || echo "(none)"
echo; echo "=== suspects still alive? ==="; ps -o pid,ppid,command -p 72299,72314,76996,77010,36039,36057,36064,36127,36128,36129,36130,36160,36181,36190,36204 2>/dev/null | cut -c1-120
```

> **↳ result**
> ```
> === live session cwds NOW ===
> /Users/pauljurgens/Downloads/projects/shopify
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/a5-deps-readiness-29b49e
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/completed-workstreams-query-9d6ee2
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/e5-issue-deps-571a87
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/find-available-issue-a2501f
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/h2-issue-completion-2d6711
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/optimistic-nightingale-a17409
> 
> === established conns on 3000/3001/3002 ===
> (none)
> 
> === suspects still al
> … [truncated, 1,376 more chars]
> ```

### 🤖 Claude

Confirmed: no live session owns either worktree, and nothing is connected to :3000/:3001/:3002. Cleaning now.

🔧 **Bash**
```
cd /tmp
# 1. abandoned 4-app stack (resolve-docs-issue-3f28ad) — parents first, graceful
kill -TERM 36039 36057 36064 36127 36128 36129 36130 36160 36181 36190 36204 2>/dev/null
# 2. duplicate orphaned api servers (ws-b-collections-inventory-ui)
kill -TERM 72299 72314 76996 77010 2>/dev/null
sleep 4
echo "=== survivors after SIGTERM ==="
ps -Ao pid,command | grep -E "resolve-docs-issue-3f28ad|ws-b-collections-inventory-ui" | grep -v grep | cut -c1-110 || echo "(none)"
```

> **↳ result**
> ```
> === survivors after SIGTERM ===
> Shell cwd was reset to /Users/pauljurgens/Downloads/projects/shopify
> ```

### 🤖 Claude

Clean exit, no force needed. Now the unrelated container.

🔧 **Bash**
```
docker stop iti0302-2023-backend-database-1 2>&1; echo; echo "=== remaining containers ==="; docker ps --format 'table {{.Names}}\t{{.Status}}' 2>&1
```

> **↳ result**
> ```
> iti0302-2023-backend-database-1
> 
> === remaining containers ===
> NAMES                 STATUS
> merchant-minio-1      Up 4 hours (healthy)
> merchant-postgres-1   Up 4 hours (healthy)
> merchant-mailpit-1    Up 4 hours (healthy)
> merchant-redis-1      Up 4 hours (healthy)
> ```

### 🤖 Claude

Now verifying the live agents came through untouched.

🔧 **Bash**
```
echo "=== live sessions still up ==="; for p in $(ps -Ao pid,command | grep "claude-code/2.1.246/claude.app/Contents/MacOS/claude" | grep -v grep | awk '{print $1}'); do lsof -a -p $p -d cwd -Fn 2>/dev/null | grep ^n | cut -c2- ; done | sort -u
echo; echo "=== agent dev servers still listening ==="; lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk '$1=="node"' | awk '{print $2, $9}' | sort -u
```

> **↳ result**
> ```
> === live sessions still up ===
> /Users/pauljurgens/Downloads/projects/shopify
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/a5-deps-readiness-29b49e
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/completed-workstreams-query-9d6ee2
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/e5-issue-deps-571a87
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/find-available-issue-a2501f
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/h2-issue-completion-2d6711
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/optimistic-nightingale-a17409
> 
> === agent dev servers still listening ===
> 68540 *:4001
> 68574 *:4002
> 7986
> … [truncated, 47 more chars]
> ```

🔧 **Bash**
```
sleep 20; echo "=== load / memory after cleanup ==="; uptime; sysctl vm.swapusage; vm_stat | sed -n '2p;3p;4p'
```

> **↳ result**
> ```
> === load / memory after cleanup ===
> 18:47  up  4:02, 1 user, load averages: 12.14 18.72 20.13
> vm.swapusage: total = 5120.00M  used = 4370.75M  free = 749.25M  (encrypted)
> Pages free:                                3785.
> Pages active:                             76452.
> Pages inactive:                           68924.
> ```

### 🤖 Claude

Load dropped 38 → 12. But I see h2's servers have new PIDs — let me confirm that wasn't me.

🔧 **Bash**
```
echo "=== old h2 pids still alive? ==="; ps -o pid,command -p 40203,40221,52521,52551,52562,52882,52884 2>/dev/null | cut -c1-100 || echo "(all gone)"
echo; echo "=== new server pids: parentage ==="; ps -o pid,ppid,lstart,command -p 88470,88485,88503 2>/dev/null | cut -c1-150
echo; echo "=== walk up the tree ==="; for p in 88470 88485 88503; do pp=$(ps -o ppid= -p $p | tr -d ' '); echo "--- $p parent $pp:"; ps -o pid,ppid,command -p $pp 2>/dev/null | tail -1 | cut -c1-130; done
```

> **↳ result**
> ```
> === old h2 pids still alive? ===
>   PID COMMAND
> 
> === new server pids: parentage ===
>   PID  PPID STARTED                      COMMAND
> 88470 88450 Fri Aug 28 18:45:01 2026     next-server (v15.5.24)    
> 88485 88449 Fri Aug 28 18:45:01 2026     next-server (v15.5.24)    
> 88503 88484 Fri Aug 28 18:45:01 2026     /Users/pauljurgens/.nvm/versions/node/v22.23.2/bin/node --require /Users/pauljurgens/Downloads/projects/shopi
> 
> === walk up the tree ===
> --- 88470 parent 88450:
> 88450     1 node /opt/homebrew/bin/pnpm --filter @merchant/storefront exec next start --port 3102
> --- 88485 parent 88449:
> 88449     1 node /opt/homebrew/bin/pnpm --filter @merchant/admin exec next start --port 3100
> --- 88503 parent
> … [truncated, 138 more chars]
> ```

🔧 **Bash**
```
echo "=== h2 worktree activity now ==="; ps -Ao pid,ppid,lstart,command | grep "h2-issue-completion-2d6711" | grep -v grep | cut -c1-155
echo; echo "=== any playwright/e2e running? ==="; ps -Ao pid,command | grep -Ei "playwright|e2e|vitest" | grep -v grep | cut -c1-130 || echo "(none)"
```

> **↳ result**
> ```
> === h2 worktree activity now ===
> 88484 88448 Fri Aug 28 18:45:01 2026     node /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/h2-issue-completion-2d6711/apps/api/node_modu
> 88503 88484 Fri Aug 28 18:45:01 2026     /Users/pauljurgens/.nvm/versions/node/v22.23.2/bin/node --require /Users/pauljurgens/Downloads/projects/shopify/.c
> 88520 88503 Fri Aug 28 18:45:02 2026     /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/h2-issue-completion-2d6711/node_modules/.pnpm/@esb
> 
> === any playwright/e2e running? ===
> ```

🔧 **Bash**
```
echo "=== ports 3000/3001/3002 now ==="; lsof -nP -iTCP:3000,3001,3002 -sTCP:LISTEN 2>/dev/null || echo "(free)"; echo; echo "=== final ==="; uptime; sysctl -n vm.swapusage
```

> **↳ result**
> ```
> === ports 3000/3001/3002 now ===
> (free)
> 
> === final ===
> 18:48  up  4:03, 1 user, load averages: 9.12 17.22 19.53
> total = 5120.00M  used = 4319.19M  free = 800.81M  (encrypted)
> ```

### 🤖 Claude

All three cleaned.

| | Before | After |
|---|---|---|
| Load (1 min) | 38.46 | **9.12** |
| Swap used | 8933 MB / 10240 | **4319 MB / 5120** |
| Ports 3000/3001/3002 | held by dead worktree | **free** |

macOS shrank the swap file from 10 GB to 5 GB, which means the pressure relief is real rather than just a reshuffle.

**What I removed:**
1. The abandoned `resolve-docs-issue-3f28ad` 4-app stack (11 processes) — released :3000/:3001/:3002 and four monorepo-wide file watchers
2. Two duplicate orphaned API servers from `ws-b-collections-inventory-ui` (4 processes), idle since 16:09
3. `iti0302-2023-backend-database-1` container

All exited on SIGTERM — nothing needed force.

**All 7 live agent sessions are intact**, and the servers on :3201, :4001 and :4002 are the same PIDs as before, untouched.

One thing worth flagging honestly: h2's three servers (:3100/:3101/:3102) have **new PIDs** — they restarted at 18:45:01, about a minute after my cleanup. They were not on my kill list, and I killed by explicit PID with no process-group propagation, so this wasn't collateral. All three came up in the same second from the `ws-h/e2e-smoke` worktree, and its earlier `pnpm verify`/`pnpm test` had just finished — that's the signature of the agent cycling its own stack for the e2e phase. Its session is alive and working. I can't prove causation to zero, but the evidence points to its own restart, not mine.

The load average is still 9 on 8 cores, so the machine remains oversubscribed — that's the eight concurrent sessions and three remaining dev stacks, not leftover cruft. Dropping to three or four sessions is the lever that would take it from "usable" to "fast."
