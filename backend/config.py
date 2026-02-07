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


def get_deepseek_api_key() -> Optional[str]:
    config = _load_local_config()
    return os.getenv("DEEPSEEK_API_KEY") or _get_nested(config, ["deepseek", "api_key"])


def get_deepseek_base_url() -> str:
    config = _load_local_config()
    return os.getenv("DEEPSEEK_BASE_URL") or _get_nested(config, ["deepseek", "base_url"]) or "https://api.deepseek.com"


def get_deepseek_model() -> str:
    config = _load_local_config()
    return os.getenv("DEEPSEEK_MODEL") or _get_nested(config, ["deepseek", "model"]) or "deepseek-chat"


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
