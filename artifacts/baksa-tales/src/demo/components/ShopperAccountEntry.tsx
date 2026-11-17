import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'wouter';
import { createClient } from '@supabase/supabase-js';
import { endSampleSession, getSampleSession, useGetRuntime, useGetWorkspace, getGetWorkspaceQueryKey } from '@workspace/api-client-react';
import { SAMPLE_SESSION_KEY } from '../SampleAccount';
import { getState, subscribe } from '../store';
import { ShopperAccountMenu, type ShopperAccountDestination } from './ShopperAccountMenu';
import './storefront-components.css';

type ShopperSample = { token: string; displayName: string };

interface ShopperAccountEntryProps {
  navigate: (path: string) => void;
  wishlistCount?: number;
  className?: string;
}

const destinationPath: Record<ShopperAccountDestination, string> = {
  orders: '/account/orders',
  classes: '/account/classes',
  wishlist: '/account/wishlist',
  addresses: '/account/addresses',
};

export function ShopperAccountEntry({ navigate, wishlistCount, className = '' }: ShopperAccountEntryProps) {
  const [shopper, setShopper] = useState<ShopperSample | null>(null);
  const [notice, setNotice] = useState('');
  const [realUser, setRealUser] = useState<{id:string;email?:string}|null>(null);
  const state = useSyncExternalStore(subscribe, getState);
  const savedCount = wishlistCount ?? state.wishlist.length;
  const [currentPath] = useLocation();
  const RETURNABLE = ['/sell', '/maker', '/admin', '/account'];
  const signInHref = RETURNABLE.some(p => currentPath === p || currentPath.startsWith(p + '/'))
    ? `/sign-in?returnTo=${encodeURIComponent(currentPath)}`
    : '/sign-in';

  const runtimeQuery = useGetRuntime();
  const runtime = runtimeQuery.data;
  const supabase = useMemo(() => {
    if (runtime?.auth && runtime.supabaseUrl && runtime.supabaseAnonKey) {
      return createClient(runtime.supabaseUrl, runtime.supabaseAnonKey);
    }
    return null;
  }, [runtime?.auth, runtime?.supabaseUrl, runtime?.supabaseAnonKey]);

  const workspaceQuery = useGetWorkspace({ query: { queryKey: [...getGetWorkspaceQueryKey(), realUser?.id ?? null], enabled: !!realUser && !!supabase } });
  const workspace = workspaceQuery.data;

  useEffect(() => {
    if (!supabase) { setRealUser(null); return; }
    supabase.auth.getSession().then(({ data }) => {
      setRealUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setRealUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const refresh = useCallback(async () => {
    let token: string | null = null;
    try { token = localStorage.getItem(SAMPLE_SESSION_KEY); } catch { /* storage may be unavailable */ }
    if (!token) { setShopper(null); setNotice(''); return; }
    try {
      const identity = await getSampleSession({ headers: { authorization: `Bearer ${token}` } });
      setShopper(identity.role === 'shopper' ? { token, displayName: identity.displayName } : null);
      setNotice('');
    } catch {
      setShopper(null);
      setNotice('Shopper account status could not be checked. Sign in again to continue.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const check = () => { if (active) void refresh(); };
    check();
    window.addEventListener('storage', check);
    window.addEventListener('bt:sample-session-changed', check);
    return () => {
      active = false;
      window.removeEventListener('storage', check);
      window.removeEventListener('bt:sample-session-changed', check);
    };
  }, [refresh]);

  const signOutReal = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setRealUser(null);
    navigate('/');
  };

  const signOut = async () => {
    if (!shopper) return;
    try {
      await endSampleSession({ headers: { authorization: `Bearer ${shopper.token}` } });
      localStorage.removeItem(SAMPLE_SESSION_KEY);
      window.dispatchEvent(new Event('bt:sample-session-changed'));
      setShopper(null); setNotice('');
      navigate('/account');
    } catch {
      setNotice('Could not confirm sign out. Please try again.');
    }
  };

  const roles = workspace?.roles ?? [];
  const destination = roles.includes('admin') ? '/admin' : roles.includes('maker') ? '/maker' : '/account';
  const displayName = workspace?.buyerProfile?.fullName
    ? workspace.buyerProfile.fullName.split(' ')[0]
    : (realUser?.email?.split('@')[0] ?? 'Account');
  const avatar = roles.includes('admin') ? '🔑'
    : roles.includes('maker') ? '🏺'
    : (workspace?.buyerProfile?.avatarUrl && workspace.buyerProfile.avatarUrl.length <= 4
        ? workspace.buyerProfile.avatarUrl : '🛍️');
  const roleLabel = roles.includes('admin') ? 'Admin' : roles.includes('maker') ? 'Studio' : displayName;

  return (
    <div className={`bt-account-entry ${className}`.trim()} data-testid="shopper-account-entry">
      {realUser ? (
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <a
            href={destination}
            className="bt-account-entry__sign-in"
            onClick={event => { event.preventDefault(); navigate(destination); }}
            aria-label="Your account"
            style={{display:'flex',alignItems:'center',gap:6,textDecoration:'none'}}
          >
            <span style={{fontSize:18,lineHeight:1}}>{avatar}</span>
            <span style={{fontSize:13,fontWeight:600}}>{roleLabel}</span>
          </a>
          <button
            onClick={() => void signOutReal()}
            style={{fontSize:11,opacity:.6,background:'none',border:'none',cursor:'pointer',padding:'2px 6px'}}
            aria-label="Sign out"
          >Sign out</button>
        </div>
      ) : shopper ? (
        <ShopperAccountMenu
          displayName={shopper.displayName}
          displayState="sample"
          wishlistCount={savedCount}
          onNavigate={destination => navigate(destinationPath[destination])}
          onSignOut={() => { void signOut(); }}
        />
      ) : (
        <a
          className="bt-account-entry__sign-in"
          href={signInHref}
          onClick={event => { event.preventDefault(); history.pushState(null, '', signInHref); window.dispatchEvent(new PopStateEvent('popstate')); }}
          data-testid="link-shopper-sign-in"
          aria-label="Sign in to your account"
        >
          <svg className="bt-account-menu__person" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="3.2" /><path d="M5 20c.6-3.5 3.2-5.5 7-5.5s6.4 2 7 5.5" /></svg>
          <span>Sign in</span>
        </a>
      )}
      {notice && <span className="bt-account-entry__notice" role="status">{notice}</span>}
    </div>
  );
}

export default ShopperAccountEntry;
