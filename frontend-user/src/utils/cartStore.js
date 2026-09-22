/**
 * 购物车存储管理
 *
 * - 使用 localStorage 持久化：刷新页面、离开商城再返回后购物车不丢失
 * - 全局单例 + reactive：跨页面/跨组件联动，数量与金额始终取最新值
 * - 只保存 { productId, qty }，渲染时用商品主数据 PRODUCT_MAP 拼装，
 *   保证价格、名称、库存与接口侧一致，不出现旧值
 */

import { reactive } from 'vue'
import { PRODUCT_MAP } from './products'

const STORAGE_KEY = 'billiard_user_cart'

const logger = {
  info: (...args) => console.log('[cartStore]', ...args),
  warn: (...args) => console.warn('[cartStore]', ...args),
  error: (...args) => console.error('[cartStore]', ...args)
}

/**
 * 限制数量到 [1, stock] 区间
 */
function clampQty(qty, stock) {
  const max = Number.isFinite(stock) && stock > 0 ? stock : Number.MAX_SAFE_INTEGER
  return Math.min(Math.max(1, Math.floor(qty) || 1), max)
}

function loadCart() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const raw = stored ? JSON.parse(stored) : []
    if (!Array.isArray(raw)) return []
    // 过滤已下架商品并按库存收敛数量
    return raw
      .filter(item => item && PRODUCT_MAP.has(item.productId))
      .map(item => ({
        productId: item.productId,
        qty: clampQty(item.qty, PRODUCT_MAP.get(item.productId).stock)
      }))
  } catch (e) {
    logger.error('加载购物车失败', e)
    return []
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    logger.error('保存购物车失败', e)
  }
}

const state = reactive({
  items: loadCart()
})

function persist() {
  saveCart(state.items)
}

export const cartStore = {
  /**
   * 购物车行数据（附带最新商品信息），供模板渲染
   */
  getLines() {
    return state.items
      .map(line => {
        const product = PRODUCT_MAP.get(line.productId)
        if (!product) return null
        return { ...product, qty: clampQty(line.qty, product.stock) }
      })
      .filter(Boolean)
  },

  /** 商品种类数（购物车角标） */
  getKindCount() {
    return state.items.length
  },

  /** 商品总件数 */
  getCount() {
    return this.getLines().reduce((sum, line) => sum + line.qty, 0)
  },

  /** 合计金额（始终用主数据最新价格计算） */
  getTotal() {
    return this.getLines().reduce((sum, line) => sum + line.price * line.qty, 0)
  },

  /** 下单快照：深拷贝行数据，杜绝后续加减影响已生成的订单 */
  snapshot() {
    return JSON.parse(JSON.stringify(this.getLines()))
  },

  isEmpty() {
    return state.items.length === 0
  },

  /**
   * 加入购物车，超出库存时收敛到库存上限
   * @returns {{ok: boolean, qty: number, stock: number}}
   */
  add(productId, qty = 1) {
    const product = PRODUCT_MAP.get(productId)
    if (!product) {
      logger.warn('商品不存在', productId)
      return { ok: false, qty: 0, stock: 0 }
    }
    const existing = state.items.find(i => i.productId === productId)
    if (existing) {
      existing.qty = clampQty(existing.qty + qty, product.stock)
    } else {
      state.items.push({ productId, qty: clampQty(qty, product.stock) })
    }
    persist()
    const current = state.items.find(i => i.productId === productId)
    return { ok: true, qty: current ? current.qty : 0, stock: product.stock }
  },

  /** 直接设置某商品数量（购物车内快速加减） */
  setQty(productId, qty) {
    const product = PRODUCT_MAP.get(productId)
    if (!product) return
    const existing = state.items.find(i => i.productId === productId)
    if (!existing) return
    existing.qty = clampQty(qty, product.stock)
    persist()
  },

  increase(productId) {
    const line = state.items.find(i => i.productId === productId)
    if (line) this.setQty(productId, line.qty + 1)
  },

  decrease(productId) {
    const line = state.items.find(i => i.productId === productId)
    if (!line) return
    if (line.qty <= 1) {
      this.remove(productId)
    } else {
      this.setQty(productId, line.qty - 1)
    }
  },

  /** 按商品 id 移除（避免用数组下标 splice 造成的错位） */
  remove(productId) {
    const index = state.items.findIndex(i => i.productId === productId)
    if (index !== -1) {
      state.items.splice(index, 1)
      persist()
    }
  },

  /** 批量移除多条商品 */
  removeMany(productIds = []) {
    const idSet = new Set(productIds)
    const next = state.items.filter(i => !idSet.has(i.productId))
    state.items.splice(0, state.items.length, ...next)
    persist()
  },

  /**
   * 按下单结果扣减购物车数量：行剩余数量 > 0 时保留，
   * 支付期间加入的数量不会被一起清掉
   * @param {Array<{id: number, qty: number}>} purchased
   */
  deductPurchased(purchased = []) {
    for (const bought of purchased) {
      const line = state.items.find(i => i.productId === bought.id)
      if (!line) continue
      line.qty -= bought.qty
      if (line.qty <= 0) {
        const index = state.items.findIndex(i => i.productId === bought.id)
        if (index !== -1) state.items.splice(index, 1)
      }
    }
    persist()
  },

  clear() {
    state.items.splice(0, state.items.length)
    persist()
  }
}

export default cartStore
