import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as React from 'react'

// 每个测试后清理
afterEach(() => {
  cleanup()
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.OPEN
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  send = vi.fn((data: string) => {})
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  })

  // Helper method to simulate receiving a message
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  // Helper method to simulate an error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

vi.stubGlobal('WebSocket', MockWebSocket)

// 创建 LinearGradient 类
class MockLinearGradient {
  constructor(
    public x: number,
    public y: number,
    public x2: number,
    public y2: number,
    public colorStops: Array<{ offset: number; color: string }>
  ) {}
}

// Mock ECharts - 完整模拟
const mockChartInstance = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  getOption: vi.fn(() => ({})),
  clear: vi.fn(),
}

const echartsMock = {
  init: vi.fn(() => mockChartInstance),
  graphic: {
    LinearGradient: MockLinearGradient,
    RadialGradient: vi.fn(),
    Linear: vi.fn(),
    Ring: vi.fn(),
    Rect: vi.fn(),
    Circle: vi.fn(),
    Path: vi.fn(),
    Image: vi.fn(),
    Text: vi.fn(),
    Group: vi.fn(),
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
  dispose: vi.fn(),
  getInstanceByDom: vi.fn(),
  registerTheme: vi.fn(),
  registerMap: vi.fn(),
  registerAction: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  util: {
    each: vi.fn(),
    map: vi.fn(),
    filter: vi.fn(),
    indexOf: vi.fn(),
    inherits: vi.fn(),
    reduce: vi.fn(),
    bind: vi.fn(),
    curry: vi.fn(),
    isArray: vi.fn(),
    isString: vi.fn(),
    isObject: vi.fn(),
    isNumber: vi.fn(),
    isFunction: vi.fn(),
    extend: vi.fn(),
    defaults: vi.fn(),
    clone: vi.fn(),
    merge: vi.fn(),
  },
}

vi.mock('echarts', () => ({
  default: echartsMock,
  ...echartsMock,
}))

// Mock fetch
const originalFetch = global.fetch
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Export mock WebSocket for use in tests
export { MockWebSocket, mockChartInstance, echartsMock }
