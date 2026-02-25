import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.local.json"


def _load_local_config() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {}
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _get_nested(config: Dict[str, Any], keys: List[str]) -> Optional[str]:
    cursor: Any = config
    for key in keys:
        if not isinstance(cursor, dict):
            return None
        cursor = cursor.get(key)
    if cursor is None:
        return None
    return str(cursor)


def _get_int_value(value: Optional[str], default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def get_deepseek_api_key() -> Optional[str]:
    config = _load_local_config()
    return os.getenv("DEEPSEEK_API_KEY") or _get_nested(config, ["deepseek", "api_key"])


def get_deepseek_base_url() -> str:
    config = _load_local_config()
    return os.getenv("DEEPSEEK_BASE_URL") or _get_nested(config, ["deepseek", "base_url"]) or "https://api.deepseek.com"


def get_deepseek_model() -> str:
    config = _load_local_config()
    return os.getenv("DEEPSEEK_MODEL") or _get_nested(config, ["deepseek", "model"]) or "deepseek-chat"


def get_mimo_api_key() -> Optional[str]:
    config = _load_local_config()
    return os.getenv("MIMO_API_KEY") or _get_nested(config, ["mimo", "api_key"])


def get_mimo_base_url() -> str:
    config = _load_local_config()
    return os.getenv("MIMO_BASE_URL") or _get_nested(config, ["mimo", "base_url"]) or "https://api.xiaomimimo.com/v1"


def get_mimo_model() -> str:
    config = _load_local_config()
    return os.getenv("MIMO_MODEL") or _get_nested(config, ["mimo", "model"]) or "mimo-v2-flash"


def get_news_rss_url() -> str:
    config = _load_local_config()
    return os.getenv("NEWS_RSS_URL") or _get_nested(config, ["news", "rss_url"]) or "http://rss.sina.com.cn/roll/finance/hot_roll.xml"


def get_news_keywords() -> List[str]:
    config = _load_local_config()
    raw = _get_nested(config, ["news", "keywords"])
    if raw:
        return [word for word in re.split(r"[,\s]+", raw) if word]
    return [
        "A股",
        "A股",
        "沪深",
        "上证",
        "深证",
        "创业板",
        "科创板",
        "北交所",
        "证券",
        "券商",
        "指数",
        "中证",
        "ETF",
        "基金",
        "公募",
        "私募",
        "两融",
        "涨停",
        "跌停",
        "限售",
        "减持",
        "IPO",
        "新股",
        "回购",
        "分红",
    ]


def get_redis_url() -> Optional[str]:
    config = _load_local_config()
    return os.getenv("REDIS_URL") or _get_nested(config, ["redis", "url"])


def get_news_cache_ttl_sec() -> int:
    config = _load_local_config()
    return _get_int_value(os.getenv("NEWS_CACHE_TTL_SEC") or _get_nested(config, ["news", "cache_ttl_sec"]), 300)


def get_news_refresh_interval_sec() -> int:
    config = _load_local_config()
    return _get_int_value(os.getenv("NEWS_REFRESH_INTERVAL_SEC") or _get_nested(config, ["news", "refresh_interval_sec"]), 60)


def get_database_url() -> Optional[str]:
    config = _load_local_config()
    return (
        os.getenv("DATABASE_URL")
        or _get_nested(config, ["database", "url"])
        or _get_nested(config, ["postgres", "url"])
    )
