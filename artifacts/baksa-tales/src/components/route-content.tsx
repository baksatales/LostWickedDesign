import { Suspense, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ErrorBoundary } from './error-boundary';

function RouteLoadError() {
  return (
    <main className="bk-formpage" role="alert">
      <h1>This page could not be opened.</h1>
      <p>The page download may have been interrupted. Reload to try again.</p>
      <button className="bk-btn" onClick={() => window.location.reload()}>Reload page</button>
      <p><Link className="bk-textlink" href="/">Return to the shop</Link></p>
    </main>
  );
}

export function RouteContent({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  return (
    <ErrorBoundary resetKey={path} FallbackComponent={RouteLoadError}>
      <Suspense fallback={
        <main className="bk-formpage" aria-busy="true">
          <div className="bk-skeleton" />
          <p role="status">Opening this page…</p>
        </main>
      }>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
