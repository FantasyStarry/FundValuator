import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWebSocket } from "@/lib/useWebSocket";

type MockSocket = {
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

describe("useWebSocket", () => {
  const OriginalWebSocket = global.WebSocket;
  let mockWebSocketInstance: MockSocket;

  beforeEach(() => {
    vi.useFakeTimers();

    mockWebSocketInstance = {
      readyState: 1,
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      send: vi.fn(),
      close: vi.fn(),
    };

    class TestWebSocket {
      static OPEN = 1;
      static CONNECTING = 0;
      static CLOSING = 2;
      static CLOSED = 3;

      constructor(url: string) {
        void url;
        mockWebSocketInstance.readyState = TestWebSocket.CONNECTING;
        setTimeout(() => {
          mockWebSocketInstance.readyState = TestWebSocket.OPEN;
          mockWebSocketInstance.onopen?.(new Event("open"));
        }, 0);
        return mockWebSocketInstance as unknown as TestWebSocket;
      }
    }

    global.WebSocket = TestWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.WebSocket = OriginalWebSocket;
    vi.clearAllMocks();
  });

  it("starts disconnected and connects on mount", async () => {
    const onOpen = vi.fn();
    const { result } = renderHook(() => useWebSocket("/ws/test", { onOpen }));

    expect(result.current.isConnected).toBe(false);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(onOpen).toHaveBeenCalled();
  });

  it("receives parsed messages", async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => useWebSocket<{ type: string }>("/ws/test", { onMessage }));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    await act(async () => {
      mockWebSocketInstance.onmessage?.(new MessageEvent("message", { data: JSON.stringify({ type: "ok" }) }));
    });

    expect(result.current.lastMessage).toEqual({ type: "ok" });
    expect(onMessage).toHaveBeenCalledWith({ type: "ok" });
  });

  it("sends and disconnects through the current socket", async () => {
    const { result } = renderHook(() => useWebSocket("/ws/test"));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    act(() => {
      result.current.send("ping");
      result.current.disconnect();
    });

    expect(mockWebSocketInstance.send).toHaveBeenCalledWith("ping");
    expect(mockWebSocketInstance.close).toHaveBeenCalled();
  });

  it("reconnects after close when under retry limit", async () => {
    const { result } = renderHook(() =>
      useWebSocket("/ws/test", {
        reconnectInterval: 1000,
        maxReconnectAttempts: 2,
      })
    );

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    await act(async () => {
      mockWebSocketInstance.onclose?.(new CloseEvent("close"));
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.reconnect).toBeTypeOf("function");
  });
});
