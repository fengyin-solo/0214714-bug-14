/**
 * Shop 商城页面组件测试
 *
 * 覆盖：
 * - 空购物车不能进入/完成结算
 * - 支付加载中重复点击只产生一笔订单
 * - 支付成功后购物车、订单、任务三方对应同一批商品
 * - 支付中断后购物车保留，可重试
 * - 返回商城后购物车仍在（持久化）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import Shop from '../views/Shop.vue'
import { cartStore } from '../utils/cartStore'
import { taskStore } from '../utils/taskStore'
import { __resetMockState } from '../utils/api'
import { authState } from '../utils/auth'

// Modal/LoginModal/Toast 依赖 Teleport，浅化即可，重点测页面方法
const globalStubs = {
  Modal: {
    props: ['modelValue', 'loading', 'confirmDisabled'],
    emits: ['update:modelValue', 'confirm', 'cancel'],
    template: '<div v-if="modelValue" class="modal-stub"><button class="stub-confirm" :disabled="confirmDisabled || loading" @click="$emit(\'confirm\')">confirm</button><button class="stub-cancel" @click="$emit(\'cancel\')">cancel</button><slot /></div>'
  },
  Toast: { template: '<div />' },
  LoginModal: { template: '<div />' }
}

function mountShop() {
  const wrapper = mount(Shop, {
    global: {
      stubs: globalStubs,
      mocks: {
        $router: { push: vi.fn(), replace: vi.fn() },
        $route: { path: '/shop', query: {} }
      }
    }
  })
  return wrapper
}

describe('Shop page cart & checkout', () => {
  beforeEach(() => {
    localStorage.clear()
    cartStore.clear()
    taskStore.clearAll()
    __resetMockState()
    authState.isLoggedIn = true
    authState.token = 'mock_token'
    vi.useRealTimers()
  })

  it('blocks checkout when cart is empty', async () => {
    const wrapper = mountShop()
    expect(wrapper.vm.cartItems).toHaveLength(0)

    // 直接调用结算（模拟空购物车点击去结算）
    wrapper.vm.checkout()
    expect(wrapper.vm.showCheckoutModal).toBe(false)
  })

  it('prevents duplicate orders on rapid confirm clicks', async () => {
    cartStore.add(1, 1)
    const wrapper = mountShop()
    wrapper.vm.checkout()
    expect(wrapper.vm.showCheckoutModal).toBe(true)

    // 快速连续点击确认支付
    const p1 = wrapper.vm.confirmCheckout()
    // 加载中再次点击（模拟重复支付）
    wrapper.vm.confirmCheckout()
    await p1
    await flushPromises()

    const orders = taskStore.getOrders()
    expect(orders).toHaveLength(1)
    expect(wrapper.vm.orderResult.orderNo).toMatch(/^SP\d+$/)
  })

  it('keeps cart, order result and task record consistent after payment', async () => {
    cartStore.add(1, 1)
    cartStore.add(5, 2)
    const wrapper = mountShop()
    wrapper.vm.checkout()
    await wrapper.vm.confirmCheckout()
    await flushPromises()

    // 购物车已清空（本批商品移除）
    expect(cartStore.isEmpty()).toBe(true)

    const order = wrapper.vm.orderResult
    expect(order.items).toHaveLength(2)
    expect(order.amount).toBe(2999 + 39 * 2)

    // 页面订单列表与任务中心为同一订单
    expect(wrapper.vm.orders).toHaveLength(1)
    expect(wrapper.vm.orders[0].orderNo).toBe(order.orderNo)
    const task = taskStore.getOrderTask(order.orderNo)
    expect(task).toBeTruthy()
    expect(task.extra.items.map(i => i.id).sort()).toEqual(order.items.map(i => i.id).sort())
  })

  it('snapshot is fixed during payment: cart changes do not affect the order', async () => {
    cartStore.add(5, 1)
    const wrapper = mountShop()
    wrapper.vm.checkout()

    // 支付进行期间，用户在其它入口快速加购同商品
    cartStore.add(5, 3)
    await wrapper.vm.confirmCheckout()
    await flushPromises()

    // 订单只包含结算快照中的 1 件；后加入的 3 件保留在购物车
    expect(wrapper.vm.orderResult.items[0].qty).toBe(1)
    const line = cartStore.getLines().find(i => i.id === 5)
    expect(line).toBeTruthy()
    expect(line.qty).toBe(3)
  })

  it('keeps cart when payment is interrupted/cancelled', async () => {
    cartStore.add(1, 1)
    const wrapper = mountShop()
    wrapper.vm.checkout()

    // 用户在支付弹窗点取消（支付中断）
    wrapper.vm.onCheckoutCancel()
    await nextTick()

    expect(cartStore.getCount()).toBe(1)
    expect(taskStore.getOrders()).toHaveLength(0)
    expect(wrapper.vm.showCheckoutModal).toBe(false)
  })

  it('cart survives leaving shop and coming back (persistence)', async () => {
    cartStore.add(3, 2)

    const wrapperA = mountShop()
    expect(wrapperA.vm.cartItemCount).toBe(2)

    // 模拟离开页面后重新进入（组件重建）
    wrapperA.unmount()
    const wrapperB = mountShop()
    expect(wrapperB.vm.cartItemCount).toBe(2)
    expect(wrapperB.vm.cartTotal).toBe(1299 * 2)
  })

  it('buy now does not overwrite the persisted cart', async () => {
    cartStore.add(3, 1)
    const wrapper = mountShop()

    wrapper.vm.openProductDetail(wrapper.vm.products.find(p => p.id === 1))
    wrapper.vm.quantity = 1
    wrapper.vm.buyNow()
    await wrapper.vm.confirmCheckout()
    await flushPromises()

    // 立即购买只结算球杆；购物车中的球仍在
    const line = cartStore.getLines().find(i => i.id === 3)
    expect(line).toBeTruthy()
    expect(line.qty).toBe(1)
    // 订单只含球杆 1 件
    expect(wrapper.vm.orderResult.items).toHaveLength(1)
    expect(wrapper.vm.orderResult.items[0].id).toBe(1)
  })

  it('cancelling an order keeps the record in the orders list', async () => {
    cartStore.add(1, 1)
    const wrapper = mountShop()
    wrapper.vm.checkout()
    await wrapper.vm.confirmCheckout()
    await flushPromises()

    const orderNo = wrapper.vm.orderResult.orderNo
    // 模拟任务中心取消订单
    const taskId = taskStore.getOrderTask(orderNo).id
    taskStore.cancelTask(taskId)

    await wrapper.vm.refreshOrders()
    const order = wrapper.vm.orders.find(o => o.orderNo === orderNo)
    expect(order).toBeTruthy()
    expect(order.status).toBe('cancelled')
  })
})
