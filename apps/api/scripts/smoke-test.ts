import assert from 'node:assert/strict';

const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

type Envelope<T> = { success: boolean; data: T };

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiUrl}${path}`, init);
  const body = await response.json().catch(() => null) as Envelope<T> | { error?: { message?: string } } | null;
  return { response, body };
}

async function login(email: string) {
  const { response, body } = await request<{ accessToken: string }>(
    '/api/v1/auth/login',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: process.env.SMOKE_PASSWORD ?? 'Password123', rememberMe: false }) },
  );
  assert.equal(response.status, 200, `${email} should be able to log in`);
  assert.equal((body as Envelope<{ accessToken: string }>).success, true);
  return (body as Envelope<{ accessToken: string }>).data.accessToken;
}

async function main() {
  const ownerToken = await login(process.env.SMOKE_OWNER_EMAIL ?? 'owner@shop.test');
  const employeeToken = await login(process.env.SMOKE_EMPLOYEE_EMAIL ?? 'employee@shop.test');
  const ownerHeaders = { authorization: `Bearer ${ownerToken}` };
  const employeeHeaders = { authorization: `Bearer ${employeeToken}` };

  for (const path of ['/api/v1/auth/me', '/api/v1/dashboard/summary', '/api/v1/products?pageSize=1', '/api/v1/products/inventory/history?pageSize=1', '/api/v1/customers?pageSize=1', '/api/v1/suppliers?pageSize=1', '/api/v1/sales?pageSize=1', '/api/v1/purchases?pageSize=1', '/api/v1/expenses?pageSize=1', '/api/v1/reports/overview', '/api/v1/notifications']) {
    const { response } = await request(path, { headers: ownerHeaders });
    assert.equal(response.status, 200, `owner access failed: ${path}`);
  }

  const productResponse = await request<{ products: { id: string }[] }>('/api/v1/products?pageSize=1', { headers: employeeHeaders });
  assert.equal(productResponse.response.status, 200);
  const productId = (productResponse.body as Envelope<{ products: { id: string }[] }>).data.products[0]?.id;
  assert.ok(productId, 'seed data should contain a product');

  const forbidden = await request(`/api/v1/products/${productId}/stock-out`, { method: 'POST', headers: { ...employeeHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ quantity: 1, reason: 'smoke permission check' }) });
  assert.equal(forbidden.response.status, 403, 'employee stock-out must be forbidden');

  const unauthenticated = await request('/api/v1/dashboard/summary');
  assert.equal(unauthenticated.response.status, 401, 'dashboard must require authentication');
  console.log('API smoke test passed: auth, protected resources, seeded data, and RBAC.');
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
