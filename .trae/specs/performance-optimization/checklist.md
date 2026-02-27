# Checklist - 性能优化

## 数据库连接池
- [x] storage.py 使用连接池而非每次创建新连接
- [x] 连接池在应用启动时初始化
- [x] 应用关闭时正确释放连接池

## 基金估值缓存
- [x] Redis缓存键使用统一格式 `fund:gz:{code}`
- [x] 缓存TTL设置为60秒
- [x] 缓存未命中时正确回退到外部API
- [x] api_list_funds 使用缓存

## NAV历史缓存
- [x] Redis缓存键使用统一格式 `fund:nav:{code}`
- [x] 缓存TTL设置为300秒
- [x] api_nav_history 使用缓存

## 持仓股票批量获取
- [x] data_sources.py 实现批量获取股票行情
- [x] 腾讯和新浪API都支持批量请求
- [x] api_fund_estimate 使用批量获取替代串行

## API并发控制
- [x] 外部API请求使用信号量限制并发
- [x] 并发数设置合理（5-10）
- [x] 无雪崩风险

## 性能验证
- [x] 基金列表加载时间 < 1秒
- [x] 基金详情加载时间 < 500ms
- [x] 功能测试通过
- [x] 数据准确性验证通过
