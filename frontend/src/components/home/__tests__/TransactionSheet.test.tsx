import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionSheet } from "../TransactionSheet";
import type { EstimateResponse, FundInfo } from "../types";

const amountFund: FundInfo = {
  code: "000001",
  name: "测试基金",
  amount: 10000,
  mode: "amount",
  shares: 1000,
  cost: 1.5,
};

const sharesFund: FundInfo = {
  code: "000002",
  name: "份额基金",
  amount: 0,
  mode: "shares",
  shares: 1000,
  cost: 1.5,
};

const detail: EstimateResponse = {
  code: "000001",
  name: "测试基金",
  estimate_pct: 1.5,
  estimate_source: "realtime",
  estimate_income: 150,
  total_income: 500,
  components: [],
  fund_gz_nav: 1.55,
  fund_gz_pct: 1.2,
};

const createProps = () => ({
  open: true,
  onClose: vi.fn(),
  selectedFund: amountFund,
  detail,
  transType: "buy" as const,
  onTransTypeChange: vi.fn(),
  transAmount: "",
  onTransAmountChange: vi.fn(),
  transShares: "",
  onTransSharesChange: vi.fn(),
  transPrice: "",
  onTransPriceChange: vi.fn(),
  transDate: "",
  onTransDateChange: vi.fn(),
  isAfter3PM: false,
  onIsAfter3PMChange: vi.fn(),
  onSubmit: vi.fn(),
});

describe("TransactionSheet", () => {
  it("does not render when closed", () => {
    const { container } = render(<TransactionSheet {...createProps()} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders amount mode and fires actions", () => {
    const props = createProps();
    render(<TransactionSheet {...props} />);

    expect(screen.getByText("记录交易")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("请输入金额"), { target: { value: "1000" } });
    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: "2024-01-15" },
    });
    fireEvent.click(screen.getByText("卖出"));
    fireEvent.click(screen.getByText("15:00后"));
    fireEvent.click(screen.getByText("取消"));
    fireEvent.click(screen.getByText("确认"));

    expect(props.onTransAmountChange).toHaveBeenCalledWith("1000");
    expect(props.onTransDateChange).toHaveBeenCalledWith("2024-01-15");
    expect(props.onTransTypeChange).toHaveBeenCalledWith("sell");
    expect(props.onIsAfter3PMChange).toHaveBeenCalledWith(true);
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onSubmit).toHaveBeenCalled();
  });

  it("renders shares mode fields", () => {
    const props = createProps();
    render(<TransactionSheet {...props} selectedFund={sharesFund} transType="sell" />);

    fireEvent.change(screen.getByPlaceholderText("请输入份额"), { target: { value: "300" } });
    fireEvent.change(screen.getByPlaceholderText("请输入净值"), { target: { value: "1.23" } });

    expect(screen.getByText("卖出份额")).toBeInTheDocument();
    expect(props.onTransSharesChange).toHaveBeenCalledWith("300");
    expect(props.onTransPriceChange).toHaveBeenCalledWith("1.23");
  });
});
