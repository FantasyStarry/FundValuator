const sourceMap: Record<string, string> = {
  realtime: "实时估值",
  official: "官方涨跌",
  transition: "官方更新中",
  holdings: "持仓估算",
};

export const formatNumber = (value?: number | null, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const month = (parsed.getMonth() + 1).toString().padStart(2, "0");
  const date = parsed.getDate().toString().padStart(2, "0");
  const hours = parsed.getHours().toString().padStart(2, "0");
  const minutes = parsed.getMinutes().toString().padStart(2, "0");
  return `${month}-${date} ${hours}:${minutes}`;
};

export const formatPct = (value?: number | null, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
};

export const resolveSourceLabel = (source?: string | null, holiday?: boolean) => {
  if (holiday) return "休市沿用上一交易日";
  if (!source) return "—";
  return sourceMap[source] ?? "—";
};
