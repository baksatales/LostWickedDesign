import { afterEach, expect, test, vi } from 'vitest';
import { act, lazy } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BaksaApp from '../src/pages/BaksaApp';
import { RouteContent } from '../src/components/route-content';
import { starterDocument } from '../src/pages/starter-document';

const state = vi.hoisted(() => ({
  path: '/',
  loaded: [] as string[],
}));
vi.mock('wouter', async importOriginal => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => [state.path, vi.fn()] };
});
vi.mock('../src/pages/MakerArea', () => {
  state.loaded.push('maker');
  return { default: () => <div>Maker module</div> };
});
vi.mock('../src/pages/AdminArea', () => {
  state.loaded.push('admin');
  return { default: () => <div>Admin module</div> };
});
vi.mock('../src/pages/SiteStudio', () => {
  state.loaded.push('studio');
  return { default: () => <div>Local studio module</div> };
});
vi.mock('@workspace/api-client-react', async importOriginal => {
  const actual = await importOriginal<typeof import('@workspace/api-client-react')>();
  return {
    ...actual,
    useGetSite: () => ({ data: { document: starterDocument() }, isError: false }),
    useGetCatalog: () => ({ data: { products: [], makers: [], sample: true }, isError: false }),
    // Deliberately unconfigured: no synthetic account, session, or role.
    useGetRuntime: () => ({ data: { auth: false }, isLoading: false }),
    useGetWorkspace: () => ({ data: undefined, isLoading: false }),
  };
});

let root: Root | undefined;
let container: HTMLDivElement;
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

async function render(content = <BaksaApp />) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(async () => root!.render(
    <QueryClientProvider client={client}>{content}</QueryClientProvider>,
  ));
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.body.innerHTML = '';
  client.clear();
});

test('public browsing and protected setup screens do not request private modules', async () => {
  for (const [path, text] of [
    ['/', 'Open the baksa'],
    ['/shop', 'The considered edit.'],
    ['/makers', 'Maker listings are sample catalogue entries.'],
    ['/stories/tathaastu', 'A blue lotus, held in brass'],
    ['/gift-finder', 'Who is the lucky person?'],
    ['/maker', 'Access is not connected.'],
    ['/maker/products/new', 'Access is not connected.'],
    ['/admin', 'Access is not connected.'],
    ['/admin/site', 'Access is not connected.'],
    ['/account', 'Access is not connected.'],
  ]) {
    state.path = path;
    await render();
    expect(container.textContent, path).toContain(text);
    expect(state.loaded, path).toEqual([]);
    expect(container.querySelector('header')).not.toBeNull();
  }
  state.path = '/studio-preview';
  await render();
  await act(async () => { await vi.waitFor(() => expect(state.loaded).toEqual(['studio'])); });
  await render();
  expect(container.textContent).toContain('Local studio module');
});

test('a pending route download shows an accessible loading state, then its content', async () => {
  let finish!: (value: { default: () => React.JSX.Element }) => void;
  const Page = lazy(() => new Promise<{ default: () => React.JSX.Element }>(resolve => { finish = resolve; }));
  await render(<RouteContent><Page /></RouteContent>);
  expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  expect(container.querySelector('[role="status"]')?.textContent).toContain('Opening this page');
  await act(async () => { finish({ default: () => <h1>Downloaded page</h1> }); });
  expect(container.textContent).toContain('Downloaded page');
  expect(container.querySelector('[aria-busy="true"]')).toBeNull();
});

test('a failed download offers reload and can recover by navigating away', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const Page = lazy(() => Promise.reject(new Error('Interrupted chunk download')));
    state.path = '/studio-preview';
    await render(<RouteContent><Page /></RouteContent>);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('This page could not be opened.');
    expect(container.querySelector('button')?.textContent).toBe('Reload page');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/');
    state.path = '/shop';
    await render(<RouteContent><h1>Public shop</h1></RouteContent>);
    expect(container.textContent).toBe('Public shop');
  } finally {
    consoleError.mockRestore();
  }
});
