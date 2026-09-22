<template>
  <div class="shop-page">
    <header class="page-header">
      <div class="header-content">
        <span class="page-tag">正品保障</span>
        <h1>装备商城</h1>
        <p>精选台球装备，品质保证，助您提升球技</p>
      </div>
    </header>

    <div class="shop-layout">
      <aside class="sidebar">
        <h3 class="section-title">商品分类</h3>
        <div class="category-section">
          <div class="category-list">
            <button 
              v-for="cat in categories" 
              :key="cat.id"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              <span class="cat-icon">{{ cat.icon }}</span>
              <span class="cat-name">{{ cat.name }}</span>
              <span class="cat-count">{{ getCategoryCount(cat.id) }}</span>
            </button>
          </div>
        </div>
      </aside>

      <main class="main-content">
        <div class="content-header">
          <div class="result-count">共 <span>{{ filteredProducts.length }}</span> 件商品</div>
          <select v-model="sortBy" class="sort-select">
            <option value="default">默认排序</option>
            <option value="price-asc">价格从低到高</option>
            <option value="price-desc">价格从高到低</option>
          </select>
        </div>

        <div class="products-grid">
          <div v-for="product in sortedProducts" :key="product.id" class="product-card" :class="{ 'sold-out': product.stock <= 0 }" @click="openProductDetail(product)">
            <div class="product-image">
              <div class="image-placeholder">{{ product.icon }}</div>
              <div class="product-badges">
                <span v-if="product.stock <= 0" class="badge out">已售罄</span>
                <span v-if="product.hot" class="badge hot">热销</span>
                <span v-if="product.new" class="badge new">新品</span>
              </div>
              <button
                v-if="product.stock > 0"
                class="quick-add"
                @click.stop="quickAddToCart(product)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
            <div class="product-info">
              <span class="product-brand">{{ product.brand }}</span>
              <h3>{{ product.name }}</h3>
              <p class="product-desc">{{ product.description }}</p>
              <div class="product-footer">
                <div class="price-info">
                  <span class="current-price">¥{{ product.price }}</span>
                  <span v-if="product.originalPrice" class="original-price">¥{{ product.originalPrice }}</span>
                </div>
                <span class="sales">{{ product.stock > 0 ? `库存 ${product.stock}` : '已售罄' }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Cart Float -->
    <div v-if="cartItems.length > 0" class="cart-float" @click="openCartModal">
      <div class="cart-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <span class="cart-count">{{ cartCount }}</span>
      </div>
      <div class="cart-total">¥{{ cartTotal }}</div>
    </div>

    <!-- Product Detail Modal -->
    <Modal v-model="showDetailModal" size="large" :show-footer="false">
      <div v-if="selectedProduct" class="product-detail">
        <div class="detail-image">
          <div class="detail-icon">{{ selectedProduct.icon }}</div>
        </div>
        <div class="detail-info">
          <span class="detail-brand">{{ selectedProduct.brand }}</span>
          <h2>{{ selectedProduct.name }}</h2>
          <p class="detail-desc">{{ selectedProduct.description }}</p>
          <div class="detail-specs">
            <div class="spec-item"><span class="label">分类</span><span class="value">{{ getCategoryName(selectedProduct.category) }}</span></div>
            <div class="spec-item"><span class="label">销量</span><span class="value">{{ selectedProduct.sales }}件</span></div>
            <div class="spec-item"><span class="label">库存</span><span class="value" :class="{ 'stock-out': selectedProduct.stock <= 0 }">{{ selectedProduct.stock > 0 ? selectedProduct.stock + '件' : '已售罄' }}</span></div>
          </div>
          <div class="detail-price">
            <span class="current">¥{{ selectedProduct.price }}</span>
            <span v-if="selectedProduct.originalPrice" class="original">¥{{ selectedProduct.originalPrice }}</span>
          </div>
          <div v-if="selectedProduct.stock > 0" class="quantity-selector">
            <span class="qty-label">数量</span>
            <div class="qty-controls">
              <button :disabled="quantity <= 1" @click="changeDetailQty(-1)">-</button>
              <span>{{ quantity }}</span>
              <button :disabled="quantity >= selectedProduct.stock" @click="changeDetailQty(1)">+</button>
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn-add-cart" :disabled="selectedProduct.stock <= 0" @click="addToCartFromDetail">
              {{ selectedProduct.stock > 0 ? '加入购物车' : '已售罄' }}
            </button>
            <button class="btn-buy-now" :disabled="selectedProduct.stock <= 0" @click="buyNow">立即购买</button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Cart Modal -->
    <Modal v-model="showCartModal" title="购物车" size="medium" :show-footer="false">
      <div class="cart-content">
        <div v-if="cartItems.length > 0" class="cart-items">
          <div class="cart-toolbar">
            <span>共 {{ cartCount }} 件商品</span>
            <button class="btn-clear-cart" @click="clearCart">清空购物车</button>
          </div>
          <div v-for="item in cartItems" :key="item.id" class="cart-item">
            <div class="item-icon">{{ item.icon }}</div>
            <div class="item-info"><h4>{{ item.name }}</h4><span class="item-brand">{{ item.brand }} · 库存 {{ item.stock ?? '充足' }}</span></div>
            <div class="cart-qty-controls">
              <button :disabled="item.qty <= 1" @click="decreaseCartQty(item)">-</button>
              <span>{{ item.qty }}</span>
              <button :disabled="isCartQtyMax(item)" @click="increaseCartQty(item)">+</button>
            </div>
            <div class="item-price">¥{{ item.price * item.qty }}</div>
            <button class="remove-btn" title="移除" @click="removeFromCart(item.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div v-else class="cart-empty"><div class="empty-icon">🛒</div><p>购物车是空的</p><p class="empty-tip">去挑选心仪的装备吧</p></div>
        <div v-if="cartItems.length > 0" class="cart-footer">
          <div class="cart-summary"><span>共 {{ cartCount }} 件商品</span><span class="total">合计：<strong>¥{{ cartTotal }}</strong></span></div>
          <button class="btn-checkout" :disabled="submitting" @click="checkout">去结算</button>
        </div>
      </div>
    </Modal>

    <!-- Checkout Modal -->
    <Modal v-model="showCheckoutModal" icon="🛒" icon-type="info" title="确认订单" size="small" confirm-text="确认支付" :loading="submitting" @confirm="confirmCheckout">
      <div class="checkout-info">
        <div class="checkout-goods">
          <div v-for="item in checkoutItems" :key="item.id" class="checkout-goods-item">
            <span class="item-icon">{{ item.icon }}</span>
            <span class="goods-name">{{ item.name }}</span>
            <span class="goods-qty">x{{ item.qty }}</span>
            <span class="goods-price">¥{{ item.price * item.qty }}</span>
          </div>
        </div>
        <div class="info-row"><span class="label">商品数量</span><span class="value">{{ checkoutCount }} 件</span></div>
        <div class="info-row total"><span class="label">应付金额</span><span class="value price">¥{{ checkoutTotal }}</span></div>
        <p v-if="submitError" class="checkout-error">{{ submitError }}</p>
      </div>
    </Modal>

    <!-- Success Modal -->
    <Modal v-model="showSuccessModal" icon="🎉" icon-type="success" title="支付成功" subtitle="您的订单已提交" size="small" :show-cancel="false" confirm-text="查看订单" @confirm="viewOrderDetail">
      <div v-if="orderResult" class="success-info">
        <div class="info-row"><span class="label">订单编号</span><span class="value">{{ orderResult.orderNo }}</span></div>
        <div class="info-row"><span class="label">商品数量</span><span class="value">{{ orderItemCount }} 件</span></div>
        <div class="info-row"><span class="label">支付金额</span><span class="value">¥{{ orderResult.amount }}</span></div>
      </div>
    </Modal>

    <!-- Orders Modal -->
    <Modal v-model="showOrdersModal" title="我的订单" size="medium" :show-footer="false">
      <div class="orders-content">
        <div v-if="orders.length > 0" class="orders-list">
          <div v-for="order in orders" :key="order.orderNo" class="order-card">
            <div class="order-header">
              <span class="order-no">{{ order.orderNo }}</span>
              <span class="order-status" :class="order.status">{{ orderStatusText(order.status) }}</span>
            </div>
            <div class="order-items">
              <div v-for="item in order.items" :key="item.id" class="order-item">
                <span class="item-icon">{{ item.icon }}</span>
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">x{{ item.qty }}</span>
              </div>
            </div>
            <div class="order-footer">
              <span class="order-time">{{ order.createTime }}</span>
              <span class="order-amount">¥{{ order.amount }}</span>
            </div>
          </div>
        </div>
        <div v-else class="orders-empty">
          <div class="empty-icon">📦</div>
          <p>暂无订单</p>
        </div>
      </div>
    </Modal>

    <Toast v-model="showToast" :type="toastType" :title="toastTitle" :message="toastMessage" />

    <LoginModal v-model="showLoginModal" @success="onLoginSuccess" />
  </div>
</template>

<script>
import Modal from '../components/Modal.vue'
import Toast from '../components/Toast.vue'
import LoginModal from '../components/LoginModal.vue'
import { isAuthenticated } from '../utils/auth'
import { api } from '../utils/api'
import { cartStore } from '../utils/cartStore'

function genRequestId() {
  return 'REQ' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export default {
  name: 'Shop',
  components: { Modal, Toast, LoginModal },
  data() {
    return {
      selectedCategory: 'all',
      sortBy: 'default',
      showDetailModal: false,
      showCartModal: false,
      showCheckoutModal: false,
      showSuccessModal: false,
      submitting: false, // 支付提交中（弹窗期间禁止重复支付/关闭）
      submitError: '',
      selectedProduct: null,
      quantity: 1,
      orderResult: null,
      orders: [], // 订单列表（来自订单接口，与任务中心同源）
      showOrdersModal: false, // 订单列表弹框
      checkoutItems: [], // 本次结算的商品快照（购物车结算 / 立即购买）
      checkoutSource: 'cart', // cart | buyNow
      checkoutRequestId: null, // 本次结算的幂等请求标识
      showToast: false,
      toastType: 'success',
      toastTitle: '',
      toastMessage: '',
      showLoginModal: false,
      pendingAction: null,
      pendingProduct: null,
      categories: [
        { id: 'all', name: '全部商品', icon: '🏷️' },
        { id: 'cue', name: '球杆', icon: '🏏' },
        { id: 'ball', name: '台球', icon: '🎱' },
        { id: 'accessory', name: '配件', icon: '🔧' },
        { id: 'clothing', name: '服装', icon: '👔' }
      ],
      // 首屏兜底数据，挂载后会以接口返回（含最新库存）为准
      products: [
        { id: 1, name: 'LP专业斯诺克球杆', brand: 'LP', price: 2999, originalPrice: 3599, category: 'cue', icon: '🏏', description: '进口白蜡木杆身，专业级配置', sales: 328, hot: true, stock: 5 },
        { id: 2, name: 'Predator美式九球杆', brand: 'Predator', price: 4599, category: 'cue', icon: '🏏', description: '碳纤维前节，低偏转技术', sales: 156, new: true, stock: 3 },
        { id: 3, name: '星牌比赛用球', brand: '星牌', price: 1299, originalPrice: 1499, category: 'ball', icon: '🎱', description: '国际比赛标准，酚醛树脂材质', sales: 892, hot: true, stock: 12 },
        { id: 4, name: 'Aramith水晶球套装', brand: 'Aramith', price: 2199, category: 'ball', icon: '🎱', description: '比利时进口，透明水晶材质', sales: 234, stock: 8 },
        { id: 5, name: 'Master专业巧克粉', brand: 'Master', price: 39, category: 'accessory', icon: '🧊', description: '美国原装进口，防滑效果好', sales: 2341, hot: true, stock: 50 },
        { id: 6, name: '球杆延长器', brand: 'Generic', price: 199, originalPrice: 259, category: 'accessory', icon: '🔧', description: '铝合金材质，轻便耐用', sales: 567, stock: 20 },
        { id: 7, name: 'Kamui台球手套', brand: 'Kamui', price: 89, category: 'accessory', icon: '🧤', description: '日本进口，透气舒适', sales: 1234, stock: 30 },
        { id: 8, name: '专业比赛马甲', brand: 'Billiard Pro', price: 299, category: 'clothing', icon: '🎽', description: '修身剪裁，舒适透气', sales: 445, new: true, stock: 0 }
      ]
    }
  },
  computed: {
    filteredProducts() {
      if (this.selectedCategory === 'all') return this.products
      return this.products.filter(p => p.category === this.selectedCategory)
    },
    sortedProducts() {
      let result = [...this.filteredProducts]
      if (this.sortBy === 'price-asc') result.sort((a, b) => a.price - b.price)
      else if (this.sortBy === 'price-desc') result.sort((a, b) => b.price - a.price)
      return result
    },
    // 购物车数据来自全局持久化 store，跨页面/刷新保持一致
    cartItems() { return cartStore.items },
    cartCount() { return cartStore.count },
    cartTotal() { return cartStore.totalAmount },
    // 结算弹窗只展示本次快照，保证「购物车—订单—任务」是同一批商品
    checkoutCount() { return this.checkoutItems.reduce((sum, item) => sum + item.qty, 0) },
    checkoutTotal() { return this.checkoutItems.reduce((sum, item) => sum + item.price * item.qty, 0) },
    orderItemCount() {
      return (this.orderResult?.items || []).reduce((sum, item) => sum + item.qty, 0)
    }
  },
  created() {
    // 先按接口最新商品数据校正购物车（价格/库存/下架），再加载订单
    this.loadInitialData()
  },
  methods: {
    async loadInitialData() {
      const result = await api.getProducts()
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        this.products = result.data
      }
      cartStore.reconcile(this.products)
      await this.loadOrders()
    },
    async loadOrders() {
      const result = await api.getOrders()
      if (result.success) {
        this.orders = result.data
      }
    },
    getCategoryCount(catId) {
      if (catId === 'all') return this.products.length
      return this.products.filter(p => p.category === catId).length
    },
    getCategoryName(catId) {
      return this.categories.find(c => c.id === catId)?.name || ''
    },
    openProductDetail(product) {
      this.selectedProduct = product
      this.quantity = 1
      this.showDetailModal = true
    },
    changeDetailQty(delta) {
      if (!this.selectedProduct) return
      const stock = this.selectedProduct.stock ?? Infinity
      const next = this.quantity + delta
      if (next < 1 || next > stock) return
      this.quantity = next
    },
    checkLoginRequired(action, product = null) {
      if (!isAuthenticated()) {
        this.pendingAction = action
        this.pendingProduct = product
        this.showLoginModal = true
        return false
      }
      return true
    },
    onLoginSuccess() {
      this.showLoginModal = false
      if (this.pendingAction === 'quickAdd' && this.pendingProduct) {
        this.addToCart(this.pendingProduct, 1)
        this.showNotification('success', '已加入购物车', this.pendingProduct.name)
      } else if (this.pendingAction === 'addFromDetail') {
        this.addToCart(this.selectedProduct, this.quantity)
        this.showNotification('success', '已加入购物车', `${this.selectedProduct.name} x${this.quantity}`)
        this.showDetailModal = false
      } else if (this.pendingAction === 'buyNow') {
        this.startBuyNow()
      } else if (this.pendingAction === 'checkout') {
        this.startCheckout()
      }
      this.pendingAction = null
      this.pendingProduct = null
    },
    quickAddToCart(product) {
      if (!this.checkLoginRequired('quickAdd', product)) return
      const result = this.addToCart(product, 1)
      if (result) this.showNotification('success', '已加入购物车', product.name)
    },
    addToCartFromDetail() {
      if (!this.checkLoginRequired('addFromDetail')) return
      const result = this.addToCart(this.selectedProduct, this.quantity)
      if (!result) return
      this.showNotification('success', '已加入购物车', `${this.selectedProduct.name} x${this.quantity}`)
      this.showDetailModal = false
    },
    /**
     * 加入购物车，统一经过库存钳制
     * @returns {boolean} 是否加入成功
     */
    addToCart(product, qty) {
      if (!product || product.stock <= 0) {
        this.showNotification('warning', '无法加入', '该商品已售罄')
        return false
      }
      const result = cartStore.add(product, qty)
      if (!result.ok) {
        if (result.reason === 'stock') {
          this.showNotification('warning', '库存不足', `该商品最多可购买 ${result.max} 件`)
        }
        return false
      }
      return true
    },
    isCartQtyMax(item) {
      return Number.isInteger(item.stock) && item.qty >= item.stock
    },
    increaseCartQty(item) {
      if (this.isCartQtyMax(item)) {
        this.showNotification('warning', '库存不足', `该商品最多可购买 ${item.stock} 件`)
        return
      }
      cartStore.increase(item.id)
    },
    decreaseCartQty(item) {
      cartStore.decrease(item.id)
    },
    /** 按商品 id 移除，避免按索引连续删除时错位 */
    removeFromCart(productId) {
      cartStore.remove(productId)
    },
    clearCart() {
      cartStore.clear()
    },
    openCartModal() {
      // 打开前以接口最新库存校正一次，避免展示旧数量
      cartStore.reconcile(this.products)
      this.showCartModal = true
    },
    buyNow() {
      if (!this.checkLoginRequired('buyNow')) return
      this.startBuyNow()
    },
    /** 立即购买：只把当前商品作为本次结算快照，不覆盖购物车 */
    startBuyNow() {
      const product = this.products.find(p => p.id === this.selectedProduct?.id) || this.selectedProduct
      if (!product || product.stock <= 0) {
        this.showNotification('warning', '无法购买', '该商品已售罄')
        return
      }
      const qty = Math.min(Math.max(1, this.quantity), product.stock)
      this.checkoutSource = 'buyNow'
      this.checkoutItems = [{ ...product, qty }]
      this.checkoutRequestId = null
      this.submitError = ''
      this.showDetailModal = false
      this.showCheckoutModal = true
    },
    checkout() {
      if (!this.checkLoginRequired('checkout')) return
      this.startCheckout()
    },
    /** 购物车结算：对当前购物车拍一次快照 */
    startCheckout() {
      cartStore.reconcile(this.products)
      if (cartStore.isEmpty) {
        this.showNotification('warning', '购物车是空的', '请先选择要购买的商品')
        return
      }
      this.checkoutSource = 'cart'
      this.checkoutItems = cartStore.items.map(item => ({ ...item }))
      this.checkoutRequestId = null
      this.submitError = ''
      this.showCartModal = false
      this.showCheckoutModal = true
    },
    /**
     * 确认支付：
     * - submitting 防重入 + 弹窗按钮禁用，杜绝重复支付
     * - 下单前用接口最新库存再校验一次
     * - 失败/中断时保留购物车与弹窗，可直接重试（同 requestId 幂等）
     */
    async confirmCheckout() {
      if (this.submitting) return
      if (this.checkoutItems.length === 0) {
        this.showCheckoutModal = false
        this.showNotification('warning', '购物车是空的', '请先选择要购买的商品')
        return
      }

      // 下单前校验最新库存（页面可能停留较久，库存已被其他操作扣减）
      for (const item of this.checkoutItems) {
        const product = this.products.find(p => p.id === item.id)
        if (!product || product.stock <= 0) {
          this.abortCheckoutWithError(`商品「${item.name}」已售罄，请调整购物车`)
          return
        }
        if (item.qty > product.stock) {
          this.abortCheckoutWithError(`商品「${item.name}」库存不足，仅剩 ${product.stock} 件`)
          return
        }
      }

      this.submitting = true
      this.submitError = ''
      // 同一次结算重试时复用 requestId，保证中断后重试不会产生两笔订单
      if (!this.checkoutRequestId) this.checkoutRequestId = genRequestId()

      const result = await api.createOrder({
        requestId: this.checkoutRequestId,
        items: this.checkoutItems.map(item => ({ id: item.id, qty: item.qty }))
      })

      this.submitting = false

      if (!result.success) {
        // 支付中断/失败：购物车保留、弹窗保留、错误信息展示，用户可再次确认支付
        this.submitError = result.error || '支付失败，请稍后重试'
        this.showNotification('error', '支付失败', this.submitError)
        return
      }

      const order = result.data
      this.orderResult = order
      // 本地库存跟随接口扣减结果更新，并校正购物车中可能超限的数量
      this.applyStockDeduction(order.items)
      if (this.checkoutSource === 'cart') {
        cartStore.clear()
      } else {
        cartStore.reconcile(this.products)
      }
      this.checkoutItems = []
      this.checkoutRequestId = null
      this.showCheckoutModal = false
      this.showSuccessModal = true
      await this.loadOrders()
    },
    abortCheckoutWithError(message) {
      this.submitError = message
      this.showCheckoutModal = false
      this.showCartModal = this.checkoutSource === 'cart'
      cartStore.reconcile(this.products)
      this.showNotification('error', '无法结算', message)
    },
    applyStockDeduction(orderedItems) {
      for (const ordered of orderedItems) {
        const product = this.products.find(p => p.id === ordered.id)
        if (product) {
          product.stock = Math.max(0, (product.stock ?? 0) - ordered.qty)
          product.sales = (product.sales || 0) + ordered.qty
        }
      }
    },
    orderStatusText(status) {
      const map = {
        pending_payment: '待付款',
        paid: '已支付',
        pending_shipment: '待发货',
        shipped: '已发货',
        completed: '已完成',
        cancelled: '已取消'
      }
      return map[status] || status
    },
    showNotification(type, title, message) {
      this.toastType = type
      this.toastTitle = title
      this.toastMessage = message
      this.showToast = true
    },
    async viewOrderDetail() {
      this.showSuccessModal = false
      await this.loadOrders()
      this.showOrdersModal = true
    }
  }
}
</script>

<style scoped>
.shop-page { max-width: 1400px; margin: 0 auto; padding: 0 3rem 4rem; }
.page-header { text-align: center; padding: 1.5rem 0 2rem; }
.page-tag { display: inline-block; background: rgba(0, 217, 165, 0.1); color: var(--primary); padding: 0.5rem 1rem; border-radius: 50px; font-size: 0.85rem; font-weight: 500; margin-bottom: 1rem; }
.page-header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 3rem; font-weight: 700; margin-bottom: 0.75rem; }
.page-header p { color: var(--text-secondary); font-size: 1.1rem; }
.shop-layout { display: grid; grid-template-columns: 240px 1fr; gap: 2rem; align-items: start; }
.sidebar { position: sticky; top: 100px; height: fit-content; }
.section-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-secondary); }
.category-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 1rem; }
.category-list { display: flex; flex-direction: column; gap: 0.25rem; }
.category-list button { display: flex; align-items: center; gap: 0.75rem; width: 100%; background: transparent; border: none; padding: 0.75rem 1rem; color: var(--text-secondary); font-size: 0.9rem; border-radius: 10px; cursor: pointer; transition: all 0.3s; text-align: left; }
.category-list button:hover { background: rgba(255, 255, 255, 0.03); color: var(--text-primary); }
.category-list button.active { background: rgba(0, 217, 165, 0.1); color: var(--primary); }
.cat-icon { font-size: 1.1rem; }
.cat-name { flex: 1; }
.cat-count { font-size: 0.75rem; color: var(--text-muted); background: rgba(255, 255, 255, 0.05); padding: 0.2rem 0.5rem; border-radius: 10px; }
.category-list button.active .cat-count { background: rgba(0, 217, 165, 0.2); color: var(--primary); }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; margin-top: -6.8rem; }
.result-count { color: var(--text-secondary); font-size: 0.9rem; font-weight: 600; }
.result-count span { color: var(--primary); font-weight: 600; }
.sort-select { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 0.6rem 1rem; color: var(--text-primary); font-size: 0.85rem; cursor: pointer; }
.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.25rem; }
.product-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; cursor: pointer; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.product-card:hover { transform: translateY(-6px); border-color: rgba(255, 255, 255, 0.15); }
.product-image { position: relative; height: 160px; background: linear-gradient(135deg, var(--bg-card-hover) 0%, var(--bg-card) 100%); display: flex; align-items: center; justify-content: center; }
.image-placeholder { font-size: 4rem; opacity: 0.8; }
.product-badges { position: absolute; top: 0.75rem; left: 0.75rem; display: flex; gap: 0.4rem; }
.badge { padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 600; }
.badge.hot { background: rgba(255, 107, 107, 0.2); color: #ff6b6b; }
.badge.new { background: rgba(0, 217, 165, 0.2); color: var(--primary); }
.badge.out { background: rgba(138, 138, 154, 0.25); color: var(--text-secondary); }
.product-card.sold-out { opacity: 0.7; }
.product-card.sold-out .image-placeholder { filter: grayscale(0.6); }
.stock-out { color: #ff6b6b !important; }
.quick-add { position: absolute; bottom: 0.75rem; right: 0.75rem; width: 40px; height: 40px; background: var(--primary); border: none; border-radius: 10px; color: var(--bg-dark); cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transform: translateY(10px); transition: all 0.3s; }
.product-card:hover .quick-add { opacity: 1; transform: translateY(0); }
.quick-add:hover { transform: scale(1.1); }
.quick-add svg { width: 20px; height: 20px; }
.product-info { padding: 1.25rem; }
.product-brand { font-size: 0.75rem; color: var(--primary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
.product-info h3 { font-size: 1rem; font-weight: 600; margin: 0.4rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.product-desc { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.product-footer { display: flex; justify-content: space-between; align-items: flex-end; }
.price-info { display: flex; align-items: baseline; gap: 0.5rem; }
.current-price { font-family: 'Space Grotesk', sans-serif; font-size: 1.25rem; font-weight: 700; color: var(--primary); }
.original-price { font-size: 0.8rem; color: var(--text-muted); text-decoration: line-through; }
.sales { font-size: 0.75rem; color: var(--text-muted); }
</style>

<style scoped>
.cart-float { position: fixed; bottom: 2rem; right: 2rem; display: flex; align-items: center; gap: 1rem; background: var(--bg-card); border: 1px solid var(--border); padding: 1rem 1.5rem; border-radius: 50px; cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); z-index: 100; }
.cart-float:hover { transform: translateY(-4px); border-color: var(--primary); box-shadow: var(--shadow-glow); }
.cart-icon { position: relative; }
.cart-icon svg { width: 24px; height: 24px; color: var(--primary); }
.cart-count { position: absolute; top: -8px; right: -8px; background: var(--primary); color: var(--bg-dark); width: 20px; height: 20px; border-radius: 50%; font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.cart-total { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--primary); }
.product-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: -20px -24px; }
.detail-image { background: linear-gradient(135deg, var(--bg-card-hover) 0%, var(--bg-card) 100%); display: flex; align-items: center; justify-content: center; min-height: 300px; }
.detail-icon { font-size: 8rem; }
.detail-info { padding: 2rem 2rem 2rem 0; display: flex; flex-direction: column; }
.detail-brand { font-size: 0.85rem; color: var(--primary); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; }
.detail-info h2 { font-family: 'Space Grotesk', sans-serif; font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; }
.detail-desc { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; }
.detail-specs { display: flex; gap: 2rem; margin-bottom: 1.5rem; }
.spec-item { display: flex; flex-direction: column; gap: 0.25rem; }
.spec-item .label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }
.spec-item .value { font-size: 0.9rem; }
.detail-price { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 1.5rem; }
.detail-price .current { font-family: 'Space Grotesk', sans-serif; font-size: 2.5rem; font-weight: 700; color: var(--primary); }
.detail-price .original { font-size: 1.1rem; color: var(--text-muted); text-decoration: line-through; }
.quantity-selector { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.qty-label { font-size: 0.9rem; color: var(--text-secondary); }
.qty-controls { display: flex; align-items: center; background: rgba(255, 255, 255, 0.05); border-radius: 10px; overflow: hidden; }
.qty-controls button { width: 40px; height: 40px; background: transparent; border: none; color: var(--text-primary); font-size: 1.25rem; cursor: pointer; transition: background 0.2s; }
.qty-controls button:hover { background: rgba(255, 255, 255, 0.1); }
.qty-controls span { width: 50px; text-align: center; font-weight: 600; }
.detail-actions { display: flex; gap: 1rem; margin-top: auto; }
.btn-add-cart, .btn-buy-now { flex: 1; padding: 1rem; font-size: 1rem; font-weight: 600; border-radius: 12px; cursor: pointer; transition: all 0.3s; }
.btn-add-cart { background: transparent; border: 1px solid var(--primary); color: var(--primary); }
.btn-add-cart:hover { background: rgba(0, 217, 165, 0.1); }
.btn-buy-now { background: var(--gradient-1); border: none; color: var(--bg-dark); }
.btn-buy-now:hover { box-shadow: 0 8px 25px var(--primary-glow); }
.cart-content { margin: -20px -24px -20px -24px; }
.cart-items { max-height: 400px; overflow-y: auto; padding: 1rem 1.5rem; }
.cart-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.03); border-radius: 12px; margin-bottom: 0.75rem; }
.item-icon { font-size: 2rem; width: 50px; height: 50px; background: var(--bg-card-hover); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.item-info { flex: 1; }
.item-info h4 { font-size: 0.9rem; font-weight: 500; margin-bottom: 0.2rem; }
.item-brand { font-size: 0.75rem; color: var(--text-muted); }
.cart-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 0 1rem 0.75rem; font-size: 0.85rem; color: var(--text-secondary); }
.btn-clear-cart { background: transparent; border: none; color: var(--text-muted); font-size: 0.8rem; cursor: pointer; transition: color 0.2s; }
.btn-clear-cart:hover { color: #ff6b6b; }
.cart-qty-controls { display: flex; align-items: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; overflow: hidden; }
.cart-qty-controls button { width: 30px; height: 30px; background: transparent; border: none; color: var(--text-primary); font-size: 1rem; cursor: pointer; transition: background 0.2s; }
.cart-qty-controls button:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); }
.cart-qty-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
.cart-qty-controls span { min-width: 34px; text-align: center; font-weight: 600; font-size: 0.85rem; }
.item-qty { font-size: 0.85rem; color: var(--text-secondary); }
.item-price { font-family: 'Space Grotesk', sans-serif; font-weight: 600; color: var(--primary); }
.remove-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0.4rem; border-radius: 6px; transition: all 0.3s; }
.remove-btn:hover { background: rgba(255, 107, 107, 0.1); color: #ff6b6b; }
.remove-btn svg { width: 16px; height: 16px; }
.cart-empty { padding: 3rem; text-align: center; color: var(--text-muted); }
.empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
.cart-empty .empty-tip { font-size: 0.8rem; margin-top: 0.25rem; opacity: 0.7; }
.checkout-goods { display: flex; flex-direction: column; gap: 0.5rem; max-height: 180px; overflow-y: auto; margin-bottom: 0.5rem; }
.checkout-goods-item { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; background: rgba(255, 255, 255, 255, 0.03); padding: 0.5rem 0.75rem; border-radius: 8px; }
.checkout-goods-item .item-icon { font-size: 1.1rem; }
.checkout-goods-item .goods-name { flex: 1; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.checkout-goods-item .goods-qty { color: var(--text-muted); font-size: 0.8rem; }
.checkout-goods-item .goods-price { font-family: 'Space Grotesk', sans-serif; font-weight: 600; color: var(--primary); }
.checkout-error { color: #ff6b6b; font-size: 0.8rem; margin-top: 0.25rem; }
.cart-footer { padding: 1.5rem; border-top: 1px solid var(--border); }
.cart-summary { display: flex; justify-content: space-between; margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem; }
.cart-summary .total strong { font-family: 'Space Grotesk', sans-serif; font-size: 1.25rem; color: var(--primary); }
.btn-checkout { width: 100%; background: var(--gradient-1); border: none; color: var(--bg-dark); padding: 1rem; font-size: 1rem; font-weight: 600; border-radius: 12px; cursor: pointer; transition: all 0.3s; }
.btn-checkout:hover { box-shadow: 0 8px 30px var(--primary-glow); }
.btn-checkout:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.btn-add-cart:disabled, .btn-buy-now:disabled { opacity: 0.5; cursor: not-allowed; }
.qty-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
.checkout-info, .success-info { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; background: rgba(255, 255, 255, 0.03); border-radius: 12px; text-align: left; }
.info-row { display: flex; justify-content: space-between; font-size: 0.9rem; }
.info-row .label { color: var(--text-secondary); }
.info-row .value { font-weight: 500; }
.info-row.total { border-top: 1px solid var(--border); padding-top: 0.75rem; margin-top: 0.25rem; }
.info-row .value.price { font-family: 'Space Grotesk', sans-serif; font-size: 1.25rem; color: var(--primary); }
@media (max-width: 900px) { .shop-layout { grid-template-columns: 1fr; } .sidebar { position: static; } .product-detail { grid-template-columns: 1fr; } .detail-image { min-height: 200px; } .detail-info { padding: 1.5rem; } }
@media (max-width: 600px) { .shop-page { padding: 0 1.5rem 3rem; } .page-header h1 { font-size: 2rem; } .products-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; } .product-image { height: 120px; } .image-placeholder { font-size: 3rem; } }
</style>


<style scoped>
/* Orders Modal Styles */
.orders-content { margin: -20px -24px; }
.orders-list { max-height: 400px; overflow-y: auto; padding: 1rem 1.5rem; }
.order-card { background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; }
.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.order-no { font-family: monospace; font-size: 0.85rem; color: var(--text-secondary); }
.order-status { padding: 0.25rem 0.6rem; border-radius: 12px; font-size: 0.7rem; font-weight: 600; }
.order-status.paid,
.order-status.pending_shipment { background: rgba(0, 217, 165, 0.15); color: var(--primary); }
.order-status.pending_payment { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
.order-status.shipped { background: rgba(79, 172, 254, 0.15); color: #4facfe; }
.order-status.completed { background: rgba(108, 117, 125, 0.15); color: #8a8a9a; }
.order-status.cancelled { background: rgba(255, 107, 107, 0.15); color: #ff6b6b; }
.order-items { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
.order-item { display: flex; align-items: center; gap: 0.4rem; background: rgba(255, 255, 255, 0.05); padding: 0.4rem 0.6rem; border-radius: 8px; font-size: 0.8rem; }
.item-icon { font-size: 1rem; }
.item-name { color: var(--text-secondary); }
.item-qty { color: var(--text-muted); }
.order-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid var(--border); }
.order-time { font-size: 0.75rem; color: var(--text-muted); }
.order-amount { font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: var(--primary); }
.orders-empty { padding: 3rem; text-align: center; color: var(--text-muted); }
.orders-empty .empty-icon { font-size: 3rem; margin-bottom: 0.5rem; opacity: 0.5; }
</style>