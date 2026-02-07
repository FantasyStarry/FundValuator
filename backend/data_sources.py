import json
import re
from datetime import datetime
from typing import List, Optional, Tuple

import httpx


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
    url = f"https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz&code={code}&page=1&per={limit}"
    text = await fetch_text(url)
    return _parse_nav_rows(text)


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
