import { useCallback, useState } from "react";
import type { FundInfo, EstimateResponse, TransactionInfo } from "@/components/home/types";

const API_BASE = "/api";

const fetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
};

export const addTransaction = (payload: {
  fund_code: string;
  type: "buy" | "sell";
  amount: number;
  shares: number;
  price: number;
  trans_date: string;
  is_after_3pm: boolean;
  mode: string;
}) =>
  fetchJson<TransactionInfo>("/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const deleteTransaction = (id: number) =>
  fetchJson<void>(`/transactions/${id}`, {
    method: "DELETE",
  });

export const updateFundAmount = (
  code: string,
  payload: { amount: number; mode: "amount" | "shares"; shares: number; cost: number }
) =>
  fetchJson<FundInfo>(`/funds/${code}/amount`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export interface TransactionFormState {
  transType: "buy" | "sell";
  transAmount: string;
  transShares: string;
  transPrice: string;
  transDate: string;
  isAfter3PM: boolean;
}

export const useTransactionForm = (selectedFund: FundInfo | undefined, detail: EstimateResponse | null) => {
  const [showTransactionSheet, setShowTransactionSheet] = useState(false);
  const [formState, setFormState] = useState<TransactionFormState>({
    transType: "buy",
    transAmount: "",
    transShares: "",
    transPrice: "",
    transDate: "",
    isAfter3PM: false,
  });

  const updateFormField = useCallback(<K extends keyof TransactionFormState>(
    field: K,
    value: TransactionFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const openTransactionSheet = useCallback(() => {
    const now = new Date();
    const estimateNav = detail?.fund_gz_nav;
    const bestPrice = estimateNav || 0;
    
    setFormState({
      transType: "buy",
      transAmount: "",
      transShares: "",
      transPrice: bestPrice ? String(bestPrice) : "",
      transDate: now.toISOString().split("T")[0],
      isAfter3PM: now.getHours() >= 15,
    });
    setShowTransactionSheet(true);
  }, [detail]);

  const closeTransactionSheet = useCallback(() => {
    setShowTransactionSheet(false);
    setFormState({
      transType: "buy",
      transAmount: "",
      transShares: "",
      transPrice: "",
      transDate: "",
      isAfter3PM: false,
    });
  }, []);

  return {
    showTransactionSheet,
    formState,
    updateFormField,
    openTransactionSheet,
    closeTransactionSheet,
    setFormState,
  };
};

export const useHoldingForm = (selectedFund: FundInfo | undefined) => {
  const [showHoldingSheet, setShowHoldingSheet] = useState(false);
  const [editMode, setEditMode] = useState<"amount" | "shares">("amount");
  const [inputAmount, setInputAmount] = useState("");
  const [inputShares, setInputShares] = useState("");
  const [inputCost, setInputCost] = useState("");

  const syncFromFund = useCallback((fund?: FundInfo) => {
    setEditMode(fund?.mode ?? "amount");
    setInputAmount(fund?.amount ? String(fund.amount) : "");
    setInputShares(fund?.shares ? String(fund.shares) : "");
    setInputCost(fund?.cost ? String(fund.cost) : "");
  }, []);

  const openHoldingSheet = useCallback(() => {
    if (selectedFund) syncFromFund(selectedFund);
    setShowHoldingSheet(true);
  }, [selectedFund, syncFromFund]);

  const closeHoldingSheet = useCallback(() => {
    setShowHoldingSheet(false);
  }, []);

  return {
    showHoldingSheet,
    editMode,
    setEditMode,
    inputAmount,
    setInputAmount,
    inputShares,
    setInputShares,
    inputCost,
    setInputCost,
    syncFromFund,
    openHoldingSheet,
    closeHoldingSheet,
  };
};
