# AI 基金估值分析平台

> 本地部署、隐私安全、数据驱动的 AI 基金投资辅助平台

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📖 项目简介

通过实时估值监控、AI 驱动的新闻影响分析，帮助投资者在复杂的 A 股市场中识别噪音，捕捉真实的市场机会。

> ⚠️ **特别提示**：本平台所有分析结果、估值数据及 AI 预测内容**仅供参考**，不构成任何投资建议。投资者需独立承担风险。

## ✨ 核心功能

### 📊 自选基金实时估值
- 基于基金重仓持股结合个股实时股价波动，计算加权估值涨跌幅
- 支持交易时间内（9:30-11:30, 13:00-15:00）实时更新
- 每晚自动抓取官方净值，计算估值偏差
- 估值与净值平滑过渡，避免数据跳变

### 💰 持仓管理
- 支持**金额模式**和**份额模式**两种持仓记录方式
- 记录交易（买入/卖出），自动计算持仓成本
- 展示今日收益、持有收益、持仓占比

### 🤖 AI 新闻影响分析
- 实时抓取财经新闻 RSS 流
- 灵活选择 AI 模型：支持本地部署 (Ollama) 或云端 API (DeepSeek、ChatGPT、Gemini、Grok 等)
- 输出情感分析、影响资产、重要性评分
- 按重要性自动过滤低价值新闻

### 📈 数据可视化
- 净值走势图表（分时/近1月/近3月/近1年）
- 重仓股票明细表格
- 投资组合概览仪表盘

## 🛠 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  Next.js 16 + React 19 + Tailwind CSS + ECharts             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│  FastAPI + Python 3.10+                                     │
│  ├── 数据采集层 (AkShare / 新浪 / 腾讯 / 东方财富)            │
│  ├── AI 分析层 (支持多种 AI 模型 API)                        │
│  └── 业务逻辑层 (估值计算 / 持仓管理)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Storage                               │
│  SQLite (本地存储) + Redis (可选缓存)                        │
└─────────────────────────────────────────────────────────────┘
```

## 📦 项目结构

```
FundValuator/
├── backend/                    # FastAPI 后端服务
│   ├── __init__.py
│   ├── __main__.py            # 入口文件
│   ├── app.py                 # FastAPI 应用主文件
│   ├── config.py              # 配置管理
│   ├── data_sources.py        # 数据获取模块
│   ├── models.py              # Pydantic 数据模型
│   ├── storage.py             # SQLite 存储层
│   ├── requirements.txt       # Python 依赖
│   └── data/                  # 本地数据库文件
│       └── app.db
├── frontend/                   # Next.js 前端应用
│   ├── src/
│   │   ├── app/               # 页面路由
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # 主页面
│   │   │   └── globals.css
│   │   ├── components/        # UI 组件
│   │   │   ├── ui/            # shadcn/ui 组件
│   │   │   └── FundChart.tsx  # 图表组件
│   │   └── lib/
│   │       └── utils.ts
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── docker-compose.yml         # Docker 部署配置
├── AI_Fund_Analysis_Platform_PRD.md   # 产品需求文档
├── Development_Guide.md       # 开发指南
└── Development_Analysis.md    # 技术分析文档
```

## 🚀 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+ / Bun
- Redis (可选，用于缓存)

### 后端启动

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
export DEEPSEEK_API_KEY=your_api_key  # AI 分析功能必需
export REDIS_URL=redis://localhost:6379/0  # 可选

# 启动服务
python -m backend
# 服务运行在 http://localhost:8000
```

### 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
bun install
# 或 npm install

# 开发模式启动
bun run dev
# 或 npm run dev
# 服务运行在 http://localhost:3000

# 生产构建
bun run build
bun run start
```

### Docker 部署

```bash
# 一键启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## ⚙️ 环境变量配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `DEEPSEEK_API_KEY` | AI 模型 API 密钥 (支持 DeepSeek/OpenAI/Gemini 等) | - | ✅ |
| `DEEPSEEK_BASE_URL` | AI 模型 API 地址 | `https://api.deepseek.com` | ❌ |
| `DEEPSEEK_MODEL` | 使用的模型名称 | `deepseek-chat` | ❌ |
| `REDIS_URL` | Redis 连接地址 | - | ❌ |
| `NEWS_RSS_URL` | 新闻 RSS 源地址 | 财联社 RSS | ❌ |
| `NEWS_CACHE_TTL_SEC` | 新闻缓存时间(秒) | `3600` | ❌ |
| `NEWS_REFRESH_INTERVAL_SEC` | 新闻刷新间隔(秒) | `300` | ❌ |

## 📡 API 接口

### 基金管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/funds` | 获取基金列表 |
| `POST` | `/api/funds` | 添加基金 |
| `DELETE` | `/api/funds/{code}` | 删除基金 |
| `PUT` | `/api/funds/{code}/amount` | 更新持仓 |

### 估值与净值

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/funds/{code}/estimate` | 获取估值详情 |
| `GET` | `/api/funds/{code}/nav/history` | 获取净值历史 |

### 投资组合

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/portfolio/overview` | 投资组合概览 |

### 市场数据

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/market/search` | 搜索基金 |

### 新闻资讯

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/news/feed` | 新闻资讯流 |
| `POST` | `/api/ai/news/analyze` | AI 新闻分析 |

## 📊 数据来源

| 数据项 | 来源 | 更新频率 |
|--------|------|----------|
| 基金基本信息 | 东方财富 | 添加时获取 |
| 基金持仓 | 东方财富基金F10 | 季度更新 |
| 实时估值 | 天天基金 | 交易时间内实时 |
| 官方净值 | 东方财富 | 每日 20:00 后 |
| 个股行情 | 新浪/腾讯财经 | 实时 |
| 财经新闻 | RSS 订阅源 | 实时流式 |

## 🗺 开发进度

### ✅ 已完成 (MVP + AI 增强)

<details>
<summary>点击展开详细列表</summary>

#### 后端基础架构
- [x] FastAPI 框架搭建
- [x] SQLite 数据库存储
- [x] Redis 缓存支持（可选）
- [x] CORS 跨域配置

#### 基金管理功能
- [x] 基金搜索和添加
- [x] 持仓管理（金额模式/份额模式）
- [x] 基金删除
- [x] 持仓成本计算

#### 实时估值系统
- [x] 天天基金估值接口集成
- [x] 基于重仓股加权估值
- [x] 官方净值获取和历史记录
- [x] 估值与净值平滑过渡
- [x] 休市日期处理

#### 投资组合概览
- [x] 总资产统计
- [x] 今日收益计算
- [x] 持有收益计算
- [x] 当日涨跌幅

#### AI 新闻分析
- [x] RSS 新闻抓取
- [x] DeepSeek AI 集成
- [x] 新闻重要性评分
- [x] 情绪分析
- [x] 影响资产识别
- [x] 新闻内容全文抓取

#### 前端界面
- [x] 基金列表侧边栏
- [x] 估值详情展示
- [x] 净值走势图表
- [x] 重仓股明细表格
- [x] 新闻资讯流
- [x] 持仓更新弹窗
- [x] 交易记录功能
- [x] 响应式布局

</details>

### 🚧 进行中 / 待开发 (专业版)

<details>
<summary>点击展开详细列表</summary>

#### 机构动向监控
- [ ] 龙虎榜数据获取
- [ ] 北向资金流向监控
- [ ] 大宗交易分析
- [ ] 机构席位识别

#### 高级功能
- [ ] WebSocket 实时推送
- [ ] DuckDB 高性能分析
- [ ] 分时图完善
- [ ] 历史新闻回测
- [ ] RAG 向量检索

#### 部署优化
- [ ] Docker 部署完善
- [ ] 数据备份恢复
- [ ] 多数据源冗余

</details>

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [AkShare](https://github.com/akfamily/akshare) - 金融数据接口
- [FastAPI](https://fastapi.tiangolo.com/) - 现代化 Web 框架
- [Next.js](https://nextjs.org/) - React 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [ECharts](https://echarts.apache.org/) - 数据可视化
- [DeepSeek](https://www.deepseek.com/) - AI 模型

---

**文档版本**: 1.0  
**更新日期**: 2026-02-21
