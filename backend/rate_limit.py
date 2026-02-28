import os
import time
from typing import Dict, Tuple
from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)

_redis_client = None

def set_redis_client(client):
    global _redis_client
    _redis_client = client

def get_redis_client():
    return _redis_client


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._memory_store: Dict[str, Tuple[int, float]] = {}

        self.default_limit = int(os.getenv("RATE_LIMIT_DEFAULT", "60"))
        self.window_seconds = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
        self.ai_limit = int(os.getenv("RATE_LIMIT_AI", "10"))
        self.ai_window = int(os.getenv("RATE_LIMIT_AI_WINDOW", "60"))

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _check_rate_limit_redis(self, key: str, limit: int, window: int) -> bool:
        redis_client = get_redis_client()
        if not redis_client:
            return self._check_rate_limit_memory(key, limit, window)
        
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(self._redis_sync_get, redis_client, key)
                    current = future.result(timeout=1)
            else:
                current = asyncio.run(self._redis_sync_get(redis_client, key))
            
            if current is None:
                asyncio.run(self._redis_sync_setex(redis_client, key, window, "1"))
                return True
            
            count = int(current)
            if count >= limit:
                return False
            
            asyncio.run(self._redis_sync_incr(redis_client, key))
            return True
        except Exception as e:
            logger.warning(f"Redis rate limit check failed: {e}")
            return self._check_rate_limit_memory(key, limit, window)

    def _redis_sync_get(self, redis_client, key):
        return redis_client.get(key)

    def _redis_sync_setex(self, redis_client, key, time, value):
        return redis_client.setex(key, time, value)

    def _redis_sync_incr(self, redis_client, key):
        return redis_client.incr(key)

    def _check_rate_limit_memory(self, key: str, limit: int, window: int) -> bool:
        now = time.time()
        if key not in self._memory_store:
            self._memory_store[key] = (1, now)
            return True
        
        count, timestamp = self._memory_store[key]
        if now - timestamp >= window:
            self._memory_store[key] = (1, now)
            return True
        
        if count >= limit:
            return False
        
        self._memory_store[key] = (count + 1, timestamp)
        return True

    def _check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        redis_client = get_redis_client()
        if redis_client:
            return self._check_rate_limit_redis(key, limit, window)
        return self._check_rate_limit_memory(key, limit, window)

    def _get_rate_limit_config(self, path: str) -> Tuple[int, int]:
        if "/ai/" in path or "/news/analyze" in path:
            return self.ai_limit, self.ai_window
        return self.default_limit, self.window_seconds

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        
        debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
        if debug_mode:
            return await call_next(request)

        path = request.url.path
        limit, window = self._get_rate_limit_config(path)
        
        rate_key = f"rate:{client_ip}:{path}"
        
        if not self._check_rate_limit(rate_key, limit, window):
            logger.warning(f"Rate limit exceeded for {client_ip} on {path}")
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "请求过于频繁，请稍后再试",
                    "retry_after": window
                }
            )
        
        response = await call_next(request)
        
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(limit - 1)
        
        return response
