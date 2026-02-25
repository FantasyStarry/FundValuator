"use client";

import { ExternalLink, Newspaper, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NewsAnalysisResponse, NewsItem } from "@/components/home/types";
import { formatDateTime } from "@/components/home/utils";

type NewsTimelineProps = {
  newsItems: NewsItem[];
  selectedNewsKey: string;
  onSelectNewsKey: (key: string) => void;
};

const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
  const isPositive = sentiment.toLowerCase().includes("positive") || sentiment === "利好";
  const isNegative = sentiment.toLowerCase().includes("negative") || sentiment === "利空";
  
  return (
    <span
      className={cn(
        "text-[10px] font-medium",
        isPositive ? "text-[var(--gain)]" : isNegative ? "text-[var(--loss)]" : "text-[var(--muted-foreground)]"
      )}
    >
      {isPositive && <TrendingUp className="w-3 h-3 inline mr-1" />}
      {isNegative && <TrendingDown className="w-3 h-3 inline mr-1" />}
      {sentiment}
    </span>
  );
};

const NewsItemCard = ({ 
  item, 
  isActive, 
  onClick 
}: { 
  item: NewsItem; 
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      className={cn(
        "w-full text-left p-3 rounded-lg transition-colors",
        isActive ? "bg-[var(--primary)]/10" : "hover:bg-[var(--muted)]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {formatDateTime(item.published_at)}
        </span>
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="w-3 h-3 text-[var(--muted-foreground)]" />
          </a>
        )}
      </div>
      <h4 className="text-sm font-medium mb-2 line-clamp-2">{item.title}</h4>
      <div className="flex items-center gap-2">
        {item.analysis && <SentimentBadge sentiment={item.analysis.sentiment} />}
        {item.source && <span className="text-[10px] text-[var(--muted-foreground)]">{item.source}</span>}
      </div>
    </button>
  );
};

export const NewsTimeline = ({
  newsItems,
  selectedNewsKey,
  onSelectNewsKey,
}: NewsTimelineProps) => {
  return (
    <div className="flex flex-col h-full rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4" />
          <span className="font-medium text-sm">资讯</span>
          <Badge variant="outline" className="text-[10px]">{newsItems.length}</Badge>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {newsItems.map((item, idx) => (
          <NewsItemCard
            key={idx}
            item={item}
            isActive={selectedNewsKey === String(idx)}
            onClick={() => onSelectNewsKey(String(idx))}
          />
        ))}
        {!newsItems.length && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
            <div className="text-sm">暂无资讯</div>
          </div>
        )}
      </div>
    </div>
  );
};
