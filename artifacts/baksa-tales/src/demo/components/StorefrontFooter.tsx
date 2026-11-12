import { useState, type FormEvent, type MouseEvent } from 'react';
import './storefront-components.css';

export interface StorefrontFooterLink {
  label: string;
  href: string;
}

export interface StorefrontFooterGroup {
  title: string;
  links: StorefrontFooterLink[];
}

export interface StorefrontFooterProps {
  brandName?: string;
  brandMark?: string;
  tagline?: string;
  title?: string;
  copy?: string;
  groups?: StorefrontFooterGroup[];
  copyright?: string;
  sampleMode?: boolean;
  onSubmit?: (contact: string) => string | void;
  onNavigate?: (href: string) => void;
  onShowInfo?: (key: string, label: string) => void;
}

const defaultGroups: StorefrontFooterGroup[] = [
  { title: 'Shop', links: [{ label: 'Gift finder', href: '/bea' }, { label: 'The BT Edit', href: '/shop' }, { label: 'Our makers', href: '/makers/tathaastu' }, { label: 'Wishlist', href: '/shop?wishlist=1' }] },
  { title: 'Gifting', links: [{ label: 'Corporate gifting', href: '/corporate' }, { label: 'Keepsake boxes', href: '/corporate' }, { label: 'Wedding gifting', href: '/corporate' }, { label: 'Kala Samāgam', href: '/#kala' }] },
  { title: 'For makers', links: [{ label: 'Sell with Baksa', href: '/maker' }, { label: 'Makers’ Academy', href: '/academy' }, { label: 'Maker sign in', href: '/maker' }] },
  { title: 'Help', links: [{ label: 'Track my order', href: '/account/orders' }, { label: 'Shipping and returns', href: '/#returns' }, { label: 'Questions', href: '/#faq' }, { label: 'Talk to us', href: '/#contact' }] },
];

export function StorefrontFooter({
  brandName = 'Baksa Tales',
  brandMark,
  tagline = 'Dil Se Duniya Tak',
  title = 'Come say namaste.',
  copy = 'New maker tales, first looks at limited drops, and invites to Kala Samāgam, our craft carnival in Delhi NCR.',
  groups = defaultGroups,
  copyright = '© 2026 Baksa Tales, made with love in Delhi NCR',
  sampleMode = false,
  onSubmit,
  onNavigate,
  onShowInfo,
}: StorefrontFooterProps) {
  const [contact, setContact] = useState('');
  const [notice, setNotice] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanContact = contact.trim();
    if (!cleanContact || !onSubmit) return;
    try {
      const result = onSubmit(cleanContact);
      setNotice(result || (sampleMode ? 'Sample preview only. No WhatsApp message is sent.' : 'Thank you.'));
      setContact('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Your details could not be saved.');
    }
  };

  const followLink = (event: MouseEvent<HTMLAnchorElement>, href: string, label: string) => {
    if (href.startsWith('/#')) {
      event.preventDefault();
      const [path, hash] = href.split('#');
      const informationAnchors = new Set(['orders', 'returns', 'faq', 'contact', 'email', 'whatsapp', 'instagram']);
      const currentTarget = document.getElementById(hash);
      if (informationAnchors.has(hash) || (path === window.location.pathname && !currentTarget)) {
        onShowInfo?.(hash, label);
        return;
      }
      if (path && path !== window.location.pathname) onNavigate?.(path);
      window.setTimeout(() => {
        const target = document.getElementById(hash);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        else onShowInfo?.(hash, label);
      }, 0);
      return;
    }
    if (href.startsWith('#')) {
      event.preventDefault();
      onShowInfo?.(href.slice(1), label);
      return;
    }
    if (href.startsWith('/') && onNavigate) {
      event.preventDefault();
      const aliases: Record<string, string> = {
        '/gift-finder': '/bea',
        '/wishlist': '/shop?wishlist=1',
        '/makers': '/makers/tathaastu',
        '/sign-in': '/account',
      };
      onNavigate(aliases[href] || href);
    }
  };

  return (
    <footer className="bt-showcase-footer" data-testid="storefront-footer">
      <svg className="bt-showcase-footer__scallop" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40 Q30 0 60 40 Q90 0 120 40 Q150 0 180 40 Q210 0 240 40 Q270 0 300 40 Q330 0 360 40 Q390 0 420 40 Q450 0 480 40 Q510 0 540 40 Q570 0 600 40 Q630 0 660 40 Q690 0 720 40 Q750 0 780 40 Q810 0 840 40 Q870 0 900 40 Q930 0 960 40 Q990 0 1020 40 Q1050 0 1080 40 Q1110 0 1140 40 Q1170 0 1200 40 Q1230 0 1260 40 Q1290 0 1320 40 Q1350 0 1380 40 Q1410 0 1440 40 Z" />
      </svg>
      <div className="bt-showcase-footer__inner">
        <div className="bt-showcase-footer__intro">
          <div className="bt-showcase-footer__welcome">
            <p className="bt-showcase-footer__tagline" lang="hi">{tagline}</p>
            <h2>{title}</h2>
            <p className="bt-showcase-footer__copy">{copy}</p>
            <div className="bt-showcase-footer__social" aria-label="Baksa Tales contact links">
              <a href="#instagram" onClick={event => followLink(event, '#instagram', 'Instagram')} aria-label="Baksa Tales on Instagram" data-testid="footer-social-instagram"><SocialIcon kind="instagram" /></a>
              <a href="#whatsapp" onClick={event => followLink(event, '#whatsapp', 'WhatsApp')} aria-label="Baksa Tales on WhatsApp" data-testid="footer-social-whatsapp"><SocialIcon kind="whatsapp" /></a>
              <a href="#email" onClick={event => followLink(event, '#email', 'Email Baksa Tales')} aria-label="Email Baksa Tales" data-testid="footer-social-email"><SocialIcon kind="email" /></a>
            </div>
          </div>
          <div className="bt-showcase-footer__letter">
            <div className="bt-showcase-footer__stamp" aria-hidden="true">{brandMark ? <img src={brandMark} alt="" /> : <span>{brandName}</span>}</div>
            <span className="bt-showcase-footer__seal" aria-hidden="true"><i /><i /></span>
            <p className="bt-showcase-footer__letter-kicker">Join the Baksa circle</p>
            <p className="bt-showcase-footer__letter-title">Dear friend, we’d love to write to you.</p>
            {onSubmit ? (
              <form className="bt-showcase-footer__form" onSubmit={submit}>
                <label htmlFor="bt-footer-contact">Your WhatsApp number</label>
                <div className="bt-showcase-footer__form-row">
                  <span className="bt-showcase-footer__country-code" aria-hidden="true">+91</span>
                  <input
                    id="bt-footer-contact"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={contact}
                    onChange={event => setContact(event.target.value)}
                    placeholder="98765 43210"
                    required
                    data-testid="footer-input-contact"
                  />
                  <button type="submit" data-testid="footer-button-submit">Count me in</button>
                </div>
                <p className="bt-showcase-footer__smallprint" role="status" data-testid="footer-submit-status">
                  {notice || (sampleMode ? 'Preview only; no contact details are sent.' : 'Your details are handled by the configured sign-up service.')}
                </p>
              </form>
            ) : (
              <p className="bt-showcase-footer__smallprint bt-showcase-footer__unavailable" data-testid="footer-signup-unavailable">
                {sampleMode ? 'Sample preview. Sign-up is not connected.' : 'Sign-up is not available here.'}
              </p>
            )}
          </div>
        </div>

        <nav className="bt-showcase-footer__links" aria-label="Footer">
          {groups.map((group, index) => (
            <section className="bt-showcase-footer__link-group" key={`${group.title}-${index}`} aria-labelledby={`bt-footer-group-${index}`}>
              <h3 id={`bt-footer-group-${index}`}>{group.title}</h3>
              {group.links.map((link, linkIndex) => (
                <a href={link.href} key={`${link.href}-${linkIndex}`} onClick={event => followLink(event, link.href, link.label)} data-testid={`footer-link-${index}-${linkIndex}`}>{link.label}</a>
              ))}
            </section>
          ))}
        </nav>

        <div className="bt-showcase-footer__bottom">
          <div className="bt-showcase-footer__brand-lockup">
            <span className="bt-showcase-footer__wordmark" aria-label={brandName}>{brandName}</span>
            <p>Storytelling is the identity. Discovery is the experience. Commerce is the outcome.</p>
          </div>
          <div className="bt-showcase-footer__legal">
            <span>{sampleMode ? 'Sample storefront · checkout is not connected' : 'Checkout options depend on configured providers'}</span>
            <span data-testid="footer-copyright">{copyright}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ kind }: { kind: 'instagram' | 'whatsapp' | 'email' }) {
  if (kind === 'instagram') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle className="bt-showcase-footer__icon-fill" cx="17.2" cy="6.8" r="1.1" /></svg>;
  }
  if (kind === 'whatsapp') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8.4 19z" /><path className="bt-showcase-footer__icon-fill" d="M9 9.2c.3 2.6 2.4 4.8 5 5.4l1.1-1.3-1.8-.9-.8.7c-.9-.4-1.7-1.2-2.1-2.1l.7-.8-.9-1.8z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M4 7l8 6 8-6" /></svg>;
}

export default StorefrontFooter;
