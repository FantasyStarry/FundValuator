from pathlib import Path
from typing import List, Optional, Tuple
import asyncio
import json
from datetime import datetime, date

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from redis.asyncio import Redis

from .data_sources import (
    analyze_news_with_deepseek,
    fetch_fund_gz,
    fetch_holdings,
    fetch_nav_history,
    fetch_news_feed,
    fetch_quote,
    search_market_funds,
)
from .config import (
    get_news_cache_ttl_sec,
    get_news_refresh_interval_sec,
    get_redis_url,
)
from .models import (
    EstimateComponent,
    EstimateResponse,
    FundCreate,
    FundInfo,
    FundUpdate,
    NavHistoryResponse,
    NewsAnalysisRequest,
    NewsAnalysisResponse,
    NewsFeedResponse,
    NewsItem,
    PortfolioOverview,
)
from .storage import (
    delete_fund,
    get_fund,
    get_holdings,
    init_db,
    list_news_items,
    list_funds,
    replace_holdings,
    update_fund_source_state,
    update_fund_holding,
    upsert_news_items,
    upsert_fund,
)


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"

app = FastAPI(title="AI Fund MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NEWS_CACHE_TTL_SEC = get_news_cache_ttl_sec()
NEWS_REFRESH_INTERVAL_SEC = get_news_refresh_interval_sec()
redis_client: Optional[Redis] = None


def _extract_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return value.split(" ")[0]


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _news_item_key(item: dict) -> str:
    return str(item.get("link") or item.get("title") or "").strip()


def _normalize_news_items(items: List[dict], source: str) -> List[dict]:
    normalized = []
    for item in items:
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        normalized.append(
            {
                "title": title,
                "link": item.get("link") or None,
                "published_at": item.get("published_at") or None,
                "summary": item.get("summary") or None,
                "source": source,
            }
        )
    return normalized


async def _redis_get_json(key: str) -> Optional[List[dict]]:
    if not redis_client:
        return None
    raw = await redis_client.get(key)
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, list):
        return None
    return data


async def _redis_set_json(key: str, value: List[dict], ttl_sec: int) -> None:
    if not redis_client:
        return
    payload = json.dumps(value, ensure_ascii=False)
    await redis_client.set(key, payload, ex=ttl_sec)


async def _load_news_with_cache(source: str, limit: int) -> List[dict]:
    if source != "rss":
        source = "rss"
    cache_key = f"news:feed:{source}:{limit}"
    last_check_key = f"news:last_check:{source}"
    now_ts = int(datetime.now().timestamp())

    if redis_client:
        cached = await _redis_get_json(cache_key)
        if cached:
            last_check_raw = await redis_client.get(last_check_key)
            last_check = 0
            if last_check_raw:
                try:
                    last_check = int(last_check_raw)
                except (TypeError, ValueError):
                    last_check = 0
            if last_check and now_ts - last_check < NEWS_REFRESH_INTERVAL_SEC:
                return cached
            latest = await fetch_news_feed(source=source, limit=1)
            latest_normalized = _normalize_news_items(latest, source)
            cached_latest = cached[0] if cached else None
            if cached_latest and latest_normalized:
                cached_key = _news_item_key(cached_latest)
                latest_key = _news_item_key(latest_normalized[0])
                if cached_key and latest_key and cached_key == latest_key:
                    await redis_client.set(last_check_key, str(now_ts), ex=NEWS_CACHE_TTL_SEC)
                    return cached

    items = await fetch_news_feed(source=source, limit=limit)
    normalized = _normalize_news_items(items, source)
    if normalized:
        now_iso = datetime.now().isoformat(timespec="seconds")
        upsert_news_items(
            [{**item, "updated_at": now_iso} for item in normalized],
            source,
        )
        if redis_client:
            await _redis_set_json(cache_key, normalized, NEWS_CACHE_TTL_SEC)
            await redis_client.set(last_check_key, str(now_ts), ex=NEWS_CACHE_TTL_SEC)
        return normalized
    return list_news_items(source, limit)


def _resolve_used_pct(
    fund: dict,
    realtime_pct: Optional[float],
    realtime_time: Optional[str],
    official_pct: Optional[float],
    official_date: Optional[str],
    fallback_pct: Optional[float],
) -> Tuple[float, str, Optional[str], Optional[str], Optional[float], bool, bool]:
    today_str = date.today().isoformat()
    realtime_date = _extract_date(realtime_time)
    target_source = "holdings"
    target_pct = fallback_pct if fallback_pct is not None else 0.0
    target_date = realtime_date or official_date
    if official_date and official_pct is not None and realtime_date:
        if official_date >= realtime_date:
            target_source = "official"
            target_pct = official_pct
            target_date = official_date
        else:
            target_source = "realtime"
            target_pct = realtime_pct if realtime_pct is not None else target_pct
            target_date = realtime_date
    elif realtime_date and realtime_pct is not None:
        target_source = "realtime"
        target_pct = realtime_pct
        target_date = realtime_date
    elif official_date and official_pct is not None:
        target_source = "official"
        target_pct = official_pct
        target_date = official_date

    holiday_mode = bool(official_date and official_date < today_str and (not realtime_date or realtime_date < today_str))
    official_updated = bool(official_date and official_date == today_str)

    last_source = fund.get("last_source")
    last_source_date = fund.get("last_source_date")
    last_source_pct = fund.get("last_source_pct")
    last_switch_at = fund.get("last_switch_at")
    switch_at = last_switch_at
    transition_progress = None

    used_pct = target_pct
    used_source = target_source

    if target_source == "official" and target_date:
        if last_source in ("realtime", "holdings") and last_source_date == target_date and last_source_pct is not None:
            if not last_switch_at:
                switch_at = datetime.now().isoformat(timespec="seconds")
            start_at = _parse_datetime(switch_at)
            if start_at:
                elapsed = (datetime.now() - start_at).total_seconds()
                progress = min(max(elapsed / 600, 0.0), 1.0)
                transition_progress = progress
                used_pct = last_source_pct + (target_pct - last_source_pct) * progress
                used_source = "transition" if progress < 1 else "official"
        elif last_source == "transition" and last_source_date == target_date and last_source_pct is not None and last_switch_at:
            start_at = _parse_datetime(last_switch_at)
            if start_at:
                elapsed = (datetime.now() - start_at).total_seconds()
                progress = min(max(elapsed / 600, 0.0), 1.0)
                transition_progress = progress
                used_pct = last_source_pct + (target_pct - last_source_pct) * progress
                used_source = "transition" if progress < 1 else "official"

    if used_source == "official":
        update_fund_source_state(
            fund["code"],
            "official",
            target_date,
            target_pct,
            None,
            official_date,
        )
    elif used_source == "transition":
        update_fund_source_state(
            fund["code"],
            "transition",
            target_date,
            last_source_pct if last_source_pct is not None else target_pct,
            switch_at,
            official_date,
        )
    else:
        update_fund_source_state(
            fund["code"],
            target_source,
            target_date,
            target_pct,
            None,
            official_date,
        )

    return used_pct, used_source, target_date, switch_at, transition_progress, official_updated, holiday_mode


@app.on_event("startup")
async def startup_event() -> None:
    init_db()
    global redis_client
    redis_url = get_redis_url()
    if redis_url:
        client = Redis.from_url(redis_url, decode_responses=True)
        try:
            await client.ping()
        except Exception:
            await client.close()
        else:
            redis_client = client


@app.on_event("shutdown")
async def shutdown_event() -> None:
    if redis_client:
        await redis_client.close()


@app.get("/")
async def root() -> FileResponse:
    index_path = DIST_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(index_path)


@app.get("/api/funds", response_model=List[FundInfo])
async def api_list_funds(keyword: str = "") -> List[FundInfo]:
    funds = [FundInfo(**row) for row in list_funds(keyword)]
    
    # Optional: We could batch fetch estimates here if performance allows, 
    # but for "at a glance" list, maybe client-side or separate endpoint is better?
    # User requested "at a glance", so let's try to populate estimate_pct for all funds.
    # To avoid too many requests if list is huge, we might need caution.
    # But usually user has < 50 funds.
    
    tasks = [fetch_fund_gz(f.code) for f in funds]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for i, res in enumerate(results):
        if not isinstance(res, Exception) and res:
            try:
                funds[i].estimate_pct = float(res.get("gszzl", 0))
            except (ValueError, TypeError):
                pass
                
    return funds


@app.get("/api/portfolio/overview", response_model=PortfolioOverview)
async def api_portfolio_overview() -> PortfolioOverview:
    # 1. Get all funds with holdings
    all_funds = list_funds()
    holding_funds = [
        f for f in all_funds 
        if (f["mode"] == "amount" and f["amount"] > 0) or 
           (f["mode"] == "shares" and f["shares"] > 0)
    ]
    
    if not holding_funds:
        return PortfolioOverview(
            total_amount=0,
            total_daily_income=0,
            total_holding_income=0,
            daily_pct=0,
            update_time=None
        )

    # 2. Fetch realtime estimate and latest official NAV concurrently
    tasks_gz = [fetch_fund_gz(f["code"]) for f in holding_funds]
    tasks_nav = [fetch_nav_history(f["code"], limit=1) for f in holding_funds]
    estimates = await asyncio.gather(*tasks_gz, return_exceptions=True)
    navs = await asyncio.gather(*tasks_nav, return_exceptions=True)
    
    total_amount = 0.0
    total_daily_income = 0.0
    total_holding_income = 0.0
    latest_time = None
    used_sources = []
    used_dates = []
    switch_times = []
    transition_progresses = []
    official_updated_any = False
    holiday_any = False
    
    # 3. Calculate totals
    # We need yesterday's total amount to calculate daily pct accurately
    # Yesterday Total = Sum(Today Amount - Daily Income)
    total_yesterday_amount = 0.0

    for i, fund in enumerate(holding_funds):
        gz = estimates[i]
        latest_nav_items = navs[i]
        official_pct = None
        official_date = None
        official_nav = None
        if isinstance(latest_nav_items, list) and latest_nav_items:
            official_pct = latest_nav_items[0].get("daily_pct")
            official_date = latest_nav_items[0].get("date")
            official_nav = latest_nav_items[0].get("nav")
        if isinstance(gz, Exception) or not gz:
            # If estimate fails, we can't calculate dynamic values, 
            # but we should still count the base amount/cost if possible
            # For simplicity, skip dynamic parts or use 0 change
            current_val = fund["amount"] # Default for amount mode
            if fund["mode"] == "shares":
                # Without NAV, we can't value shares accurately. 
                # Fallback: maybe use cost? or just ignore?
                # Let's try to fetch history NAV if real-time fails? 
                # For now, just skip income calculation for this fund
                pass
            else:
                total_amount += current_val
                total_yesterday_amount += current_val
            continue

        # Parse estimate
        try:
            gszzl = float(gz.get("gszzl", 0)) if isinstance(gz, dict) else 0.0
            dwjz = float(gz.get("dwjz", 0)) if isinstance(gz, dict) else 0.0
            gztime = gz.get("gztime", "") if isinstance(gz, dict) else ""
            if not latest_time or (gztime and gztime > latest_time):
                latest_time = gztime
        except (ValueError, TypeError):
            gszzl = 0.0
            dwjz = 0.0
        
        # Calculate Fund metrics
        fund_current_amount = 0.0
        fund_daily_income = 0.0
        fund_holding_income = 0.0
        fund_yesterday_amount = 0.0

        used_pct, used_source, used_date, switch_at, transition_progress, official_updated, holiday_mode = _resolve_used_pct(
            fund,
            gszzl,
            gztime,
            official_pct,
            official_date,
            None,
        )
        used_sources.append(used_source)
        if used_date:
            used_dates.append(used_date)
        if switch_at:
            switch_times.append(switch_at)
        if transition_progress is not None:
            transition_progresses.append(transition_progress)
        official_updated_any = official_updated_any or official_updated
        holiday_any = holiday_any or holiday_mode
        if fund["mode"] == "shares":
            shares = fund["shares"]
            cost = fund["cost"]
            if dwjz > 0:
                # Yesterday amount
                fund_yesterday_amount = shares * dwjz
                # Today amount = Yesterday * (1 + pct%)
                fund_current_amount = fund_yesterday_amount * (1 + used_pct / 100)
                fund_daily_income = fund_current_amount - fund_yesterday_amount
                # Holding income
                fund_holding_income = (fund_current_amount / shares - cost) * shares
            elif official_nav:
                fund_current_amount = shares * official_nav
                ratio = 1 + used_pct / 100
                if ratio > 0:
                    fund_yesterday_amount = fund_current_amount / ratio
                    fund_daily_income = fund_current_amount - fund_yesterday_amount
                    fund_holding_income = (fund_current_amount / shares - cost) * shares
        else:
            base_amount = fund["amount"]
            ratio = 1 + used_pct / 100
            if ratio > 0:
                fund_yesterday_amount = base_amount / ratio
                fund_daily_income = base_amount - fund_yesterday_amount
            else:
                fund_yesterday_amount = base_amount
                fund_daily_income = 0.0
            fund_current_amount = base_amount
            fund_holding_income = 0.0

        total_amount += fund_current_amount
        total_daily_income += fund_daily_income
        total_holding_income += fund_holding_income
        total_yesterday_amount += fund_yesterday_amount

    # 4. Calculate weighted daily pct
    daily_pct = 0.0
    if total_yesterday_amount > 0:
        daily_pct = (total_daily_income / total_yesterday_amount) * 100

    overview_source = "holdings"
    if "transition" in used_sources:
        overview_source = "transition"
    elif "realtime" in used_sources:
        overview_source = "realtime"
    elif "official" in used_sources:
        overview_source = "official"

    overview_date = max(used_dates) if used_dates else None
    overview_switch_at = max(switch_times) if switch_times else None
    overview_progress = max(transition_progresses) if transition_progresses else None

    return PortfolioOverview(
        total_amount=round(total_amount, 2),
        total_daily_income=round(total_daily_income, 2),
        total_holding_income=round(total_holding_income, 2),
        daily_pct=round(daily_pct, 4),
        update_time=latest_time,
        used_source=overview_source,
        used_date=overview_date,
        switch_at=overview_switch_at,
        transition_progress=overview_progress,
        official_updated=official_updated_any,
        holiday_mode=holiday_any,
    )


@app.get("/api/market/search", response_model=List[dict])
async def api_search_market(keyword: str) -> List[dict]:
    if not keyword:
        return []
    return await search_market_funds(keyword)


@app.post("/api/funds", response_model=FundInfo)
async def api_add_fund(payload: FundCreate) -> FundInfo:
    code = payload.code.strip()
    try:
        fund_gz = await fetch_fund_gz(code)
        if not fund_gz:
            raise HTTPException(status_code=400, detail="无法获取基金估值信息")
        name = fund_gz.get("name", code)
        holdings, holdings_time = await fetch_holdings(code)
        upsert_fund(code, name, holdings_time)
        if holdings:
            replace_holdings(code, holdings)
        return FundInfo(code=code, name=name, updated_at=holdings_time)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="数据源请求失败，请稍后重试")


@app.delete("/api/funds/{code}", status_code=204)
async def api_delete_fund(code: str) -> None:
    fund = get_fund(code)
    if not fund:
        raise HTTPException(status_code=404, detail="基金不存在")
    delete_fund(code)


@app.put("/api/funds/{code}/amount", response_model=FundInfo)
async def api_update_fund_amount(code: str, payload: FundUpdate) -> FundInfo:
    fund = get_fund(code)
    if not fund:
        raise HTTPException(status_code=404, detail="基金不存在")
    update_fund_holding(
        code, 
        amount=payload.amount, 
        mode=payload.mode, 
        shares=payload.shares, 
        cost=payload.cost
    )
    updated_fund = get_fund(code)
    return FundInfo(**updated_fund)


@app.get("/api/funds/{code}/estimate", response_model=EstimateResponse)
async def api_fund_estimate(code: str) -> EstimateResponse:
    fund = get_fund(code)
    if not fund:
        raise HTTPException(status_code=404, detail="基金不存在")
    try:
        fund_gz = await fetch_fund_gz(code)
        nav_history = await fetch_nav_history(code, limit=2)
        latest_nav = nav_history[0] if nav_history else None
        prev_nav = nav_history[1] if len(nav_history) > 1 else None
        
        holdings = get_holdings(code)
        components = []
        estimate_pct = 0.0
        estimate_source = "holdings"
        total_weight = 0.0
        for holding in holdings:
            quote = await fetch_quote(holding["stock_code"])
            if not quote:
                continue
            weight = holding["weight"]
            total_weight += weight
            estimate_pct += quote["change_pct"] * weight
            components.append(
                EstimateComponent(
                    stock_code=holding["stock_code"],
                    stock_name=holding["stock_name"],
                    weight=weight,
                    price=quote["price"],
                    prev_close=quote["prev_close"],
                    change_pct=quote["change_pct"],
                )
            )
        realtime_pct = None
        realtime_time = None
        fallback_pct = None
        if fund_gz and fund_gz.get("gszzl") is not None:
            realtime_pct = float(fund_gz.get("gszzl", 0.0))
            realtime_time = fund_gz.get("gztime")
        elif total_weight > 0:
            fallback_pct = estimate_pct / total_weight
            
        # Check if real NAV is newer or equal to estimate time
        official_pct = None
        official_date = None
        if latest_nav:
            official_pct = latest_nav.get("daily_pct")
            official_date = latest_nav.get("date")
        
        estimate_income = 0.0
        total_income = 0.0
        
        used_pct, used_source, used_date, switch_at, transition_progress, official_updated, holiday_mode = _resolve_used_pct(
            fund,
            realtime_pct,
            realtime_time,
            official_pct,
            official_date,
            fallback_pct,
        )
        estimate_pct = used_pct
        estimate_source = used_source

        mode = fund.get("mode", "amount")
        if mode == "shares":
            shares = fund.get("shares", 0.0)
            cost = fund.get("cost", 0.0)
            
            if estimate_source in ("official", "transition") and latest_nav and latest_nav.get("nav"):
                current_amount = shares * latest_nav.get("nav", 0.0)
                ratio = 1 + estimate_pct / 100
                if ratio > 0:
                    estimate_income = current_amount - current_amount / ratio
                total_income = (latest_nav.get("nav", 0.0) - cost) * shares
            else:
                yesterday_nav = 0.0
                if fund_gz and fund_gz.get("dwjz"):
                    try:
                        yesterday_nav = float(fund_gz["dwjz"])
                    except (ValueError, TypeError):
                        pass
                if yesterday_nav == 0 and prev_nav:
                    yesterday_nav = prev_nav.get("nav", 0.0)
                if yesterday_nav > 0:
                    current_amount = shares * yesterday_nav
                    estimate_income = current_amount * estimate_pct / 100
                if yesterday_nav > 0 and shares > 0:
                    current_estimated_nav = yesterday_nav * (1 + estimate_pct / 100)
                    total_income = (current_estimated_nav - cost) * shares
                
        else:
            current_amount = fund.get("amount", 0.0)
            ratio = 1 + estimate_pct / 100
            if ratio > 0:
                estimate_income = current_amount - current_amount / ratio

        return EstimateResponse(
            code=code,
            name=fund["name"],
            estimate_pct=round(estimate_pct, 4),
            estimate_source=estimate_source,
            used_date=used_date,
            switch_at=switch_at,
            transition_progress=transition_progress,
            official_updated=official_updated,
            holiday_mode=holiday_mode,
            estimate_income=round(estimate_income, 2),
            total_income=round(total_income, 2),
            components=components,
            fund_gz_pct=float(fund_gz.get("gszzl")) if fund_gz and fund_gz.get("gszzl") else None,
            fund_gz_nav=float(fund_gz.get("gsz")) if fund_gz and fund_gz.get("gsz") else None,
            fund_gz_time=fund_gz.get("gztime") if fund_gz else None,
            real_nav_pct=official_pct,
            real_nav_date=official_date,
            official_pct=official_pct,
            official_date=official_date,
            realtime_pct=realtime_pct,
            realtime_time=realtime_time,
        )
    except Exception:
        raise HTTPException(status_code=502, detail="估值数据获取失败，请稍后重试")


@app.get("/api/funds/{code}/nav/history", response_model=NavHistoryResponse)
async def api_nav_history(code: str, limit: int = 30) -> NavHistoryResponse:
    fund = get_fund(code)
    if not fund:
        raise HTTPException(status_code=404, detail="基金不存在")
    try:
        items = await fetch_nav_history(code, limit=limit)
        return NavHistoryResponse(code=code, name=fund["name"], items=items)
    except Exception:
        raise HTTPException(status_code=502, detail="净值数据获取失败，请稍后重试")


@app.get("/api/news/feed", response_model=NewsFeedResponse)
async def api_news_feed(source: str = "rss", limit: int = 20) -> NewsFeedResponse:
    items = await _load_news_with_cache(source=source, limit=limit)
    normalized = [NewsItem(**item) for item in items]
    return NewsFeedResponse(source=source if source == "rss" else "rss", items=normalized)


@app.post("/api/ai/news/analyze", response_model=NewsAnalysisResponse)
async def api_ai_news_analyze(payload: NewsAnalysisRequest) -> NewsAnalysisResponse:
    try:
        result = await analyze_news_with_deepseek(payload.title, payload.content, payload.source)
    except ValueError:
        raise HTTPException(status_code=400, detail="DeepSeek API key 未配置")
    except Exception:
        raise HTTPException(status_code=502, detail="AI 分析失败，请稍后重试")
    summary = str(result.get("summary") or "")
    sentiment = str(result.get("sentiment") or "neutral")
    impacted_assets = result.get("impacted_assets") or []
    if not isinstance(impacted_assets, list):
        impacted_assets = [str(impacted_assets)]
    confidence_raw = result.get("confidence")
    try:
        confidence = float(confidence_raw)
    except (TypeError, ValueError):
        confidence = 0.0
    reasoning = result.get("reasoning")
    return NewsAnalysisResponse(
        summary=summary,
        sentiment=sentiment,
        impacted_assets=[str(item) for item in impacted_assets],
        confidence=confidence,
        reasoning=str(reasoning) if reasoning is not None else None,
    )


if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
