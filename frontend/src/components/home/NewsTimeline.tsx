"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Clock, ExternalLink, Newspaper, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NewsAnalysisResponse, NewsItem } from "@/components/home/types";
import { formatDateTime } from "@/components/home/utils";

type NewsTimelineProps = {
  newsItems: NewsItem[];
  selectedNewsKey: string;
  onSelectNewsKey: (key: string) => void;
  analysisCache: Record<string, NewsAnalysisResponse>;
  newsLoading: boolean;
};

// Sentiment indicator component
const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
  const isPositive = sentiment.toLowerCase().includes("positive") || sentiment.toLowerCase().includes("bullish") || sentiment === "利好";
  const isNegative = sentiment.toLowerCase().includes("negative") || sentiment.toLowerCase().includes("bearish") || sentiment === "利空";
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
        isPositive 
          ? "bg-[var(--gain)]/10 text-[var(--gain)]" 
          : isNegative 
          ? "bg-[var(--loss)]/10 text-[var(--loss)]"
          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
      )}
    >
      {isPositive && <TrendingUp className="w-3 h-3" />}
      {isNegative && <TrendingDown className="w-3 h-3" />}
      <span>{sentiment}</span>
    </div>
  );
};

// Importance score badge
const ImportanceBadge = ({ score }: { score: number }) => {
  const level = score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low";
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold",
        level === "high" 
          ? "bg-[var(--loss)]/20 text-[var(--loss)]" 
          : level === "medium"
          ? "bg-amber-500/20 text-amber-500"
          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
      )}
    >
      <Zap className="w-3 h-3" />
      <span>{score.toFixed(2)}</span>
    </div>
  );
};

// News item component
const NewsItemCard = ({ 
  item, 
  isActive, 
  analysis,
  onClick 
}: { 
  item: NewsItem; 
  isActive: boolean;
  analysis: NewsAnalysisResponse | null;
  onClick: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-0 top-4 w-3 h-3 rounded-full border-2 transition-all duration-300 z-10",
          isActive 
            ? "bg-[var(--primary)] border-[var(--primary)] scale-125 shadow-[0_0_12px_rgba(0,214,125,0.4)]" 
            : "bg-[var(--muted)] border-[var(--border)] group-hover:border-[var(--primary)]/50"
        )}
      />
      
      {/* Timeline line */}
      <div className="absolute left-[5px] top-7 bottom-0 w-px bg-gradient-to-b from-[var(--border)] to-transparent" />

      {/* Content */}
      <button
        className={cn(
          "w-full text-left transition-all duration-300 rounded-xl p-4 ml-6",
          isActive 
            ? "glass-card" 
            : "hover:bg-[var(--muted)]/30"
        )}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-[var(--muted-foreground)]" />
            <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
              {formatDateTime(item.published_at)}
            </span>
          </div>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5 text-[var(--muted-foreground)] hover:text-[var(--primary)]" />
            </a>
          )}
        </div>

        {/* Title */}
        <h4 className={cn(
          "text-sm font-medium leading-snug mb-3 transition-colors",
          isActive 
            ? "text-[var(--foreground)]" 
            : "text-[var(--foreground)]/80 group-hover:text-[var(--foreground)]"
        )}>
          {item.title}
        </h4>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {analysis && (
            <>
              <SentimentBadge sentiment={analysis.sentiment} />
              {analysis.importance_score !== undefined && analysis.importance_score !== null && (
                <ImportanceBadge score={Number(analysis.importance_score)} />
              )}
            </>
          )}
          {item.source && (
            <Badge 
              variant="outline" 
              className="text-[10px] h-5 px-1.5 font-normal bg-[var(--muted)]/30 border-[var(--border)]/50 text-[var(--muted-foreground)]"
            >
              {item.source}
            </Badge>
          )}
        </div>

        {/* Summary */}
        {analysis?.summary && (
          <p className={cn(
            "text-xs leading-relaxed line-clamp-2 transition-all duration-300",
            isActive 
              ? "text-[var(--muted-foreground)]" 
              : "text-[var(--muted-foreground)]/70"
          )}>
            {analysis.summary}
          </p>
        )}

        {/* Impacted assets */}
        {analysis?.impacted_assets && analysis.impacted_assets.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {analysis.impacted_assets.slice(0, 3).map((asset, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] font-mono"
              >
                {asset}
              </span>
            ))}
            {analysis.impacted_assets.length > 3 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                +{analysis.impacted_assets.length - 3}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
};

export const NewsTimeline = ({
  newsItems,
  selectedNewsKey,
  onSelectNewsKey,
  analysisCache,
  newsLoading,
}: NewsTimelineProps) => {
  return (
    <aside className="flex flex-col gap-6 min-h-0">
      <div className="glass-card rounded-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--muted)]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-[var(--primary)]" />
              <span className="text-sm font-semibold">市场资讯</span>
              <Badge variant="outline" className="text-[10px] font-mono bg-[var(--card)] border-[var(--border)]">
                {newsItems.length}
              </Badge>
            </div>
            {newsLoading && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                <span className="text-[10px] text-[var(--muted-foreground)]">更新中</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {newsItems.length > 0 ? (
            <div className="relative pl-2 space-y-4">
              {newsItems.map((item, idx) => {
                const key = item.link || item.title;
                const isActive = key === selectedNewsKey;
                const analysis = key ? analysisCache[key] : null;

                return (
                  <NewsItemCard
                    key={idx}
                    item={item}
                    isActive={isActive}
                    analysis={analysis || null}
                    onClick={() => key && onSelectNewsKey(key)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
              <Newspaper className="w-10 h-10 mb-3 opacity-30" />
              <div className="text-sm font-medium">暂无资讯</div>
              <div className="text-xs mt-1 opacity-60">等待数据更新</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--muted)]/20">
          <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>自动刷新: 每 15 秒</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              <span>实时</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};