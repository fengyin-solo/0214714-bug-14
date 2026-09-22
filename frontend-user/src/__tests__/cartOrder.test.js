/**
 * 购物车/订单/任务联动测试
 *
 * 覆盖：
 * - 购物车快速加减、库存钳制、按 id 移除/批量移除、持久化、接口数据校正
 * - 空购物车下单、库存不足、重复支付幂等、连续下单订单号唯一
 * - 订单接口结果与任务中心记录对应同一批商品、同一金额
 * - 取消订单保留记录、已支付任务不可重复支付
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { api, __resetMockState } from '../utils/api'
import { cartStore } from '../utils/cartStore'
import { taskStore } from '../utils/taskStore'

function makeProduct(overrides = {}) {
  return {
    id: 1001,
    name: '测试球杆',
    brand: 'Test',
    price: 100,
    icon: '🏏',
    stock: 5,
    ...overrides
  }
}

describe('Cart Store', () => {
  beforeEach(() => {
    localStorage.clear()
    cartStore.clear()
  })

  it('合并同款商品并正确累加数量与金额', () => {
    const p = makeProduct()
    cartStore.add(p, 2)
    cartStore.add(p, 1)

    expect(cartStore.items).toHaveLength(1)
    expect(cartStore.items[0].qty).toBe(3)
    expect(cartStore.count).toBe(3)
    expect(cartStore.totalAmount).toBe(300)
  })

  it('快速加减时数量始终被钳制在库存范围内', () => {
    const p = makeProduct({ stock: 3 })
    cartStore.add(p, 2)

    for (let i = 0; i < 10; i++) cartStore.increase(p.id)
    expect(cartStore.items[0].qty).toBe(3)

    for (let i = 0; i < 10; i++) cartStore.decrease(p.id)
    expect(cartStore.items[0].qty).toBe(1)

    // 已达到库存上限后继续加入应被拒绝
    cartStore.setQty(p.id, 3)
    const r = cartStore.add(p, 99)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('stock')
    expect(cartStore.items[0].qty).toBe(3)
  })

  it('按商品 id 移除单条与批量移除不会错位', () => {
    cartStore.add(makeProduct({ id: 1, name: 'A' }), 1)
    cartStore.add(makeProduct({ id: 2, name: 'B' }), 1)
    cartStore.add(makeProduct({ id: 3, name: 'C' }), 1)

    cartStore.remove(2)
    expect(cartStore.items.map(i => i.id)).toEqual([1, 3])

    cartStore.removeMany([1, 3])
    expect(cartStore.items).toHaveLength(0)
  })

  it('持久化到 localStorage，重新读取后数量金额一致', () => {
    cartStore.add(makeProduct({ id: 9, stock: 8 }), 4)

    const stored = JSON.parse(localStorage.getItem('billiard_cart_v1'))
    expect(stored).toHaveLength(1)
    expect(stored[0].qty).toBe(4)
    expect(stored[0].price).toBe(100)
  })

  it('reconcile 按接口最新数据修正价格、库存并剔除售罄/下架商品', () => {
    cartStore.add(makeProduct({ id: 1, stock: 10, price: 100 }), 8)
    cartStore.add(makeProduct({ id: 2, stock: 10, price: 50 }), 2)

    const changed = cartStore.reconcile([
      { id: 1, name: '测试球杆', brand: 'Test', icon: '🏏', price: 90, stock: 3 },
      { id: 2, name: '已售罄', brand: 'Test', icon: '🏏', price: 50, stock: 0 }
    ])
    expect(changed).toBe(true)

    const ids = cartStore.items.map(i => i.id)
    expect(ids).toEqual([1])
    expect(cartStore.items[0].qty).toBe(3)
    expect(cartStore.items[0].price).toBe(90)
  })

  it('空购物车数量与金额为 0', () => {
    expect(cartStore.isEmpty).toBe(true)
    expect(cartStore.count).toBe(0)
    expect(cartStore.totalAmount).toBe(0)
  })
})

describe('Orders API', () => {
  beforeEach(() => {
    localStorage.clear()
    taskStore.clearAll()
    __resetMockState()
  })

  it('空购物车无法创建订单', async () => {
    const result = await api.createOrder({
      requestId: 'REQ-empty',
      items: []
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('购物车')
  })

  it('以接口主数据计算商品快照与金额，不使用页面传入的价格/数量', async () => {
    const result = await api.createOrder({
      requestId: 'REQ-1',
      // 故意传入错误价格，接口应以主数据为准
      items: [{ id: 5, qty: 3, price: 1 }]
    })

    expect(result.success).toBe(true)
    const order = result.data
    expect(order.orderNo).toMatch(/^SP\d+$/)
    expect(order.items).toHaveLength(1)
    expect(order.items[0].name).toBe('Master专业巧克粉')
    expect(order.items[0].price).toBe(39)
    expect(order.items[0].qty).toBe(3)
    expect(order.amount).toBe(39 * 3)
    expect(order.status).toBe('paid')
  })

  it('多种商品下单后库存被扣减，超量下单返回库存不足', async () => {
    const ok = await api.createOrder({
      requestId: 'REQ-stock-1',
      items: [{ id: 5, qty: 5 }]
    })
    expect(ok.success).toBe(true)

    const over = await api.createOrder({
      requestId: 'REQ-stock-2',
      items: [{ id: 5, qty: 46 }] // 初始库存 50，剩 45
    })
    expect(over.success).toBe(false)
    expect(over.error).toContain('库存不足')

    // 库存不足时不应产生订单
    const list = await api.getOrders()
    expect(list.data).toHaveLength(1)
  })

  it('同一 requestId 重复支付只产生一笔订单（幂等）', async () => {
    const payload = {
      requestId: 'REQ-dup',
      items: [{ id: 7, qty: 2 }]
    }
    const first = await api.createOrder(payload)
    const second = await api.createOrder(payload)

    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(second.data.orderNo).toBe(first.data.orderNo)
    expect(second.data.amount).toBe(first.data.amount)

    const list = await api.getOrders()
    expect(list.data).toHaveLength(1)
  })

  it('快速连续下单生成互不相同的订单号', async () => {
    const results = await Promise.all(
      [1, 2, 3].map(n =>
        api.createOrder({ requestId: 'REQ-fast-' + n, items: [{ id: 5, qty: n }] })
      )
    )
    const orderNos = results.map(r => r.data.orderNo)
    expect(new Set(orderNos).size).toBe(3)
  })

  it('订单接口结果与任务中心记录对应同一批商品、同一金额', async () => {
    const result = await api.createOrder({
      requestId: 'REQ-link',
      items: [
        { id: 1, qty: 1 },
        { id: 5, qty: 2 }
      ]
    })
    expect(result.success).toBe(true)
    const order = result.data
    const expectedAmount = 2999 + 39 * 2

    expect(order.amount).toBe(expectedAmount)

    // 任务中心同源记录
    const task = taskStore.findByOrderNo(order.orderNo)
    expect(task).not.toBeNull()
    expect(task.type).toBe('order')
    expect(task.amount).toBe(expectedAmount)
    expect(task.extra.items.map(i => i.id).sort()).toEqual([1, 5])

    // GET /orders 与任务记录一致
    const list = await api.getOrders()
    const listed = list.data.find(o => o.orderNo === order.orderNo)
    expect(listed).toBeDefined()
    expect(listed.amount).toBe(expectedAmount)
    expect(listed.items.map(i => `${i.id}:${i.qty}`).sort()).toEqual(['1:1', '5:2'])
    expect(listed.status).toBe('paid')
  })

  it('未传 requestId 时由接口侧补全，订单仍可正常创建且不重复', async () => {
    const result = await api.createOrder({ items: [{ id: 5, qty: 1 }] })
    expect(result.success).toBe(true)
    expect(result.data.requestId).toMatch(/^REQ-SRV-/)
    expect(result.data.orderNo).toMatch(/^SP\d+$/)
  })
})

describe('Task Store - 取消与重复支付', () => {
  beforeEach(() => {
    localStorage.clear()
    taskStore.clearAll()
    __resetMockState()
  })

  it('取消订单保留记录并标记为已取消，可在已完成列表查到', () => {
    const order = taskStore.add({
      type: 'order',
      title: '测试订单',
      subtitle: '待付款',
      amount: 100,
      status: 'pending_payment',
      extra: { orderNo: 'SPTEST1', items: [] }
    })

    const cancelled = taskStore.cancelTask(order.id)
    expect(cancelled).not.toBeNull()
    expect(cancelled.status).toBe('cancelled')
    expect(taskStore.getById(order.id)).not.toBeNull()
    expect(taskStore.getByStatus('completed').map(t => t.id)).toContain(order.id)
    expect(taskStore.getByStatus('pending').map(t => t.id)).not.toContain(order.id)
  })

  it('已支付的任务再次支付不会产生重复状态变更', () => {
    const task = taskStore.add({
      type: 'order',
      title: '测试订单',
      subtitle: '待付款',
      amount: 100,
      status: 'pending_payment',
      extra: { orderNo: 'SPTEST2', items: [] }
    })

    const paid = taskStore.markAsPaid(task.id)
    expect(paid.status).toBe('pending_shipment')

    const again = taskStore.markAsPaid(task.id)
    expect(again.status).toBe('pending_shipment')
  })

  it('已完成的任务不能取消', () => {
    const task = taskStore.add({
      type: 'order',
      title: '测试订单',
      subtitle: '已完成',
      amount: 100,
      status: 'completed',
      extra: { orderNo: 'SPTEST3', items: [] }
    })
    expect(taskStore.cancelTask(task.id)).toBeNull()
  })
})
