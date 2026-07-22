#!/usr/bin/env python3
import sqlite3
import os
import shutil

db = "/opt/data/kanban/boards/needlepoint/kanban.db"
bak = db + ".pre-repair-agent.bak"
if not os.path.exists(bak):
    shutil.copy2(db, bak)
    print(f"backed up to {bak}")

conn = sqlite3.connect(db)
cur = conn.cursor()
print("integrity:", cur.execute("PRAGMA integrity_check").fetchall())
print("tables:", [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")])

try:
    cur.execute("REINDEX")
    conn.commit()
    print("REINDEX done")
    print("integrity after reindex:", cur.execute("PRAGMA integrity_check").fetchall())
except Exception as e:
    print("REINDEX failed:", e)

try:
    cols = [r[1] for r in cur.execute("PRAGMA table_info(tasks)")]
    print("task cols:", cols)
    row = cur.execute("SELECT * FROM tasks WHERE id=?", ("t_aa44f4bd",)).fetchone()
    if row:
        print("TASK FOUND:")
        for c, v in zip(cols, row):
            val = v if not isinstance(v, str) or len(v) < 3000 else v[:3000] + "...[truncated]"
            print(f"  {c}: {val}")
    else:
        print("task not found by id")
        rows = cur.execute(
            "SELECT id, title, status, assignee FROM tasks ORDER BY rowid DESC LIMIT 20"
        ).fetchall()
        print("recent tasks:", rows)
except Exception as e:
    print("task query err:", e)

try:
    ccols = [r[1] for r in cur.execute("PRAGMA table_info(comments)")]
    comments = cur.execute(
        "SELECT * FROM comments WHERE task_id=? ORDER BY rowid", ("t_aa44f4bd",)
    ).fetchall()
    print("comments count:", len(comments))
    for c in comments:
        d = dict(zip(ccols, c))
        print(d)
except Exception as e:
    print("comments err:", e)

try:
    ecols = [r[1] for r in cur.execute("PRAGMA table_info(events)")]
    events = cur.execute(
        "SELECT * FROM events WHERE task_id=? ORDER BY rowid DESC LIMIT 15",
        ("t_aa44f4bd",),
    ).fetchall()
    print("recent events:")
    for e in events:
        print(dict(zip(ecols, e)))
except Exception as e:
    print("events err:", e)

try:
    # parent links
    for tname in [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")]:
        info = cur.execute(f"PRAGMA table_info({tname})").fetchall()
        colnames = [r[1] for r in info]
        if any(c in colnames for c in ("parent_id", "child_id", "task_id")):
            print(f"table {tname} cols: {colnames}")
except Exception as e:
    print("link inspect err:", e)

conn.close()
