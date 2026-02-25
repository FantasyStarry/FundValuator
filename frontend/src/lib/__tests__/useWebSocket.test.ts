import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWebSocket } from '@/lib/useWebSocket'

describe('useWebSocket', () => {
  // 保存原始 WebSocket
  const OriginalWebSocket = global.WebSocket
  
  let mockWebSocketInstance: {
    readyState: number
    onopen: ((event: Event) => void) | null
    onclose: ((event: CloseEvent) => void) | null
    onmessage: ((event: MessageEvent) => void) | null
    onerror: ((event: Event) => void) | null
    send: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.useFakeTimers()
    
    // 创建模拟的 WebSocket 实例
    mockWebSocketInstance = {
      readyState: 1, // WebSocket.OPEN
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      send: vi.fn(),
      close: vi.fn(),
    }

    // 模拟 WebSocket 构造函数
    const MockWebSocketConstructor = vi.fn().mockImplementation((url: string) => {
      mockWebSocketInstance.readyState = 0
      // 异步触发 onopen
      setTimeout(() => {
        mockWebSocketInstance.readyState = 1
        if (mockWebSocketInstance.onopen) {
          mockWebSocketInstance.onopen(new Event('open'))
        }
      }, 0)
      return mockWebSocketInstance
    })
    MockWebSocketConstructor.OPEN = 1
    MockWebSocketConstructor.CONNECTING = 0
    MockWebSocketConstructor.CLOSING = 2
    MockWebSocketConstructor.CLOSED = 3

    global.WebSocket = MockWebSocketConstructor as unknown as typeof WebSocket
  })

  afterEach(() => {
    vi.useRealTimers()
    global.WebSocket = OriginalWebSocket
    vi.clearAllMocks()
  })

  describe('TC-WS-001: 初始状态正确', () => {
    it('初始 isConnected 应该为 false', () => {
      const { result } = renderHook(() => useWebSocket('/ws/test'))
      expect(result.current.isConnected).toBe(false)
    })

    it('初始 lastMessage 应该为 null', () => {
      const { result } = renderHook(() => useWebSocket('/ws/test'))
      expect(result.current.lastMessage).toBeNull()
    })
  })

  describe('TC-WS-002: 连接成功后状态更新', () => {
    it('连接成功后应该调用 onOpen 回调', async () => {
      const onOpen = vi.fn()
      renderHook(() => useWebSocket('/ws/test', { onOpen }))

      // 运行初始定时器
      await act(async () => {
        vi.runOnlyPendingTimers()
      })

      expect(onOpen).toHaveBeenCalled()
    })
  })

  describe('TC-WS-003: 收到消息后更新 lastMessage', () => {
    it('收到消息后应该调用 onMessage 回调', async () => {
      const onMessage = vi.fn()
      const testData = { type: 'test', data: 'hello' }

      renderHook(() => useWebSocket<{ type: string; data: string }>('/ws/test', { onMessage }))

      // 运行初始定时器
      await act(async () => {
        vi.runOnlyPendingTimers()
      })

      // 模拟收到消息
      await act(async () => {
        if (mockWebSocketInstance.onmessage) {
          mockWebSocketInstance.onmessage(new MessageEvent('message', {
            data: JSON.stringify(testData)
          }))
        }
      })

      expect(onMessage).toHaveBeenCalledWith(testData)
    })
  })

  describe('TC-WS-004: 连接关闭后状态更新', () => {
    it('连接关闭后应该调用 onClose 回调', async () => {
      const onClose = vi.fn()

      renderHook(() => useWebSocket('/ws/test', { onClose }))

      // 运行初始定时器
      await act(async () => {
        vi.runOnlyPendingTimers()
      })

      // 模拟连接关闭
      await act(async () => {
        if (mockWebSocketInstance.onclose) {
          mockWebSocketInstance.onclose(new CloseEvent('close'))
        }
      })

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('TC-WS-005: 错误处理', () => {
    it('WebSocket 错误时应该调用 onError 回调', async () => {
      const onError = vi.fn()

      renderHook(() => useWebSocket('/ws/test', { onError }))

      // 运行初始定时器
      await act(async () => {
        vi.runOnlyPendingTimers()
      })

      // 模拟错误
      await act(async () => {
        if (mockWebSocketInstance.onerror) {
          mockWebSocketInstance.onerror(new Event('error'))
        }
      })

      expect(onError).toHaveBeenCalled()
    })
  })

  describe('TC-WS-006: send 方法发送数据', () => {
    it('连接状态下 send 方法应该调用 WebSocket.send', async () => {
      const { result } = renderHook(() => useWebSocket('/ws/test'))

      // 运行初始定时器
      await act(async () => {
        vi.runOnlyPendingTimers()
      })

      act(() => {
        result.current.send('test message')
      })

      expect(mockWebSocketInstance.send).toHaveBeenCalledWith('test message')
    })
  })

  describe('TC-WS-007: disconnect 方法关闭连接', () => {
    it('disconnect 方法应该调用 WebSocket.close', async () => {
      const { result } = renderHook(() => useWebSocket('/ws/test'))

      // 运行初始定时器
      await act(async () => {
        vi.runOnlyPendingTimers()
      })

      act(() => {
        result.current.disconnect()
      })

      expect(mockWebSocketInstance.close).toHaveBeenCalled()
    })
  })

  describe('TC-WS-008: 组件卸载时清理连接', () => {
    it('组件卸载时应该关闭连接', async () => {
      const { unmount } = renderHook(() => useWebSocket('/ws/test'))

      // 运行初始定时器
      await act(async () => {
        vi.runOnlyPendingTimers()
      })

      unmount()

      expect(mockWebSocketInstance.close).toHaveBeenCalled()
    })
  })

  describe('空 endpoint 不连接', () => {
    it('空字符串 endpoint 不应该创建连接', () => {
      const { result } = renderHook(() => useWebSocket(''))
      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('重连功能', () => {
    it('reconnect 方法应该重新建立连接', async () => {
      const { result } = renderHook(() => useWebSocket('/ws/test'))

      // 运行初始定时器
      await act(async () => {
        vi.runOnlyPendingTimers()
      })

      act(() => {
        result.current.reconnect()
      })

      expect(mockWebSocketInstance.close).toHaveBeenCalled()
    })
  })
})