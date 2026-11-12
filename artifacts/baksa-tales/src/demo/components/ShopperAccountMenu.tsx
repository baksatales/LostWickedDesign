import { useEffect, useRef, useState } from 'react';
import './storefront-components.css';

export type ShopperAccountDestination = 'orders' | 'classes' | 'wishlist' | 'addresses';

export interface ShopperAccountMenuProps {
  displayName: string;
  displayState: 'verified' | 'sample';
  onNavigate: (destination: ShopperAccountDestination) => void;
  onSignOut: () => void;
  wishlistCount?: number;
}

const items: { label: string; destination: ShopperAccountDestination; testId: string }[] = [
  { label: 'My orders', destination: 'orders', testId: 'account-menu-orders' },
  { label: 'My classes', destination: 'classes', testId: 'account-menu-classes' },
  { label: 'Wishlist', destination: 'wishlist', testId: 'account-menu-wishlist' },
  { label: 'Addresses', destination: 'addresses', testId: 'account-menu-addresses' },
];

export function ShopperAccountMenu({ displayName, displayState, onNavigate, onSignOut, wishlistCount }: ShopperAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === 'ArrowDown' && document.activeElement === triggerRef.current) {
        event.preventDefault();
        firstItemRef.current?.focus();
      }
    };
    const handleOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [open]);

  const navigate = (destination: ShopperAccountDestination) => {
    setOpen(false);
    onNavigate(destination);
  };

  return (
    <div className="bt-account-menu" ref={rootRef} data-testid="shopper-account-menu">
      <button
        ref={triggerRef}
        className="bt-account-menu__trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${displayName}'s account menu`}
        onClick={() => setOpen(value => !value)}
        data-testid="account-menu-trigger"
      >
        <svg className="bt-account-menu__person" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="3.2" /><path d="M5 20c.6-3.5 3.2-5.5 7-5.5s6.4 2 7 5.5" /></svg>
        <span>{displayName}</span>
        {displayState === 'sample' && <span className="bt-account-menu__sample-mark" data-testid="account-menu-sample-status">Sample</span>}
      </button>
      {open && (
        <div className="bt-account-menu__panel" role="menu" aria-label={`${displayName} account options`} data-testid="account-menu-panel">
          {items.map((item, index) => (
            <button
              ref={index === 0 ? firstItemRef : undefined}
              key={item.destination}
              className="bt-account-menu__item"
              type="button"
              role="menuitem"
              onClick={() => navigate(item.destination)}
              data-testid={item.testId}
            >
              <span>{item.label}</span>
              {item.destination === 'wishlist' && typeof wishlistCount === 'number' && <span className="bt-account-menu__count" aria-label={`${wishlistCount} saved items`}>{wishlistCount}</span>}
            </button>
          ))}
          <button className="bt-account-menu__item bt-account-menu__signout" type="button" role="menuitem" onClick={() => { setOpen(false); onSignOut(); }} data-testid="account-menu-sign-out">
            Sign out{displayState === 'sample' ? ' of sample account' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

export default ShopperAccountMenu;
