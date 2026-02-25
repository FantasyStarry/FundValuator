"""
Test configuration and fixtures for backend API tests.
Uses SQLite in-memory database for isolation.
"""

import os
import sys
from pathlib import Path
from typing import Generator
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from fastapi.testclient import TestClient

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set test environment variables BEFORE importing app
os.environ["DATABASE_URL"] = "sqlite::memory:"
os.environ["REDIS_URL"] = ""
os.environ["DEEPSEEK_API_KEY"] = ""


# In-memory SQLite for testing
_test_db = None


def get_test_db():
    """Get or create the in-memory test database."""
    global _test_db
    if _test_db is None:
        import sqlite3
        _test_db = sqlite3.connect(":memory:", check_same_thread=False)
        _test_db.row_factory = sqlite3.Row
        
        # Create tables
        _test_db.executescript("""
            CREATE TABLE IF NOT EXISTS funds (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                updated_at TEXT,
                amount REAL DEFAULT 0,
                mode TEXT DEFAULT 'amount',
                shares REAL DEFAULT 0,
                cost REAL DEFAULT 0,
                invested_amount REAL DEFAULT 0,
                last_source TEXT,
                last_source_date TEXT,
                last_source_pct REAL,
                last_switch_at TEXT,
                last_official_date TEXT
            );
            
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fund_code TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL DEFAULT 0,
                shares REAL DEFAULT 0,
                price REAL DEFAULT 0,
                trans_date TEXT NOT NULL,
                is_after_3pm INTEGER DEFAULT 0,
                confirm_date TEXT,
                status TEXT DEFAULT 'pending',
                created_at TEXT,
                FOREIGN KEY (fund_code) REFERENCES funds(code)
            );
            
            CREATE TABLE IF NOT EXISTS holdings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fund_code TEXT NOT NULL,
                stock_code TEXT NOT NULL,
                stock_name TEXT NOT NULL,
                weight REAL NOT NULL,
                FOREIGN KEY (fund_code) REFERENCES funds(code)
            );
            
            CREATE TABLE IF NOT EXISTS news_items (
                news_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                link TEXT,
                source TEXT NOT NULL,
                published_at TEXT,
                summary TEXT,
                updated_at TEXT
            );
            
            CREATE TABLE IF NOT EXISTS news_analysis (
                news_id TEXT PRIMARY KEY,
                summary TEXT,
                sentiment TEXT,
                impacted_assets TEXT,
                confidence REAL,
                reasoning TEXT,
                updated_at TEXT,
                importance_score REAL DEFAULT 0
            );
        """)
    return _test_db


class TestStorage:
    """Test storage implementation using SQLite in-memory database."""
    
    def __init__(self, conn):
        self._conn = conn
    
    def init_db(self):
        pass
    
    def upsert_fund(self, code: str, name: str, updated_at=None):
        cursor = self._conn.cursor()
        cursor.execute(
            """INSERT OR REPLACE INTO funds 
               (code, name, updated_at, amount, mode, shares, cost, invested_amount)
               VALUES (?, ?, ?, 
                       COALESCE((SELECT amount FROM funds WHERE code=?), 0),
                       COALESCE((SELECT mode FROM funds WHERE code=?), 'amount'),
                       COALESCE((SELECT shares FROM funds WHERE code=?), 0),
                       COALESCE((SELECT cost FROM funds WHERE code=?), 0),
                       COALESCE((SELECT invested_amount FROM funds WHERE code=?), 0))""",
            (code, name, updated_at, code, code, code, code, code)
        )
        self._conn.commit()
    
    def get_fund(self, code: str):
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM funds WHERE code = ?", (code,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def list_funds(self, keyword: str = ""):
        cursor = self._conn.cursor()
        if keyword:
            pattern = f"%{keyword}%"
            cursor.execute(
                "SELECT * FROM funds WHERE code LIKE ? OR name LIKE ? ORDER BY code",
                (pattern, pattern)
            )
        else:
            cursor.execute("SELECT * FROM funds ORDER BY code")
        return [dict(row) for row in cursor.fetchall()]
    
    def delete_fund(self, code: str):
        cursor = self._conn.cursor()
        cursor.execute("DELETE FROM holdings WHERE fund_code = ?", (code,))
        cursor.execute("DELETE FROM funds WHERE code = ?", (code,))
        self._conn.commit()
    
    def update_fund_holding(self, code: str, amount=0.0, mode="amount", shares=0.0, cost=0.0, invested_amount=0.0):
        cursor = self._conn.cursor()
        cursor.execute(
            "UPDATE funds SET amount = ?, mode = ?, shares = ?, cost = ?, invested_amount = ? WHERE code = ?",
            (amount, mode, shares, cost, invested_amount, code)
        )
        self._conn.commit()
    
    def update_fund_source_state(self, code, last_source, last_source_date, last_source_pct, 
                                  last_switch_at, last_official_date):
        cursor = self._conn.cursor()
        cursor.execute(
            "UPDATE funds SET last_source = ?, last_source_date = ?, last_source_pct = ?, last_switch_at = ?, last_official_date = ? WHERE code = ?",
            (last_source, last_source_date, last_source_pct, last_switch_at, last_official_date, code)
        )
        self._conn.commit()
    
    def get_holdings(self, code: str):
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT stock_code, stock_name, weight FROM holdings WHERE fund_code = ? ORDER BY weight DESC",
            (code,)
        )
        return [dict(row) for row in cursor.fetchall()]
    
    def replace_holdings(self, code: str, holdings: list):
        cursor = self._conn.cursor()
        cursor.execute("DELETE FROM holdings WHERE fund_code = ?", (code,))
        for h in holdings:
            cursor.execute(
                "INSERT INTO holdings (fund_code, stock_code, stock_name, weight) VALUES (?, ?, ?, ?)",
                (code, h["stock_code"], h["stock_name"], h["weight"])
            )
        self._conn.commit()
    
    def add_transaction(self, fund_code, trans_type, amount, shares, price, trans_date,
                        is_after_3pm=False, confirm_date=None, status="pending"):
        from datetime import datetime
        cursor = self._conn.cursor()
        created_at = datetime.now().isoformat(timespec="seconds")
        cursor.execute(
            "INSERT INTO transactions (fund_code, type, amount, shares, price, trans_date, is_after_3pm, confirm_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (fund_code, trans_type, amount, shares, price, trans_date, 
             1 if is_after_3pm else 0, confirm_date, status, created_at)
        )
        self._conn.commit()
        return cursor.lastrowid
    
    def get_transaction(self, trans_id: int):
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM transactions WHERE id = ?", (trans_id,))
        row = cursor.fetchone()
        if row:
            result = dict(row)
            result["is_after_3pm"] = bool(result.get("is_after_3pm", 0))
            return result
        return None
    
    def list_transactions(self, fund_code: str):
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT * FROM transactions WHERE fund_code = ? ORDER BY trans_date DESC, created_at DESC",
            (fund_code,)
        )
        results = []
        for row in cursor.fetchall():
            result = dict(row)
            result["is_after_3pm"] = bool(result.get("is_after_3pm", 0))
            results.append(result)
        return results
    
    def delete_transaction(self, trans_id: int):
        cursor = self._conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE id = ?", (trans_id,))
        self._conn.commit()
    
    def update_transaction_status(self, trans_id: int, status: str, confirm_date=None):
        cursor = self._conn.cursor()
        if confirm_date:
            cursor.execute(
                "UPDATE transactions SET status = ?, confirm_date = ? WHERE id = ?",
                (status, confirm_date, trans_id)
            )
        else:
            cursor.execute("UPDATE transactions SET status = ? WHERE id = ?", (status, trans_id))
        self._conn.commit()
    
    def get_confirmed_transactions(self, fund_code: str):
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT * FROM transactions WHERE fund_code = ? AND status = 'confirmed' ORDER BY confirm_date ASC, trans_date ASC",
            (fund_code,)
        )
        return [dict(row) for row in cursor.fetchall()]
    
    def calculate_position_from_transactions(self, fund_code: str):
        transactions = self.get_confirmed_transactions(fund_code)
        
        total_shares = 0.0
        total_cost = 0.0
        total_amount = 0.0
        
        for trans in transactions:
            trans_type = trans["type"]
            shares = trans["shares"] or 0.0
            amount = trans["amount"] or 0.0
            price = trans["price"] or 0.0
            
            if trans_type == "buy":
                total_shares += shares
                total_amount += amount
                if shares > 0 and price > 0:
                    total_cost += shares * price
            elif trans_type == "sell":
                if total_shares > 0 and shares > 0 and total_shares >= shares:
                    cost_per_share = total_cost / total_shares if total_shares > 0 else 0
                    total_cost -= shares * cost_per_share
                    total_shares -= shares
                total_amount -= amount
                if total_amount < 0:
                    total_amount = 0
        
        avg_cost = total_cost / total_shares if total_shares > 0 else 0.0
        
        return {
            "shares": round(total_shares, 2),
            "cost": round(avg_cost, 4),
            "invested_amount": round(total_amount, 2),
        }
    
    def clear_news_analysis(self):
        cursor = self._conn.cursor()
        cursor.execute("DELETE FROM news_analysis")
        self._conn.commit()
    
    def list_news_items(self, source: str, limit: int = 20):
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT title, link, source, published_at, summary FROM news_items WHERE source = ? ORDER BY published_at DESC LIMIT ?",
            (source, limit)
        )
        return [dict(row) for row in cursor.fetchall()]
    
    def upsert_news_items(self, items: list, source: str):
        cursor = self._conn.cursor()
        for item in items:
            title = str(item.get("title") or "").strip()
            if not title:
                continue
            link = item.get("link") or None
            news_id = link or title
            cursor.execute(
                "INSERT OR REPLACE INTO news_items (news_id, title, link, source, published_at, summary, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (news_id, title, link, source, item.get("published_at"), item.get("summary"), item.get("updated_at"))
            )
        self._conn.commit()
    
    def upsert_news_analysis(self, news_id: str, analysis: dict, updated_at=None):
        import json
        cursor = self._conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO news_analysis (news_id, summary, sentiment, impacted_assets, confidence, reasoning, updated_at, importance_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (news_id, analysis.get("summary"), analysis.get("sentiment"),
             json.dumps(analysis.get("impacted_assets", [])),
             analysis.get("confidence"), analysis.get("reasoning"), updated_at,
             analysis.get("importance_score", 0))
        )
        self._conn.commit()
    
    def list_news_analysis(self, news_ids: list):
        import json
        if not news_ids:
            return {}
        cursor = self._conn.cursor()
        placeholders = ",".join("?" * len(news_ids))
        cursor.execute(
            f"SELECT * FROM news_analysis WHERE news_id IN ({placeholders})",
            news_ids
        )
        result = {}
        for row in cursor.fetchall():
            row_dict = dict(row)
            try:
                row_dict["impacted_assets"] = json.loads(row_dict.get("impacted_assets", "[]"))
            except:
                row_dict["impacted_assets"] = []
            result[row["news_id"]] = row_dict
        return result
    
    def clear_all(self):
        """Clear all data for test isolation."""
        cursor = self._conn.cursor()
        cursor.execute("DELETE FROM transactions")
        cursor.execute("DELETE FROM holdings")
        cursor.execute("DELETE FROM funds")
        cursor.execute("DELETE FROM news_items")
        cursor.execute("DELETE FROM news_analysis")
        self._conn.commit()


@pytest.fixture
def test_storage():
    """Create a TestStorage instance."""
    db = get_test_db()
    storage = TestStorage(db)
    storage.clear_all()  # Start fresh for each test
    return storage


@pytest.fixture
def mock_data_sources():
    """Mock external data source functions."""
    with patch("backend.data_sources.fetch_fund_gz", new_callable=AsyncMock) as mock_gz, \
         patch("backend.data_sources.fetch_holdings", new_callable=AsyncMock) as mock_holdings, \
         patch("backend.data_sources.fetch_nav_history", new_callable=AsyncMock) as mock_nav, \
         patch("backend.data_sources.fetch_quote", new_callable=AsyncMock) as mock_quote, \
         patch("backend.data_sources.search_market_funds", new_callable=AsyncMock) as mock_search, \
         patch("backend.data_sources.fetch_news_feed", new_callable=AsyncMock) as mock_news, \
         patch("backend.data_sources.fetch_article_content", new_callable=AsyncMock) as mock_article:
        
        # Default mock returns
        mock_gz.return_value = {
            "name": "测试基金",
            "gszzl": 1.5,
            "gsz": 1.2345,
            "dwjz": 1.2156,
            "gztime": "2026-02-25 14:30:00"
        }
        mock_holdings.return_value = ([], None)
        mock_nav.return_value = [
            {"date": "2026-02-24", "nav": 1.2156, "accum_nav": 1.5234, "daily_pct": 1.2},
            {"date": "2026-02-23", "nav": 1.2012, "accum_nav": 1.5090, "daily_pct": 0.8}
        ]
        mock_quote.return_value = {"price": 10.5, "prev_close": 10.0, "change_pct": 5.0}
        mock_search.return_value = [
            {"code": "000001", "name": "华夏成长混合"},
            {"code": "000002", "name": "华夏回报混合"}
        ]
        mock_news.return_value = []
        mock_article.return_value = None
        
        yield {
            "fetch_fund_gz": mock_gz,
            "fetch_holdings": mock_holdings,
            "fetch_nav_history": mock_nav,
            "fetch_quote": mock_quote,
            "search_market_funds": mock_search,
            "fetch_news_feed": mock_news,
            "fetch_article_content": mock_article
        }


@pytest.fixture
def client(test_storage, mock_data_sources) -> Generator[TestClient, None, None]:
    """Create a test client with mocked dependencies."""
    from contextlib import ExitStack
    
    # Patch storage module functions
    patches = [
        ("backend.storage.init_db", test_storage.init_db),
        ("backend.storage.list_funds", test_storage.list_funds),
        ("backend.storage.get_fund", test_storage.get_fund),
        ("backend.storage.upsert_fund", test_storage.upsert_fund),
        ("backend.storage.delete_fund", test_storage.delete_fund),
        ("backend.storage.update_fund_holding", test_storage.update_fund_holding),
        ("backend.storage.update_fund_source_state", test_storage.update_fund_source_state),
        ("backend.storage.get_holdings", test_storage.get_holdings),
        ("backend.storage.replace_holdings", test_storage.replace_holdings),
        ("backend.storage.add_transaction", test_storage.add_transaction),
        ("backend.storage.get_transaction", test_storage.get_transaction),
        ("backend.storage.list_transactions", test_storage.list_transactions),
        ("backend.storage.delete_transaction", test_storage.delete_transaction),
        ("backend.storage.update_transaction_status", test_storage.update_transaction_status),
        ("backend.storage.calculate_position_from_transactions", test_storage.calculate_position_from_transactions),
        ("backend.storage.get_confirmed_transactions", test_storage.get_confirmed_transactions),
        ("backend.storage.list_news_items", test_storage.list_news_items),
        ("backend.storage.upsert_news_items", test_storage.upsert_news_items),
        ("backend.storage.upsert_news_analysis", test_storage.upsert_news_analysis),
        ("backend.storage.list_news_analysis", test_storage.list_news_analysis),
        ("backend.storage.clear_news_analysis", test_storage.clear_news_analysis),
    ]
    
    with ExitStack() as stack:
        for target, side_effect in patches:
            stack.enter_context(patch(target, side_effect))
        
        # Import app after patching
        from backend.app import app
        yield TestClient(app, raise_server_exceptions=True)


@pytest.fixture
def sample_fund():
    """Sample fund data for testing."""
    return {
        "code": "000001",
        "name": "华夏成长混合A",
        "amount": 10000.0,
        "mode": "amount",
        "shares": 0.0,
        "cost": 0.0,
        "invested_amount": 9500.0
    }


@pytest.fixture
def sample_transaction():
    """Sample transaction data for testing."""
    return {
        "fund_code": "000001",
        "type": "buy",
        "amount": 1000.0,
        "shares": 0.0,
        "price": 1.5,
        "trans_date": "2026-02-25",
        "is_after_3pm": False,
        "mode": "amount"
    }