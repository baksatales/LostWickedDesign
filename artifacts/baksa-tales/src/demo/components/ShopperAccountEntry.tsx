import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { endSampleSession, getSampleSession } from '@workspace/api-client-react';
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
  const state = useSyncExternalStore(subscribe, getState);
  const savedCount = wishlistCount ?? state.wishlist.length;

  const refresh = useCallback(async () => {
    let token: string | null = null;
    try { token = localStorage.getItem(SAMPLE_SESSION_KEY); } catch { /* storage may be unavailable */ }
    if (!token) {
      setShopper(null);
      setNotice('');
      return;
    }
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

  const signOut = async () => {
    if (!shopper) return;
    try {
      await endSampleSession({ headers: { authorization: `Bearer ${shopper.token}` } });
      localStorage.removeItem(SAMPLE_SESSION_KEY);
      window.dispatchEvent(new Event('bt:sample-session-changed'));
      setShopper(null);
      setNotice('');
      navigate('/account');
    } catch {
      setNotice('Could not confirm sign out. Please try again.');
    }
  };

  return (
    <div className={`bt-account-entry ${className}`.trim()} data-testid="shopper-account-entry">
      {shopper ? (
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
          href="/account"
          onClick={event => { event.preventDefault(); navigate('/account'); }}
          data-testid="link-shopper-sign-in"
          aria-label="Sign in to your shopper account"
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
