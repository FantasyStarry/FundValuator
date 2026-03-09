const sourceMap: Record<string, string> = {
  realtime: "实时估值",
  official: "官方净值",
  transition: "官方切换中",
  holdings: "持仓估算",
};

export const EMPTY_TEXT = "--";

export const formatNumber = (value?: number | null, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_TEXT;
  return value.toFixed(digits);
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return EMPTY_TEXT;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const month = (parsed.getMonth() + 1).toString().padStart(2, "0");
  const date = parsed.getDate().toString().padStart(2, "0");
  const hours = parsed.getHours().toString().padStart(2, "0");
  const minutes = parsed.getMinutes().toString().padStart(2, "0");
  return `${month}-${date} ${hours}:${minutes}`;
};

export const formatPct = (value?: number | null, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_TEXT;
  return `${value.toFixed(digits)}%`;
};

export const resolveSourceLabel = (source?: string | null, holiday?: boolean) => {
  if (holiday) return "休市，沿用上一交易日";
  if (!source) return EMPTY_TEXT;
  return sourceMap[source] ?? EMPTY_TEXT;
};
