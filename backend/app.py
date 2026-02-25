from pathlib import Path
from typing import Dict, List, Optional, Tuple
import asyncio
import json
from datetime import datetime, date

from fastapi import BackgroundTasks, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
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
    fetch_intraday_nav,
    fetch_article_content,
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
    TransactionCreate,
    TransactionInfo,
)
from .storage import (
    clear_news_analysis,
    delete_fund,
    get_fund,
    get_holdings,
    init_db,
    list_news_analysis,
    list_news_items,
    list_funds,
    replace_holdings,
    update_fund_source_state,
    update_fund_holding,
    upsert_news_analysis,
    upsert_news_items,
    upsert_fund,
    add_transaction,
    list_transactions,
    get_transaction,
    update_transaction_status,
    delete_transaction,
    calculate_position_from_transactions,
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

# WebSocket push task registry
_estimate_push_tasks: Dict[str, asyncio.Task] = {}
_portfolio_push_task: Optional[asyncio.Task] = None
_news_push_task: Optional[asyncio.Task] = None
_last_news_check: float = 0


class ConnectionManager:
    def __init__(self):
        self._connections: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            if channel not in self._connections:
                self._connections[channel] = []
            self._connections[channel].append(websocket)

    async def disconnect(self, channel: str, websocket: WebSocket) -> None:
        async with self._lock:
            if channel in self._connections:
                try:
                    self._connections[channel].remove(websocket)
                except ValueError:
                    pass
                if not self._connections[channel]:
                    del self._connections[channel]

    async def broadcast(self, channel: str, message: dict) -> None:
        async with self._lock:
            connections = self._connections.get(channel, [])
        dead_connections = []
        for conn in connections:
            try:
                await conn.send_json(message)
            except Exception:
                dead_connections.append(conn)
        for conn in dead_connections:
            await self.disconnect(channel, conn)

    async def get_channel_count(self, channel: str) -> int:
        async with self._lock:
            return len(self._connections.get(channel, []))


ws_manager = ConnectionManager()


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


def _normalize_news_analysis(result: dict) -> dict:
    summary = str(result.get("summary") or "")
    sentiment = str(result.get("sentiment") or "neutral")
    impacted_assets = result.get("impacted_assets") or []
    if not isinstance(impacted_assets, list):
        impacted_assets = [str(impacted_assets)]
    
    confidence = 0.0
    try:
        confidence = float(result.get("confidence") or 0.0)
    except (TypeError, ValueError):
        pass
        
    importance_score = 0.0
    try:
        importance_score = float(result.get("importance_score") or 0.0)
    except (TypeError, ValueError):
        pass

    reasoning = result.get("reasoning")
    return {
        "summary": summary,
        "sentiment": sentiment,
        "impacted_assets": [str(item) for item in impacted_assets],
        "confidence": confidence,
        "reasoning": str(reasoning) if reasoning is not None else None,
        "importance_score": importance_score,
    }


def _analysis_cache_key(news_id: str) -> str:
    return f"news:analysis:{news_id}"


def _analysis_lock_key(news_id: str) -> str:
    return f"news:analysis:lock:{news_id}"


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


async def _redis_get_obj(key: str) -> Optional[dict]:
    if not redis_client:
        return None
    raw = await redis_client.get(key)
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    return data


async def _redis_set_json(key: str, value: List[dict], ttl_sec: int) -> None:
    if not redis_client:
        return
    payload = json.dumps(value, ensure_ascii=False)
    await redis_client.set(key, payload, ex=ttl_sec)


async def _redis_set_obj(key: str, value: dict, ttl_sec: int) -> None:
    if not redis_client:
        return
    payload = json.dumps(value, ensure_ascii=False)
    await redis_client.set(key, payload, ex=ttl_sec)


async def _trigger_news_analysis(items: List[dict]):
    """Background task to analyze news items."""
    items_map = { _news_item_key(item): item for item in items if _news_item_key(item) }
    news_ids = list(items_map.keys())
    if not news_ids:
        return
        
    # Check what's already analyzed or being analyzed
    analysis_map = {}
    missing_ids = []
    if redis_client:
        pipe = redis_client.pipeline()
        for news_id in news_ids:
            pipe.get(_analysis_cache_key(news_id))
            pipe.get(_analysis_lock_key(news_id))
        results = await pipe.execute()
        
        for i, news_id in enumerate(news_ids):
            cached = results[i * 2]
            locked = results[i * 2 + 1]
            if cached:
                try:
                    analysis_map[news_id] = json.loads(cached)
                except json.JSONDecodeError:
                    missing_ids.append(news_id)
            elif locked:
                missing_ids.append(news_id)
            else:
                missing_ids.append(news_id)
    else:
        missing_ids = news_ids
        
    if missing_ids:
        db_map = list_news_analysis(missing_ids)
        for news_id, analysis in db_map.items():
            analysis_map[news_id] = analysis
            if redis_client:
                await _redis_set_obj(_analysis_cache_key(news_id), analysis, NEWS_CACHE_TTL_SEC)
        missing_ids = [nid for nid in missing_ids if nid not in db_map]
        
    if not missing_ids:
        return

    # Acquire locks for items to analyze
    if redis_client:
        for news_id in missing_ids:
            lock_key = _analysis_lock_key(news_id)
            await redis_client.set(lock_key, "1", ex=300)

    # Process missing items
    semaphore = asyncio.Semaphore(3)
    async def run_one(news_id: str):
        item = items_map[news_id]
        content = item.get("summary") or item.get("title") or ""
        link = item.get("link")
        
        async with semaphore:
            try:
                # Try to fetch full content if link exists
                if link and (not content or len(content) < 200):
                     full_content = await fetch_article_content(link)
                     if full_content and len(full_content) > 100:
                         content = full_content
                
                # Truncate content if too long to avoid exceeding token limits
                if len(content) > 5000:
                    content = content[:5000] + "..."
                    
                result = await analyze_news_with_deepseek(item["title"], content, item.get("source"))
                normalized = _normalize_news_analysis(result)
                now_iso = datetime.now().isoformat(timespec="seconds")
                upsert_news_analysis(news_id, normalized, now_iso)
                if redis_client:
                    await _redis_set_obj(_analysis_cache_key(news_id), normalized, NEWS_CACHE_TTL_SEC)
                    await redis_client.delete(_analysis_lock_key(news_id))
            except Exception:
                if redis_client:
                    await redis_client.delete(_analysis_lock_key(news_id))
                
    await asyncio.gather(*[run_one(news_id) for news_id in missing_ids], return_exceptions=True)


async def _load_news_analysis(items: List[dict], background_tasks: Optional[BackgroundTasks] = None) -> Dict[str, dict]:
    items_map = { _news_item_key(item): item for item in items if _news_item_key(item) }
    news_ids = list(items_map.keys())
    if not news_ids:
        return {}
    analysis_map: Dict[str, dict] = {}
    missing_ids: List[str] = []
    
    # 1. Try Redis
    if redis_client:
        for news_id in news_ids:
            cached = await _redis_get_obj(_analysis_cache_key(news_id))
            if cached:
                analysis_map[news_id] = cached
            else:
                missing_ids.append(news_id)
    else:
        missing_ids = news_ids
        
    # 2. Try DB
    if missing_ids:
        db_map = list_news_analysis(missing_ids)
        for news_id, analysis in db_map.items():
            analysis_map[news_id] = analysis
            if redis_client:
                await _redis_set_obj(_analysis_cache_key(news_id), analysis, NEWS_CACHE_TTL_SEC)
        missing_ids = [news_id for news_id in missing_ids if news_id not in db_map]

    # 3. Trigger background analysis for missing items
    if missing_ids and background_tasks:
        background_tasks.add_task(_trigger_news_analysis, [items_map[nid] for nid in missing_ids])
        
    return analysis_map


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

    # Clear old analysis to force re-analysis with full content
    # In production this might be too aggressive, but for this update it's necessary
    try:
        clear_news_analysis()
        if redis_client:
            # Also clear redis cache pattern for analysis
            keys = await redis_client.keys("news:analysis:*")
            if keys:
                await redis_client.delete(*keys)
    except Exception:
        pass

    # Start portfolio push loop
    asyncio.create_task(_portfolio_push_loop())


@app.on_event("shutdown")
async def shutdown_event() -> None:
    # Cancel all WebSocket push tasks
    global _estimate_push_tasks, _portfolio_push_task, _news_push_task
    
    for code, task in list(_estimate_push_tasks.items()):
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    _estimate_push_tasks.clear()
    
    if _portfolio_push_task is not None:
        _portfolio_push_task.cancel()
        try:
            await _portfolio_push_task
        except asyncio.CancelledError:
            pass
        _portfolio_push_task = None
    
    if _news_push_task is not None:
        _news_push_task.cancel()
        try:
            await _news_push_task
        except asyncio.CancelledError:
            pass
        _news_push_task = None
    
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
            invested_amount = fund.get("invested_amount", 0.0) or 0.0
            ratio = 1 + used_pct / 100
            if ratio > 0:
                fund_yesterday_amount = base_amount / ratio
                fund_daily_income = base_amount - fund_yesterday_amount
            else:
                fund_yesterday_amount = base_amount
                fund_daily_income = 0.0
            fund_current_amount = base_amount
            fund_holding_income = base_amount - invested_amount if invested_amount > 0 else 0.0

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
        
        # 异步获取持仓数据，但不阻塞响应
        holdings, holdings_time = await fetch_holdings(code)
        upsert_fund(code, name, holdings_time)
        if holdings:
            replace_holdings(code, holdings)
        
        # 直接返回估值数据
        estimate_pct = None
        try:
            estimate_pct = float(fund_gz.get("gszzl", 0)) if fund_gz.get("gszzl") else None
        except (ValueError, TypeError):
            pass
        
        return FundInfo(
            code=code, 
            name=name, 
            updated_at=holdings_time,
            estimate_pct=estimate_pct
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="数据源请求失败，请稍后重试")


@app.delete("/api/funds/{code}", status_code=204)
async def api_delete_fund(code: str) -> None:
    global _estimate_push_tasks
    fund = get_fund(code)
    if not fund:
        raise HTTPException(status_code=404, detail="基金不存在")
    delete_fund(code)
    # Cancel associated WebSocket push task if exists
    if code in _estimate_push_tasks:
        _estimate_push_tasks[code].cancel()
        try:
            await _estimate_push_tasks[code]
        except asyncio.CancelledError:
            pass
        del _estimate_push_tasks[code]


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
        cost=payload.cost,
        invested_amount=payload.invested_amount
    )
    updated_fund = get_fund(code)
    return FundInfo(**updated_fund)


def _calculate_confirm_date(trans_date_str: str, is_after_3pm: bool = False) -> str:
    """计算确认日期：T日15:00前买入 -> T+1确认；T日15:00后买入 -> T+2确认"""
    try:
        trans_date = datetime.strptime(trans_date_str, "%Y-%m-%d").date()
    except ValueError:
        trans_date = date.today()
    
    # 根据交易时间确定需要跳过的天数
    days_to_add = 2 if is_after_3pm else 1
    
    confirm_date = trans_date
    added = 0
    while added < days_to_add:
        # 增加一天
        confirm_date = date.fromordinal(confirm_date.toordinal() + 1)
        # 跳过周末 (5=Saturday, 6=Sunday)
        if confirm_date.weekday() < 5:
            added += 1
    
    return confirm_date.isoformat()


def _is_transaction_confirmed(trans_date_str: str, is_after_3pm: bool = False) -> Tuple[bool, Optional[str]]:
    """判断交易是否已确认"""
    try:
        trans_date = datetime.strptime(trans_date_str, "%Y-%m-%d").date()
    except ValueError:
        trans_date = date.today()
    
    confirm_date = _calculate_confirm_date(trans_date_str, is_after_3pm)
    today = date.today()
    
    # 如果今天 >= 确认日期，则已确认
    is_confirmed = today.isoformat() >= confirm_date
    return is_confirmed, confirm_date if is_confirmed else None


@app.post("/api/transactions", response_model=TransactionInfo)
async def api_add_transaction(payload: TransactionCreate) -> TransactionInfo:
    """添加交易记录"""
    fund = get_fund(payload.fund_code)
    if not fund:
        raise HTTPException(status_code=404, detail="基金不存在")
    
    if payload.type not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="交易类型必须是 buy 或 sell")
    
    # 判断是否已确认
    is_confirmed, confirm_date = _is_transaction_confirmed(payload.trans_date, payload.is_after_3pm)
    status = "confirmed" if is_confirmed else "pending"
    
    # 根据模式计算份额或金额
    amount = payload.amount
    shares = payload.shares
    price = payload.price
    
    if payload.price <= 0:
        raise HTTPException(status_code=400, detail="交易价格必须大于0")
    
    if payload.mode == "amount":
        if amount <= 0:
            raise HTTPException(status_code=400, detail="交易金额必须大于0")
        shares = amount / price
    elif payload.mode == "shares":
        if shares <= 0:
            raise HTTPException(status_code=400, detail="交易份额必须大于0")
        amount = shares * price
    
    trans_id = add_transaction(
        fund_code=payload.fund_code,
        trans_type=payload.type,
        amount=amount,
        shares=shares,
        price=price,
        trans_date=payload.trans_date,
        is_after_3pm=payload.is_after_3pm,
        confirm_date=confirm_date,
        status=status,
    )
    
    # 如果已确认，更新基金持仓
    if is_confirmed:
        position = calculate_position_from_transactions(payload.fund_code)
        update_fund_holding(
            payload.fund_code,
            amount=position["invested_amount"],
            mode=payload.mode,
            shares=position["shares"],
            cost=position["cost"],
            invested_amount=position["invested_amount"],
        )
    
    trans = get_transaction(trans_id)
    return TransactionInfo(**trans)


@app.get("/api/funds/{code}/transactions", response_model=List[TransactionInfo])
async def api_list_transactions(code: str) -> List[TransactionInfo]:
    """获取基金的交易记录"""
    fund = get_fund(code)
    if not fund:
        raise HTTPException(status_code=404, detail="基金不存在")
    
    transactions = list_transactions(code)
    return [TransactionInfo(**t) for t in transactions]


@app.delete("/api/transactions/{trans_id}", status_code=204)
async def api_delete_transaction(trans_id: int) -> None:
    """删除交易记录"""
    trans = get_transaction(trans_id)
    if not trans:
        raise HTTPException(status_code=404, detail="交易记录不存在")
    
    fund_code = trans["fund_code"]
    delete_transaction(trans_id)
    
    # 重新计算持仓
    position = calculate_position_from_transactions(fund_code)
    update_fund_holding(
        fund_code,
        amount=position["invested_amount"],
        shares=position["shares"],
        cost=position["cost"],
        invested_amount=position["invested_amount"],
    )


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
            invested_amount = fund.get("invested_amount", 0.0) or 0.0
            ratio = 1 + estimate_pct / 100
            if ratio > 0:
                estimate_income = current_amount - current_amount / ratio
            total_income = current_amount - invested_amount if invested_amount > 0 else 0.0

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
        if limit == 0:  # Convention for intraday
             items = await fetch_intraday_nav(code)
             # If empty, frontend will handle "coming soon"
             return NavHistoryResponse(code=code, name=fund["name"], items=items)
        
        items = await fetch_nav_history(code, limit=limit)
        return NavHistoryResponse(code=code, name=fund["name"], items=items)
    except Exception:
        raise HTTPException(status_code=502, detail="净值数据获取失败，请稍后重试")


@app.get("/api/news/feed", response_model=NewsFeedResponse)
async def api_news_feed(background_tasks: BackgroundTasks, source: str = "rss", limit: int = 20) -> NewsFeedResponse:
    # Fetch more items to allow for filtering
    fetch_limit = limit * 3
    items = await _load_news_with_cache(source=source, limit=fetch_limit)
    analysis_map = await _load_news_analysis(items, background_tasks=background_tasks)
    
    normalized = []
    filtered_count = 0
    
    for item in items:
        key = _news_item_key(item)
        analysis = analysis_map.get(key)
        
        # Filter logic:
        # If analysis exists, check importance score
        # Threshold: 4.0 (General market news and above)
        # If analysis doesn't exist yet (background), we keep it to avoid empty feed initially
        if analysis:
            score = analysis.get("importance_score", 0)
            # If we have a valid score (not 0, assuming AI returns >0 for valid), apply filter
            # But AI might return 0 for noise.
            # Let's say threshold is 4.0.
            if score < 4.0:
                filtered_count += 1
                continue
        
        normalized.append(NewsItem(**{**item, "analysis": analysis}))
        if len(normalized) >= limit:
            break
            
    return NewsFeedResponse(source=source if source == "rss" else "rss", items=normalized)


@app.post("/api/ai/news/analyze", response_model=NewsAnalysisResponse)
async def api_ai_news_analyze(payload: NewsAnalysisRequest) -> NewsAnalysisResponse:
    try:
        result = await analyze_news_with_deepseek(payload.title, payload.content, payload.source)
    except ValueError:
        raise HTTPException(status_code=400, detail="DeepSeek API key 未配置")
    except Exception:
        raise HTTPException(status_code=502, detail="AI 分析失败，请稍后重试")
    normalized = _normalize_news_analysis(result)
    news_id = (payload.title or "").strip()
    if news_id:
        now_iso = datetime.now().isoformat(timespec="seconds")
        upsert_news_analysis(news_id, normalized, now_iso)
        if redis_client:
            await _redis_set_obj(_analysis_cache_key(news_id), normalized, NEWS_CACHE_TTL_SEC)
    return NewsAnalysisResponse(**normalized)


def _is_trading_time() -> bool:
    now = datetime.now()
    hour = now.hour
    minute = now.minute
    weekday = now.weekday()
    if weekday >= 5:
        return False
    if (9 <= hour < 11) or (hour == 11 and minute <= 30):
        return True
    if 13 <= hour < 15:
        return True
    return False


async def _estimate_push_loop(code: str) -> None:
    while True:
        try:
            count = await ws_manager.get_channel_count(f"estimate:{code}")
            if count == 0:
                await asyncio.sleep(1)
                continue
            if not _is_trading_time():
                await asyncio.sleep(5)
                continue
            fund = get_fund(code)
            if not fund:
                await asyncio.sleep(5)
                continue
            fund_gz = await fetch_fund_gz(code)
            if fund_gz:
                await ws_manager.broadcast(f"estimate:{code}", {
                    "type": "estimate_update",
                    "code": code,
                    "name": fund["name"],
                    "estimate_pct": float(fund_gz.get("gszzl", 0)) if fund_gz.get("gszzl") else None,
                    "estimate_nav": float(fund_gz.get("gsz", 0)) if fund_gz.get("gsz") else None,
                    "update_time": fund_gz.get("gztime"),
                })
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(5)


async def _portfolio_push_loop() -> None:
    while True:
        try:
            count = await ws_manager.get_channel_count("portfolio")
            if count == 0:
                await asyncio.sleep(1)
                continue
            if not _is_trading_time():
                await asyncio.sleep(5)
                continue
            overview = await api_portfolio_overview()
            await ws_manager.broadcast("portfolio", {
                "type": "portfolio_update",
                "total_amount": overview.total_amount,
                "total_daily_income": overview.total_daily_income,
                "total_holding_income": overview.total_holding_income,
                "daily_pct": overview.daily_pct,
                "update_time": overview.update_time,
                "used_source": overview.used_source,
                "used_date": overview.used_date,
            })
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(5)


async def _news_push_loop() -> None:
    global _last_news_check
    while True:
        try:
            count = await ws_manager.get_channel_count("news")
            if count == 0:
                await asyncio.sleep(1)
                continue
            now_ts = datetime.now().timestamp()
            if now_ts - _last_news_check < 30:
                await asyncio.sleep(5)
                continue
            _last_news_check = now_ts
            items = await _load_news_with_cache(source="rss", limit=20)
            if items:
                for item in items[:5]:
                    await ws_manager.broadcast("news", {
                        "type": "news_update",
                        "title": item.get("title"),
                        "link": item.get("link"),
                        "published_at": item.get("published_at"),
                        "summary": item.get("summary"),
                        "source": item.get("source"),
                    })
            await asyncio.sleep(30)
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(10)


@app.websocket("/ws/estimate/{code}")
async def ws_estimate(websocket: WebSocket, code: str) -> None:
    global _estimate_push_tasks
    await ws_manager.connect(f"estimate:{code}", websocket)
    # Start push task if not already running
    if code not in _estimate_push_tasks or _estimate_push_tasks[code].done():
        _estimate_push_tasks[code] = asyncio.create_task(_estimate_push_loop(code))
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(f"estimate:{code}", websocket)
        # Cancel task if no more connections
        count = await ws_manager.get_channel_count(f"estimate:{code}")
        if count == 0 and code in _estimate_push_tasks:
            _estimate_push_tasks[code].cancel()
            try:
                await _estimate_push_tasks[code]
            except asyncio.CancelledError:
                pass
            del _estimate_push_tasks[code]


@app.websocket("/ws/portfolio")
async def ws_portfolio(websocket: WebSocket) -> None:
    global _portfolio_push_task
    await ws_manager.connect("portfolio", websocket)
    # Start push task if not already running
    if _portfolio_push_task is None or _portfolio_push_task.done():
        _portfolio_push_task = asyncio.create_task(_portfolio_push_loop())
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect("portfolio", websocket)
        # Cancel task if no more connections
        count = await ws_manager.get_channel_count("portfolio")
        if count == 0 and _portfolio_push_task is not None:
            _portfolio_push_task.cancel()
            try:
                await _portfolio_push_task
            except asyncio.CancelledError:
                pass
            _portfolio_push_task = None


@app.websocket("/ws/news")
async def ws_news(websocket: WebSocket) -> None:
    global _news_push_task
    await ws_manager.connect("news", websocket)
    # Start push task if not already running
    if _news_push_task is None or _news_push_task.done():
        _news_push_task = asyncio.create_task(_news_push_loop())
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect("news", websocket)
        # Cancel task if no more connections
        count = await ws_manager.get_channel_count("news")
        if count == 0 and _news_push_task is not None:
            _news_push_task.cancel()
            try:
                await _news_push_task
            except asyncio.CancelledError:
                pass
            _news_push_task = None


if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
