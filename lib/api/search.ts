import type { SearchResults } from './types';

export type { SearchResults };

export async function search(q: string, signal?: AbortSignal): Promise<SearchResults> {
   const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal });
   if (!res.ok) throw new Error(`search → ${res.status}`);
   return (await res.json()) as SearchResults;
}
