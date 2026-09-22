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
          <div v-for="product in sortedProducts" :key="product.id" class="product-card" @click="openProductDetail(product)">
            <div class="product-image">
              <div class="image-placeholder">{{ product.icon }}</div>
              <div class="product-badges">
                <span v-if="product.hot" class="badge hot">热销</span>
                <span v-if="product.new" class="badge new">新品</span>
              </div>
              <button class="quick-add" @click.stop="quickAddToCart(product)">
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
                <span class="sales">已售 {{ product.sales }}</span>
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
        <span class="cart-count">{{ cartItemCount }}</span>
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
          </div>
          <div class="detail-price">
            <span class="current">¥{{ selectedProduct.price }}</span>
            <span v-if="selectedProduct.originalPrice" class="original">¥{{ selectedProduct.originalPrice }}</span>
          </div>
          <div class="quantity-selector">
            <span class="qty-label">数量</span>
            <div class="qty-controls">
              <button :disabled="quantity <= 1" @click="quantity--">-</button>
              <span>{{ quantity }}</span>
              <button :disabled="quantity >= selectedProduct.stock" @click="quantity < selectedProduct.stock && quantity++">+</button>
            </div>
            <span class="qty-stock">库存 {{ selectedProduct.stock }} 件</span>
          </div>
          <div class="detail-actions">
            <button class="btn-add-cart" @click="addToCartFromDetail">加入购物车</button>
            <button class="btn-buy-now" @click="buyNow">立即购买</button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Cart Modal -->
    <Modal v-model="showCartModal" title="购物车" size="medium" :show-footer="false">
      <div class="cart-content">
        <div v-if="cartItems.length > 0" class="cart-items">
          <div v-for="item in cartItems" :key="item.id" class="cart-item">
            <input
              class="item-check"
              type="checkbox"
              :checked="isSelected(item.id)"
              @change="toggleSelect(item.id)"
            />
            <div class="item-icon">{{ item.icon }}</div>
            <div class="item-info">
              <h4>{{ item.name }}</h4>
              <span class="item-brand">{{ item.brand }} · 库存 {{ item.stock }} 件</span>
            </div>
            <div class="qty-controls cart-qty">
              <button :disabled="item.qty <= 1" @click="decreaseCartQty(item.id)">-</button>
              <span>{{ item.qty }}</span>
              <button :disabled="item.qty >= item.stock" @click="increaseCartQty(item.id)">+</button>
            </div>
            <div class="item-price">¥{{ item.price * item.qty }}</div>
            <button class="remove-btn" title="移除" @click="removeFromCart(item.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div v-else class="cart-empty">
          <div class="empty-icon">🛒</div>
          <p>购物车是空的</p>
          <button class="btn-go-shopping" @click="goShopping">去逛逛</button>
        </div>
        <div v-if="cartItems.length > 0" class="cart-footer">
          <label class="select-all">
            <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
            全选
          </label>
          <button
            v-if="selectedIds.length > 0"
            class="btn-remove-selected"
            :disabled="cartRemoving"
            @click="removeSelected"
          >
            移除所选 ({{ selectedIds.length }})
          </button>
          <div class="cart-summary">
            <span>共 {{ selectedCount }} 件商品</span>
            <span class="total">合计：<strong>¥{{ selectedTotal }}</strong></span>
          </div>
          <button class="btn-checkout" :disabled="selectedIds.length === 0" @click="checkout">去结算</button>
        </div>
      </div>
    </Modal>

    <!-- Checkout Modal -->
    <Modal
      v-model="showCheckoutModal"
      icon="🛒"
      icon-type="info"
      title="确认订单"
      size="small"
      confirm-text="确认支付"
      :loading="checkoutLoading"
      :confirm-disabled="checkoutLoading || checkoutItems.length === 0"
      :close-on-overlay="!checkoutLoading"
      @confirm="confirmCheckout"
      @cancel="onCheckoutCancel"
    >
      <div v-if="checkoutItems.length > 0" class="checkout-info">
        <div class="checkout-items-preview">
          <div v-for="item in checkoutItems" :key="item.id" class="checkout-item">
            <span class="item-icon">{{ item.icon }}</span>
            <span class="item-name">{{ item.name }}</span>
            <span class="item-qty">x{{ item.qty }}</span>
            <span class="item-amount">¥{{ item.price * item.qty }}</span>
          </div>
        </div>
        <div class="info-row"><span class="label">商品数量</span><span class="value">{{ checkoutItemCount }} 件</span></div>
        <div class="info-row total"><span class="label">应付金额</span><span class="value price">¥{{ checkoutTotal }}</span></div>
      </div>
      <div v-else class="checkout-empty">
        <div class="empty-icon">🛒</div>
        <p>购物车是空的，无法结算</p>
      </div>
    </Modal>

    <!-- Success Modal -->
    <Modal v-model="showSuccessModal" icon="🎉" icon-type="success" title="支付成功" subtitle="您的订单已提交" size="small" :show-cancel="false" confirm-text="查看订单" @confirm="viewOrderDetail">
      <div v-if="orderResult" class="success-info">
        <div class="info-row"><span class="label">订单编号</span><span class="value">{{ orderResult.orderNo }}</span></div>
        <div class="info-row"><span class="label">商品数量</span><span class="value">{{ orderResult.items.length }} 种 / {{ orderResultQty }} 件</span></div>
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
              <span class="order-status" :class="orderStatusMeta(order.status).type">{{ orderStatusMeta(order.status).text }}</span>
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
              <div class="order-footer-right">
                <button
                  v-if="order.status === 'cancelled'"
                  class="order-action-btn default"
                  @click="rebuyOrder(order)"
                >
                  再次购买
                </button>
                <button
                  v-if="order.status === 'pending_payment'"
                  class="order-action-btn danger"
                  @click="cancelOrder(order)"
                >
                  取消订单
                </button>
                <button
                  v-if="order.status === 'pending_payment'"
                  class="order-action-btn default"
                  @click="payOrder(order)"
                >
                  去支付
                </button>
                <span class="order-amount">¥{{ order.amount }}</span>
              </div>
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

    <LoginModal v-model="showLoginModal" @login-success="onLoginSuccess" />
  </div>
</template>

<script>
import Modal from '../components/Modal.vue'
import Toast from '../components/Toast.vue'
import LoginModal from '../components/LoginModal.vue'
import { isAuthenticated } from '../utils/auth'
import { taskStore } from '../utils/taskStore'
import { cartStore } from '../utils/cartStore'
import { api } from '../utils/api'
import PRODUCTS from '../utils/products'

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
      checkoutLoading: false,
      selectedProduct: null,
      quantity: 1,
      // 本次结算快照（打开结算弹窗瞬间固定，支付期间加减购物车不影响本单）
      checkoutItems: [],
      checkoutMode: 'cart', // cart: 购物车结算 | buynow: 立即购买
      clientOrderId: null, // 支付幂等键，中断后重试不会重复下单
      orderResult: null,
      orders: [], // 订单列表（与任务中心同源）
      showOrdersModal: false, // 订单列表弹框
      selectedIds: [], // 购物车勾选的商品 id
      cartRemoving: false,
      showToast: false,
      toastType: 'success',
      toastTitle: '',
      toastMessage: '',
      showLoginModal: false,
      pendingAction: null,
      pendingProduct: null,
      pendingQty: 1,
      categories: [
        { id: 'all', name: '全部商品', icon: '🏷️' },
        { id: 'cue', name: '球杆', icon: '🏏' },
        { id: 'ball', name: '台球', icon: '🎱' },
        { id: 'accessory', name: '配件', icon: '🔧' },
        { id: 'clothing', name: '服装', icon: '👔' }
      ],
      products: PRODUCTS
    }
  },
  computed: {
    filteredProducts() {
      if (this.selectedCategory === 'all') return this.products
      return this.products.filter(p => p.category === this.selectedCategory)
    },
    sortedProducts() {
      const result = [...this.filteredProducts]
      if (this.sortBy === 'price-asc') result.sort((a, b) => a.price - b.price)
      else if (this.sortBy === 'price-desc') result.sort((a, b) => b.price - a.price)
      return result
    },
    // 购物车行数据由 cartStore 统一提供（持久化、跨页面联动）
    cartItems() {
      return cartStore.getLines()
    },
    cartTotal() {
      return cartStore.getTotal()
    },
    cartItemCount() {
      return cartStore.getCount()
    },
    allSelected() {
      return this.cartItems.length > 0 && this.selectedIds.length === this.cartItems.length
    },
    selectedLines() {
      return this.cartItems.filter(item => this.selectedIds.includes(item.id))
    },
    selectedCount() {
      return this.selectedLines.reduce((sum, item) => sum + item.qty, 0)
    },
    selectedTotal() {
      return this.selectedLines.reduce((sum, item) => sum + item.price * item.qty, 0)
    },
    checkoutItemCount() {
      return this.checkoutItems.reduce((sum, item) => sum + item.qty, 0)
    },
    checkoutTotal() {
      return this.checkoutItems.reduce((sum, item) => sum + item.price * item.qty, 0)
    },
    orderResultQty() {
      return this.orderResult?.items?.reduce((sum, item) => sum + item.qty, 0) || 0
    }
  },
  watch: {
    '$route.query': {
      handler(query) {
        this.handleRouteQuery(query || {})
      }
    }
  },
  async mounted() {
    // 默认全选购物车，并从任务中心恢复订单（刷新/返回后不丢单）
    this.selectedIds = this.cartItems.map(item => item.id)
    await this.refreshOrders()
    this.handleRouteQuery(this.$route.query)
  },
  methods: {
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
    openCartModal() {
      // 打开时同步勾选状态（勾选的商品已被移除时自动剔除）
      this.selectedIds = this.cartItems
        .filter(item => this.selectedIds.includes(item.id))
        .map(item => item.id)
      if (this.selectedIds.length === 0) {
        this.selectedIds = this.cartItems.map(item => item.id)
      }
      this.showCartModal = true
    },
    goShopping() {
      this.showCartModal = false
    },
    isSelected(productId) {
      return this.selectedIds.includes(productId)
    },
    toggleSelect(productId) {
      if (this.isSelected(productId)) {
        this.selectedIds = this.selectedIds.filter(id => id !== productId)
      } else {
        this.selectedIds = [...this.selectedIds, productId]
      }
    },
    toggleSelectAll() {
      this.selectedIds = this.allSelected ? [] : this.cartItems.map(item => item.id)
    },
    increaseCartQty(productId) {
      cartStore.increase(productId)
    },
    decreaseCartQty(productId) {
      cartStore.decrease(productId)
    },
    removeFromCart(productId) {
      cartStore.remove(productId)
      this.selectedIds = this.selectedIds.filter(id => id !== productId)
    },
    async removeSelected() {
      if (this.selectedIds.length === 0 || this.cartRemoving) return
      this.cartRemoving = true
      // 批量移除多条商品：一次性更新，避免逐条 splice 造成的索引错位
      const ids = [...this.selectedIds]
      await new Promise(resolve => setTimeout(resolve, 100))
      cartStore.removeMany(ids)
      this.selectedIds = []
      this.cartRemoving = false
      this.showNotification('info', '已移除商品', `共移除 ${ids.length} 种商品`)
    },
    checkLoginRequired(action, product = null, qty = 1) {
      if (!isAuthenticated()) {
        this.pendingAction = action
        this.pendingProduct = product
        this.pendingQty = qty
        this.showLoginModal = true
        return false
      }
      return true
    },
    onLoginSuccess() {
      this.showLoginModal = false
      if (this.pendingAction === 'quickAdd' && this.pendingProduct) {
        this.applyAddToCart(this.pendingProduct, 1)
      } else if (this.pendingAction === 'addFromDetail') {
        this.applyAddToCart(this.selectedProduct, this.quantity)
        this.showDetailModal = false
      } else if (this.pendingAction === 'buyNow') {
        this.startCheckout('buynow', [this.snapshotOf(this.selectedProduct, this.quantity)])
        this.showDetailModal = false
      } else if (this.pendingAction === 'checkout') {
        this.startCheckout('cart', this.snapshotSelected())
        this.showCartModal = false
      }
      this.pendingAction = null
      this.pendingProduct = null
    },
    /**
     * 加入购物车并提示库存收敛结果
     */
    applyAddToCart(product, qty) {
      const result = cartStore.add(product.id, qty)
      if (!result.ok) return
      if (result.qty >= result.stock && qty < result.stock) {
        this.showNotification('warning', '库存不足', `${product.name} 最多可购买 ${result.stock} 件，已为您加到库存上限`)
      } else if (this.pendingAction) {
        this.showNotification('success', '已加入购物车', `${product.name} x${result.qty}`)
      }
      this.selectedIds = this.cartItems.map(item => item.id)
    },
    quickAddToCart(product) {
      if (!this.checkLoginRequired('quickAdd', product, 1)) return
      const result = cartStore.add(product.id, 1)
      this.selectedIds = this.cartItems.map(item => item.id)
      if (result.qty >= product.stock) {
        this.showNotification('warning', '库存不足', `${product.name} 最多可购买 ${product.stock} 件`)
      } else {
        this.showNotification('success', '已加入购物车', product.name)
      }
    },
    addToCartFromDetail() {
      if (!this.checkLoginRequired('addFromDetail', this.selectedProduct, this.quantity)) return
      const result = cartStore.add(this.selectedProduct.id, this.quantity)
      if (result.qty >= result.stock && this.quantity < result.stock) {
        this.showNotification('warning', '库存不足', `最多可购买 ${result.stock} 件，已为您加到库存上限`)
      } else {
        this.showNotification('success', '已加入购物车', `${this.selectedProduct.name} x${result.qty}`)
      }
      this.selectedIds = this.cartItems.map(item => item.id)
      this.showDetailModal = false
    },
    /**
     * 单个商品的下单快照（深拷贝）
     */
    snapshotOf(product, qty) {
      const clamped = Math.min(Math.max(1, qty), product.stock)
      return JSON.parse(JSON.stringify({ ...product, qty: clamped }))
    },
    /**
     * 购物车勾选项的下单快照
     */
    snapshotSelected() {
      return JSON.parse(JSON.stringify(this.selectedLines))
    },
    buyNow() {
      if (!this.checkLoginRequired('buyNow', this.selectedProduct, this.quantity)) return
      // 立即购买不覆盖、不清空购物车，仅结算当前商品
      this.startCheckout('buynow', [this.snapshotOf(this.selectedProduct, this.quantity)])
      this.showDetailModal = false
    },
    checkout() {
      if (!this.checkLoginRequired('checkout')) return
      if (this.selectedLines.length === 0) {
        this.showNotification('warning', '请选择商品', '请先勾选要结算的商品')
        return
      }
      this.startCheckout('cart', this.snapshotSelected())
      this.showCartModal = false
    },
    /**
     * 打开结算弹窗：固定快照与幂等键
     */
    startCheckout(mode, items) {
      if (!items || items.length === 0) {
        this.showNotification('warning', '购物车是空的', '请先添加商品再结算')
        return
      }
      this.checkoutMode = mode
      this.checkoutItems = items
      this.clientOrderId = 'C' + Date.now() + Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      this.showCheckoutModal = true
    },
    /**
     * 支付中断（取消/关闭）：关闭弹窗、不清购物车、不生成订单，可用同一幂等键重试
     */
    onCheckoutCancel() {
      if (this.checkoutLoading) return
      this.showCheckoutModal = false
      this.checkoutItems = []
      this.clientOrderId = null
    },
    async confirmCheckout() {
      // 防重复支付：支付中忽略后续点击
      if (this.checkoutLoading || this.checkoutItems.length === 0) return

      this.checkoutLoading = true
      const payload = {
        clientOrderId: this.clientOrderId,
        items: this.checkoutItems.map(item => ({ productId: item.id, quantity: item.qty }))
      }

      const result = await api.createOrder(payload)
      this.checkoutLoading = false

      if (!result.success || !result.data) {
        // 支付失败/中断：保留购物车与快照，允许重试
        this.showNotification('error', '支付失败', result.error || '请稍后重试')
        return
      }

      // 以接口返回的订单结果为准（金额、商品以后端重算为准）
      const order = result.data
      this.orderResult = order

      if (this.checkoutMode === 'cart') {
        // 按购买数量扣减，支付期间新加入的数量保留
        cartStore.deductPurchased(order.items)
        this.selectedIds = cartStore.getLines().map(item => item.id)
      }

      // 订单任务已在接口侧写入任务中心，这里只做同源刷新
      await this.refreshOrders()

      this.checkoutItems = []
      this.clientOrderId = null
      this.showCheckoutModal = false
      this.showSuccessModal = true

      this.showNotification('info', '已添加到任务中心', '您可以在任务中心查看并管理此订单')
    },
    showNotification(type, title, message) {
      this.toastType = type
      this.toastTitle = title
      this.toastMessage = message
      this.showToast = true
    },
    /**
     * 从接口刷新订单列表，保证订单与任务记录是同一批商品
     */
    async refreshOrders() {
      const result = await api.getOrders()
      if (result.success && Array.isArray(result.data)) {
        this.orders = result.data
      }
    },
    orderStatusMeta(status) {
      const map = {
        paid: { text: '已支付', type: 'paid' },
        pending_payment: { text: '待付款', type: 'pending' },
        pending_shipment: { text: '待发货', type: 'pending' },
        shipped: { text: '已发货', type: 'shipped' },
        completed: { text: '已完成', type: 'paid' },
        cancelled: { text: '已取消', type: 'cancelled' }
      }
      return map[status] || { text: status, type: 'pending' }
    },
    viewOrderDetail() {
      this.showSuccessModal = false
      this.refreshOrders().then(() => {
        this.showOrdersModal = true
      })
    },
    /**
     * 取消订单：保留记录（标记已取消）并返还库存
     */
    async cancelOrder(order) {
      const taskId = order.taskId
      if (!taskId) return
      const result = await api.doTaskAction({ taskId, action: 'cancel' })
      await this.refreshOrders()
      if (result.success) {
        this.showNotification('success', '订单已取消', '记录已保留，可随时再次购买')
      } else {
        this.showNotification('error', '取消失败', result.message || '请稍后重试')
      }
    },
    /**
     * 再次购买：把订单商品加回购物车（受库存限制）
     */
    rebuyItems(items) {
      let changed = false
      for (const item of items || []) {
        const productId = item.productId ?? item.id
        const res = cartStore.add(productId, item.qty)
        if (res.ok) changed = true
      }
      this.selectedIds = this.cartItems.map(line => line.id)
      if (changed) {
        this.showNotification('success', '已加入购物车', '请确认数量后重新结算')
        this.showCartModal = true
      } else {
        this.showNotification('warning', '商品已下架', '订单中的商品暂不可购买')
      }
    },
    /**
     * 订单列表中的再次购买入口
     */
    rebuyOrder(order) {
      this.showOrdersModal = false
      this.rebuyItems(order.items)
    },
    /**
     * 从订单弹窗继续支付中断的待付款订单
     */
    payOrder(order) {
      this.showOrdersModal = false
      const task = taskStore.getOrderTask(order.orderNo)
      if (!task || task.status !== 'pending_payment') {
        this.refreshOrders()
        this.showNotification('warning', '无需支付', '该订单不是待付款状态')
        return
      }
      this.startCheckout('cart', JSON.parse(JSON.stringify(task.extra?.items || [])))
    },
    /**
     * 任务中心跳转联动：
     * - action=pay&orderNo=xxx 待付款订单：打开结算弹窗继续付款
     * - action=rebuy&orderNo=xxx：再次购买，加回购物车
     * - 仅 orderNo：打开订单列表
     */
    handleRouteQuery(query) {
      if (!query || !query.orderNo || this.$route.path !== '/shop') return

      if (query.action === 'rebuy') {
        const task = taskStore.getOrderTask(query.orderNo)
        if (task && task.extra?.items?.length) {
          this.rebuyItems(task.extra.items)
        } else {
          this.showOrdersModal = true
        }
      } else if (query.action === 'pay') {
        const task = taskStore.getOrderTask(query.orderNo)
        if (task && task.status === 'pending_payment') {
          this.startCheckout('cart', JSON.parse(JSON.stringify(task.extra.items)))
        } else {
          this.showOrdersModal = true
        }
      } else {
        this.showOrdersModal = true
      }
      // 清理 query，避免重复触发
      this.$router.replace({ path: '/shop' })
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
.item-qty { font-size: 0.85rem; color: var(--text-secondary); }
.item-price { font-family: 'Space Grotesk', sans-serif; font-weight: 600; color: var(--primary); }
.remove-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0.4rem; border-radius: 6px; transition: all 0.3s; }
.remove-btn:hover { background: rgba(255, 107, 107, 0.1); color: #ff6b6b; }
.remove-btn svg { width: 16px; height: 16px; }
.cart-empty { padding: 3rem; text-align: center; color: var(--text-muted); }
.empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
.cart-footer { padding: 1.5rem; border-top: 1px solid var(--border); }
.cart-summary { display: flex; justify-content: space-between; margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem; }
.cart-summary .total strong { font-family: 'Space Grotesk', sans-serif; font-size: 1.25rem; color: var(--primary); }
.btn-checkout { width: 100%; background: var(--gradient-1); border: none; color: var(--bg-dark); padding: 1rem; font-size: 1rem; font-weight: 600; border-radius: 12px; cursor: pointer; transition: all 0.3s; }
.btn-checkout:hover { box-shadow: 0 8px 30px var(--primary-glow); }
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
.order-status.paid { background: rgba(0, 217, 165, 0.15); color: var(--primary); }
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

/* 购物车勾选与数量调节 */
.item-check { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; flex-shrink: 0; }
.cart-qty { flex-shrink: 0; }
.cart-qty button { width: 28px; height: 28px; }
.cart-qty button:disabled { opacity: 0.35; cursor: not-allowed; }
.cart-qty span { width: 36px; font-size: 0.85rem; }
.qty-stock { font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem; }
.qty-controls button:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-go-shopping { margin-top: 1rem; background: var(--gradient-1); border: none; color: var(--bg-dark); padding: 0.7rem 1.6rem; font-size: 0.9rem; font-weight: 600; border-radius: 10px; cursor: pointer; }
.cart-footer { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.select-all { display: flex; align-items: center; gap: 0.4rem; color: var(--text-secondary); font-size: 0.85rem; cursor: pointer; }
.select-all input { accent-color: var(--primary); cursor: pointer; }
.btn-remove-selected { background: rgba(255, 107, 107, 0.1); border: 1px solid rgba(255, 107, 107, 0.3); color: #ff6b6b; padding: 0.5rem 0.9rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; }
.btn-remove-selected:disabled { opacity: 0.5; cursor: not-allowed; }
.cart-footer .cart-summary { display: flex; gap: 1rem; margin-bottom: 0; margin-left: auto; }
.cart-footer .btn-checkout { width: auto; padding: 0.75rem 1.6rem; }
.btn-checkout:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

/* 结算弹窗商品明细 */
.checkout-items-preview { display: flex; flex-direction: column; gap: 0.5rem; max-height: 180px; overflow-y: auto; }
.checkout-item { display: flex; align-items: center; gap: 0.6rem; background: rgba(255, 255, 255, 0.04); border-radius: 8px; padding: 0.5rem 0.7rem; font-size: 0.82rem; }
.checkout-item .item-icon { font-size: 1.1rem; }
.checkout-item .item-name { flex: 1; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.checkout-item .item-qty { color: var(--text-muted); }
.checkout-item .item-amount { font-weight: 600; color: var(--primary); }
.checkout-empty { text-align: center; color: var(--text-muted); padding: 1.5rem 0; }
.checkout-empty .empty-icon { font-size: 2.5rem; opacity: 0.5; margin-bottom: 0.5rem; }

/* 订单状态与操作 */
.order-status.paid { background: rgba(0, 217, 165, 0.15); color: var(--primary); }
.order-status.pending { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
.order-status.shipped { background: rgba(79, 172, 254, 0.15); color: #4facfe; }
.order-status.cancelled { background: rgba(108, 117, 125, 0.15); color: #8a8a9a; }
.order-footer-right { display: flex; align-items: center; gap: 0.75rem; }
.order-action-btn { padding: 0.35rem 0.8rem; border-radius: 8px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
.order-action-btn.default { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); color: var(--text-primary); }
.order-action-btn.default:hover { border-color: var(--primary); color: var(--primary); }
.order-action-btn.danger { background: rgba(255, 107, 107, 0.1); border: 1px solid rgba(255, 107, 107, 0.3); color: #ff6b6b; }
.order-action-btn.danger:hover { background: rgba(255, 107, 107, 0.2); }
</style>