import { useGetSite } from '@workspace/api-client-react';
import HomeV5 from './HomeV5';

/** Public storefront consumes published editorial content only, never an owner's draft. */
export default function HomepageRoute() {
  const site = useGetSite({ query: { retry: false, staleTime: 30_000 } });
  return <>
    <HomeV5 document={site.data?.document} />
    {site.isError && <p role="status" style={{ margin: 0, padding: '10px 24px', background: '#FBF4EA', color: '#5C463C', fontFamily: 'Arvo,Georgia,serif', fontSize: 11 }}>
      Editorial updates could not load. Showing the approved homepage defaults.
    </p>}
  </>;
}
