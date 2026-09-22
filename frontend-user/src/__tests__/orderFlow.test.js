/**
 * 订单接口与任务记录一致性测试
 *
 * 覆盖：
 * - 空购物车不能下单
 * - 数量/库存校验
 * - 金额由接口重算，订单结果与任务记录是同一批商品
 * - 重复支付幂等：不产生重复订单、不重复扣库存
 * - 订单列表接口与任务中心同源
 * - 取消订单保留记录并返还库存
 * - 刷新后订单仍可从任务中心恢复
 * - 任务支付守卫（重复支付/支付中断后继续支付）
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { api, __resetMockState } from '../utils/api'
import taskStore from '../utils/taskStore'
import { PRODUCT_MAP } from '../utils/products'

describe('Order API & Task consistency', () => {
  beforeEach(() => {
    localStorage.clear()
    taskStore.clearAll()
    __resetMockState()
  })

  it('rejects order with empty items', async () => {
    const result = await api.createOrder({ clientOrderId: 'c1', items: [] })
    expect(result.success).toBe(false)
    expect(result.error).toContain('购物车为空')
  })

  it('rejects order exceeding stock', async () => {
    const stock = PRODUCT_MAP.get(1).stock
    const result = await api.createOrder({
      clientOrderId: 'c2',
      items: [{ productId: 1, quantity: stock + 1 }]
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('库存不足')
  })

  it('rejects invalid quantity and unknown product', async () => {
    const badQty = await api.createOrder({
      clientOrderId: 'c3',
      items: [{ productId: 1, quantity: 0 }]
    })
    expect(badQty.success).toBe(false)
    expect(badQty.error).toContain('数量')

    const unknown = await api.createOrder({
      clientOrderId: 'c4',
      items: [{ productId: 404, quantity: 1 }]
    })
    expect(unknown.success).toBe(false)
    expect(unknown.error).toContain('不存在')
  })

  it('recalculates amount server-side and deducts stock', async () => {
    const result = await api.createOrder({
      clientOrderId: 'c5',
      items: [{ productId: 1, quantity: 2 }],
      amount: 1 // 故意传错金额，应被服务端重算覆盖
    })
    expect(result.success).toBe(true)
    expect(result.data.amount).toBe(2999 * 2)
    expect(result.data.status).toBe('paid')
    expect(result.data.orderNo).toMatch(/^SP\d+$/)
  })

  it('keeps cart, order result and task record on the same products', async () => {
    const items = [
      { productId: 1, quantity: 1 },
      { productId: 5, quantity: 3 }
    ]
    const result = await api.createOrder({ clientOrderId: 'c6', items })
    expect(result.success).toBe(true)

    const order = result.data
    const task = taskStore.getOrderTask(order.orderNo)
    expect(task).not.toBeNull()
    expect(task.type).toBe('order')
    expect(task.amount).toBe(order.amount)

    // 商品条目一一对应
    expect(task.extra.items).toHaveLength(2)
    const orderIds = order.items.map(i => i.id).sort()
    const taskIds = task.extra.items.map(i => i.id).sort()
    expect(orderIds).toEqual(taskIds)

    // 数量一致
    for (const item of order.items) {
      const taskItem = task.extra.items.find(i => i.id === item.id)
      expect(taskItem.qty).toBe(item.qty)
    }

    // 订单列表接口返回同一批数据
    const list = await api.getOrders()
    expect(list.success).toBe(true)
    expect(list.data).toHaveLength(1)
    expect(list.data[0].orderNo).toBe(order.orderNo)
    expect(list.data[0].items).toHaveLength(2)
  })

  it('is idempotent for duplicate payments with same clientOrderId', async () => {
    const payload = { clientOrderId: 'dup-1', items: [{ productId: 3, quantity: 1 }] }
    const first = await api.createOrder(payload)
    const second = await api.createOrder(payload)

    expect(first.data.orderNo).toBe(second.data.orderNo)
    const orders = taskStore.getOrders()
    expect(orders).toHaveLength(1)
  })

  it('merges duplicate product lines in one order', async () => {
    const result = await api.createOrder({
      clientOrderId: 'c7',
      items: [
        { productId: 5, quantity: 1 },
        { id: 5, qty: 2 } // 兼容 {id, qty} 格式
      ]
    })
    expect(result.success).toBe(true)
    expect(result.data.items).toHaveLength(1)
    expect(result.data.items[0].qty).toBe(3)
    expect(result.data.amount).toBe(39 * 3)
  })

  it('cancelling order keeps the record as cancelled and restores stock', async () => {
    const stockBefore = PRODUCT_MAP.get(1).stock
    const created = await api.createOrder({
      clientOrderId: 'c8',
      items: [{ productId: 1, quantity: 2 }]
    })
    const orderNo = created.data.orderNo
    const taskId = taskStore.getOrderTask(orderNo).id

    // 再下一单同商品 2 件：库存已减少
    const afterFirst = await api.createOrder({
      clientOrderId: 'c9',
      items: [{ productId: 1, quantity: stockBefore - 1 }] // 超过剩余库存
    })
    expect(afterFirst.success).toBe(false)

    const cancel = await api.doTaskAction({ taskId, action: 'cancel' })
    expect(cancel.success).toBe(true)

    const cancelledTask = taskStore.getById(taskId)
    expect(cancelledTask.status).toBe('cancelled')

    // 记录没有被删除，仍可在订单接口查到（状态为已取消）
    const list = await api.getOrders()
    const cancelledOrder = list.data.find(o => o.orderNo === orderNo)
    expect(cancelledOrder).toBeDefined()
    expect(cancelledOrder.status).toBe('cancelled')

    // 库存返还后同样数量可以再下单
    const retry = await api.createOrder({
      clientOrderId: 'c10',
      items: [{ productId: 1, quantity: stockBefore - 1 }]
    })
    expect(retry.success).toBe(true)
  })

  it('survives refresh: orders are restored from task storage', async () => {
    const created = await api.createOrder({
      clientOrderId: 'c11',
      items: [{ productId: 6, quantity: 2 }]
    })
    const orderNo = created.data.orderNo

    // 模拟刷新：localStorage 中任务仍在
    const stored = JSON.parse(localStorage.getItem('billiard_user_tasks'))
    expect(stored.some(t => t.extra?.orderNo === orderNo)).toBe(true)

    const list = await api.getOrders()
    expect(list.data.some(o => o.orderNo === orderNo)).toBe(true)
  })
})

describe('Task payment guards', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('refuses to pay a non-pending task (no duplicate payment)', () => {
    const task = taskStore.add({
      type: 'order',
      title: '测试订单',
      amount: 100,
      status: 'pending_shipment',
      extra: { orderNo: 'SPTEST1', items: [] }
    })
    const result = taskStore.markAsPaid(task.id)
    expect(result).toBeNull()
  })

  it('allows continuing payment after interruption (still pending_payment)', () => {
    const task = taskStore.add({
      type: 'order',
      title: '待付款订单',
      amount: 200,
      status: 'pending_payment',
      extra: { orderNo: 'SPTEST2', items: [] }
    })
    // 用户关闭支付弹窗（中断），状态不变；再次支付成功
    expect(taskStore.getById(task.id).status).toBe('pending_payment')
    const paid = taskStore.markAsPaid(task.id)
    expect(paid.status).toBe('pending_shipment')
    // 二次支付被拦截
    expect(taskStore.markAsPaid(task.id)).toBeNull()
  })

  it('upserts order task by orderNo (idempotent addOrderTask)', () => {
    const order = {
      orderNo: 'SPUPSERT',
      amount: 39,
      items: [{ id: 5, name: '巧克粉', price: 39, qty: 1 }],
      createTime: '2026-09-22 10:00'
    }
    taskStore.addOrderTask(order)
    taskStore.addOrderTask(order)
    const matches = taskStore.getOrders().filter(t => t.extra.orderNo === 'SPUPSERT')
    expect(matches).toHaveLength(1)
  })

  it('keeps cancelled orders visible in completed list', () => {
    const task = taskStore.add({
      type: 'order',
      title: '待取消订单',
      amount: 10,
      status: 'pending_payment',
      extra: { orderNo: 'SPCANCEL', items: [] }
    })
    taskStore.cancelTask(task.id)
    const completed = taskStore.getByStatus('completed')
    expect(completed.some(t => t.id === task.id)).toBe(true)
    expect(taskStore.getByStatus('pending').some(t => t.id === task.id)).toBe(false)
  })
})
