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

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('owner@shop.test');
  const [password, setPassword] = useState('Password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState<'dashboard' | 'products'>('dashboard');

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

  if (user) return screen === 'products' ? <Products user={user} onHome={() => setScreen('dashboard')} onSignOut={async () => { await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }); localStorage.removeItem('shop_access_token'); setUser(null); }} /> : <Dashboard user={user} onProducts={() => setScreen('products')} onSignOut={async () => { await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }); localStorage.removeItem('shop_access_token'); setUser(null); }} />;

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

function Dashboard({ user, onProducts, onSignOut }: { user: User; onProducts: () => void; onSignOut: () => void }) {
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
    <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark small">R</div><span>Rahman Store</span></div><nav>{['Overview', 'Products', 'Inventory', 'Sales / POS', 'Purchases', 'Customers', 'Expenses', 'Reports'].map((item, index) => <button onClick={index === 1 ? onProducts : undefined} className={index === 0 ? 'nav-item active' : 'nav-item'} key={item}><span>{['⌂', '□', '▦', '＋', '↗', '◎', '◌', '▥'][index]}</span>{item}</button>)}</nav><button className="nav-item sign-out" onClick={onSignOut}>↪ <span>Sign out</span></button></aside>
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

function Products({ user, onHome, onSignOut }: { user: User; onHome: () => void; onSignOut: () => void }) {
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

  return <main className="dashboard"><aside className="sidebar"><div className="brand-lockup"><div className="brand-mark small">R</div><span>Rahman Store</span></div><nav><button className="nav-item" onClick={onHome}><span>⌂</span>Overview</button><button className="nav-item active"><span>□</span>Products</button><button className="nav-item"><span>▦</span>Inventory</button><button className="nav-item"><span>＋</span>Sales / POS</button></nav><button className="nav-item sign-out" onClick={onSignOut}>↪ <span>Sign out</span></button></aside><section className="dashboard-main"><header className="dashboard-header"><div><p className="eyebrow">{user.role} WORKSPACE</p><span className="mobile-shop-name">Rahman Store</span></div><button className="mobile-sign-out" onClick={onSignOut}>Sign out</button></header><section className="dashboard-content products-content"><div className="products-heading"><div><p className="eyebrow">CATALOGUE</p><h1>Products</h1><p className="dashboard-copy">Keep your shelves, prices and stock in one clear view.</p></div><button className="primary-action" onClick={() => setShowForm(true)}>＋ Add product</button></div><div className="product-toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product name or SKU" /></label><button className="filter-button">All stock⌄</button></div>{error && <p className="dashboard-error">{error}</p>}{loading ? <div className="dashboard-loading"><span /> Loading catalogue...</div> : products.length === 0 ? <div className="empty-panel"><strong>No products found</strong><span>Try a different name or SKU.</span></div> : <div className="product-table"><div className="product-table-head"><span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Status</span></div>{products.map((product) => <div className="product-row" key={product.id}><div><strong>{product.name}</strong><small>{product.sku}</small></div><span className="category-cell">{product.category.name}</span><span>৳ {product.sellingPrice.toLocaleString('en-BD')}</span><span>{product.stockQuantity} {product.unit}<small>min {product.minStockLevel}</small></span><span className={`pill ${product.stockStatus}`}>{product.stockStatus.replace('-', ' ')}</span></div>)}</div>}<div className="status-strip"><span className="status-dot" /> {products.length} products shown <span className="divider" /> Signed in as {user.email}</div></section></section>{showForm && <div className="modal-backdrop"><form className="product-form" onSubmit={createProduct}><div className="modal-heading"><div><p className="eyebrow">NEW CATALOGUE ITEM</p><h2>Add product</h2></div><button type="button" className="modal-close" onClick={() => setShowForm(false)}>×</button></div><label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Samsung Charger 25W" /></label><div className="form-grid"><label>SKU<input required value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="CHG-25W" /></label><label>Category<select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Choose category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Cost price<input required type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => setForm({ ...form, costPrice: event.target.value })} /></label><label>Selling price<input required type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} /></label><label>Opening stock<input type="number" min="0" step="1" value={form.openingStock} onChange={(event) => setForm({ ...form, openingStock: event.target.value })} /></label><label>Minimum stock<input type="number" min="0" step="1" value={form.minStockLevel} onChange={(event) => setForm({ ...form, minStockLevel: event.target.value })} /></label></div><div className="modal-actions"><button type="button" className="quiet-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-action">Create product</button></div></form></div>}<nav className="mobile-nav"><button onClick={onHome}>⌂<small>Home</small></button><button className="active">□<small>Products</small></button><button>＋<small>Sale</small></button><button>≡<small>More</small></button></nav></main>;
}

export default App;
