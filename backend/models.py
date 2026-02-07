from pydantic import BaseModel
from typing import List, Optional


class FundCreate(BaseModel):
    code: str


class FundInfo(BaseModel):
    code: str
    name: str
    updated_at: Optional[str]
    amount: float = 0.0
    mode: str = "amount"
    shares: float = 0.0
    cost: float = 0.0
    estimate_pct: Optional[float] = None
    last_source: Optional[str] = None
    last_source_date: Optional[str] = None
    last_source_pct: Optional[float] = None
    last_switch_at: Optional[str] = None
    last_official_date: Optional[str] = None


class FundUpdate(BaseModel):
    amount: float = 0.0
    mode: str = "amount"
    shares: float = 0.0
    cost: float = 0.0


class Holding(BaseModel):
    stock_code: str
    stock_name: str
    weight: float


class EstimateComponent(BaseModel):
    stock_code: str
    stock_name: str
    weight: float
    price: float
    prev_close: float
    change_pct: float


class EstimateResponse(BaseModel):
    code: str
    name: str
    estimate_pct: float
    estimate_source: str
    used_date: Optional[str] = None
    switch_at: Optional[str] = None
    transition_progress: Optional[float] = None
    official_updated: bool = False
    holiday_mode: bool = False
    estimate_income: float = 0.0
    total_income: float = 0.0
    components: List[EstimateComponent]
    fund_gz_pct: Optional[float]
    fund_gz_nav: Optional[float]
    fund_gz_time: Optional[str]
    real_nav_pct: Optional[float] = None
    real_nav_date: Optional[str] = None
    official_pct: Optional[float] = None
    official_date: Optional[str] = None
    realtime_pct: Optional[float] = None
    realtime_time: Optional[str] = None


class NavItem(BaseModel):
    date: str
    nav: float
    accum_nav: Optional[float]
    daily_pct: Optional[float]


class NavHistoryResponse(BaseModel):
    code: str
    name: str
    items: List[NavItem]


class PortfolioOverview(BaseModel):
    total_amount: float
    total_daily_income: float
    total_holding_income: float
    daily_pct: float
    update_time: Optional[str] = None
    used_source: Optional[str] = None
    used_date: Optional[str] = None
    switch_at: Optional[str] = None
    transition_progress: Optional[float] = None
    official_updated: bool = False
    holiday_mode: bool = False
