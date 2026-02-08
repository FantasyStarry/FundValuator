from typing import Dict, List, Optional
import json

from psycopg import connect
from psycopg.rows import dict_row

from .config import get_database_url


def get_conn():
    url = get_database_url() or "postgresql://postgres:postgres@localhost:5432/jijin"
    return connect(url, row_factory=dict_row)


def clear_news_analysis() -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM news_analysis")

def init_db() -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
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
            for col, col_type, default in [
                ("amount", "REAL", "0"),
                ("mode", "TEXT", "'amount'"),
                ("shares", "REAL", "0"),
                ("cost", "REAL", "0"),
                ("last_source", "TEXT", "NULL"),
                ("last_source_date", "TEXT", "NULL"),
                ("last_source_pct", "REAL", "NULL"),
                ("last_switch_at", "TEXT", "NULL"),
                ("last_official_date", "TEXT", "NULL"),
            ]:
                cur.execute(
                    f"ALTER TABLE funds ADD COLUMN IF NOT EXISTS {col} {col_type} DEFAULT {default}"
                )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS holdings (
                    id SERIAL PRIMARY KEY,
                    fund_code TEXT NOT NULL,
                    stock_code TEXT NOT NULL,
                    stock_name TEXT NOT NULL,
                    weight REAL NOT NULL,
                    FOREIGN KEY (fund_code) REFERENCES funds(code)
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS news_items (
                    news_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    link TEXT,
                    source TEXT NOT NULL,
                    published_at TEXT,
                    summary TEXT,
                    updated_at TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS news_analysis (
                    news_id TEXT PRIMARY KEY,
                    summary TEXT,
                    sentiment TEXT,
                    impacted_assets TEXT,
                    confidence REAL,
                    reasoning TEXT,
                    updated_at TEXT,
                    importance_score REAL DEFAULT 0
                )
                """
            )
            cur.execute("ALTER TABLE news_analysis ADD COLUMN IF NOT EXISTS importance_score REAL DEFAULT 0")


def upsert_fund(code: str, name: str, updated_at: Optional[str]) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO funds(code, name, updated_at, amount, mode, shares, cost, last_source, last_source_date, last_source_pct, last_switch_at, last_official_date)
                VALUES (%s, %s, %s, 0, 'amount', 0, 0, NULL, NULL, NULL, NULL, NULL)
                ON CONFLICT(code) DO UPDATE SET
                    name = excluded.name,
                    updated_at = excluded.updated_at
                """,
                (code, name, updated_at),
            )


def replace_holdings(code: str, holdings: List[dict]) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM holdings WHERE fund_code = %s", (code,))
            cur.executemany(
                """
                INSERT INTO holdings(fund_code, stock_code, stock_name, weight)
                VALUES (%s, %s, %s, %s)
                """,
                [(code, h["stock_code"], h["stock_name"], h["weight"]) for h in holdings],
            )


def update_fund_amount(code: str, amount: float) -> None:
    # Deprecated: use update_fund_holding instead
    update_fund_holding(code, amount=amount)

def update_fund_holding(code: str, amount: float = 0.0, mode: str = "amount", shares: float = 0.0, cost: float = 0.0) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE funds SET amount = %s, mode = %s, shares = %s, cost = %s WHERE code = %s",
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
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE funds
                SET last_source = %s, last_source_date = %s, last_source_pct = %s, last_switch_at = %s, last_official_date = %s
                WHERE code = %s
                """,
                (last_source, last_source_date, last_source_pct, last_switch_at, last_official_date, code),
            )


def delete_fund(code: str) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM holdings WHERE fund_code = %s", (code,))
            cur.execute("DELETE FROM funds WHERE code = %s", (code,))


def list_funds(keyword: str = "") -> List[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            if keyword:
                pattern = f"%{keyword}%"
                cur.execute(
                    "SELECT code, name, updated_at, amount, mode, shares, cost, last_source, last_source_date, last_source_pct, last_switch_at, last_official_date FROM funds WHERE code LIKE %s OR name LIKE %s ORDER BY code",
                    (pattern, pattern),
                )
            else:
                cur.execute(
                    "SELECT code, name, updated_at, amount, mode, shares, cost, last_source, last_source_date, last_source_pct, last_switch_at, last_official_date FROM funds ORDER BY code"
                )
            rows = cur.fetchall()
    return list(rows)


def get_fund(code: str) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT code, name, updated_at, amount, mode, shares, cost, last_source, last_source_date, last_source_pct, last_switch_at, last_official_date FROM funds WHERE code = %s",
                (code,),
            )
            row = cur.fetchone()
    return dict(row) if row else None


def get_holdings(code: str) -> List[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT stock_code, stock_name, weight
                FROM holdings
                WHERE fund_code = %s
                ORDER BY weight DESC
                """,
                (code,),
            )
            rows = cur.fetchall()
    return list(rows)


def upsert_news_items(items: List[dict], source: str) -> None:
    if not items:
        return
    payload = []
    for item in items:
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        link = item.get("link") or None
        news_id = link or title
        payload.append(
            (
                news_id,
                title,
                link,
                source,
                item.get("published_at"),
                item.get("summary"),
                item.get("updated_at"),
            )
        )
    if not payload:
        return
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO news_items(news_id, title, link, source, published_at, summary, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT(news_id) DO UPDATE SET
                    title = excluded.title,
                    link = excluded.link,
                    source = excluded.source,
                    published_at = excluded.published_at,
                    summary = excluded.summary,
                    updated_at = excluded.updated_at
                """,
                payload,
            )


def list_news_items(source: str, limit: int = 20) -> List[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT title, link, source, published_at, summary
                FROM news_items
                WHERE source = %s
                ORDER BY published_at DESC
                LIMIT %s
                """,
                (source, limit),
            )
            rows = cur.fetchall()
    return list(rows)


def upsert_news_analysis(news_id: str, analysis: Dict, updated_at: Optional[str]) -> None:
    impacted_assets = analysis.get("impacted_assets") or []
    payload = (
        news_id,
        analysis.get("summary"),
        analysis.get("sentiment"),
        json.dumps(impacted_assets, ensure_ascii=False),
        analysis.get("confidence"),
        analysis.get("reasoning"),
        updated_at,
        analysis.get("importance_score") or 0.0,
    )
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO news_analysis(news_id, summary, sentiment, impacted_assets, confidence, reasoning, updated_at, importance_score)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT(news_id) DO UPDATE SET
                    summary = excluded.summary,
                    sentiment = excluded.sentiment,
                    impacted_assets = excluded.impacted_assets,
                    confidence = excluded.confidence,
                    reasoning = excluded.reasoning,
                    updated_at = excluded.updated_at,
                    importance_score = excluded.importance_score
                """,
                payload,
            )


def list_news_analysis(news_ids: List[str]) -> Dict[str, dict]:
    if not news_ids:
        return {}
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT news_id, summary, sentiment, impacted_assets, confidence, reasoning, importance_score
                FROM news_analysis
                WHERE news_id = ANY(%s)
                """,
                (news_ids,),
            )
            rows = cur.fetchall()
            
    result = {}
    for row in rows:
        # Parse impacted_assets from JSON string
        impacted_assets_raw = row.get("impacted_assets")
        impacted_assets = []
        if impacted_assets_raw:
            try:
                impacted_assets = json.loads(impacted_assets_raw)
            except json.JSONDecodeError:
                pass
        
        # Ensure it's a list of strings
        if not isinstance(impacted_assets, list):
            impacted_assets = []
            
        row_dict = dict(row)
        row_dict["impacted_assets"] = impacted_assets
        result[row["news_id"]] = row_dict
        
    return result
