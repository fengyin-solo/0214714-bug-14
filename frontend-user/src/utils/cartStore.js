/**
 * 购物车存储管理（全局单例）
 *
 * 功能说明：
 * - 跨页面共享同一份购物车数据（返回商城、刷新后数量/金额保持一致）
 * - 使用 localStorage 持久化
 * - 所有数量修改都以商品库存为上限进行钳制，避免快速加减时出现旧值/超卖
 * - 一律以商品 id 作为增删改的依据，避免按索引删除多条时错位
 */

import { reactive } from 'vue'

const STORAGE_KEY = 'billiard_cart_v1'

function safeStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage
  } catch (e) {
    // 隐私模式等场景下 localStorage 可能不可用
  }
  return null
}

/**
 * 读取时只保留结构合法的条目，防止脏数据导致金额/数量显示异常
 */
function sanitize(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      item =>
        item &&
        typeof item.id !== 'undefined' &&
        Number.isInteger(item.qty) &&
        item.qty > 0
    )
    .map(item => ({
      id: item.id,
      name: item.name || '',
      brand: item.brand || '',
      price: Number(item.price) || 0,
      icon: item.icon || '📦',
      qty: item.qty,
      stock: Number.isInteger(item.stock) ? item.stock : undefined
    }))
}

function load() {
  const storage = safeStorage()
  if (!storage) return []
  try {
    return sanitize(JSON.parse(storage.getItem(STORAGE_KEY) || '[]'))
  } catch (e) {
    return []
  }
}

function persist() {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state.items))
  } catch (e) {
    // 存储空间不足等情况忽略，本次内存中的修改仍然生效
  }
}

/**
 * 将目标数量钳制在 [1, stock] 区间
 */
function clampQty(holder, qty) {
  let next = Math.floor(qty)
  if (!Number.isFinite(next) || next < 1) next = 1
  const stock = holder ? holder.stock : undefined
  if (Number.isInteger(stock) && next > stock) next = stock
  return next
}

const state = reactive({ items: load() })

export const cartStore = {
  /** 购物车条目（响应式，模板与计算属性直接依赖） */
  get items() {
    return state.items
  },

  /** 商品总件数（按数量累加） */
  get count() {
    return state.items.reduce((sum, item) => sum + item.qty, 0)
  },

  /** 购物车总金额 */
  get totalAmount() {
    return state.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  },

  get isEmpty() {
    return state.items.length === 0
  },

  find(id) {
    return state.items.find(item => item.id === id) || null
  },

  qtyOf(id) {
    return this.find(id)?.qty || 0
  },

  /**
   * 加入购物车（同款商品合并数量）
   * @returns {{ok: boolean, reason?: string, qty?: number, max?: number}}
   */
  add(product, qty = 1) {
    const addQty = Math.floor(qty)
    if (!product || !Number.isFinite(addQty) || addQty <= 0) {
      return { ok: false, reason: 'invalid' }
    }

    const existing = state.items.find(item => item.id === product.id)
    const baseQty = existing ? existing.qty : 0
    const nextQty = clampQty(product, baseQty + addQty)

    if (nextQty <= baseQty) {
      return { ok: false, reason: 'stock', max: product.stock }
    }

    if (existing) {
      existing.qty = nextQty
    } else {
      state.items.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        icon: product.icon,
        qty: nextQty,
        stock: Number.isInteger(product.stock) ? product.stock : undefined
      })
    }
    persist()
    return { ok: true, qty: nextQty }
  },

  /** 直接设置某商品数量（自动钳制库存与最小值） */
  setQty(id, qty) {
    const item = state.items.find(entry => entry.id === id)
    if (!item) return
    item.qty = clampQty(item, qty)
    persist()
  },

  increase(id) {
    const item = state.items.find(entry => entry.id === id)
    if (!item) return
    this.setQty(id, item.qty + 1)
  },

  decrease(id) {
    const item = state.items.find(entry => entry.id === id)
    if (!item || item.qty <= 1) return
    this.setQty(id, item.qty - 1)
  },

  /** 按商品 id 移除单条 */
  remove(id) {
    const index = state.items.findIndex(item => item.id === id)
    if (index === -1) return false
    state.items.splice(index, 1)
    persist()
    return true
  },

  /** 按 id 批量移除（一次重排，避免连续按索引 splice 造成错位） */
  removeMany(ids) {
    const idSet = new Set(ids)
    const kept = state.items.filter(item => !idSet.has(item.id))
    state.items.splice(0, state.items.length, ...kept)
    persist()
  },

  clear() {
    state.items.splice(0, state.items.length)
    persist()
  },

  /**
   * 用接口返回的最新商品数据校正购物车：
   * 同步价格/名称/库存，剔除下架与售罄商品，把超出最新库存的数量压回库存上限
   * @returns {boolean} 是否发生了校正
   */
  reconcile(products) {
    let changed = false
    const catalog = products || []
    const validItems = []

    for (const item of state.items) {
      const product = catalog.find(p => p.id === item.id)
      // 商品已下架或最新库存为 0：从购物车移除
      if (!product || product.stock <= 0) {
        changed = true
        continue
      }

      const normalized = { ...item }
      if (normalized.name !== product.name) { normalized.name = product.name; changed = true }
      if (normalized.brand !== product.brand) { normalized.brand = product.brand; changed = true }
      if (normalized.icon !== product.icon) { normalized.icon = product.icon; changed = true }
      if (normalized.price !== product.price) { normalized.price = product.price; changed = true }
      if (Number.isInteger(product.stock) && normalized.stock !== product.stock) {
        normalized.stock = product.stock
        changed = true
      }
      if (Number.isInteger(product.stock) && normalized.qty > product.stock) {
        normalized.qty = Math.max(1, product.stock)
        changed = true
      }
      validItems.push(normalized)
    }

    if (validItems.length !== state.items.length) changed = true
    if (changed) {
      state.items.splice(0, state.items.length, ...validItems)
      persist()
    }
    return changed
  }
}

export default cartStore
