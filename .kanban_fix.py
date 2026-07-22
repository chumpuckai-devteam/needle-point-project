import sqlite3, json

db = "/opt/data/kanban/boards/needlepoint/kanban.db"
conn = sqlite3.connect(db)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
print("integrity:", cur.execute("PRAGMA integrity_check").fetchall())
try:
    cur.execute("REINDEX")
    conn.commit()
    print("reindex ok")
    print("integrity after:", cur.execute("PRAGMA integrity_check").fetchall())
except Exception as e:
    print("reindex err", e)

tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("tables:", tables)

task_id = "t_9911d324"
for q in [
    "SELECT * FROM tasks WHERE id=?",
    "SELECT * FROM task WHERE id=?",
    "SELECT * FROM cards WHERE id=?",
]:
    try:
        rows = cur.execute(q, (task_id,)).fetchall()
        if rows:
            print("query", q)
            print("cols", list(rows[0].keys()))
            d = dict(rows[0])
            for k, v in d.items():
                if isinstance(v, str) and len(v) > 4000:
                    d[k] = v[:4000] + "...[trunc]"
            print(json.dumps(d, indent=2, default=str))
            break
        else:
            print("no rows for", q)
    except Exception as e:
        print("fail", q, e)

for tname in tables:
    low = tname.lower()
    if any(x in low for x in ("comment", "event", "handoff", "run", "attempt", "link", "parent")):
        try:
            cols = [r[1] for r in cur.execute(f"PRAGMA table_info({tname})").fetchall()]
            print(f"\n=== {tname} cols: {cols}")
            for col in cols:
                if "task" in col.lower():
                    try:
                        rows = cur.execute(
                            f"SELECT * FROM {tname} WHERE {col}=? ORDER BY rowid DESC LIMIT 15",
                            (task_id,),
                        ).fetchall()
                        if rows:
                            print(f"rows via {col}:", len(rows))
                            for r in rows[:10]:
                                d = dict(r)
                                for k, v in d.items():
                                    if isinstance(v, str) and len(v) > 2000:
                                        d[k] = v[:2000] + "...[trunc]"
                                print(json.dumps(d, indent=2, default=str))
                    except Exception:
                        pass
        except Exception as e:
            print("err", tname, e)
