import './storefront-components.css';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface CorporatePackagingImage {
  src: string;
  caption: string;
  alt?: string;
}

export interface CorporatePackagingGalleryProps {
  images?: CorporatePackagingImage[];
  title?: string;
  description?: string;
}

export const defaultPackagingImages: CorporatePackagingImage[] = [
  { src: `${base}/corporate-boxes/rigid-laminated.webp`, caption: 'Rigid box, laminated', alt: 'Visual mockup of a rigid laminated keepsake box with illustrated lid' },
  { src: `${base}/corporate-boxes/cotton-rag-paper.webp`, caption: 'Handmade cotton-rag paper', alt: 'Visual mockup of a keepsake box wrapped in handmade cotton-rag paper' },
  { src: `${base}/corporate-boxes/printed-tin.webp`, caption: 'Printed tin', alt: 'Visual mockup of a printed metal keepsake tin' },
  { src: `${base}/corporate-boxes/bamboo-box.webp`, caption: 'Bamboo box', alt: 'Visual mockup of a bamboo box with illustrated lid' },
  { src: `${base}/corporate-boxes/birch-ply-lid.webp`, caption: 'Birch ply story lid', alt: 'Visual mockup of a keepsake box with a birch-ply illustrated lid' },
];

export function CorporatePackagingGallery({
  images = defaultPackagingImages,
  title = 'Keepsake boxes in',
  description = 'Visual mockups for material direction. Final materials, finishes and availability are not guaranteed.',
}: CorporatePackagingGalleryProps) {
  return (
    <section className="bt-packaging" aria-labelledby="bt-packaging-title" data-testid="corporate-packaging-gallery">
      <div className="bt-packaging__heading">
        <span className="bt-packaging__eyebrow">A box with a story</span>
        <h2 id="bt-packaging-title">{title}</h2>
        <p>{description}</p>
      </div>
      <ul className="bt-packaging__grid">
        {images.map((image, index) => (
          <li className="bt-packaging__item" key={`${image.src}-${index}`} data-testid={`packaging-card-${index}`}>
            <div className="bt-packaging__image-wrap">
              <img src={image.src} alt={image.alt || `${image.caption}, a visual packaging mockup`} loading="eager" data-testid={`packaging-image-${index}`} />
              <span className="bt-packaging__mockup-label">Visual mockup</span>
            </div>
            <p>{image.caption}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default CorporatePackagingGallery;
