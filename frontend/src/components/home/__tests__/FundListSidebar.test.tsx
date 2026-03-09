import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FundListSidebar } from "../FundListSidebar";
import type { FundInfo } from "../types";

const mockFunds: Array<FundInfo & { computedAmount?: number }> = [
  {
    code: "000001",
    name: "测试基金A",
    amount: 10000,
    mode: "amount",
    shares: 0,
    cost: 0,
    estimate_pct: 1.5,
  },
  {
    code: "000002",
    name: "测试基金B",
    amount: 20000,
    mode: "amount",
    shares: 0,
    cost: 0,
    estimate_pct: -2.3,
  },
  {
    code: "000003",
    name: "测试基金C",
    amount: 0,
    mode: "shares",
    shares: 1000,
    cost: 1.5,
    estimate_pct: null,
    computedAmount: 15000,
  },
];

const createProps = () => ({
  funds: mockFunds,
  selectedCode: "",
  listQuery: "",
  onListQueryChange: vi.fn(),
  onSelectCode: vi.fn(),
  onOpenHoldingSheet: vi.fn(),
  onQuickTrade: vi.fn(),
});

describe("FundListSidebar", () => {
  it("renders monitored funds and summary", () => {
    render(<FundListSidebar {...createProps()} />);

    expect(screen.getByText("监控基金池")).toBeInTheDocument();
    expect(screen.getByText("测试基金A")).toBeInTheDocument();
    expect(screen.getByText("测试基金B")).toBeInTheDocument();
    expect(screen.getByText("上涨 2")).toBeInTheDocument();
    expect(screen.getByText("下跌 1")).toBeInTheDocument();
  });

  it("handles selection, filtering and actions", () => {
    const props = createProps();
    render(<FundListSidebar {...props} selectedCode="000001" />);

    fireEvent.click(screen.getByText("测试基金A"));
    fireEvent.change(screen.getByPlaceholderText("筛选已监控基金"), {
      target: { value: "测试" },
    });
    fireEvent.click(screen.getByText("调整持仓"));
    fireEvent.click(screen.getByText("快速交易"));

    expect(props.onSelectCode).toHaveBeenCalledWith("000001");
    expect(props.onListQueryChange).toHaveBeenCalledWith("测试");
    expect(props.onOpenHoldingSheet).toHaveBeenCalled();
    expect(props.onQuickTrade).toHaveBeenCalledWith("000001");
  });

  it("shows empty placeholder", () => {
    render(<FundListSidebar {...createProps()} funds={[]} />);

    expect(screen.getByText("当前没有监控中的基金，请在上方搜索并纳入监控。")).toBeInTheDocument();
  });
});
