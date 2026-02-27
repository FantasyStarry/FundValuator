# 性能优化规范

## Why
当前系统存在数据加载速度慢的问题，主要体现在：
- 基金列表加载需逐个请求估值数据
- 基金详情页需串行获取多个持仓股票行情
- 热门数据（基金估值、NAV历史）缺少缓存导致重复请求
- 数据库操作频繁创建连接，无连接池复用

## What Changes
- 实现数据库连接池，复用连接资源
- 实现基金估值数据缓存（Redis）
- 实现NAV历史数据缓存
- 优化持仓股票行情获取为批量并发请求
- 添加 API 请求并发限制，防止雪崩
- 优化前后端数据加载流程

## Impact
- Affected specs: 数据加载、基金估值、持仓行情
- Affected code: backend/storage.py, backend/app.py, backend/data_sources.py

## ADDED Requirements

### Requirement: 数据库连接池
系统 SHALL 使用数据库连接池来复用连接资源，减少连接创建开销。

#### Scenario: 并发查询
- **WHEN** 多个请求同时访问数据库
- **THEN** 共享连接池，复用连接，提升响应速度

### Requirement: 基金估值缓存
系统 SHALL 缓存基金估值数据，减少对外部API的重复请求。

#### Scenario: 缓存命中
- **WHEN** 请求的基金估值在缓存中且未过期
- **THEN** 直接返回缓存数据，响应时间 < 50ms

#### Scenario: 缓存未命中
- **WHEN** 缓存不存在或已过期
- **THEN** 请求外部API获取数据并存入缓存

### Requirement: NAV历史缓存
系统 SHALL 缓存基金NAV历史数据。

#### Scenario: 获取NAV历史
- **WHEN** 请求基金NAV历史数据
- **THEN** 优先从缓存获取，缓存未命中时请求外部API

### Requirement: 持仓股票批量获取
系统 SHALL 并发批量获取持仓股票行情数据。

#### Scenario: 获取多个持仓
- **WHEN** 基金有N个持仓股票
- **THEN** 并发请求所有股票行情，总耗时 = max(单个请求时间)，而非累加

### Requirement: API并发控制
系统 SHALL 对外部API请求进行并发控制。

#### Scenario: 高并发场景
- **WHEN** 同时请求多个基金估值
- **THEN** 使用信号量限制并发数，避免雪崩

## MODIFIED Requirements

### Requirement: api_list_funds
优化并发请求限制，增加缓存支持。

### Requirement: api_portfolio_overview
增加缓存层，优化数据加载。

### Requirement: api_fund_estimate
将串行获取持仓行情改为批量并发获取。

## REMOVED Requirements
无

## 性能指标
- 基金列表加载时间: 优化前 ~3-5秒 -> 优化后 < 1秒
- 基金详情加载时间: 优化前 ~2-3秒 -> 优化后 < 500ms
- 数据库查询响应: 优化前每次新建连接 -> 优化后复用连接
