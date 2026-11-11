import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from 'react';
import { Link } from 'wouter';
import { createClient, type User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { getGetWorkspaceQueryKey, setAuthTokenGetter, useGetRuntime, useGetWorkspace, type SiteDocument } from '@workspace/api-client-react';
import SiteStudio from '../pages/SiteStudio';
import { resetAccountQueries } from '../lib/account-query-cache';
import './studio.css';

export default function StudioRoute({ localOnly = false, preview }: {
  localOnly?: boolean;
  preview: (document: SiteDocument, storyId?: string) => ReactNode;
}) {
  const runtime = useGetRuntime({ query: { retry: false } });
  const queryClient = useQueryClient();
  const config = runtime.data;
  const client = useMemo(() => !localOnly && config?.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey) : null,
  [localOnly, config?.supabaseUrl, config?.supabaseAnonKey]);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setReady(false);
    if (!client) { setReady(true); return; }
    let mounted = true;
    setAuthTokenGetter(async () => (await client.auth.getSession()).data.session?.access_token ?? null);
    void client.auth.getSession().then(({ data, error }) => {
      if (mounted) { setUser(error ? null : data.session?.user ?? null); setReady(true); }
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      resetAccountQueries(queryClient);
    });
    return () => { mounted = false; subscription.unsubscribe(); setAuthTokenGetter(null); };
  }, [client, queryClient]);
  const workspace = useGetWorkspace({ query: {
    enabled: !localOnly && ready && !!user,
    queryKey: [...getGetWorkspaceQueryKey(), 'studio', user?.id ?? 'anonymous'],
    retry: false,
  } });
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || busy) return;
    setBusy(true); setNotice('');
    const fields = new FormData(event.currentTarget);
    try {
      const result = await client.auth.signInWithPassword({
        email: String(fields.get('email') ?? '').trim(),
        password: String(fields.get('password') ?? ''),
      });
      setNotice(result.error ? result.error.message : 'Signed in. Checking administrator access…');
    } catch { setNotice('Sign-in could not be completed. No access has been granted.'); }
    finally { setBusy(false); }
  }
  const verified = !!(user?.email_confirmed_at || user?.phone_confirmed_at);
  const allowed = verified && workspace.data?.roles.includes('admin');
  const loading = runtime.isLoading || (!localOnly && (!ready || (!!user && workspace.isLoading)));
  let content: ReactNode;
  if (localOnly) {
    content = <SiteStudio localOnly preview={preview} />;
  } else if (loading) {
    content = <div className="studio-entry" role="status">Checking the existing Site Studio connection…</div>;
  } else if (!client || runtime.isError) {
    content = <div className="studio-entry"><h1>Site Studio</h1><p>Live editorial storage is not available. No content has been saved or published.</p><p>You can edit a browser-only draft and preview every homepage field without changing the marketplace.</p><Link href="/studio-preview">Open the local design playground →</Link></div>;
  } else if (!user) {
    content = <div className="studio-entry"><h1>Site Studio</h1><p>Use your existing verified Baksa admin account. This does not create an account or grant a role.</p>
      <form onSubmit={signIn}><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to Site Studio'}</button></form>
      {notice && <p role="status">{notice}</p>}<p><Link href="/studio-preview">Open the local design playground instead →</Link></p></div>;
  } else if (!allowed) {
    content = <div className="studio-entry"><h1>Site Studio is protected</h1><p>{workspace.isError ? 'Account permissions could not be verified. Nothing has been saved.' : 'Only a verified Baksa administrator can save or publish editorial content.'}</p>
      <button onClick={() => { void client.auth.signOut(); }}>Sign out</button><p><Link href="/studio-preview">Open the local design playground →</Link></p></div>;
  } else {
    content = <SiteStudio verifiedUser={verified} aiAvailable={!!config?.ai} preview={preview} />;
  }
  return <div className="homepage-studio"><div style={{ padding: '18px 24px' }}><Link href="/">← Back to Baksa Tales</Link></div>{content}</div>;
}
