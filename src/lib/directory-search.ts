// Helpers for the public directories, whose search and filters live in the URL.

export const searchParam = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 80) ?? "";

export function pageParam(value: string | string[] | undefined) {
  const page = Number.parseInt(searchParam(value), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

// A LIKE pattern for what someone typed. Characters with meaning in PostgREST
// filters or LIKE patterns are dropped, and each gap between words matches
// anything, so "H. pylori" finds "h. pylori stool antigen" and "thyroid
// profile (t3, t4, tsh)" finds itself.
export function likePattern(value: string) {
  const words = value
    .toLowerCase()
    .replace(/[,()%*\\_.:]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.length > 0 ? `%${words.join("%")}%` : null;
}

export const pageRange = (page: number, perPage: number) => {
  const from = (page - 1) * perPage;
  return [from, from + perPage - 1] as const;
};

export const pageCount = (total: number, perPage: number) =>
  Math.max(1, Math.ceil(total / perPage));

// PostgREST refuses a range that starts past the last row (an old link, or a
// page number typed by hand); the directories show the first page instead.
export const isPastLastPage = (error: { code?: string } | null) =>
  error?.code === "PGRST103";
