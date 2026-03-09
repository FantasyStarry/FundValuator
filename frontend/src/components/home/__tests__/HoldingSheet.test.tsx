import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HoldingSheet } from "../HoldingSheet";
import type { FundInfo } from "../types";

const mockFund: FundInfo = {
  code: "000001",
  name: "测试基金",
  amount: 10000,
  mode: "amount",
  shares: 0,
  cost: 0,
};

const createProps = () => ({
  open: true,
  onClose: vi.fn(),
  selectedFund: mockFund,
  editMode: "amount" as const,
  onEditModeChange: vi.fn(),
  inputAmount: "",
  onInputAmountChange: vi.fn(),
  inputShares: "",
  onInputSharesChange: vi.fn(),
  inputCost: "",
  onInputCostChange: vi.fn(),
  onSubmit: vi.fn(),
});

describe("HoldingSheet", () => {
  it("does not render when closed", () => {
    const { container } = render(<HoldingSheet {...createProps()} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders amount mode and submits actions", () => {
    const props = createProps();
    render(<HoldingSheet {...props} />);

    expect(screen.getByText("更新持仓")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("请输入金额"), { target: { value: "12000" } });
    fireEvent.click(screen.getByText("按份额"));
    fireEvent.click(screen.getByText("取消"));
    fireEvent.click(screen.getByText("确认"));

    expect(props.onInputAmountChange).toHaveBeenCalledWith("12000");
    expect(props.onEditModeChange).toHaveBeenCalledWith("shares");
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onSubmit).toHaveBeenCalled();
  });

  it("renders shares mode inputs", () => {
    const props = createProps();
    render(<HoldingSheet {...props} editMode="shares" />);

    fireEvent.change(screen.getByPlaceholderText("请输入份额"), { target: { value: "500" } });
    fireEvent.change(screen.getByPlaceholderText("请输入成本"), { target: { value: "1.5" } });

    expect(screen.getByText("持有份额")).toBeInTheDocument();
    expect(screen.getByText("持仓成本")).toBeInTheDocument();
    expect(props.onInputSharesChange).toHaveBeenCalledWith("500");
    expect(props.onInputCostChange).toHaveBeenCalledWith("1.5");
  });
});
