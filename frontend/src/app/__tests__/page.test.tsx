import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/useWebSocket", () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: true,
    lastMessage: null,
    send: vi.fn(),
    reconnect: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

describe("Home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/funds?")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { code: "000001", name: "测试基金A", amount: 10000, mode: "amount", shares: 0, cost: 0, estimate_pct: 1.5 },
            ]),
          text: () => Promise.resolve(""),
        });
      }
      if (url.includes("/portfolio/overview")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              total_amount: 30000,
              total_daily_income: 150,
              total_holding_income: 1000,
              daily_pct: 0.5,
              update_time: "2024-01-15T15:00:00",
              used_source: "realtime",
              used_date: "2024-01-15",
              official_updated: true,
              holiday_mode: false,
            }),
          text: () => Promise.resolve(""),
        });
      }
      if (url.includes("/estimate")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              code: "000001",
              name: "测试基金A",
              estimate_pct: 1.5,
              estimate_source: "realtime",
              estimate_income: 150,
              total_income: 500,
              components: [],
              fund_gz_nav: 1.55,
              fund_gz_pct: 1.2,
              real_nav_date: "2024-01-14",
            }),
          text: () => Promise.resolve(""),
        });
      }
      if (url.includes("/nav/history")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              code: "000001",
              name: "测试基金A",
              items: [{ date: "2024-01-15", nav: 1.55, daily_pct: 1.2 }],
            }),
          text: () => Promise.resolve(""),
        });
      }
      if (url.includes("/news/feed")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ source: "rss", items: [] }),
          text: () => Promise.resolve(""),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
      });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the redesigned console shell", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("AI 基金监控台")).toBeInTheDocument();
    });

    expect(screen.getByText("监控基金池")).toBeInTheDocument();
    expect(screen.getByText("资讯联动")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索基金代码或名称")).toBeInTheDocument();
  });
});
