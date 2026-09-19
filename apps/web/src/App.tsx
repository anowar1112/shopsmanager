import { FormEvent, useEffect, useState } from 'react';
import { formatMoney, loginSchema, type Role } from '@shop/shared';

type User = { name: string; email: string; role: Role; shop: { name: string; currency: string } };
type LoginResponse = { success: true; data: { user: User; accessToken: string } };
type UserResponse = { success: true; data: { user: User } };
type DashboardData = {
  metrics: { sales: number; orders: number; products: number; lowStock: number; expenses: number; profit: number; stockValue: number };
  lowStock: { id: string; name: string; sku: string; stockQuantity: number; minStockLevel: number; unit: string }[];
  recentSales: { id: string; invoiceNo: string; total: number; status: string; createdAt: string; customer: string; employee: string }[];
  recentActivity: { id: string; type: string; detail: string; by: string; createdAt: string }[];
};
type Product = { id: string; name: string; sku: string; unit: string; costPrice: number; sellingPrice: number; stockQuantity: number; minStockLevel: number; stockStatus: string; category: { name: string } };
type InventoryRow = { id: string; type: string; quantityChange: number; stockBefore: number; stockAfter: number; note: string | null; createdAt: string; changedBy: string; product: { name: string; sku: string; unit: string } };
type CartItem = Product & { quantity: number };

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('owner@shop.test');
  const [password, setPassword] = useState('Password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState<'dashboard' | 'products' | 'inventory' | 'sales'>('dashboard');

  useEffect(() => {
    const savedToken = localStorage.getItem('shop_access_token');
    if (savedToken) {
      void loadUser(savedToken);
      return;
    }
    void refreshSession();
  }, []);

  async function loadUser(accessToken: string) {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });
    if (response.ok) {
      const body = (await response.json()) as UserResponse;
      setUser(body.data.user);
      return true;
    }
    localStorage.removeItem('shop_access_token');
    return false;
  }

  async function refreshSession() {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!response.ok) return;
      const body = (await response.json()) as { success: true; data: { accessToken: string } };
      localStorage.setItem('shop_access_token', body.data.accessToken);
      await loadUser(body.data.accessToken);
    } catch {
      // An absent refresh cookie simply means the visitor needs to sign in.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const parsed = loginSchema.safeParse({ email, password, rememberMe });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as LoginResponse | { error?: { message?: string } };
      if (!response.ok || !('success' in body) || !body.success) {
        throw new Error('error' in body ? body.error?.message : 'Unable to sign in');
      }
      localStorage.setItem('shop_access_token', body.data.accessToken);
      setUser(body.data.user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  if (user) return screen === 'products' ? <Products user={user} onHome={() => setScreen('dashboard')} onInventory={() => setScreen('inventory')} onSales={() => setScreen('sales')} onSignOut={async () => { await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }); localStorage.removeItem('shop_access_token'); setUser(null); }} /> : screen === 'inventory' ? <Inventory user={user} onHome={() => setScreen('dashboard')} onProducts={() => setScreen('products')} onSales={() => setScreen('sales')} onSignOut={async () => { await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }); localStorage.removeItem('shop_access_token'); setUser(null); }} /> : screen === 'sales' ? <Sales user={user} onHome={() => setScreen('dashboard')} onProducts={() => setScreen('products')} onSignOut={async () => { await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }); localStorage.removeItem('shop_access_token'); setUser(null); }} /> : <Dashboard user={user} onProducts={() => setScreen('products')} onInventory={() => setScreen('inventory')} onSales={() => setScreen('sales')} onSignOut={async () => { await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }); localStorage.removeItem('shop_access_token'); setUser(null); }} />;

  return (
    <main className="auth-layout">
      <section className="brand-panel">
        <div className="brand-mark">R</div>
        <p className="eyebrow">RAHMAN STORE / 2026</p>
        <h1>Know your shop.<br /><em>Run it better.</em></h1>
        <p className="brand-copy">A calmer way to keep stock, sales and the daily rhythm of your store in view.</p>
        <div className="signal-line"><span /> Live workspace <strong>Dhaka · BDT</strong></div>
        <div className="receipt-preview" aria-hidden="true">
          <div className="receipt-top"><span>DAILY TILL</span><b>৳ 48,260</b></div>
          <div className="receipt-bars"><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="receipt-foot"><span>SALES TODAY</span><span>+18.4%</span></div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-mark">R</div>
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Good to see you.</h2>
          <p className="login-intro">Sign in to pick up where your store left off.</p>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">Work email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@shop.test" />
            <div className="label-row"><label htmlFor="password">Password</label><button type="button" className="text-button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? 'Hide' : 'Show'}</button></div>
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <label className="checkbox-label"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Keep me signed in</span></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="submit-button" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Enter workspace'} <span aria-hidden="true">↗</span></button>
          </form>
          <p className="secure-note"><span>●</span> Your workspace is protected with secure session cookies.</p>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ user, onProducts, onInventory, onSales, onSignOut }: { user: User; onProducts: () => void; onInventory: () => void; onSales: () => void; onSignOut: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('shop_access_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/dashboard/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Dashboard data could not be loaded');
        return (await response.json() as { success: true; data: DashboardData }).data;
      })
      .then(setData)
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Dashboard data could not be loaded'));
  }, []);

  const metrics = data?.metrics;
  return <main className="dashboard">
    <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark small">R</div><span>Rahman Store</span></div><nav>{['Overview', 'Products', 'Inventory', 'Sales / POS', 'Purchases', 'Customers', 'Expenses', 'Reports'].map((item, index) => <button onClick={index === 1 ? onProducts : index === 2 ? onInventory : index === 3 ? onSales : undefined} className={index === 0 ? 'nav-item active' : 'nav-item'} key={item}><span>{['⌂', '□', '▦', '＋', '↗', '◎', '◌', '▥'][index]}</span>{item}</button>)}</nav><button className="nav-item sign-out" onClick={onSignOut}>↪ <span>Sign out</span></button></aside>
    <section className="dashboard-main"><header className="dashboard-header"><div><p className="eyebrow">{user.role} WORKSPACE</p><span className="mobile-shop-name">Rahman Store</span></div><div className="header-actions"><span className="notification">○</span><button className="mobile-sign-out" onClick={onSignOut}>Sign out</button></div></header>
      <section className="dashboard-content"><h1>Good morning, {user.name.split(' ')[0]}.</h1><p className="dashboard-copy">Here is what is happening across your shop today.</p>{error && <p className="dashboard-error" role="alert">{error}</p>}
        {!data ? <div className="dashboard-loading"><span /> Loading today’s numbers...</div> : <>
          <div className="metric-grid"><article><span>Today’s sales</span><strong>{formatMoney(metrics!.sales)}</strong><small>{metrics!.orders} completed orders</small></article><article><span>Estimated profit</span><strong>{formatMoney(metrics!.profit)}</strong><small>After today’s expenses</small></article><article><span>Inventory value</span><strong>{formatMoney(metrics!.stockValue)}</strong><small>{metrics!.products} active products</small></article><article><span>Low stock</span><strong>{String(metrics!.lowStock).padStart(2, '0')}</strong><small>Items need attention</small></article></div>
          <div className="dashboard-columns"><section className="dashboard-section sales-section"><div className="section-heading"><div><p className="eyebrow">RECENT SALES</p><h2>Today at a glance</h2></div><button className="quiet-button">View all ↗</button></div>{data.recentSales.length === 0 ? <p className="empty-state">No sales recorded today.</p> : <div className="sales-list">{data.recentSales.map((sale) => <div className="sale-row" key={sale.id}><div className="sale-avatar">{sale.customer.slice(0, 1)}</div><div><strong>{sale.customer}</strong><small>{sale.invoiceNo} · {sale.employee}</small></div><b>{formatMoney(sale.total)}</b></div>)}</div>}</section><section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">INVENTORY WATCH</p><h2>Low stock</h2></div><button className="quiet-button">Manage ↗</button></div>{data.lowStock.length === 0 ? <p className="empty-state">Everything is well stocked.</p> : <div className="stock-list">{data.lowStock.map((product) => <div className="stock-row" key={product.id}><div><strong>{product.name}</strong><small>{product.sku}</small></div><span className={product.stockQuantity === 0 ? 'stock-critical' : 'stock-warning'}>{product.stockQuantity} {product.unit}<small>min {product.minStockLevel}</small></span></div>)}</div>}</section></div>
        </>}
        <div className="status-strip"><span className="status-dot" /> Live data <span className="divider" /> Signed in as {user.email}</div>
      </section></section><nav className="mobile-nav"><button className="active">⌂<small>Home</small></button><button>＋<small>Sale</small></button><button>□<small>Products</small></button><button>≡<small>More</small></button></nav>
  </main>;
}

function Products({ user, onHome, onInventory, onSales, onSignOut }: { user: User; onHome: () => void; onInventory: () => void; onSales: () => void; onSignOut: () => void }) {
  void onSales;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', categoryId: '', costPrice: '', sellingPrice: '', openingStock: '0', minStockLevel: '5' });

  useEffect(() => {
    const token = localStorage.getItem('shop_access_token');
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '100', q: query });
    fetch(`${API_URL}/api/v1/products?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Products could not be loaded');
        const data = (await response.json() as { success: true; data: { products: Product[]; categories: { id: string; name: string }[] } }).data;
        setCategories(data.categories);
        return data.products;
      })
      .then(setProducts)
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Products could not be loaded'))
      .finally(() => setLoading(false));
  }, [query]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const token = localStorage.getItem('shop_access_token');
    const response = await fetch(`${API_URL}/api/v1/products`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice), openingStock: Number(form.openingStock), minStockLevel: Number(form.minStockLevel), isActive: true }) });
    if (!response.ok) {
      const body = await response.json() as { error?: { message?: string } };
      setError(body.error?.message ?? 'Product could not be created');
      return;
    }
    setShowForm(false);
    setForm({ name: '', sku: '', categoryId: '', costPrice: '', sellingPrice: '', openingStock: '0', minStockLevel: '5' });
    setQuery((value) => value);
    const refreshed = await fetch(`${API_URL}/api/v1/products?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
    if (refreshed.ok) setProducts((await refreshed.json() as { data: { products: Product[] } }).data.products);
  }

  return <main className="dashboard"><aside className="sidebar"><div className="brand-lockup"><div className="brand-mark small">R</div><span>Rahman Store</span></div><nav><button className="nav-item" onClick={onHome}><span>⌂</span>Overview</button><button className="nav-item active"><span>□</span>Products</button><button className="nav-item" onClick={onInventory}><span>▦</span>Inventory</button><button className="nav-item"><span>＋</span>Sales / POS</button></nav><button className="nav-item sign-out" onClick={onSignOut}>↪ <span>Sign out</span></button></aside><section className="dashboard-main"><header className="dashboard-header"><div><p className="eyebrow">{user.role} WORKSPACE</p><span className="mobile-shop-name">Rahman Store</span></div><button className="mobile-sign-out" onClick={onSignOut}>Sign out</button></header><section className="dashboard-content products-content"><div className="products-heading"><div><p className="eyebrow">CATALOGUE</p><h1>Products</h1><p className="dashboard-copy">Keep your shelves, prices and stock in one clear view.</p></div><button className="primary-action" onClick={() => setShowForm(true)}>＋ Add product</button></div><div className="product-toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product name or SKU" /></label><button className="filter-button">All stock⌄</button></div>{error && <p className="dashboard-error">{error}</p>}{loading ? <div className="dashboard-loading"><span /> Loading catalogue...</div> : products.length === 0 ? <div className="empty-panel"><strong>No products found</strong><span>Try a different name or SKU.</span></div> : <div className="product-table"><div className="product-table-head"><span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Status</span></div>{products.map((product) => <div className="product-row" key={product.id}><div><strong>{product.name}</strong><small>{product.sku}</small></div><span className="category-cell">{product.category.name}</span><span>৳ {product.sellingPrice.toLocaleString('en-BD')}</span><span>{product.stockQuantity} {product.unit}<small>min {product.minStockLevel}</small></span><span className={`pill ${product.stockStatus}`}>{product.stockStatus.replace('-', ' ')}</span></div>)}</div>}<div className="status-strip"><span className="status-dot" /> {products.length} products shown <span className="divider" /> Signed in as {user.email}</div></section></section>{showForm && <div className="modal-backdrop"><form className="product-form" onSubmit={createProduct}><div className="modal-heading"><div><p className="eyebrow">NEW CATALOGUE ITEM</p><h2>Add product</h2></div><button type="button" className="modal-close" onClick={() => setShowForm(false)}>×</button></div><label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Samsung Charger 25W" /></label><div className="form-grid"><label>SKU<input required value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="CHG-25W" /></label><label>Category<select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Choose category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Cost price<input required type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => setForm({ ...form, costPrice: event.target.value })} /></label><label>Selling price<input required type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} /></label><label>Opening stock<input type="number" min="0" step="1" value={form.openingStock} onChange={(event) => setForm({ ...form, openingStock: event.target.value })} /></label><label>Minimum stock<input type="number" min="0" step="1" value={form.minStockLevel} onChange={(event) => setForm({ ...form, minStockLevel: event.target.value })} /></label></div><div className="modal-actions"><button type="button" className="quiet-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-action">Create product</button></div></form></div>}<nav className="mobile-nav"><button onClick={onHome}>⌂<small>Home</small></button><button className="active">□<small>Products</small></button><button onClick={onInventory}>▦<small>Stock</small></button><button>≡<small>More</small></button></nav></main>;
}

function Sales({ user, onHome, onProducts, onSignOut }: { user: User; onHome: () => void; onProducts: () => void; onSignOut: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE'>('CASH');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('shop_access_token');
    fetch(`${API_URL}/api/v1/products?pageSize=100&q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } }).then(async (response) => (await response.json() as { data: { products: Product[] } }).data.products).then(setProducts).catch(() => setError('Products could not be loaded'));
  }, [query]);

  function addToCart(product: Product) {
    setError('');
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stockQuantity) } : item);
      return product.stockQuantity > 0 ? [...current, { ...product, quantity: 1 }] : current;
    });
  }
  const total = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  async function completeSale() {
    if (!cart.length) return setError('Add a product to the cart first');
    const token = localStorage.getItem('shop_access_token');
    const response = await fetch(`${API_URL}/api/v1/sales`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ items: cart.map((item) => ({ productId: item.id, quantity: item.quantity, unitPrice: item.sellingPrice, discountAmount: 0 })), paymentMethod, paidAmount: Number(total.toFixed(2)) }) });
    if (!response.ok) { const body = await response.json() as { error?: { message?: string } }; setError(body.error?.message ?? 'Sale could not be completed'); return; }
    const body = await response.json() as { data: { invoiceNo: string; total: number } };
    setCart([]); setMessage(`${body.data.invoiceNo} completed · ${formatMoney(body.data.total)}`); setQuery('');
  }

  return <main className="dashboard"><aside className="sidebar"><div className="brand-lockup"><div className="brand-mark small">R</div><span>Rahman Store</span></div><nav><button className="nav-item" onClick={onHome}><span>⌂</span>Overview</button><button className="nav-item" onClick={onProducts}><span>□</span>Products</button><button className="nav-item active"><span>＋</span>Sales / POS</button></nav><button className="nav-item sign-out" onClick={onSignOut}>↪ <span>Sign out</span></button></aside><section className="dashboard-main"><header className="dashboard-header"><div><p className="eyebrow">{user.role} WORKSPACE</p><span className="mobile-shop-name">Rahman Store</span></div><button className="mobile-sign-out" onClick={onSignOut}>Sign out</button></header><section className="dashboard-content pos-content"><div className="products-heading"><div><p className="eyebrow">QUICK CHECKOUT</p><h1>Sales / POS</h1><p className="dashboard-copy">Find a product, add it to the cart, and close the sale.</p></div></div>{message && <p className="success-message">{message}</p>}{error && <p className="dashboard-error">{error}</p>}<div className="pos-layout"><section className="pos-products"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU" /></label><div className="pos-product-grid">{products.map((product) => <button className="pos-product" key={product.id} onClick={() => addToCart(product)} disabled={product.stockQuantity === 0}><strong>{product.name}</strong><small>{product.sku} · {product.stockQuantity} {product.unit} left</small><b>{formatMoney(product.sellingPrice)}</b></button>)}</div></section><aside className="cart-panel"><div className="section-heading"><div><p className="eyebrow">CURRENT SALE</p><h2>Cart <span>({cart.length})</span></h2></div></div>{cart.length === 0 ? <p className="empty-state">Your cart is ready for the next customer.</p> : <div className="cart-list">{cart.map((item) => <div className="cart-row" key={item.id}><div><strong>{item.name}</strong><small>{formatMoney(item.sellingPrice)} × {item.quantity}</small></div><b>{formatMoney(item.sellingPrice * item.quantity)}</b><button onClick={() => setCart((current) => current.filter((cartItem) => cartItem.id !== item.id))}>×</button></div>)}</div>}<div className="cart-total"><span>Total</span><strong>{formatMoney(total)}</strong></div><div className="payment-options"><span>Payment</span>{(['CASH', 'CARD', 'MOBILE'] as const).map((method) => <button className={paymentMethod === method ? 'payment-button active' : 'payment-button'} key={method} onClick={() => setPaymentMethod(method)}>{method}</button>)}</div><button className="submit-button checkout-button" onClick={() => void completeSale()} disabled={!cart.length}>Complete sale <span>↗</span></button></aside></div></section></section></main>;
}

function Inventory({ user, onHome, onProducts, onSales, onSignOut }: { user: User; onHome: () => void; onProducts: () => void; onSales: () => void; onSignOut: () => void }) {
  void onSales;
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<InventoryRow[]>([]);
  const [productId, setProductId] = useState('');
  const [mode, setMode] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const token = localStorage.getItem('shop_access_token');
    const headers = { Authorization: `Bearer ${token}` };
    const [productResponse, historyResponse] = await Promise.all([fetch(`${API_URL}/api/v1/products?pageSize=100`, { headers }), fetch(`${API_URL}/api/v1/products/inventory/history?pageSize=12`, { headers })]);
    if (!productResponse.ok || !historyResponse.ok) throw new Error('Inventory data could not be loaded');
    const productBody = await productResponse.json() as { data: { products: Product[] } };
    const historyBody = await historyResponse.json() as { data: InventoryRow[] };
    setProducts(productBody.data.products);
    setHistory(historyBody.data);
    if (!productId && productBody.data.products[0]) setProductId(productBody.data.products[0].id);
  }

  useEffect(() => { void load().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Inventory data could not be loaded')); }, []);

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const token = localStorage.getItem('shop_access_token');
    const path = mode === 'IN' ? 'stock-in' : mode === 'OUT' ? 'stock-out' : 'adjust';
    const body = mode === 'ADJUST' ? { countedQuantity: Number(quantity), reason } : mode === 'IN' ? { quantity: Number(quantity), note: reason } : { quantity: Number(quantity), reason };
    try {
      const response = await fetch(`${API_URL}/api/v1/products/${productId}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (!response.ok) { const result = await response.json() as { error?: { message?: string } }; throw new Error(result.error?.message ?? 'Stock movement failed'); }
      setQuantity(''); setReason(''); await load();
    } catch (movementError) { setError(movementError instanceof Error ? movementError.message : 'Stock movement failed'); } finally { setSaving(false); }
  }

  return <main className="dashboard"><aside className="sidebar"><div className="brand-lockup"><div className="brand-mark small">R</div><span>Rahman Store</span></div><nav><button className="nav-item" onClick={onHome}><span>⌂</span>Overview</button><button className="nav-item" onClick={onProducts}><span>□</span>Products</button><button className="nav-item active"><span>▦</span>Inventory</button><button className="nav-item"><span>＋</span>Sales / POS</button></nav><button className="nav-item sign-out" onClick={onSignOut}>↪ <span>Sign out</span></button></aside><section className="dashboard-main"><header className="dashboard-header"><div><p className="eyebrow">{user.role} WORKSPACE</p><span className="mobile-shop-name">Rahman Store</span></div><button className="mobile-sign-out" onClick={onSignOut}>Sign out</button></header><section className="dashboard-content products-content"><div className="products-heading"><div><p className="eyebrow">STOCK CONTROL</p><h1>Inventory</h1><p className="dashboard-copy">Every movement is recorded with who changed it and when.</p></div></div>{error && <p className="dashboard-error">{error}</p>}<form className="movement-panel" onSubmit={submitMovement}><div className="movement-tabs"><button type="button" className={mode === 'IN' ? 'movement-tab active' : 'movement-tab'} onClick={() => setMode('IN')}>Stock in</button><button type="button" className={mode === 'OUT' ? 'movement-tab active' : 'movement-tab'} onClick={() => setMode('OUT')}>Stock out</button><button type="button" className={mode === 'ADJUST' ? 'movement-tab active' : 'movement-tab'} onClick={() => setMode('ADJUST')}>Adjust count</button></div><div className="movement-fields"><label>Product<select required value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Choose product</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.stockQuantity} {product.unit}</option>)}</select></label><label>{mode === 'ADJUST' ? 'Counted quantity' : 'Quantity'}<input required type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><label>{mode === 'IN' ? 'Note' : 'Reason'}<input required minLength={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={mode === 'IN' ? 'Supplier delivery' : 'Explain this change'} /></label><button className="primary-action" disabled={saving}>{saving ? 'Saving...' : 'Record movement'}</button></div></form><section className="dashboard-section inventory-history"><div className="section-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Recent movements</h2></div></div>{history.length === 0 ? <p className="empty-state">No inventory movements yet.</p> : <div className="history-list">{history.map((row) => <div className="history-row" key={row.id}><div><strong>{row.product.name}</strong><small>{row.product.sku} · {row.note ?? 'Stock movement'}</small></div><span className={`pill ${row.type === 'IN' ? 'in-stock' : row.type === 'OUT' ? 'out-of-stock' : 'low-stock'}`}>{row.type} {row.quantityChange > 0 ? `+${row.quantityChange}` : row.quantityChange}</span><div><strong>{row.stockAfter} {row.product.unit}</strong><small>{row.changedBy} · {new Date(row.createdAt).toLocaleDateString('en-BD')}</small></div></div>)}</div>}</section></section></section><nav className="mobile-nav"><button onClick={onHome}>⌂<small>Home</small></button><button onClick={onProducts}>□<small>Products</small></button><button className="active">▦<small>Stock</small></button><button>≡<small>More</small></button></nav></main>;
}

export default App;
