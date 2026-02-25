import { describe, it, expect } from 'vitest'
import { formatNumber, formatPct, formatDateTime, resolveSourceLabel } from '@/components/home/utils'

describe('formatNumber', () => {
  describe('正常数值测试', () => {
    it('应该正确格式化正数，默认保留2位小数', () => {
      expect(formatNumber(1234.5678)).toBe('1234.57')
    })

    it('应该正确格式化0', () => {
      expect(formatNumber(0)).toBe('0.00')
    })

    it('应该正确格式化负数', () => {
      expect(formatNumber(-100.5)).toBe('-100.50')
    })

    it('应该支持自定义小数位数', () => {
      expect(formatNumber(1234.5678, 4)).toBe('1234.5678')
      expect(formatNumber(1234.5, 0)).toBe('1235')
    })
  })

  describe('边界值测试', () => {
    it('null 应该返回 "—"', () => {
      expect(formatNumber(null)).toBe('—')
    })

    it('undefined 应该返回 "—"', () => {
      expect(formatNumber(undefined)).toBe('—')
    })

    it('NaN 应该返回 "—"', () => {
      expect(formatNumber(NaN)).toBe('—')
    })
  })
})

describe('formatPct', () => {
  it('应该正确格式化正百分比', () => {
    expect(formatPct(12.345)).toBe('12.35%')
  })

  it('应该正确格式化负百分比', () => {
    expect(formatPct(-5.67)).toBe('-5.67%')
  })

  it('应该正确格式化0', () => {
    expect(formatPct(0)).toBe('0.00%')
  })

  it('应该支持自定义小数位数', () => {
    expect(formatPct(12.345, 4)).toBe('12.3450%')
  })

  it('null 应该返回 "—"', () => {
    expect(formatPct(null)).toBe('—')
  })

  it('undefined 应该返回 "—"', () => {
    expect(formatPct(undefined)).toBe('—')
  })
})

describe('formatDateTime', () => {
  it('应该正确格式化日期时间', () => {
    // 使用固定日期测试
    const date = '2024-01-15T14:30:00'
    expect(formatDateTime(date)).toBe('01-15 14:30')
  })

  it('空字符串应该返回 "—"', () => {
    expect(formatDateTime('')).toBe('—')
  })

  it('null 应该返回 "—"', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('undefined 应该返回 "—"', () => {
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('无效日期应该返回原值', () => {
    expect(formatDateTime('invalid-date')).toBe('invalid-date')
  })
})

describe('resolveSourceLabel', () => {
  it('realtime 应该返回 "实时估值"', () => {
    expect(resolveSourceLabel('realtime')).toBe('实时估值')
  })

  it('official 应该返回 "官方涨跌"', () => {
    expect(resolveSourceLabel('official')).toBe('官方涨跌')
  })

  it('transition 应该返回 "官方更新中"', () => {
    expect(resolveSourceLabel('transition')).toBe('官方更新中')
  })

  it('holdings 应该返回 "持仓估算"', () => {
    expect(resolveSourceLabel('holdings')).toBe('持仓估算')
  })

  it('未知来源应该返回 "—"', () => {
    expect(resolveSourceLabel('unknown')).toBe('—')
  })

  it('null 应该返回 "—"', () => {
    expect(resolveSourceLabel(null)).toBe('—')
  })

  it('undefined 应该返回 "—"', () => {
    expect(resolveSourceLabel(undefined)).toBe('—')
  })

  it('休市模式应该返回 "休市沿用上一交易日"', () => {
    expect(resolveSourceLabel(null, true)).toBe('休市沿用上一交易日')
    expect(resolveSourceLabel('realtime', true)).toBe('休市沿用上一交易日')
  })
})
