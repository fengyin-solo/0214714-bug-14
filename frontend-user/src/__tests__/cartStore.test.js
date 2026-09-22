/**
 * 购物车存储单元测试
 *
 * 覆盖：
 * - 快速加减时的库存收敛
 * - 批量移除多条商品（按下标错位问题回归）
 * - 持久化（刷新恢复）
 * - 金额始终用商品主数据重算，不出现旧值
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import cartStore from '../utils/cartStore'
import { PRODUCT_MAP } from '../utils/products'

describe('Cart Store', () => {
  beforeEach(() => {
    localStorage.clear()
    cartStore.clear()
  })

  it('adds a new product line', () => {
    cartStore.add(1, 2)
    expect(cartStore.getKindCount()).toBe(1)
    expect(cartStore.getCount()).toBe(2)
  })

  it('merges quantity for the same product', () => {
    cartStore.add(1, 1)
    cartStore.add(1, 2)
    const line = cartStore.getLines().find(i => i.id === 1)
    expect(line.qty).toBe(3)
  })

  it('clamps quick increments to stock limit', () => {
    const stock = PRODUCT_MAP.get(1).stock
    cartStore.add(1, 1)
    for (let i = 0; i < stock + 10; i++) {
      cartStore.increase(1)
    }
    const line = cartStore.getLines().find(i => i.id === 1)
    expect(line.qty).toBe(stock)
  })

  it('never allows qty below 1 while line exists', () => {
    cartStore.add(5, 1)
    cartStore.decrease(5) // 1 -> remove
    expect(cartStore.getKindCount()).toBe(0)
    cartStore.add(5, 2)
    cartStore.decrease(5) // 2 -> 1
    const line = cartStore.getLines().find(i => i.id === 5)
    expect(line.qty).toBe(1)
  })

  it('removes by product id without shifting other lines', () => {
    cartStore.add(1, 1)
    cartStore.add(2, 1)
    cartStore.add(3, 1)
    cartStore.remove(2)
    const ids = cartStore.getLines().map(i => i.id)
    expect(ids).toEqual([1, 3])
  })

  it('removes many products in one batch operation', () => {
    cartStore.add(1, 1)
    cartStore.add(2, 2)
    cartStore.add(3, 3)
    cartStore.add(4, 1)
    cartStore.removeMany([1, 3])
    const ids = cartStore.getLines().map(i => i.id)
    expect(ids).toEqual([2, 4])
    // 未被移除的行数量保持不变（无索引错位）
    expect(cartStore.getLines().find(i => i.id === 2).qty).toBe(2)
    expect(cartStore.getLines().find(i => i.id === 4).qty).toBe(1)
  })

  it('calculates total from master product prices', () => {
    cartStore.add(1, 2) // 2999 * 2
    cartStore.add(5, 3) // 39 * 3
    expect(cartStore.getTotal()).toBe(2999 * 2 + 39 * 3)
  })

  it('returns independent deep snapshot for checkout', () => {
    cartStore.add(1, 1)
    const snapshot = cartStore.snapshot()
    cartStore.setQty(1, 4)
    expect(snapshot[0].qty).toBe(1)
    expect(cartStore.getLines()[0].qty).toBe(4)
  })

  it('persists cart across reloads', () => {
    cartStore.add(1, 2)
    cartStore.add(5, 1)

    // 重新加载模块状态：直接读取 localStorage 并重建
    const saved = JSON.parse(localStorage.getItem('billiard_user_cart'))
    expect(saved).toEqual([
      { productId: 1, qty: 2 },
      { productId: 5, qty: 1 }
    ])
  })

  it('clamps persisted qty to current stock on reload', async () => {
    localStorage.setItem(
      'billiard_user_cart',
      JSON.stringify([{ productId: 1, qty: 99999 }, { productId: 999, qty: 2 }])
    )
    vi.resetModules()
    const { cartStore: freshStore } = await import('../utils/cartStore')
    const lines = freshStore.getLines()
    expect(lines.find(i => i.id === 1).qty).toBe(PRODUCT_MAP.get(1).stock)
    expect(lines.find(i => i.id === 999)).toBeUndefined()
  })
})
