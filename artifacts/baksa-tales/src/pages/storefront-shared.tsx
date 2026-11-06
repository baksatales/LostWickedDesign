import { createContext, useContext, useEffect } from 'react';
import type { SiteDocument, SitePage } from '@workspace/api-client-react';

const base = import.meta.env.BASE_URL;
export const safeImagePath=(value:string)=>/^\/images\/baksa\/[a-zA-Z0-9_.-]+\.(webp|png|jpg|jpeg|avif)$/i.test(value)||/^https:\/\/[a-zA-Z0-9.-]+(?::443)?\/[^\s<>\\]*$/i.test(value);
export const imageUrl = (value: string) => {
  if(/^https:\/\//i.test(value)&&safeImagePath(value))return value;
  const path=value.startsWith('/')?value:`/images/baksa/${value}`;
  return safeImagePath(path)?`${base}${path.slice(1)}`:`${base}images/baksa/baksatales-trunk-mark.png`;
};
export const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);
export const errText = (e: unknown) => {
  const api = e as { data?: { error?: string }; message?: string };
  return api?.data?.error || api?.message || 'Something could not be completed. Please try again.';
};
export const SiteDocumentContext=createContext<SiteDocument|null>(null);
export function useSitePage(id:string){const document=useContext(SiteDocumentContext);return document?.pages.find(p=>p.id===id);}
export function PageArtwork({page}:{page?:SitePage}){return page?.image?<figure className="bk-page-art"><img src={imageUrl(page.image)} alt={page.imageAlt}/></figure>:null}

export function Seo({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = `${title} | Baksa Tales`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description;
    let og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (!og) { og = document.createElement('meta'); og.setAttribute('property', 'og:title'); document.head.appendChild(og); }
    og.content = `${title} | Baksa Tales`;
    let ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (!ogDescription) { ogDescription = document.createElement('meta'); ogDescription.setAttribute('property', 'og:description'); document.head.appendChild(ogDescription); }
    ogDescription.content = description;
    let ogType = document.querySelector<HTMLMetaElement>('meta[property="og:type"]');
    if (!ogType) { ogType = document.createElement('meta'); ogType.setAttribute('property', 'og:type'); document.head.appendChild(ogType); }
    ogType.content = 'website';
  }, [title, description]);
  return null;
}
