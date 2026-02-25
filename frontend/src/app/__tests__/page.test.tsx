import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

// Mock useWebSocket
vi.mock('@/lib/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: true,
    lastMessage: null,
    send: vi.fn(),
    reconnect: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

// 由于主页面组件复杂，需要异步加载数据，我们只测试基本渲染
describe('主页面集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/funds?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { code: '000001', name: '测试基金A', amount: 10000, mode: 'amount', shares: 0, cost: 0, estimate_pct: 1.5 },
          ]),
          text: () => Promise.resolve(''),
        })
      }
      if (url.includes('/portfolio/overview')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            total_amount: 30000,
            total_daily_income: 150,
            total_holding_income: 1000,
            daily_pct: 0.5,
            update_time: '2024-01-15T15:00:00',
            used_source: 'realtime',
            used_date: '2024-01-15',
            official_updated: true,
            holiday_mode: false,
          }),
          text: () => Promise.resolve(''),
        })
      }
      if (url.includes('/estimate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            code: '000001',
            name: '测试基金A',
            estimate_pct: 1.5,
            estimate_source: 'realtime',
            estimate_income: 150,
            total_income: 500,
            components: [],
            fund_gz_nav: 1.55,
            fund_gz_pct: 1.2,
            real_nav_date: '2024-01-14',
          }),
          text: () => Promise.resolve(''),
        })
      }
      if (url.includes('/nav/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            code: '000001',
            name: '测试基金A',
            items: [
              { date: '2024-01-15', nav: 1.55, daily_pct: 1.2 },
            ],
          }),
          text: () => Promise.resolve(''),
        })
      }
      if (url.includes('/news/feed')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ source: 'rss', items: [] }),
          text: () => Promise.resolve(''),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      })
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TC-PAGE-001: 页面基本渲染', () => {
    it('应该包含基金列表标题', async () => {
      // 动态导入以避免 ECharts 初始化问题
      const Home = (await import('@/app/page')).default
      
      await act(async () => {
        render(<Home />)
      })
      
      expect(screen.getByText('基金列表')).toBeInTheDocument()
    })
  })

  describe('页面组件存在', () => {
    it('应该包含筛选输入框', async () => {
      const Home = (await import('@/app/page')).default
      
      await act(async () => {
        render(<Home />)
      })
      
      expect(screen.getByPlaceholderText('筛选...')).toBeInTheDocument()
    })

    it('应该包含搜索输入框', async () => {
      const Home = (await import('@/app/page')).default
      
      await act(async () => {
        render(<Home />)
      })
      
      // 使用更通用的选择器
      const searchInput = document.querySelector('input[placeholder*="搜索"]')
      expect(searchInput).toBeTruthy()
    })
  })
})
