# Tasks
- [x] Task 1: 实现数据库连接池 - 修改 storage.py 使用 psycopg 池化连接
  - [x] SubTask 1.1: 移除每次调用创建新连接的逻辑
  - [x] SubTask 1.2: 实现全局连接池变量
  - [x] SubTask 1.3: 添加连接池初始化和关闭逻辑

- [x] Task 2: 实现基金估值数据缓存 - 在 app.py 中添加 Redis 缓存层
  - [x] SubTask 2.1: 添加基金估值缓存键生成函数
  - [x] SubTask 2.2: 实现缓存读取和写入逻辑
  - [x] SubTask 2.3: 设置合理的缓存TTL（60秒）

- [x] Task 3: 实现NAV历史数据缓存
  - [x] SubTask 3.1: 添加NAV历史缓存键生成函数
  - [x] SubTask 3.2: 实现缓存读取和写入逻辑

- [x] Task 4: 优化持仓股票行情获取为批量并发
  - [x] SubTask 4.1: 修改 data_sources.py 添加批量获取函数
  - [x] SubTask 4.2: 修改 app.py api_fund_estimate 使用批量获取

- [x] Task 5: 添加API并发控制
  - [x] SubTask 5.1: 在 app.py 中添加信号量限制外部API并发
  - [x] SubTask 5.2: 限制单个基金详情页持仓行情并发数

- [x] Task 6: 性能测试与验证
  - [x] SubTask 6.1: 使用时间戳测试优化前后加载时间
  - [x] SubTask 6.2: 验证功能正常和数据准确性

# Task Dependencies
- Task 1 是基础，其他任务依赖它
- Task 2 和 Task 3 可并行执行
- Task 4 依赖 Task 5 的并发控制
- Task 6 在所有任务完成后执行
