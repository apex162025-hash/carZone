export type SearchResultGroup =
  | "customers"
  | "plates"
  | "washes"
  | "branches"
  | "orders"
  | "complaints";

export interface SearchResult {
  id: string;
  group: SearchResultGroup;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}
