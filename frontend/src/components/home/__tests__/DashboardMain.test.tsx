import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DashboardMain } from '../DashboardMain'
import type { FundInfo, EstimateResponse, NavItem, PortfolioOverview } from '../types'

describe('DashboardMain', () => {
  const mockPortfolio: PortfolioOverview = {
    total_amount: 50000,
    total_daily_income: 150,
    total_holding_income: 2500,
    daily_pct: 0.5,
    update_time: '2024-01-15T15:00:00',
    used_source: 'realtime',
    used_date: '2024-01-15',
    official_updated: true,
    holiday_mode: false,
  }

  const mockFund: FundInfo = {
    code: '000001',
    name: '测试基金',
    amount: 10000,
    mode: 'amount',
    shares: 0,
    cost: 1.5,
    estimate_pct: 1.5,
  }

  const mockDetail: EstimateResponse = {
    code: '000001',
    name: '测试基金',
    estimate_pct: 1.5,
    estimate_source: 'realtime',
    estimate_income: 150,
    total_income: 500,
    components: [
      {
        stock_code: '600519',
        stock_name: '贵州茅台',
        weight: 10,
        price: 1800,
        prev_close: 1780,
        change_pct: 1.12,
      },
      {
        stock_code: '000858',
        stock_name: '五粮液',
        weight: 8,
        price: 150,
        prev_close: 152,
        change_pct: -1.32,
      },
    ],
    fund_gz_nav: 1.55,
    fund_gz_pct: 1.2,
    real_nav_date: '2024-01-14',
  }

  const mockNavItems: NavItem[] = [
    { date: '2024-01-15', nav: 1.55, daily_pct: 1.2 },
    { date: '2024-01-14', nav: 1.53, daily_pct: 0.8 },
    { date: '2024-01-13', nav: 1.52, daily_pct: -0.5 },
  ]

  const mockChartOption = {
    xAxis: { type: 'category', data: ['2024-01-13', '2024-01-14', '2024-01-15'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: [1.52, 1.53, 1.55] }],
  }

  const defaultProps = {
    portfolio: mockPortfolio,
    selectedFund: mockFund,
    detail: mockDetail,
    navItems: mockNavItems,
    chartOption: mockChartOption,
    chartPeriod: '1m' as const,
    onChartPeriodChange: vi.fn(),
    onRefreshDetail: vi.fn(),
    onDeleteFund: vi.fn(),
    onOpenHoldingSheet: vi.fn(),
    onOpenTransactionSheet: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TC-MAIN-001: 正确显示投资组合概览卡片', () => {
    it('应该显示"总资产"卡片', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('总资产')).toBeInTheDocument()
      expect(screen.getByText('50000.00')).toBeInTheDocument()
    })

    it('应该显示"今日收益"卡片', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('今日收益')).toBeInTheDocument()
      expect(screen.getByText('+150.00')).toBeInTheDocument()
    })

    it('应该显示"数据来源"标签', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('数据来源')).toBeInTheDocument()
    })

    it('应该显示当日涨跌百分比', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('+0.50%')).toBeInTheDocument()
    })
  })

  describe('TC-MAIN-002: 收益正负颜色区分', () => {
    it('正收益应该显示红色', () => {
      render(<DashboardMain {...defaultProps} />)
      
      // 今日收益为正
      const incomeElements = screen.getAllByText('+150.00')
      incomeElements.forEach(el => {
        expect(el).toHaveClass('text-destructive')
      })
    })

    it('负收益应该显示绿色', () => {
      const negativePortfolio = {
        ...mockPortfolio,
        total_daily_income: -100,
        total_holding_income: -500,
      }
      
      render(<DashboardMain {...defaultProps} portfolio={negativePortfolio} />)
      
      // 今日收益为负
      const incomeElements = screen.getAllByText('-100.00')
      incomeElements.forEach(el => {
        expect(el).toHaveClass('text-foreground')
      })
    })
  })

  describe('TC-MAIN-003: 选中基金详情显示', () => {
    it('应该显示基金名称', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('测试基金')).toBeInTheDocument()
    })

    it('应该显示基金代码', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('000001')).toBeInTheDocument()
    })

    it('应该显示估算收益标签', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('估算收益')).toBeInTheDocument()
    })

    it('应该显示持有收益标签', () => {
      render(<DashboardMain {...defaultProps} />)
      const holdingIncomeLabels = screen.getAllByText('持有收益')
      expect(holdingIncomeLabels.length).toBeGreaterThan(0)
    })

    it('应该显示当日涨跌标签', () => {
      render(<DashboardMain {...defaultProps} />)
      const dailyPctLabels = screen.getAllByText('当日涨跌')
      expect(dailyPctLabels.length).toBeGreaterThan(0)
    })

    it('应该显示官方估值标签', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('官方估值')).toBeInTheDocument()
    })

    it('应该显示官方净值标签', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('官方净值')).toBeInTheDocument()
    })

    it('应该显示净值日期标签', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('净值日期')).toBeInTheDocument()
      expect(screen.getByText('2024-01-14')).toBeInTheDocument()
    })
  })

  describe('TC-MAIN-004: 图表周期切换', () => {
    it('点击"分时"应该触发 onChartPeriodChange', () => {
      const onChartPeriodChange = vi.fn()
      render(<DashboardMain {...defaultProps} onChartPeriodChange={onChartPeriodChange} />)
      
      fireEvent.click(screen.getByText('分时'))
      expect(onChartPeriodChange).toHaveBeenCalledWith('intraday')
    })

    it('点击"近1月"应该触发 onChartPeriodChange', () => {
      const onChartPeriodChange = vi.fn()
      render(<DashboardMain {...defaultProps} onChartPeriodChange={onChartPeriodChange} />)
      
      fireEvent.click(screen.getByText('近1月'))
      expect(onChartPeriodChange).toHaveBeenCalledWith('1m')
    })

    it('点击"近3月"应该触发 onChartPeriodChange', () => {
      const onChartPeriodChange = vi.fn()
      render(<DashboardMain {...defaultProps} onChartPeriodChange={onChartPeriodChange} />)
      
      fireEvent.click(screen.getByText('近3月'))
      expect(onChartPeriodChange).toHaveBeenCalledWith('3m')
    })

    it('点击"近1年"应该触发 onChartPeriodChange', () => {
      const onChartPeriodChange = vi.fn()
      render(<DashboardMain {...defaultProps} onChartPeriodChange={onChartPeriodChange} />)
      
      fireEvent.click(screen.getByText('近1年'))
      expect(onChartPeriodChange).toHaveBeenCalledWith('1y')
    })
  })

  describe('TC-MAIN-005: 分时图表未开盘显示', () => {
    it('分时模式且无数据应该显示"暂未开盘"', () => {
      render(<DashboardMain {...defaultProps} chartPeriod="intraday" navItems={[]} />)
      expect(screen.getByText('暂未开盘')).toBeInTheDocument()
    })

    it('分时模式且无数据应该显示英文提示', () => {
      render(<DashboardMain {...defaultProps} chartPeriod="intraday" navItems={[]} />)
      expect(screen.getByText('Market Not Open')).toBeInTheDocument()
    })
  })

  describe('TC-MAIN-006: 点击刷新按钮', () => {
    it('点击"刷新"按钮应该触发 onRefreshDetail', () => {
      const onRefreshDetail = vi.fn()
      render(<DashboardMain {...defaultProps} onRefreshDetail={onRefreshDetail} />)
      
      fireEvent.click(screen.getByText('刷新'))
      expect(onRefreshDetail).toHaveBeenCalled()
    })
  })

  describe('TC-MAIN-007: 点击删除按钮', () => {
    it('点击"删除"按钮应该触发 onDeleteFund', () => {
      const onDeleteFund = vi.fn()
      render(<DashboardMain {...defaultProps} onDeleteFund={onDeleteFund} />)
      
      fireEvent.click(screen.getByText('删除'))
      expect(onDeleteFund).toHaveBeenCalled()
    })
  })

  describe('TC-MAIN-008: 重仓股票明细表格显示', () => {
    it('应该显示重仓股票明细标题', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('重仓股票明细')).toBeInTheDocument()
    })

    it('应该显示表头', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('股票代码')).toBeInTheDocument()
      expect(screen.getByText('名称')).toBeInTheDocument()
      expect(screen.getByText('权重')).toBeInTheDocument()
      expect(screen.getByText('价格')).toBeInTheDocument()
      expect(screen.getByText('涨跌幅')).toBeInTheDocument()
    })

    it('应该显示股票数据', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('贵州茅台')).toBeInTheDocument()
      expect(screen.getByText('五粮液')).toBeInTheDocument()
      expect(screen.getByText('600519')).toBeInTheDocument()
      expect(screen.getByText('000858')).toBeInTheDocument()
    })

    it('股票涨跌颜色应该正确', () => {
      render(<DashboardMain {...defaultProps} />)
      
      // 茅台涨 +1.12%
      const upElement = screen.getByText('+1.12%')
      expect(upElement).toHaveClass('text-destructive')
      
      // 五粮液跌 -1.32%
      const downElement = screen.getByText('-1.32%')
      expect(downElement).toHaveClass('text-primary')
    })

    it('无持仓数据时应该显示提示', () => {
      render(<DashboardMain {...defaultProps} detail={{ ...mockDetail, components: [] }} />)
      expect(screen.getByText('暂无持仓数据')).toBeInTheDocument()
    })
  })

  describe('TC-MAIN-009: 持仓概况卡片显示', () => {
    it('应该显示持仓概况标题', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('持仓概况')).toBeInTheDocument()
    })

    it('金额模式应该显示持有金额', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('持有金额')).toBeInTheDocument()
    })

    it('份额模式应该显示持有份额', () => {
      const sharesFund = { ...mockFund, mode: 'shares' as const, shares: 1000 }
      render(<DashboardMain {...defaultProps} selectedFund={sharesFund} />)
      expect(screen.getByText('持有份额')).toBeInTheDocument()
    })

    it('应该显示持仓成本', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('持仓成本')).toBeInTheDocument()
    })

    it('应该显示累计收益', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('累计收益')).toBeInTheDocument()
    })

    it('应该显示持仓占比', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('持仓占比')).toBeInTheDocument()
    })

    it('应该显示持仓模式badge', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('金额持有')).toBeInTheDocument()
    })
  })

  describe('TC-MAIN-010: 无选中基金时显示提示', () => {
    it('无选中基金时应该显示"请选择基金查看详情"', () => {
      render(<DashboardMain {...defaultProps} selectedFund={undefined} />)
      expect(screen.getByText('请选择基金')).toBeInTheDocument()
      expect(screen.getByText('请选择基金查看详情')).toBeInTheDocument()
    })
  })

  describe('净值走势图表', () => {
    it('应该显示净值走势标题', () => {
      render(<DashboardMain {...defaultProps} />)
      expect(screen.getByText('净值走势')).toBeInTheDocument()
    })

    it('无图表数据时应该显示提示', () => {
      render(<DashboardMain {...defaultProps} chartOption={null} navItems={[]} />)
      expect(screen.getByText('暂无净值数据')).toBeInTheDocument()
    })
  })

  describe('已更新badge', () => {
    it('官方已更新时应该显示"已更新"badge', () => {
      render(<DashboardMain {...defaultProps} portfolio={{ ...mockPortfolio, official_updated: true }} />)
      expect(screen.getByText('已更新')).toBeInTheDocument()
    })

    it('官方未更新时不应该显示"已更新"badge', () => {
      render(<DashboardMain {...defaultProps} portfolio={{ ...mockPortfolio, official_updated: false }} />)
      expect(screen.queryByText('已更新')).not.toBeInTheDocument()
    })
  })
})