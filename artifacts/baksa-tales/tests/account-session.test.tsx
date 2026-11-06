import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import userEvent from '@testing-library/user-event';
import { getByRole } from '@testing-library/dom';
import BaksaApp from '../src/pages/BaksaApp';
import { starterDocument } from '../src/pages/starter-document';
import { resetAccountQueries } from '../src/lib/account-query-cache';
import { getGetRuntimeQueryKey, getGetCatalogQueryKey, getGetSiteQueryKey } from '@workspace/api-client-react';

const auth = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; email_confirmed_at: string },
  listeners: new Set<(event: string, session: unknown) => void>(),
  creations: 0,
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    auth.creations++;
    return { auth: {
      getSession: async () => ({ data: { session: auth.user
        ? { user: auth.user, access_token: 'TEST_ONLY_NOT_A_REAL_TOKEN' } : null }, error: null }),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        auth.listeners.add(callback);
        return { data: { subscription: { unsubscribe: () => auth.listeners.delete(callback) } } };
      },
    } };
  },
}));

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let location: ReturnType<typeof memoryLocation>;
const request = vi.fn();
const requests: string[] = [];
const runtime = { auth: true, database: true, payments: false, ai: false,
  supabaseUrl: 'https://example.invalid', supabaseAnonKey: 'sb_publishable_TEST_ONLY' };
const person = (id: string) => ({ id, email: `${id}@example.test`, email_confirmed_at: '2026-01-01T00:00:00Z' });

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  auth.user = person('owner-one');
  auth.listeners.clear();
  auth.creations = 0;
  requests.length = 0;
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  location = memoryLocation({ path: '/', record: true });
  request.mockImplementation(async (input: RequestInfo | URL) => {
    const path = new URL(input instanceof Request ? input.url : String(input), 'http://localhost').pathname;
    requests.push(path);
    const payload = path === '/api/runtime' ? runtime :
      path === '/api/catalog' ? { sample: false, products: [], makers: [] } :
      path === '/api/site' ? { document: starterDocument(), revision: 0 } :
      path === '/api/workspace' ? { roles: ['buyer'], user: auth.user, maker: null, applications: [], products: [] } :
      path === '/api/operations' ? { orders: [], applications: [], briefs: [] } : undefined;
    if (!payload) throw new Error(`Unexpected test request: ${path}`);
    return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', request);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  localStorage.clear();
  auth.listeners.clear();
  vi.unstubAllGlobals();
  request.mockReset();
});
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); }); }
async function emit(user: ReturnType<typeof person> | null) {
  await act(async () => {
    auth.user = user;
    for (const callback of auth.listeners) callback(user ? 'SIGNED_IN' : 'SIGNED_OUT',
      user ? { user, access_token: 'TEST_ONLY_NOT_A_REAL_TOKEN' } : null);
  });
  await settle();
}

test('account reset keeps public connection data but removes all private query results', async () => {
  const publicKeys = [getGetRuntimeQueryKey(), getGetCatalogQueryKey(), getGetSiteQueryKey()];
  for (const key of publicKeys) client.setQueryData(key, { public: true });
  const privateKeys = [['/api/workspace', 'owner-one'], ['/api/operations'], ['/api/site/draft']];
  for (const key of privateKeys) client.setQueryData(key, { private: 'previous user data' });
  await resetAccountQueries(client);
  for (const key of publicKeys) expect(client.getQueryData(key)).toEqual({ public: true });
  for (const key of privateKeys) expect(client.getQueryData(key)).toBeUndefined();
});

test('restoring a signed-in session and switching users does not reload runtime or block navigation', async () => {
  await act(async () => root.render(
    <StrictMode><QueryClientProvider client={client}><Router hook={location.hook}>
      <BaksaApp />
    </Router></QueryClientProvider></StrictMode>,
  ));
  await settle();
  expect(client.getQueryData(getGetRuntimeQueryKey())).toEqual(runtime);
  expect(client.getQueryData(['/api/workspace', 'owner-one'])).toBeDefined();
  const runtimeCalls = requests.filter(path => path === '/api/runtime').length;
  const clientCreations = auth.creations;
  expect(runtimeCalls).toBeLessThanOrEqual(3);
  const user = userEvent.setup({ document });
  await act(async () => { await user.click(getByRole(container.querySelector('header')!, 'link', { name: 'Corporate gifting', exact: true })); });
  await settle();
  expect(location.history.at(-1)).toBe('/corporate');
  expect(container.querySelector('form')).not.toBeNull();
  client.setQueryData(['/api/site/draft'], { private: 'old account draft' });
  await emit(null);
  expect(client.getQueryData(['/api/workspace', 'owner-one'])).toBeUndefined();
  expect(client.getQueryData(['/api/site/draft'])).toBeUndefined();
  await emit(person('owner-two'));
  expect(client.getQueryData(['/api/workspace', 'owner-two'])).toBeDefined();
  expect(client.getQueryData(['/api/workspace', 'owner-one'])).toBeUndefined();
  expect(client.getQueryData(getGetRuntimeQueryKey())).toEqual(runtime);
  expect(requests.filter(path => path === '/api/runtime')).toHaveLength(runtimeCalls);
  expect(auth.creations).toBe(clientCreations);
});
