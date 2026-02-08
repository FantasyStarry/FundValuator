import json
import re
import asyncio
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Any, List, Optional, Tuple

import httpx

from .config import (
    get_deepseek_api_key,
    get_deepseek_base_url,
    get_deepseek_model,
    get_news_keywords,
    get_news_rss_url,
)


async def fetch_text(url: str, timeout: float = 6.0) -> str:
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        raw = resp.content
        for encoding in ("utf-8", "gbk", "latin1"):
            try:
                return raw.decode(encoding)
            except UnicodeDecodeError:
                continue
        return raw.decode("utf-8", errors="ignore")


def _clean_html(text: str) -> str:
    cleaned = re.sub(r"<.*?>", "", text, flags=re.S)
    cleaned = cleaned.replace("&nbsp;", "").replace("&amp;", "&")
    return cleaned.strip()


def _decode_js_string(text: str) -> str:
    text = text.replace("\\/", "/")
    try:
        return bytes(text, "utf-8").decode("unicode_escape")
    except Exception:
        return text


def _parse_rss_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo:
            return parsed.astimezone()
        return parsed
    except Exception:
        return None


def _extract_json_object(text: str) -> Optional[dict]:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


async def fetch_fund_gz(code: str) -> Optional[dict]:
    url = f"https://fundgz.1234567.com.cn/js/{code}.js"
    text = await fetch_text(url)
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _parse_nav_rows(html: str) -> List[dict]:
    rows = re.findall(r"<tr>.*?</tr>", html, re.S)
    items = []
    for row in rows:
        cols = re.findall(r"<td.*?>(.*?)</td>", row, re.S)
        if len(cols) < 2:
            continue
        date = _clean_html(cols[0])
        nav = _clean_html(cols[1])
        accum = _clean_html(cols[2]) if len(cols) > 2 else ""
        daily = _clean_html(cols[3]) if len(cols) > 3 else ""
        if not date or not nav:
            continue
        items.append(
            {
                "date": date,
                "nav": float(nav),
                "accum_nav": float(accum) if accum else None,
                "daily_pct": float(daily.replace("%", "")) if daily else None,
            }
        )
    return items


async def fetch_nav_history(code: str, limit: int = 30) -> List[dict]:
    per_page = 40
    if limit <= per_page:
        url = f"https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz&code={code}&page=1&per={limit}"
        text = await fetch_text(url)
        return _parse_nav_rows(text)
    
    # Calculate pages needed
    num_pages = (limit + per_page - 1) // per_page
    
    # Create tasks
    tasks = []
    for page in range(1, num_pages + 1):
        url = f"https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz&code={code}&page={page}&per={per_page}"
        tasks.append(fetch_text(url))
        
    results = await asyncio.gather(*tasks)
    
    all_items = []
    for text in results:
        items = _parse_nav_rows(text)
        all_items.extend(items)
        
    return all_items[:limit]


def _parse_holdings_content(content: str) -> List[dict]:
    rows = re.findall(r"<tr>.*?</tr>", content, re.S)
    holdings = []
    for row in rows:
        cols = re.findall(r"<td.*?>(.*?)</td>", row, re.S)
        if len(cols) < 4:
            continue
        stock_code = _clean_html(cols[1])
        stock_name = _clean_html(cols[2])
        weight_raw = _clean_html(cols[3]).replace("%", "")
        if not stock_code or not weight_raw:
            continue
        try:
            weight = float(weight_raw)
        except ValueError:
            continue
        holdings.append(
            {
                "stock_code": stock_code,
                "stock_name": stock_name,
                "weight": weight,
            }
        )
    return holdings


async def fetch_holdings(code: str) -> Tuple[List[dict], Optional[str]]:
    now = datetime.now()
    months = [12, 9, 6, 3]
    years = [now.year, now.year - 1]
    for year in years:
        for month in months:
            url = (
                "https://fundf10.eastmoney.com/FundArchivesDatas.aspx"
                f"?type=jjcc&code={code}&topline=10&year={year}&month={month}"
            )
            text = await fetch_text(url)
            match = re.search(r'content:"(.*)"\s*,\s*arryear', text, re.S)
            if not match:
                continue
            content = _decode_js_string(match.group(1))
            holdings = _parse_holdings_content(content)
            if holdings:
                return holdings, f"{year}-{month:02d}"
    return [], None


def _normalize_stock_code(code: str) -> str:
    if code.startswith("6"):
        return f"sh{code}"
    if code.startswith(("0", "3")):
        return f"sz{code}"
    return code


async def fetch_quote_tencent(code: str) -> Optional[dict]:
    market_code = _normalize_stock_code(code)
    url = f"http://qt.gtimg.cn/q={market_code}"
    text = await fetch_text(url)
    match = re.search(r'="(.*)";', text, re.S)
    if not match:
        return None
    parts = match.group(1).split("~")
    if len(parts) < 5:
        return None
    name = parts[1]
    price = float(parts[3]) if parts[3] else 0.0
    prev_close = float(parts[4]) if parts[4] else 0.0
    if prev_close == 0:
        return None
    change_pct = (price - prev_close) / prev_close * 100
    return {
        "stock_code": code,
        "stock_name": name,
        "price": price,
        "prev_close": prev_close,
        "change_pct": change_pct,
    }


async def fetch_quote_sina(code: str) -> Optional[dict]:
    market_code = _normalize_stock_code(code)
    url = f"http://hq.sinajs.cn/list={market_code}"
    text = await fetch_text(url)
    if "=" not in text:
        return None
    payload = text.split("=", 1)[1].strip().strip('";')
    parts = payload.split(",")
    if len(parts) < 4:
        return None
    name = parts[0]
    prev_close = float(parts[2]) if parts[2] else 0.0
    price = float(parts[3]) if parts[3] else 0.0
    if prev_close == 0:
        return None
    change_pct = (price - prev_close) / prev_close * 100
    return {
        "stock_code": code,
        "stock_name": name,
        "price": price,
        "prev_close": prev_close,
        "change_pct": change_pct,
    }


async def fetch_quote(code: str) -> Optional[dict]:
    data = await fetch_quote_tencent(code)
    if data:
        return data
    return await fetch_quote_sina(code)


async def search_market_funds(keyword: str) -> List[dict]:
    # Use Eastmoney suggest API
    url = f"https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key={keyword}"
    try:
        text = await fetch_text(url)
        # The API usually returns JSON directly
        data = json.loads(text)
        if not isinstance(data, dict):
            return []
        
        results = []
        # The structure is usually {"Datas": [...]}
        for item in data.get("Datas", []):
            # item format: ["CODE", "NAME", "TYPE", "PINYIN", ...] or object
            # Eastmoney often returns simple objects
            if isinstance(item, dict):
                results.append({
                    "code": item.get("CODE"),
                    "name": item.get("NAME"),
                    "type": item.get("FundType"),
                })
            # Sometimes it might return other formats, let's keep it simple for now
        return results
    except Exception:
        return []


async def fetch_intraday_nav(code: str) -> List[dict]:
    # Try to fetch real-time intraday estimation curve
    # Use FundMNTime API which is commonly used by mobile apps
    url = f"https://fundmobapi.eastmoney.com/FundMNewApi/FundMNTime?FCODE={code}&deviceid=1&plat=Android&product=EFund&version=6.3.8&GTOKEN=99B8Z1"
    
    try:
        text = await fetch_text(url, timeout=5.0)
        data = json.loads(text)
        
        # Response structure: { "Datas": [ "0930,1.1234,1.120,0.05%", ... ], "Expansion": ... }
        if not isinstance(data, dict) or "Datas" not in data:
            return []
            
        datas = data.get("Datas", [])
        if not datas or not isinstance(datas, list):
            return []
            
        items = []
        for row in datas:
            # Format: "Time,NAV,Price,Rate" (e.g. "0930,1.0667,1.066,0.00%")
            # Some versions might be different, let's parse robustly
            parts = row.split(",")
            if len(parts) < 2:
                continue
                
            time_str = parts[0] # "0930" or "10:30"
            if len(time_str) == 4 and ":" not in time_str:
                time_str = f"{time_str[:2]}:{time_str[2:]}"
                
            try:
                nav = float(parts[1])
                # parts[3] usually contains rate like "0.15%"
                pct = 0.0
                if len(parts) > 3:
                    pct_str = parts[3].replace("%", "")
                    if pct_str:
                        pct = float(pct_str)
                        
                items.append({
                    "date": time_str,
                    "nav": nav,
                    "daily_pct": pct
                })
            except (ValueError, IndexError):
                continue
                
        return items
        
    except Exception:
        # If API fails, return empty list
        pass

    return [] 

async def fetch_news_rss(url: str, limit: int = 20) -> List[dict]:
    text = await fetch_text(url, timeout=8.0)
    try:
        root = ET.fromstring(text)
    except Exception:
        return []
    items: List[dict] = []
    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        if not title:
            continue
        link = (item.findtext("link") or "").strip() or None
        pub_date = (item.findtext("pubDate") or "").strip() or None
        description = (item.findtext("description") or "").strip()
        summary = _clean_html(description) if description else None
        parsed_date = _parse_rss_date(pub_date)
        items.append(
            {
                "title": title,
                "link": link,
                "published_at": parsed_date.isoformat(timespec="seconds") if parsed_date else pub_date,
                "_published_dt": parsed_date,
                "summary": summary,
            }
        )
        if len(items) >= limit:
            break
    items.sort(key=lambda item: item.get("_published_dt") or datetime.min, reverse=True)
    for item in items:
        item.pop("_published_dt", None)
    return items


async def fetch_news_feed(source: str = "rss", limit: int = 20) -> List[dict]:
    if source != "rss":
        source = "rss"
    url = get_news_rss_url()
    try:
        items = await fetch_news_rss(url, limit=limit * 3)
    except Exception:
        return []
    return items[:limit]


async def analyze_news_with_deepseek(title: str, content: str, source: Optional[str] = None) -> dict:
    api_key = get_deepseek_api_key()
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY is required")
    base_url = get_deepseek_base_url().rstrip("/")
    model = get_deepseek_model()
    url = f"{base_url}/v1/chat/completions"
    system_prompt = "你是金融市场研究助手。输出严格的 JSON，不要包含多余文本。"
    user_prompt = (
        "请分析以下新闻，给出简洁总结、情绪判断、可能影响的资产或板块、置信度。"
        "返回 JSON 格式："
        '{"summary":"...","sentiment":"negative|neutral|positive","impacted_assets":["..."],"confidence":0.0,"reasoning":"..."}'
        f"\n标题: {title}\n来源: {source or ''}\n内容: {content}"
    )
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 800,
    }
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    content_text = ""
    if isinstance(data, dict):
        choices = data.get("choices") or []
        if choices:
            message = choices[0].get("message") or {}
            content_text = message.get("content") or ""
    parsed = _extract_json_object(content_text) or {}
    if not parsed:
        parsed = {"summary": content_text.strip(), "sentiment": "neutral", "impacted_assets": [], "confidence": 0.0, "reasoning": ""}
    return parsed
