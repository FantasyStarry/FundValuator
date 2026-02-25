import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HoldingSheet } from '../HoldingSheet'
import type { FundInfo } from '../types'

describe('HoldingSheet', () => {
  const mockFund: FundInfo = {
    code: '000001',
    name: '测试基金',
    amount: 10000,
    mode: 'amount',
    shares: 0,
    cost: 0,
  }

  const defaultProps = {
    open: false,
    onClose: vi.fn(),
    selectedFund: mockFund,
    editMode: 'amount' as const,
    onEditModeChange: vi.fn(),
    inputAmount: '',
    onInputAmountChange: vi.fn(),
    inputShares: '',
    onInputSharesChange: vi.fn(),
    inputCost: '',
    onInputCostChange: vi.fn(),
    onSubmit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TC-HOLD-001: 组件未打开时不渲染', () => {
    it('当 open=false 时不应该渲染任何内容', () => {
      const { container } = render(<HoldingSheet {...defaultProps} open={false} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('TC-HOLD-002: 组件打开时正确显示持仓更新弹窗', () => {
    it('应该显示标题"持仓更新"', () => {
      render(<HoldingSheet {...defaultProps} open={true} />)
      expect(screen.getByText('持仓更新')).toBeInTheDocument()
    })

    it('应该显示基金名称和代码', () => {
      render(<HoldingSheet {...defaultProps} open={true} />)
      expect(screen.getByText(/测试基金/)).toBeInTheDocument()
      expect(screen.getByText(/000001/)).toBeInTheDocument()
    })

    it('当没有选中基金时应该显示提示', () => {
      render(<HoldingSheet {...defaultProps} open={true} selectedFund={undefined} />)
      expect(screen.getByText('请选择基金')).toBeInTheDocument()
    })
  })

  describe('TC-HOLD-003: 按金额/按份额模式切换测试', () => {
    it('默认应该显示"按金额"模式被选中', () => {
      render(<HoldingSheet {...defaultProps} open={true} editMode="amount" />)
      const amountRadio = screen.getByLabelText('按金额').closest('label')
      expect(amountRadio).toHaveClass('bg-background')
    })

    it('点击"按份额"应该触发 onEditModeChange', () => {
      const onEditModeChange = vi.fn()
      render(<HoldingSheet {...defaultProps} open={true} onEditModeChange={onEditModeChange} />)
      
      fireEvent.click(screen.getByLabelText('按份额'))
      expect(onEditModeChange).toHaveBeenCalledWith('shares')
    })

    it('按金额模式应该显示金额输入框', () => {
      render(<HoldingSheet {...defaultProps} open={true} editMode="amount" />)
      expect(screen.getByText('持有金额')).toBeInTheDocument()
      expect(screen.queryByText('持有份额')).not.toBeInTheDocument()
    })

    it('按份额模式应该显示份额和成本输入框', () => {
      render(<HoldingSheet {...defaultProps} open={true} editMode="shares" />)
      expect(screen.getByText('持有份额')).toBeInTheDocument()
      expect(screen.getByText('持仓成本')).toBeInTheDocument()
    })
  })

  describe('TC-HOLD-004: 输入框值变化回调测试', () => {
    it('金额输入应该触发 onInputAmountChange', () => {
      const onInputAmountChange = vi.fn()
      render(<HoldingSheet {...defaultProps} open={true} editMode="amount" onInputAmountChange={onInputAmountChange} />)
      
      const input = screen.getByPlaceholderText('当前市值')
      fireEvent.change(input, { target: { value: '10000' } })
      
      expect(onInputAmountChange).toHaveBeenCalledWith('10000')
    })

    it('份额输入应该触发 onInputSharesChange', () => {
      const onInputSharesChange = vi.fn()
      render(<HoldingSheet {...defaultProps} open={true} editMode="shares" onInputSharesChange={onInputSharesChange} />)
      
      const input = screen.getByPlaceholderText('请输入份额')
      fireEvent.change(input, { target: { value: '500' } })
      
      expect(onInputSharesChange).toHaveBeenCalledWith('500')
    })

    it('成本输入应该触发 onInputCostChange', () => {
      const onInputCostChange = vi.fn()
      render(<HoldingSheet {...defaultProps} open={true} editMode="shares" onInputCostChange={onInputCostChange} />)
      
      const input = screen.getByPlaceholderText('请输入成本单价')
      fireEvent.change(input, { target: { value: '1.5' } })
      
      expect(onInputCostChange).toHaveBeenCalledWith('1.5')
    })
  })

  describe('TC-HOLD-005: 点击遮罩层关闭弹窗', () => {
    it('点击遮罩层应该触发 onClose', () => {
      const onClose = vi.fn()
      render(<HoldingSheet {...defaultProps} open={true} onClose={onClose} />)
      
      // 点击遮罩层（弹窗外层容器）
      const overlay = document.querySelector('.fixed.inset-0')
      if (overlay) {
        fireEvent.click(overlay)
      }
      
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('TC-HOLD-006: 点击取消按钮关闭弹窗', () => {
    it('点击取消按钮应该触发 onClose', () => {
      const onClose = vi.fn()
      render(<HoldingSheet {...defaultProps} open={true} onClose={onClose} />)
      
      fireEvent.click(screen.getByText('取消'))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('TC-HOLD-007: 点击确认更新按钮提交', () => {
    it('点击确认更新按钮应该触发 onSubmit', () => {
      const onSubmit = vi.fn()
      render(<HoldingSheet {...defaultProps} open={true} onSubmit={onSubmit} />)
      
      fireEvent.click(screen.getByText('确认更新'))
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  describe('输入框显示传入的值', () => {
    it('金额输入框应该显示传入的值', () => {
      render(<HoldingSheet {...defaultProps} open={true} editMode="amount" inputAmount="15000" />)
      
      const input = screen.getByPlaceholderText('当前市值') as HTMLInputElement
      expect(input.value).toBe('15000')
    })

    it('份额输入框应该显示传入的值', () => {
      render(<HoldingSheet {...defaultProps} open={true} editMode="shares" inputShares="1000" />)
      
      const input = screen.getByPlaceholderText('请输入份额') as HTMLInputElement
      expect(input.value).toBe('1000')
    })

    it('成本输入框应该显示传入的值', () => {
      render(<HoldingSheet {...defaultProps} open={true} editMode="shares" inputCost="1.2345" />)
      
      const input = screen.getByPlaceholderText('请输入成本单价') as HTMLInputElement
      expect(input.value).toBe('1.2345')
    })
  })
})
