import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardMain } from "../DashboardMain";
import type { EstimateResponse, FundInfo, NavItem, PortfolioOverview } from "../types";

const mockPortfolio: PortfolioOverview = {
  total_amount: 50000,
  total_daily_income: 150,
  total_holding_income: 2500,
  daily_pct: 0.5,
  update_time: "2024-01-15T15:00:00",
  used_source: "realtime",
  holiday_mode: false,
};

const mockFund: FundInfo = {
  code: "000001",
  name: "测试基金",
  amount: 10000,
  mode: "amount",
  shares: 0,
  cost: 1.5,
  estimate_pct: 1.5,
};

const mockDetail: EstimateResponse = {
  code: "000001",
  name: "测试基金",
  estimate_pct: 1.5,
  estimate_source: "realtime",
  estimate_income: 150,
  total_income: 500,
  components: [
    {
      stock_code: "600519",
      stock_name: "贵州茅台",
      weight: 10,
      price: 1800,
      prev_close: 1780,
      change_pct: 1.12,
    },
    {
      stock_code: "000858",
      stock_name: "五粮液",
      weight: 8,
      price: 150,
      prev_close: 152,
      change_pct: -1.32,
    },
  ],
  fund_gz_nav: 1.55,
  fund_gz_pct: 1.2,
  real_nav_date: "2024-01-14",
};

const mockNavItems: NavItem[] = [
  { date: "2024-01-15", nav: 1.55, daily_pct: 1.2 },
  { date: "2024-01-14", nav: 1.53, daily_pct: 0.8 },
];

const mockChartOption = {
  xAxis: { type: "category" as const, data: ["2024-01-14", "2024-01-15"] },
  yAxis: { type: "value" as const },
  series: [{ type: "line" as const, data: [1.53, 1.55] }],
};

const createProps = () => ({
  portfolio: mockPortfolio,
  selectedFund: mockFund,
  detail: mockDetail,
  navItems: mockNavItems,
  chartOption: mockChartOption,
  chartPeriod: "1m" as const,
  onChartPeriodChange: vi.fn(),
  onRefreshDetail: vi.fn(),
  onDeleteFund: vi.fn(),
  onOpenHoldingSheet: vi.fn(),
  onOpenTransactionSheet: vi.fn(),
});

describe("DashboardMain", () => {
  it("renders portfolio and fund metrics", () => {
    render(<DashboardMain {...createProps()} />);

    expect(screen.getByText("组合运行概览")).toBeInTheDocument();
    expect(screen.getByText("总资产")).toBeInTheDocument();
    expect(screen.getByText("50000.00")).toBeInTheDocument();
    expect(screen.getByText("测试基金")).toBeInTheDocument();
    expect(screen.getByText("官方净值")).toBeInTheDocument();
    expect(screen.getByText("2024-01-14")).toBeInTheDocument();
  });

  it("triggers chart period and action callbacks", () => {
    const props = createProps();
    render(<DashboardMain {...props} />);

    fireEvent.click(screen.getByText("近 3 月"));
    fireEvent.click(screen.getByText("刷新数据"));
    fireEvent.click(screen.getByText("调整持仓"));
    fireEvent.click(screen.getByText("录入交易"));
    fireEvent.click(screen.getByText("移除基金"));

    expect(props.onChartPeriodChange).toHaveBeenCalledWith("3m");
    expect(props.onRefreshDetail).toHaveBeenCalled();
    expect(props.onOpenHoldingSheet).toHaveBeenCalled();
    expect(props.onOpenTransactionSheet).toHaveBeenCalled();
    expect(props.onDeleteFund).toHaveBeenCalled();
  });

  it("shows empty states when no fund or chart data exists", () => {
    render(
      <DashboardMain
        {...createProps()}
        selectedFund={undefined}
        detail={null}
        navItems={[]}
        chartOption={null}
      />
    );

    expect(screen.getByText("请选择左侧基金")).toBeInTheDocument();
    expect(screen.getByText("暂无净值走势数据")).toBeInTheDocument();
    expect(screen.getByText("当前基金暂无重仓股明细。")).toBeInTheDocument();
  });

  it("shows intraday market closed message without data", () => {
    render(
      <DashboardMain
        {...createProps()}
        chartPeriod="intraday"
        navItems={[]}
        chartOption={null}
      />
    );

    expect(screen.getByText("当前分时数据未开盘或暂不可用")).toBeInTheDocument();
  });
});
