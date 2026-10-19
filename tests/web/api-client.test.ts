import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiClient, ApiError } from '../../apps/web/src/lib/api.ts';

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('concurrent unauthorized requests share a refresh and each retry once', async () => {
  let refreshes = 0;
  let refreshed = false;
  const calls: string[] = [];
  const client = new ApiClient('/test', async (input, init) => {
    const url = String(input);
    calls.push(url);
    assert.equal(init?.credentials, 'include');
    assert.equal((init?.headers as Record<string, string>)['x-nexus-csrf'], '1');
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      refreshed = true;
      return json({ ok: true });
    }
    return refreshed ? json({ url }) : json({ message: 'Unauthorized' }, 401);
  });
  const result = await Promise.all([client.get('/auth/me'), client.get('/leads')]);
  assert.equal(refreshes, 1);
  assert.deepEqual(result, [{ url: '/test/auth/me' }, { url: '/test/leads' }]);
  assert.equal(calls.filter((url) => url.endsWith('/leads')).length, 2);
});

test('failed refresh and another unauthorized retry cannot loop', async () => {
  for (const refreshStatus of [401, 200]) {
    let requests = 0;
    let refreshes = 0;
    const client = new ApiClient('/test', async (input) => {
      if (String(input).endsWith('/auth/refresh')) {
        refreshes++;
        return json({}, refreshStatus);
      }
      requests++;
      return json({ message: 'Session expired' }, 401);
    });
    await assert.rejects(
      client.get('/leads'),
      (error: unknown) => error instanceof ApiError && error.status === 401,
    );
    assert.equal(refreshes, 1);
    assert.equal(requests, refreshStatus === 200 ? 2 : 1);
  }
});

test('invalid login preserves its error and does not refresh the session', async () => {
  const calls: string[] = [];
  const client = new ApiClient('/test', async (input, init) => {
    calls.push(String(input));
    assert.equal(init?.method, 'POST');
    assert.equal(init?.body, JSON.stringify({ email: 'user@example.test', password: 'invalid' }));
    return json({ message: ['Invalid credentials', 'Try again'] }, 401);
  });
  await assert.rejects(
    client.post('/auth/login', { email: 'user@example.test', password: 'invalid' }),
    (error: unknown) =>
      error instanceof ApiError && error.message === 'Invalid credentials. Try again',
  );
  assert.deepEqual(calls, ['/test/auth/login']);
});

test('mutations preserve CSRF headers, JSON payloads, and empty responses', async () => {
  const client = new ApiClient('/test', async (_input, init) => {
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers['x-nexus-csrf'], '1');
    if (init?.method === 'PATCH') {
      assert.equal(headers['Content-Type'], 'application/json');
      assert.equal(init.body, JSON.stringify({ status: 'COMPLETED' }));
    }
    return new Response(null, { status: 204 });
  });
  assert.equal(await client.patch('/tasks/task-id', { status: 'COMPLETED' }), undefined);
  assert.equal(await client.delete('/tasks/task-id'), undefined);
});

test('network failures have the existing actionable API error', async () => {
  const client = new ApiClient('/test', async () => {
    throw new TypeError('Network failure');
  });
  await assert.rejects(
    client.get('/leads'),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 0 &&
      error.message.includes('Check that the API is running'),
  );
});

test('CSV downloads and JSON requests share the same refresh lock', async (t) => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let clicked = false;
  const link = {
    href: '',
    download: '',
    click: () => {
      clicked = true;
    },
  };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => link },
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:test-export');
  const revoke = t.mock.method(URL, 'revokeObjectURL', () => {});
  let refreshed = false;
  let refreshes = 0;
  const client = new ApiClient('/test', async (input) => {
    const url = String(input);
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      refreshed = true;
      return json({ ok: true });
    }
    if (!refreshed) return json({}, 401);
    return url.endsWith('/reports/export') ? new Response('id\n1') : json({ records: [] });
  });
  try {
    await Promise.all([client.get('/leads'), client.download('/reports/export', 'sales.csv')]);
    assert.equal(refreshes, 1);
    assert.equal(clicked, true);
    assert.equal(link.download, 'sales.csv');
    assert.equal(link.href, 'blob:test-export');
    assert.equal(revoke.mock.callCount(), 1);
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
