export interface NotionTextAnnotations {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color: string;
}

export interface NotionRichText {
  plainText: string;
  href: string | null;
  annotations: NotionTextAnnotations;
}

export interface NotionBlock {
  id: string;
  type: string;
  richText?: NotionRichText[];
  caption?: NotionRichText[];
  children?: NotionBlock[];
  checked?: boolean;
  icon?: string;
  language?: string;
  title?: string;
  url?: string;
}

export interface NotionArticlePreview {
  id: string;
  slug: string;
  title: string;
  summary: string;
  imageUrl: string;
  categories: string[];
  publishedAt: string | null;
}

export interface NotionArticleDetail extends NotionArticlePreview {
  blocks: NotionBlock[];
}

interface NotionArticlesResponse {
  results: NotionArticlePreview[];
}

interface NotionArticleResponse {
  article: NotionArticleDetail;
}

const notionApiBase = (import.meta.env.VITE_NOTION_PROXY_BASE_URL || "/api/notion").replace(/\/$/, "");

function buildErrorMessage(status: number, statusText: string, payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) {
      return `${status} ${statusText}: ${message}`;
    }
  }

  return `${status} ${statusText}`;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${notionApiBase}${path}`, {
    headers: { Accept: "application/json" },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, response.statusText, payload));
  }

  return payload as T;
}

export async function fetchNotionArticles(limit?: number): Promise<NotionArticlePreview[]> {
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : null;
  const query = safeLimit ? `?limit=${safeLimit}` : "";

  const payload = await getJson<NotionArticlesResponse>(`/articles${query}`);
  return payload.results || [];
}

export async function fetchNotionArticleById(articleId: string): Promise<NotionArticleDetail | null> {
  if (!articleId) return null;

  try {
    const payload = await getJson<NotionArticleResponse>(`/articles/${encodeURIComponent(articleId)}`);
    return payload.article || null;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("404")) {
      return null;
    }
    throw error;
  }
}

export function formatPublishedDate(dateValue: string | null): string {
  if (!dateValue) return "Date a venir";

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "Date a venir";

  return parsedDate.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
