/**
 * Shop 页面组件集成测试
 *
 * 验证：
 * - 商品库存/售罄态来自接口
 * - 快速加入购物车后数量与金额实时更新，持久化到全局 cartStore
 * - 移除多条商品后列表仍与底层数据一致（不错位）
 * - 空购物车时不显示去结算入口
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Shop from '../views/Shop.vue'
import { cartStore } from '../utils/cartStore'
import { taskStore } from '../utils/taskStore'
import { __resetMockState } from '../utils/api'

describe('Shop 页面集成', () => {
  beforeEach(() => {
    localStorage.clear()
    cartStore.clear()
    taskStore.clearAll()
    __resetMockState()
  })

  function mountShop() {
    return mount(Shop, {
      global: {
        // Modal/Toast/LoginModal 使用 Teleport，stub 掉避免渲染噪音
        stubs: { Modal: true, Toast: true, LoginModal: true }
      }
    })
  }

  it('挂载后从接口加载商品并展示库存，售罄商品有已售罄标记', async () => {
    const wrapper = mountShop()
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.findAll('.product-card')).toHaveLength(8)
    })

    const texts = wrapper.text()
    expect(texts).toContain('库存 50')
    expect(texts).toContain('已售罄')
  })

  it('快速加入后购物车角标数量与金额随全局 store 更新', async () => {
    const wrapper = mountShop()
    await flushPromises()

    // 商品 5：¥39，加入 1 件
    cartStore.add(wrapper.vm.products.find(p => p.id === 5), 1)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.cart-count').text()).toBe('1')
    expect(wrapper.find('.cart-total').text()).toBe('¥39')

    // 再加入 2 件
    cartStore.add(wrapper.vm.products.find(p => p.id === 5), 2)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.cart-count').text()).toBe('3')
    expect(wrapper.find('.cart-total').text()).toBe('¥117')
  })

  it('连续移除多条购物车商品后剩余条目正确', async () => {
    const wrapper = mountShop()
    await flushPromises()

    cartStore.add(wrapper.vm.products.find(p => p.id === 5), 1)
    cartStore.add(wrapper.vm.products.find(p => p.id === 6), 1)
    cartStore.add(wrapper.vm.products.find(p => p.id === 7), 1)
    await wrapper.vm.$nextTick()

    cartStore.removeMany([5, 7])
    await wrapper.vm.$nextTick()

    expect(cartStore.items.map(i => i.id)).toEqual([6])
    expect(wrapper.find('.cart-count').text()).toBe('1')
  })

  it('空购物车时不渲染悬浮购物车', async () => {
    const wrapper = mountShop()
    await flushPromises()
    expect(wrapper.find('.cart-float').exists()).toBe(false)
  })
})
