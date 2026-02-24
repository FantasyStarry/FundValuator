import { Calendar } from "lucide-react";
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

export const NewsTimeline = ({
  newsItems,
  selectedNewsKey,
  onSelectNewsKey,
  analysisCache,
  newsLoading,
}: NewsTimelineProps) => {
  return (
    <aside className="flex flex-col gap-6 min-h-0">
      <div className="bg-card border border-border/60 rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] flex flex-col h-full overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">市场资讯</span>
          </div>
          {newsLoading && <span className="text-[10px] animate-pulse text-muted-foreground">更新中...</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="relative pl-2 border-l border-border/60 space-y-8">
            {newsItems.map((item, idx) => {
              const key = item.link || item.title;
              const isActive = key === selectedNewsKey;
              const analysis = key ? analysisCache[key] : null;
              const rawScore = analysis?.importance_score;
              const normalizedScore = typeof rawScore === "number" ? rawScore : rawScore ? Number(rawScore) : null;

              return (
                <div key={idx} className="relative group pl-6">
                  <div
                    className={cn(
                      "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 transition-colors duration-300 z-10",
                      isActive ? "bg-background border-primary scale-125" : "bg-border border-background group-hover:border-primary/50"
                    )}
                  />

                  <button
                    className={cn(
                      "w-full text-left transition-all duration-200 rounded-lg p-3 -mt-2 -ml-3",
                      isActive ? "bg-muted/50" : "hover:bg-muted/30"
                    )}
                    onClick={() => key && onSelectNewsKey(key)}
                  >
                    <div className="text-[10px] font-mono text-muted-foreground mb-1">{formatDateTime(item.published_at)}</div>
                    <h4 className={cn("text-sm font-medium leading-snug mb-2", isActive ? "text-foreground" : "text-foreground/90")}>
                      {item.title}
                    </h4>

                    <div className="flex flex-wrap gap-1.5">
                      {analysis && (
                        <>
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-background border border-border/60 text-muted-foreground">
                            {analysis.sentiment}
                          </Badge>
                          {normalizedScore !== null && !Number.isNaN(normalizedScore) && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] h-5 px-1.5 font-normal border font-mono",
                                normalizedScore >= 0.7
                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                  : normalizedScore >= 0.4
                                  ? "bg-secondary/40 text-foreground border-border"
                                  : "bg-background text-muted-foreground border-border/60"
                              )}
                            >
                              {normalizedScore.toFixed(2)}
                            </Badge>
                          )}
                        </>
                      )}
                      {item.source && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-border/60 text-muted-foreground">
                          {item.source}
                        </Badge>
                      )}
                    </div>

                    {analysis?.summary && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{analysis.summary}</p>
                    )}
                  </button>
                </div>
              );
            })}
            {!newsItems.length && <div className="py-10 text-center text-xs text-muted-foreground">暂无资讯</div>}
          </div>
        </div>
      </div>
    </aside>
  );
};
