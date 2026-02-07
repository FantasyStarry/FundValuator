import sqlite3
from pathlib import Path
from typing import List, Optional


DB_PATH = Path(__file__).resolve().parent / "data" / "app.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS funds (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                updated_at TEXT,
                amount REAL DEFAULT 0,
                mode TEXT DEFAULT 'amount',
                shares REAL DEFAULT 0,
                cost REAL DEFAULT 0,
                last_source TEXT,
                last_source_date TEXT,
                last_source_pct REAL,
                last_switch_at TEXT,
                last_official_date TEXT
            )
            """
        )
        try:
            conn.execute("ALTER TABLE funds ADD COLUMN amount REAL DEFAULT 0")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        for col, col_type, default in [
            ("mode", "TEXT", "'amount'"),
            ("shares", "REAL", "0"),
            ("cost", "REAL", "0"),
            ("last_source", "TEXT", "NULL"),
            ("last_source_date", "TEXT", "NULL"),
            ("last_source_pct", "REAL", "NULL"),
            ("last_switch_at", "TEXT", "NULL"),
            ("last_official_date", "TEXT", "NULL"),
        ]:
            try:
                conn.execute(f"ALTER TABLE funds ADD COLUMN {col} {col_type} DEFAULT {default}")
            except sqlite3.OperationalError:
                pass
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS holdings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fund_code TEXT NOT NULL,
                stock_code TEXT NOT NULL,
                stock_name TEXT NOT NULL,
                weight REAL NOT NULL,
                FOREIGN KEY (fund_code) REFERENCES funds(code)
            )
            """
        )


def upsert_fund(code: str, name: str, updated_at: Optional[str]) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO funds(code, name, updated_at, amount, mode, shares, cost, last_source, last_source_date, last_source_pct, last_switch_at, last_official_date)
            VALUES (?, ?, ?, 0, 'amount', 0, 0, NULL, NULL, NULL, NULL, NULL)
            ON CONFLICT(code) DO UPDATE SET
                name = excluded.name,
                updated_at = excluded.updated_at
            """,
            (code, name, updated_at),
        )


def replace_holdings(code: str, holdings: List[dict]) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM holdings WHERE fund_code = ?", (code,))
        conn.executemany(
            """
            INSERT INTO holdings(fund_code, stock_code, stock_name, weight)
            VALUES (?, ?, ?, ?)
            """,
            [(code, h["stock_code"], h["stock_name"], h["weight"]) for h in holdings],
        )


def update_fund_amount(code: str, amount: float) -> None:
    # Deprecated: use update_fund_holding instead
    update_fund_holding(code, amount=amount)

def update_fund_holding(code: str, amount: float = 0.0, mode: str = "amount", shares: float = 0.0, cost: float = 0.0) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE funds SET amount = ?, mode = ?, shares = ?, cost = ? WHERE code = ?",
            (amount, mode, shares, cost, code),
        )


def update_fund_source_state(
    code: str,
    last_source: Optional[str],
    last_source_date: Optional[str],
    last_source_pct: Optional[float],
    last_switch_at: Optional[str],
    last_official_date: Optional[str],
) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE funds
            SET last_source = ?, last_source_date = ?, last_source_pct = ?, last_switch_at = ?, last_official_date = ?
            WHERE code = ?
            """,
            (last_source, last_source_date, last_source_pct, last_switch_at, last_official_date, code),
        )


def delete_fund(code: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM holdings WHERE fund_code = ?", (code,))
        conn.execute("DELETE FROM funds WHERE code = ?", (code,))


def list_funds(keyword: str = "") -> List[dict]:
    with get_conn() as conn:
        if keyword:
            pattern = f"%{keyword}%"
            rows = conn.execute(
            "SELECT code, name, updated_at, amount, mode, shares, cost, last_source, last_source_date, last_source_pct, last_switch_at, last_official_date FROM funds WHERE code LIKE ? OR name LIKE ? ORDER BY code",
                (pattern, pattern),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT code, name, updated_at, amount, mode, shares, cost, last_source, last_source_date, last_source_pct, last_switch_at, last_official_date FROM funds ORDER BY code"
            ).fetchall()
    return [dict(row) for row in rows]


def get_fund(code: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT code, name, updated_at, amount, mode, shares, cost, last_source, last_source_date, last_source_pct, last_switch_at, last_official_date FROM funds WHERE code = ?",
            (code,),
        ).fetchone()
    return dict(row) if row else None


def get_holdings(code: str) -> List[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT stock_code, stock_name, weight
            FROM holdings
            WHERE fund_code = ?
            ORDER BY weight DESC
            """,
            (code,),
        ).fetchall()
    return [dict(row) for row in rows]
