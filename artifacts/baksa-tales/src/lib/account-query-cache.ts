import type { QueryClient } from '@tanstack/react-query';
import {
  getGetRuntimeQueryKey, getGetCatalogQueryKey, getGetSiteQueryKey,
} from '@workspace/api-client-react';

const publicPaths = new Set<string>([
  getGetRuntimeQueryKey()[0], getGetCatalogQueryKey()[0], getGetSiteQueryKey()[0],
]);

export function resetAccountQueries(client: QueryClient) {
  // Connection settings must survive account changes: removing them destroys
  // the auth client, signs the UI out, restores the session and loops forever.
  // Everything except the explicitly public queries resets to a loading state.
  client.getMutationCache().clear();
  return client.resetQueries({
    predicate: query => typeof query.queryKey[0] !== 'string' || !publicPaths.has(query.queryKey[0]),
  }, { throwOnError: false });
}
