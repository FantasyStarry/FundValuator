"use client";

import { ExternalLink, Newspaper, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NewsItem } from "@/components/home/types";
import { formatDateTime } from "@/components/home/utils";

type NewsTimelineProps = {
  newsItems: NewsItem[];
  selectedNewsKey: string;
  onSelectNewsKey: (key: string) => void;
};

const resolveNewsKey = (item: NewsItem) => item.link || item.title;

const SentimentFlag = ({ sentiment }: { sentiment?: string | null }) => {
  if (!sentiment) return <span className="text-xs text-[var(--muted-foreground)]">未分析</span>;
  const normalized = sentiment.toLowerCase();
  const positive = normalized.includes("positive") || sentiment.includes("利好");
  const negative = normalized.includes("negative") || sentiment.includes("利空");

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", positive && "text-[var(--gain)]", negative && "text-[var(--loss)]", !positive && !negative && "text-[var(--muted-foreground)]")}>
      {positive && <TrendingUp className="h-3 w-3" />}
      {negative && <TrendingDown className="h-3 w-3" />}
      {sentiment}
    </span>
  );
};

export const NewsTimeline = ({ newsItems, selectedNewsKey, onSelectNewsKey }: NewsTimelineProps) => {
  return (
    <aside className="surface-panel flex min-h-0 flex-col overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Newspaper className="h-4 w-4 text-[var(--primary)]" />
            <div>
              <div className="section-label">News Feed</div>
              <div className="text-sm font-semibold">资讯联动</div>
            </div>
          </div>
          <Badge variant="outline">{newsItems.length}</Badge>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-2">
          {newsItems.map((item) => {
            const key = resolveNewsKey(item);
            const active = selectedNewsKey === key;
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  "w-full border px-3 py-3 text-left transition-colors",
                  active ? "border-[var(--primary)] bg-[rgba(39,68,56,0.08)]" : "border-[rgba(184,174,157,0.6)] bg-[rgba(246,241,231,0.45)] hover:bg-[rgba(217,208,193,0.28)]"
                )}
                onClick={() => onSelectNewsKey(key)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="section-label">{formatDateTime(item.published_at)}</div>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <div className="mt-2 line-clamp-2 text-sm font-medium leading-6">{item.title}</div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <SentimentFlag sentiment={item.analysis?.sentiment} />
                  <span className="text-[var(--muted-foreground)]">{item.source || "RSS"}</span>
                </div>
              </button>
            );
          })}

          {!newsItems.length && <div className="px-2 py-10 text-center text-sm text-[var(--muted-foreground)]">当前没有可展示的新闻流。</div>}
        </div>
      </div>
    </aside>
  );
};
