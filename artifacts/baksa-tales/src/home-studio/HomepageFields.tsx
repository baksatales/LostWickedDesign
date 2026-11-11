import type { SiteDocument } from '@workspace/api-client-react';
import { safeHomepageImage } from './safety';
import { PRODUCTS } from '../demo/catalog';

type EditableField = { key: string; label: string; group: string; kind: string; value: string };

export default function HomepageFields({ fields, document, onChange }: {
  fields: readonly EditableField[];
  document: SiteDocument;
  onChange: (key: string, value: string) => void;
}) {
  const allFields = [...fields];
  const selected = new Set(fields.filter(field => field.key.startsWith('h5.picks.'))
    .flatMap(field => (document.labels[field.key] ?? field.value).split(',').map(id => id.trim())));
  for (const product of PRODUCTS.filter(product => selected.has(product.id))) {
    const key = `h5.image.product.${product.id}`;
    if (!allFields.some(field => field.key === key)) allFields.push({
      key, label: `Homepage photo: ${product.name}`, group: 'Product photography', kind: 'image',
      value: `/images/baksa/${product.img}.webp`,
    });
  }
  const groups = [...new Set(allFields.map(field => field.group))];
  return <div className="studio-card" data-testid="homepage-v5-editor">
    <p className="studio-kicker">APPROVED HOMEPAGE · V5</p>
    <h2>The compartment baksa</h2>
    <p className="studio-help">Edit the homepage without changing its approved layout. The trunk and five objects are separate replaceable images. Use product IDs from the sample catalogue until live listings are connected. Prices and stock cannot be edited here.</p>
    {groups.map(group => <details key={group} className="studio-subcard" open={group === groups[0]}>
      <summary>{group}</summary>
      {allFields.filter(field => field.group === group).map(field => {
        const value = document.labels[field.key] ?? field.value;
        return <label className="studio-field" key={field.key}>
          <span>{field.label}</span>
          <textarea data-testid={`edit-${field.key}`} rows={field.key.startsWith('h5.copy.') ? 2 : 1}
            maxLength={500} value={value} onChange={event => onChange(field.key, event.target.value)} />
          {field.key.startsWith('h5.image.') && value && safeHomepageImage(value)
            && <img className="studio-home-thumb" src={value} alt={`${field.label} preview`} />}
          {field.key.startsWith('h5.picks.') && <small>Comma-separated catalogue product IDs. Invalid or unavailable picks use the catalogue fallback; sample prices remain labelled.</small>}
        </label>;
      })}
    </details>)}
  </div>;
}
