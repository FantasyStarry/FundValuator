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
    invested_amount: float = 0.0  # 金额模式下的投入本金
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
    invested_amount: float = 0.0  # 金额模式下的投入本金


class TransactionCreate(BaseModel):
    fund_code: str
    type: str  # "buy" or "sell"
    amount: float = 0.0
    shares: float = 0.0
    price: float = 0.0
    trans_date: str  # 交易日期
    is_after_3pm: bool = False  # 是否15:00后交易
    mode: str = "amount"  # "amount" or "shares"


class TransactionInfo(BaseModel):
    id: int
    fund_code: str
    type: str
    amount: float
    shares: float
    price: float
    trans_date: str
    confirm_date: Optional[str] = None
    status: str  # "pending", "confirmed"
    created_at: Optional[str] = None


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


class NewsItem(BaseModel):
    title: str
    link: Optional[str] = None
    source: Optional[str] = None
    published_at: Optional[str] = None
    summary: Optional[str] = None
    analysis: Optional["NewsAnalysisResponse"] = None


class NewsFeedResponse(BaseModel):
    source: str
    items: List[NewsItem]


class NewsAnalysisRequest(BaseModel):
    title: str
    content: str
    source: Optional[str] = None


class NewsAnalysisResponse(BaseModel):
    summary: str
    sentiment: str
    impacted_assets: List[str]
    confidence: float
    reasoning: Optional[str] = None
