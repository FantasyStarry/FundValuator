import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TransactionSheet } from '../TransactionSheet'
import type { FundInfo, EstimateResponse } from '../types'

describe('TransactionSheet', () => {
  const mockFund: FundInfo = {
    code: '000001',
    name: '测试基金',
    amount: 10000,
    mode: 'amount',
    shares: 1000,
    cost: 1.5,
  }

  const mockFundSharesMode: FundInfo = {
    code: '000002',
    name: '份额模式基金',
    amount: 0,
    mode: 'shares',
    shares: 1000,
    cost: 1.5,
  }

  const mockDetail: EstimateResponse = {
    code: '000001',
    name: '测试基金',
    estimate_pct: 1.5,
    estimate_source: 'realtime',
    estimate_income: 150,
    total_income: 500,
    components: [],
    fund_gz_nav: 1.55,
    fund_gz_pct: 1.2,
  }

  const defaultProps = {
    open: false,
    onClose: vi.fn(),
    selectedFund: mockFund,
    detail: mockDetail,
    transType: 'buy' as const,
    onTransTypeChange: vi.fn(),
    transAmount: '',
    onTransAmountChange: vi.fn(),
    transShares: '',
    onTransSharesChange: vi.fn(),
    transPrice: '',
    onTransPriceChange: vi.fn(),
    transDate: '',
    onTransDateChange: vi.fn(),
    isAfter3PM: false,
    onIsAfter3PMChange: vi.fn(),
    onSubmit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TC-TRANS-001: 组件未打开时不渲染', () => {
    it('当 open=false 时不应该渲染任何内容', () => {
      const { container } = render(<TransactionSheet {...defaultProps} open={false} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('TC-TRANS-002: 组件打开时正确显示交易记录弹窗', () => {
    it('应该显示标题"记录交易"', () => {
      render(<TransactionSheet {...defaultProps} open={true} />)
      expect(screen.getByText('记录交易')).toBeInTheDocument()
    })

    it('应该显示基金名称和代码', () => {
      render(<TransactionSheet {...defaultProps} open={true} />)
      expect(screen.getByText(/测试基金/)).toBeInTheDocument()
      expect(screen.getByText(/000001/)).toBeInTheDocument()
    })

    it('当没有选中基金时应该显示提示', () => {
      render(<TransactionSheet {...defaultProps} open={true} selectedFund={undefined} />)
      expect(screen.getByText('请选择基金')).toBeInTheDocument()
    })
  })

  describe('TC-TRANS-003: 买入/卖出类型切换测试', () => {
    it('默认应该显示"加仓(买入)"被选中', () => {
      render(<TransactionSheet {...defaultProps} open={true} transType="buy" />)
      expect(screen.getByText('加仓 (买入)')).toBeInTheDocument()
    })

    it('点击"减仓(卖出)"应该触发 onTransTypeChange', () => {
      const onTransTypeChange = vi.fn()
      render(<TransactionSheet {...defaultProps} open={true} onTransTypeChange={onTransTypeChange} />)
      
      fireEvent.click(screen.getByLabelText('减仓 (卖出)'))
      expect(onTransTypeChange).toHaveBeenCalledWith('sell')
    })

    it('买入时应该显示红色标签', () => {
      render(<TransactionSheet {...defaultProps} open={true} transType="buy" />)
      const buyLabel = screen.getByText('加仓 (买入)')
      expect(buyLabel).toHaveClass('text-destructive')
    })

    it('卖出时应该显示绿色标签', () => {
      render(<TransactionSheet {...defaultProps} open={true} transType="sell" />)
      const sellLabel = screen.getByText('减仓 (卖出)')
      expect(sellLabel).toHaveClass('text-primary')
    })
  })

  describe('TC-TRANS-004: 交易日期选择测试', () => {
    it('日期输入应该触发 onTransDateChange', () => {
      const onTransDateChange = vi.fn()
      render(<TransactionSheet {...defaultProps} open={true} onTransDateChange={onTransDateChange} />)
      
      // 使用 type 来查找日期输入框
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } })
      
      expect(onTransDateChange).toHaveBeenCalledWith('2024-01-15')
    })

    it('日期输入框应该有 max 属性限制未来日期', () => {
      render(<TransactionSheet {...defaultProps} open={true} />)
      
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
      const today = new Date().toISOString().split('T')[0]
      expect(dateInput.max).toBe(today)
    })
  })

  describe('TC-TRANS-005: 交易时间(15:00前/后)切换测试', () => {
    it('默认应该显示"15:00前"被选中', () => {
      render(<TransactionSheet {...defaultProps} open={true} isAfter3PM={false} />)
      expect(screen.getByText('15:00前')).toBeInTheDocument()
    })

    it('点击"15:00后"应该触发 onIsAfter3PMChange', () => {
      const onIsAfter3PMChange = vi.fn()
      render(<TransactionSheet {...defaultProps} open={true} onIsAfter3PMChange={onIsAfter3PMChange} />)
      
      fireEvent.click(screen.getByLabelText('15:00后'))
      expect(onIsAfter3PMChange).toHaveBeenCalledWith(true)
    })
  })

  describe('TC-TRANS-006: 金额模式下显示金额输入框', () => {
    it('金额模式应该只显示交易金额输入框', () => {
      render(<TransactionSheet {...defaultProps} open={true} selectedFund={mockFund} />)
      expect(screen.getByText('交易金额')).toBeInTheDocument()
      expect(screen.queryByText('买入金额')).not.toBeInTheDocument()
      expect(screen.queryByText('卖出份额')).not.toBeInTheDocument()
    })
  })

  describe('TC-TRANS-007: 份额模式下买入显示金额输入和份额计算', () => {
    it('份额模式买入应该显示买入金额和估算份额', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          selectedFund={mockFundSharesMode}
          transType="buy"
          transShares="100"
        />
      )
      expect(screen.getByText(/买入金额/)).toBeInTheDocument()
      expect(screen.getByText(/估算份额: 100/)).toBeInTheDocument()
    })
  })

  describe('TC-TRANS-008: 份额模式下卖出显示份额输入框', () => {
    it('份额模式卖出应该显示卖出份额输入框', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          selectedFund={mockFundSharesMode}
          transType="sell"
        />
      )
      expect(screen.getByText('卖出份额')).toBeInTheDocument()
    })

    it('应该显示持仓份额', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          selectedFund={mockFundSharesMode}
          transType="sell"
        />
      )
      expect(screen.getByText('1000')).toBeInTheDocument()
    })

    it('应该显示"全部"链接', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          selectedFund={mockFundSharesMode}
          transType="sell"
        />
      )
      expect(screen.getByText('全部')).toBeInTheDocument()
    })
  })

  describe('TC-TRANS-009: 卖出份额超过持仓时显示错误提示', () => {
    it('卖出份额超过持仓应该显示错误提示', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          selectedFund={mockFundSharesMode}
          transType="sell"
          transShares="1500"
        />
      )
      expect(screen.getByText('输入份额超过当前持仓')).toBeInTheDocument()
    })

    it('卖出份额超过持仓时提交按钮应该被禁用', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          selectedFund={mockFundSharesMode}
          transType="sell"
          transShares="1500"
        />
      )
      const submitBtn = screen.getByText('确认提交').closest('button')
      expect(submitBtn).toBeDisabled()
    })
  })

  describe('TC-TRANS-010: 点击"全部"自动填充持仓份额', () => {
    it('点击"全部"应该触发 onTransSharesChange', () => {
      const onTransSharesChange = vi.fn()
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          selectedFund={mockFundSharesMode}
          transType="sell"
          onTransSharesChange={onTransSharesChange}
        />
      )
      
      fireEvent.click(screen.getByText('全部'))
      expect(onTransSharesChange).toHaveBeenCalledWith('1000')
    })
  })

  describe('TC-TRANS-011: 确认说明根据交易类型和时间变化', () => {
    it('买入15:00前应该显示"T+1日"', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          transType="buy"
          isAfter3PM={false}
        />
      )
      expect(screen.getByText('T+1日')).toBeInTheDocument()
    })

    it('买入15:00后应该显示"T+2日"', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          transType="buy"
          isAfter3PM={true}
        />
      )
      expect(screen.getByText('T+2日')).toBeInTheDocument()
    })

    it('卖出应该显示相关文案', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          transType="sell"
          isAfter3PM={false}
        />
      )
      expect(screen.getByText(/卖出份额将在/)).toBeInTheDocument()
    })
  })

  describe('TC-TRANS-012: 点击确认提交按钮', () => {
    it('点击确认提交按钮应该触发 onSubmit', () => {
      const onSubmit = vi.fn()
      render(<TransactionSheet {...defaultProps} open={true} onSubmit={onSubmit} />)
      
      fireEvent.click(screen.getByText('确认提交'))
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  describe('成交净值显示', () => {
    it('有实时估值时应该显示"实时估值"', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          selectedFund={mockFundSharesMode}
          detail={mockDetail}
        />
      )
      expect(screen.getByText('实时估值')).toBeInTheDocument()
    })

    it('没有实时估值时应该显示"历史净值"', () => {
      render(
        <TransactionSheet 
          {...defaultProps} 
          open={true} 
          selectedFund={mockFundSharesMode}
          detail={{ ...mockDetail, fund_gz_nav: null }}
        />
      )
      expect(screen.getByText('历史净值')).toBeInTheDocument()
    })
  })

  describe('点击取消按钮', () => {
    it('点击取消按钮应该触发 onClose', () => {
      const onClose = vi.fn()
      render(<TransactionSheet {...defaultProps} open={true} onClose={onClose} />)
      
      fireEvent.click(screen.getByText('取消'))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('点击遮罩层关闭弹窗', () => {
    it('点击遮罩层应该触发 onClose', () => {
      const onClose = vi.fn()
      render(<TransactionSheet {...defaultProps} open={true} onClose={onClose} />)
      
      const overlay = document.querySelector('.fixed.inset-0')
      if (overlay) {
        fireEvent.click(overlay)
      }
      
      expect(onClose).toHaveBeenCalled()
    })
  })
})