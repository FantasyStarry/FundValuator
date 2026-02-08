import argparse
import sqlite3
import sys
from pathlib import Path

from psycopg import connect

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR.parent))

from backend.config import get_database_url
from backend.storage import init_db


DEFAULT_SQLITE_PATH = BASE_DIR / "data" / "app.db"


def _fetch_all(conn: sqlite3.Connection, query: str, params: tuple = ()) -> list[dict]:
    cursor = conn.execute(query, params)
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def _default_pg_url() -> str:
    return get_database_url() or "postgresql://postgres:postgres@localhost:5432/jijin"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sqlite-path", default=str(DEFAULT_SQLITE_PATH))
    parser.add_argument("--database-url", default=None)
    parser.add_argument("--clear", action="store_true")
    args = parser.parse_args()

    sqlite_path = Path(args.sqlite_path)
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite file not found: {sqlite_path}")

    pg_url = args.database_url or _default_pg_url()

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row

    funds = _fetch_all(
        sqlite_conn,
        """
        SELECT code, name, updated_at, amount, mode, shares, cost, last_source, last_source_date, last_source_pct, last_switch_at, last_official_date
        FROM funds
        ORDER BY code
        """,
    )
    holdings = _fetch_all(
        sqlite_conn,
        """
        SELECT fund_code, stock_code, stock_name, weight
        FROM holdings
        ORDER BY fund_code
        """,
    )
    news_items = _fetch_all(
        sqlite_conn,
        """
        SELECT news_id, title, link, source, published_at, summary, updated_at
        FROM news_items
        ORDER BY published_at DESC
        """,
    )

    init_db()
    with connect(pg_url) as pg_conn:
        with pg_conn.cursor() as cur:
            if args.clear:
                cur.execute("DELETE FROM holdings")
                cur.execute("DELETE FROM news_items")
                cur.execute("DELETE FROM funds")

            if funds:
                cur.executemany(
                    """
                    INSERT INTO funds(code, name, updated_at, amount, mode, shares, cost, last_source, last_source_date, last_source_pct, last_switch_at, last_official_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT(code) DO UPDATE SET
                        name = excluded.name,
                        updated_at = excluded.updated_at,
                        amount = excluded.amount,
                        mode = excluded.mode,
                        shares = excluded.shares,
                        cost = excluded.cost,
                        last_source = excluded.last_source,
                        last_source_date = excluded.last_source_date,
                        last_source_pct = excluded.last_source_pct,
                        last_switch_at = excluded.last_switch_at,
                        last_official_date = excluded.last_official_date
                    """,
                    [
                        (
                            f["code"],
                            f["name"],
                            f["updated_at"],
                            f["amount"],
                            f["mode"],
                            f["shares"],
                            f["cost"],
                            f["last_source"],
                            f["last_source_date"],
                            f["last_source_pct"],
                            f["last_switch_at"],
                            f["last_official_date"],
                        )
                        for f in funds
                    ],
                )

            if holdings:
                cur.executemany(
                    """
                    INSERT INTO holdings(fund_code, stock_code, stock_name, weight)
                    VALUES (%s, %s, %s, %s)
                    """,
                    [(h["fund_code"], h["stock_code"], h["stock_name"], h["weight"]) for h in holdings],
                )

            if news_items:
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
                    [
                        (
                            n["news_id"],
                            n["title"],
                            n["link"],
                            n["source"],
                            n["published_at"],
                            n["summary"],
                            n["updated_at"],
                        )
                        for n in news_items
                    ],
                )


if __name__ == "__main__":
    main()
