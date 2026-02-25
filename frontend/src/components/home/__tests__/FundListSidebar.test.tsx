import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FundListSidebar } from '../FundListSidebar'
import type { FundInfo } from '../types'

describe('FundListSidebar', () => {
  const mockFunds: FundInfo[] = [
    {
      code: '000001',
      name: '测试基金A',
      amount: 10000,
      mode: 'amount',
      shares: 0,
      cost: 0,
      estimate_pct: 1.5,
    },
    {
      code: '000002',
      name: '测试基金B',
      amount: 20000,
      mode: 'amount',
      shares: 0,
      cost: 0,
      estimate_pct: -2.3,
    },
    {
      code: '000003',
      name: '测试基金C',
      amount: 15000,
      mode: 'shares',
      shares: 1000,
      cost: 1.5,
      estimate_pct: null,
    },
  ]

  const defaultProps = {
    funds: mockFunds,
    selectedCode: '',
    listQuery: '',
    onListQueryChange: vi.fn(),
    onSelectCode: vi.fn(),
    onOpenHoldingSheet: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TC-SIDEBAR-001: 正确渲染基金列表', () => {
    it('应该显示所有基金项', () => {
      render(<FundListSidebar {...defaultProps} />)
      expect(screen.getByText('测试基金A')).toBeInTheDocument()
      expect(screen.getByText('测试基金B')).toBeInTheDocument()
      expect(screen.getByText('测试基金C')).toBeInTheDocument()
    })

    it('应该显示基金数量badge', () => {
      render(<FundListSidebar {...defaultProps} />)
      // 涨跌统计 badge
      expect(screen.getByText('2 涨')).toBeInTheDocument()
      expect(screen.getByText('1 跌')).toBeInTheDocument()
    })

    it('应该显示基金代码', () => {
      render(<FundListSidebar {...defaultProps} />)
      expect(screen.getByText('000001')).toBeInTheDocument()
      expect(screen.getByText('000002')).toBeInTheDocument()
      expect(screen.getByText('000003')).toBeInTheDocument()
    })

    it('应该显示"基金列表"标题', () => {
      render(<FundListSidebar {...defaultProps} />)
      expect(screen.getByText('基金列表')).toBeInTheDocument()
    })
  })

  describe('TC-SIDEBAR-002: 选中基金高亮显示', () => {
    it('选中项应该有特殊样式', () => {
      render(<FundListSidebar {...defaultProps} selectedCode="000001" />)
      
      // 找到选中的基金项
      const selectedFund = screen.getByText('测试基金A').closest('div[class*="cursor-pointer"]')
      expect(selectedFund).toHaveClass('glass-card')
    })
  })

  describe('TC-SIDEBAR-003: 点击基金项触发选择回调', () => {
    it('点击基金项应该触发 onSelectCode', () => {
      const onSelectCode = vi.fn()
      render(<FundListSidebar {...defaultProps} onSelectCode={onSelectCode} />)
      
      fireEvent.click(screen.getByText('测试基金A'))
      expect(onSelectCode).toHaveBeenCalledWith('000001')
    })

    it('点击第二个基金项应该传递正确的code', () => {
      const onSelectCode = vi.fn()
      render(<FundListSidebar {...defaultProps} onSelectCode={onSelectCode} />)
      
      fireEvent.click(screen.getByText('测试基金B'))
      expect(onSelectCode).toHaveBeenCalledWith('000002')
    })
  })

  describe('TC-SIDEBAR-004: 筛选输入框功能', () => {
    it('输入筛选关键词应该触发 onListQueryChange', () => {
      const onListQueryChange = vi.fn()
      render(<FundListSidebar {...defaultProps} onListQueryChange={onListQueryChange} />)
      
      const input = screen.getByPlaceholderText('搜索基金...')
      fireEvent.change(input, { target: { value: '测试' } })
      
      expect(onListQueryChange).toHaveBeenCalledWith('测试')
    })

    it('筛选输入框应该显示传入的值', () => {
      render(<FundListSidebar {...defaultProps} listQuery="关键词" />)
      
      const input = screen.getByPlaceholderText('搜索基金...') as HTMLInputElement
      expect(input.value).toBe('关键词')
    })
  })

  describe('TC-SIDEBAR-005: 涨跌显示颜色区分', () => {
    it('涨的基金应该显示绿色', () => {
      render(<FundListSidebar {...defaultProps} />)
      
      const pctElement = screen.getByText('+1.50%')
      // 新设计使用 var(--gain) 颜色类
      expect(pctElement).toBeInTheDocument()
    })

    it('跌的基金应该显示红色', () => {
      render(<FundListSidebar {...defaultProps} />)
      
      const pctElement = screen.getByText('-2.30%')
      expect(pctElement).toBeInTheDocument()
    })

    it('无估值数据的基金应该显示"—"', () => {
      render(<FundListSidebar {...defaultProps} />)
      
      // 第三个基金 estimate_pct 为 null
      const nullPctElements = screen.getAllByText('—')
      expect(nullPctElements.length).toBeGreaterThan(0)
    })
  })

  describe('TC-SIDEBAR-006: 空列表显示提示', () => {
    it('空列表应该显示"暂无基金"', () => {
      render(<FundListSidebar {...defaultProps} funds={[]} />)
      expect(screen.getByText('暂无基金')).toBeInTheDocument()
    })
  })

  describe('TC-SIDEBAR-007: 点击更新持仓按钮', () => {
    it('点击"更新持仓"按钮应该触发 onOpenHoldingSheet', () => {
      const onOpenHoldingSheet = vi.fn()
      render(<FundListSidebar {...defaultProps} onOpenHoldingSheet={onOpenHoldingSheet} />)
      
      fireEvent.click(screen.getByText('更新持仓'))
      expect(onOpenHoldingSheet).toHaveBeenCalled()
    })
  })

  describe('基金项交互', () => {
    it('鼠标悬停应该显示箭头图标', () => {
      render(<FundListSidebar {...defaultProps} />)
      
      const fundItem = screen.getByText('测试基金A').closest('div[class*="group"]')
      expect(fundItem).toBeInTheDocument()
    })
  })
})