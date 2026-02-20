/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const NOTION_VERSION = "2022-06-28";

const TITLE_PROPERTY_NAMES = ["Titre", "Title", "Name", "Nom"];
const SUMMARY_PROPERTY_NAMES = ["Excerpt/Description", "Resume", "Résumé", "Summary", "Description", "Excerpt"];
const SLUG_PROPERTY_NAMES = ["Slug", "slug"];
const CATEGORIES_PROPERTY_NAMES = ["Categories", "Catégories", "Category", "Thematique", "Thématique", "Tags"];
const PUBLISHED_PROPERTY_NAMES = ["Published", "Date", "Date de publication", "Publication"];
const STATUS_PROPERTY_NAMES = ["Status", "Statut", "Published", "Publie", "Publié"];
const APPLICATION_PROPERTY_NAMES = ["Application", "Applications", "App", "Apps"];
const COVER_PROPERTY_NAMES = ["Cover", "Image URL", "Image", "Thumbnail"];

interface ApiNotionTextAnnotations {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color: string;
}

interface ApiNotionRichText {
  plainText: string;
  href: string | null;
  annotations: ApiNotionTextAnnotations;
}

interface ApiNotionBlock {
  id: string;
  type: string;
  richText?: ApiNotionRichText[];
  caption?: ApiNotionRichText[];
  children?: ApiNotionBlock[];
  checked?: boolean;
  icon?: string;
  language?: string;
  title?: string;
  url?: string;
}

interface ApiNotionArticlePreview {
  id: string;
  slug: string;
  title: string;
  summary: string;
  imageUrl: string;
  categories: string[];
  publishedAt: string | null;
  createdAt: string | null;
}

type ApiClientArticlePreview = Omit<ApiNotionArticlePreview, "createdAt">;

interface ApiNotionArticleDetail extends ApiClientArticlePreview {
  blocks: ApiNotionBlock[];
}

class NotionRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "NotionRequestError";
    this.status = status;
  }
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function defaultAnnotations(): ApiNotionTextAnnotations {
  return {
    bold: false,
    italic: false,
    strikethrough: false,
    underline: false,
    code: false,
    color: "default",
  };
}

function extractPlainText(richText: any[] | undefined): string {
  if (!Array.isArray(richText)) return "";
  return richText.map((part) => (typeof part?.plain_text === "string" ? part.plain_text : "")).join("");
}

function getPropertyByNames(properties: Record<string, any>, candidateNames: string[]): any | null {
  const normalizedNames = new Set(candidateNames.map((name) => normalizeText(name)));

  for (const [propertyName, propertyValue] of Object.entries(properties)) {
    if (normalizedNames.has(normalizeText(propertyName))) {
      return propertyValue;
    }
  }

  return null;
}

function getFirstPropertyByType(properties: Record<string, any>, propertyType: string): any | null {
  for (const propertyValue of Object.values(properties)) {
    if (propertyValue?.type === propertyType) {
      return propertyValue;
    }
  }

  return null;
}

function extractTextFromProperty(property: any): string {
  if (!property || typeof property !== "object") return "";

  switch (property.type) {
    case "title":
      return extractPlainText(property.title);
    case "rich_text":
      return extractPlainText(property.rich_text);
    case "status":
      return typeof property.status?.name === "string" ? property.status.name : "";
    case "select":
      return typeof property.select?.name === "string" ? property.select.name : "";
    case "url":
      return typeof property.url === "string" ? property.url : "";
    case "date":
      return typeof property.date?.start === "string" ? property.date.start : "";
    case "number":
      return typeof property.number === "number" ? String(property.number) : "";
    case "checkbox":
      return property.checkbox ? "true" : "false";
    case "formula":
      if (property.formula?.type === "string") return property.formula.string || "";
      if (property.formula?.type === "number") return String(property.formula.number || "");
      if (property.formula?.type === "boolean") return property.formula.boolean ? "true" : "false";
      if (property.formula?.type === "date") return property.formula.date?.start || "";
      return "";
    default:
      if (Array.isArray(property.rich_text)) return extractPlainText(property.rich_text);
      if (Array.isArray(property.title)) return extractPlainText(property.title);
      return "";
  }
}

function extractMultiSelectValues(property: any): string[] {
  if (!property || typeof property !== "object") return [];

  if (property.type === "multi_select" && Array.isArray(property.multi_select)) {
    return property.multi_select
      .map((option: any) => option?.name)
      .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0);
  }

  if (property.type === "select" && typeof property.select?.name === "string") {
    return [property.select.name];
  }

  if (property.type === "status" && typeof property.status?.name === "string") {
    return [property.status.name];
  }

  return [];
}

function extractDateFromProperty(property: any): string | null {
  if (!property || typeof property !== "object") return null;

  if (property.type === "date" && typeof property.date?.start === "string") {
    return property.date.start;
  }

  if (property.type === "formula" && property.formula?.type === "date") {
    return property.formula.date?.start || null;
  }

  const asText = extractTextFromProperty(property);
  return asText || null;
}

function extractUrlFromProperty(property: any): string {
  if (!property || typeof property !== "object") return "";

  if (property.type === "url" && typeof property.url === "string") return property.url;

  if (property.type === "files" && Array.isArray(property.files) && property.files.length > 0) {
    const file = property.files[0];
    if (file?.type === "external" && typeof file.external?.url === "string") return file.external.url;
    if (file?.type === "file" && typeof file.file?.url === "string") return file.file.url;
  }

  if (property.type === "formula" && property.formula?.type === "string") {
    return property.formula.string || "";
  }

  if (property.type === "rich_text" && Array.isArray(property.rich_text) && property.rich_text.length > 0) {
    const textItem = property.rich_text[0];
    if (typeof textItem?.href === "string") return textItem.href;
    if (typeof textItem?.plain_text === "string") return textItem.plain_text;
  }

  return "";
}

function extractCoverFromPage(page: any): string {
  if (page?.cover?.type === "external" && typeof page.cover.external?.url === "string") {
    return page.cover.external.url;
  }

  if (page?.cover?.type === "file" && typeof page.cover.file?.url === "string") {
    return page.cover.file.url;
  }

  return "";
}

function resolveCoverUrl(page: any, properties: Record<string, any>): string {
  const coverFromPage = extractCoverFromPage(page);
  if (coverFromPage) return coverFromPage;

  const coverProperty = getPropertyByNames(properties, COVER_PROPERTY_NAMES);
  const coverFromProperty = extractUrlFromProperty(coverProperty);
  if (coverFromProperty) return coverFromProperty;

  return "";
}

function isPublishedStatus(property: any): boolean {
  if (!property || typeof property !== "object") return false;

  if (property.type === "checkbox") {
    return Boolean(property.checkbox);
  }

  const normalizedStatus = normalizeText(extractTextFromProperty(property));
  return normalizedStatus === "publie" || normalizedStatus === "published";
}

function hasAllowedApplication(property: any, normalizedAllowedApp: string): boolean {
  const appTags = extractMultiSelectValues(property).map((tag) => normalizeText(tag));
  return appTags.includes(normalizedAllowedApp);
}

function isPageVisible(page: any, normalizedAllowedApp: string): boolean {
  const properties = (page?.properties || {}) as Record<string, any>;
  const statusProperty =
    getPropertyByNames(properties, STATUS_PROPERTY_NAMES) || getPropertyByNames(properties, ["Publie", "Publié"]);
  const applicationProperty = getPropertyByNames(properties, APPLICATION_PROPERTY_NAMES);

  return isPublishedStatus(statusProperty) && hasAllowedApplication(applicationProperty, normalizedAllowedApp);
}

function mapPageToPreview(page: any): ApiNotionArticlePreview {
  const properties = (page?.properties || {}) as Record<string, any>;

  const titleProperty =
    getPropertyByNames(properties, TITLE_PROPERTY_NAMES) || getFirstPropertyByType(properties, "title");
  const summaryProperty = getPropertyByNames(properties, SUMMARY_PROPERTY_NAMES);
  const slugProperty = getPropertyByNames(properties, SLUG_PROPERTY_NAMES);
  const categoriesProperty = getPropertyByNames(properties, CATEGORIES_PROPERTY_NAMES);
  const publishedProperty = getPropertyByNames(properties, PUBLISHED_PROPERTY_NAMES);

  const title = extractTextFromProperty(titleProperty).trim() || "Sans titre";
  const summary = extractTextFromProperty(summaryProperty).trim();
  const slug = extractTextFromProperty(slugProperty).trim();
  const categories = extractMultiSelectValues(categoriesProperty);
  const publishedAt = extractDateFromProperty(publishedProperty);
  const createdAt = typeof page?.created_time === "string" ? page.created_time : null;
  const imageUrl = resolveCoverUrl(page, properties);

  return {
    id: String(page?.id || ""),
    slug,
    title,
    summary,
    imageUrl,
    categories,
    publishedAt,
    createdAt,
  };
}

function toTimestamp(dateValue: string | null): number {
  if (!dateValue) return 0;

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return 0;

  return parsedDate.getTime();
}

function sortByPublishedDateDesc(a: ApiNotionArticlePreview, b: ApiNotionArticlePreview): number {
  const bTime = Math.max(toTimestamp(b.publishedAt), toTimestamp(b.createdAt));
  const aTime = Math.max(toTimestamp(a.publishedAt), toTimestamp(a.createdAt));
  return bTime - aTime;
}

function toClientArticlePreview(article: ApiNotionArticlePreview): ApiClientArticlePreview {
  const { createdAt: _createdAt, ...clientArticle } = article;
  return clientArticle;
}

function mapAnnotations(annotations: any): ApiNotionTextAnnotations {
  return {
    bold: Boolean(annotations?.bold),
    italic: Boolean(annotations?.italic),
    strikethrough: Boolean(annotations?.strikethrough),
    underline: Boolean(annotations?.underline),
    code: Boolean(annotations?.code),
    color: typeof annotations?.color === "string" ? annotations.color : "default",
  };
}

function toRichText(richText: any[] | undefined): ApiNotionRichText[] {
  if (!Array.isArray(richText)) return [];

  return richText.map((item) => ({
    plainText: typeof item?.plain_text === "string" ? item.plain_text : "",
    href:
      typeof item?.href === "string"
        ? item.href
        : typeof item?.text?.link?.url === "string"
          ? item.text.link.url
          : null,
    annotations: mapAnnotations(item?.annotations),
  }));
}

function resolveMediaUrl(blockData: any): string | undefined {
  if (!blockData || typeof blockData !== "object") return undefined;
  if (typeof blockData.url === "string") return blockData.url;

  const mediaType = typeof blockData.type === "string" ? blockData.type : "";
  const mediaData = mediaType ? blockData[mediaType] : null;
  if (mediaData && typeof mediaData.url === "string") return mediaData.url;

  return undefined;
}

function resolveIconValue(icon: any): string | undefined {
  if (!icon || typeof icon !== "object") return undefined;

  if (icon.type === "emoji" && typeof icon.emoji === "string") return icon.emoji;
  if (icon.type === "external" && typeof icon.external?.url === "string") return icon.external.url;
  if (icon.type === "file" && typeof icon.file?.url === "string") return icon.file.url;

  return undefined;
}

function sendJson(res: any, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function sendError(res: any, statusCode: number, errorMessage: string): void {
  sendJson(res, statusCode, { error: errorMessage });
}

function buildTargetUrl(baseUrl: string, incomingUrl: URL, routePrefix: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const basePath = incomingUrl.pathname.startsWith(routePrefix)
    ? incomingUrl.pathname.slice(routePrefix.length)
    : incomingUrl.pathname;
  const targetPath = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return `${normalizedBase}${targetPath}${incomingUrl.search}`;
}

function getHeaderValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  return null;
}

async function readRawBody(req: any): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function setResponseHeaders(res: any, upstreamHeaders: Headers): void {
  upstreamHeaders.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });
}

function sanitizeProxyHeaders(req: any): Headers {
  const headers = new Headers();

  for (const [key, rawValue] of Object.entries(req.headers || {})) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "host" || lowerKey === "content-length" || lowerKey === "connection") {
      continue;
    }

    const value = getHeaderValue(rawValue as string | string[] | undefined);
    if (value !== null) {
      headers.set(key, value);
    }
  }

  return headers;
}

async function forwardRequest(req: any, res: any, targetUrl: string): Promise<void> {
  const body = await readRawBody(req);
  const upstreamResponse = await fetch(targetUrl, {
    method: req.method,
    headers: sanitizeProxyHeaders(req),
    body,
    redirect: "follow",
  });

  res.statusCode = upstreamResponse.status;
  setResponseHeaders(res, upstreamResponse.headers);
  const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
  res.end(responseBuffer);
}

function createPocketBaseProxyPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), "");
  const routePrefix = "/api/pb";
  const configuredTarget = (env.POCKETBASE_TARGET_URL || env.VITE_POCKETBASE_URL || "").trim();
  const pocketBaseTargetUrl = /^https?:\/\//i.test(configuredTarget) ? configuredTarget : "";
  const isConfigured = pocketBaseTargetUrl.length > 0;

  async function pocketBaseProxyHandler(req: any, res: any, next: () => void): Promise<void> {
    const urlRaw = typeof req.url === "string" ? req.url : "";
    if (!urlRaw.startsWith(routePrefix)) {
      next();
      return;
    }

    if (!isConfigured) {
      sendError(
        res,
        500,
        "Configuration PocketBase manquante. Ajoutez POCKETBASE_TARGET_URL."
      );
      return;
    }

    const incomingUrl = new URL(urlRaw, "http://localhost");
    const targetUrl = buildTargetUrl(pocketBaseTargetUrl, incomingUrl, routePrefix);

    try {
      await forwardRequest(req, res, targetUrl);
    } catch (error) {
      console.error("[pocketbase-proxy]", error);
      sendError(res, 502, "Erreur de proxy PocketBase.");
    }
  }

  return {
    name: "pocketbase-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void pocketBaseProxyHandler(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void pocketBaseProxyHandler(req, res, next);
      });
    },
  };
}

function createNotionProxyPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), "");
  const notionApiKey = env.NOTION_API_KEY;
  const notionDatabaseId = env.NOTION_DB_ID;
  const notionAllowedApp = env.NOTION_ALLOWED_APP || "mouv minute";
  const normalizedAllowedApp = normalizeText(notionAllowedApp);
  const isConfigured = Boolean(notionApiKey && notionDatabaseId);

  let cachedArticles: ApiClientArticlePreview[] | null = null;
  let cacheTimestamp = 0;
  const CACHE_TTL_MS = 60_000;

  async function notionRequest<T>(apiPath: string, init: RequestInit = {}): Promise<T> {
    if (!notionApiKey) {
      throw new Error("NOTION_API_KEY manquante.");
    }

    const response = await fetch(`https://api.notion.com${apiPath}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });

    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : `Requete Notion en erreur (${response.status})`;
      throw new NotionRequestError(response.status, message);
    }

    return payload as T;
  }

  async function fetchAllDatabasePages(): Promise<any[]> {
    if (!notionDatabaseId) return [];

    const pages: any[] = [];
    let hasMore = true;
    let nextCursor: string | undefined;

    while (hasMore) {
      const body: Record<string, unknown> = {
        page_size: 100,
        sorts: [{ timestamp: "created_time", direction: "descending" }],
      };
      if (nextCursor) body.start_cursor = nextCursor;

      const data = await notionRequest<any>(`/v1/databases/${notionDatabaseId}/query`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      pages.push(...(Array.isArray(data?.results) ? data.results : []));
      hasMore = Boolean(data?.has_more);
      nextCursor = typeof data?.next_cursor === "string" ? data.next_cursor : undefined;
    }

    return pages;
  }

  async function getPublishedArticles(forceRefresh = false): Promise<ApiClientArticlePreview[]> {
    const now = Date.now();
    if (!forceRefresh && cachedArticles && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedArticles;
    }

    const allPages = await fetchAllDatabasePages();
    const publishedArticles = allPages
      .filter((page) => isPageVisible(page, normalizedAllowedApp))
      .map(mapPageToPreview)
      .sort(sortByPublishedDateDesc)
      .map(toClientArticlePreview);

    cachedArticles = publishedArticles;
    cacheTimestamp = now;
    return publishedArticles;
  }

  async function fetchBlockChildren(blockId: string): Promise<ApiNotionBlock[]> {
    const blocks: ApiNotionBlock[] = [];
    let hasMore = true;
    let nextCursor: string | undefined;

    while (hasMore) {
      const params = new URLSearchParams({ page_size: "100" });
      if (nextCursor) params.set("start_cursor", nextCursor);

      const data = await notionRequest<any>(`/v1/blocks/${blockId}/children?${params.toString()}`);
      const rawBlocks = Array.isArray(data?.results) ? data.results : [];

      for (const rawBlock of rawBlocks) {
        const blockType = typeof rawBlock?.type === "string" ? rawBlock.type : "unsupported";
        const blockData = rawBlock?.[blockType] || {};
        const mappedBlock: ApiNotionBlock = {
          id: String(rawBlock?.id || `${blockType}-${Date.now()}`),
          type: blockType,
        };

        if (Array.isArray(blockData?.rich_text)) {
          mappedBlock.richText = toRichText(blockData.rich_text);
        }

        switch (blockType) {
          case "to_do":
            mappedBlock.checked = Boolean(blockData?.checked);
            break;
          case "callout":
            mappedBlock.icon = resolveIconValue(blockData?.icon);
            break;
          case "code":
            mappedBlock.language = typeof blockData?.language === "string" ? blockData.language : "plain";
            break;
          case "image":
          case "video":
          case "file":
          case "pdf":
            mappedBlock.url = resolveMediaUrl(blockData);
            mappedBlock.caption = toRichText(blockData?.caption);
            break;
          case "bookmark":
          case "embed":
          case "link_preview":
            mappedBlock.url = typeof blockData?.url === "string" ? blockData.url : undefined;
            mappedBlock.caption = toRichText(blockData?.caption);
            break;
          case "child_page":
            mappedBlock.title = typeof blockData?.title === "string" ? blockData.title : "Sous-page";
            break;
          case "equation":
            if (typeof blockData?.expression === "string") {
              mappedBlock.richText = [
                {
                  plainText: blockData.expression,
                  href: null,
                  annotations: defaultAnnotations(),
                },
              ];
            }
            break;
          default:
            break;
        }

        if (rawBlock?.has_children && typeof rawBlock?.id === "string") {
          mappedBlock.children = await fetchBlockChildren(rawBlock.id);
        }

        blocks.push(mappedBlock);
      }

      hasMore = Boolean(data?.has_more);
      nextCursor = typeof data?.next_cursor === "string" ? data.next_cursor : undefined;
    }

    return blocks;
  }

  async function fetchArticleById(articleId: string): Promise<ApiNotionArticleDetail | null> {
    let page: any = null;

    try {
      page = await notionRequest<any>(`/v1/pages/${articleId}`);
    } catch (error) {
      if (error instanceof NotionRequestError && error.status === 404) {
        return null;
      }
      throw error;
    }

    if (!isPageVisible(page, normalizedAllowedApp)) {
      return null;
    }

    const preview = toClientArticlePreview(mapPageToPreview(page));
    const blocks = await fetchBlockChildren(articleId);
    return {
      ...preview,
      blocks,
    };
  }

  async function notionApiHandler(req: any, res: any, next: () => void): Promise<void> {
    const urlRaw = typeof req.url === "string" ? req.url : "";
    if (!urlRaw.startsWith("/api/notion")) {
      next();
      return;
    }

    if (!isConfigured) {
      sendError(
        res,
        500,
        "Configuration Notion manquante. Ajoutez NOTION_API_KEY, NOTION_DB_ID et NOTION_ALLOWED_APP."
      );
      return;
    }

    if (req.method !== "GET") {
      sendError(res, 405, "Methode non autorisee.");
      return;
    }

    const url = new URL(urlRaw, "http://localhost");
    const pathname = url.pathname.replace(/\/+$/, "");

    try {
      if (pathname === "/api/notion/articles") {
        const limitParam = url.searchParams.get("limit");
        const parsedLimit = limitParam ? Number(limitParam) : null;
        const limit =
          typeof parsedLimit === "number" && Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(Math.floor(parsedLimit), 100)
            : null;

        const publishedArticles = await getPublishedArticles();
        const results = limit ? publishedArticles.slice(0, limit) : publishedArticles;
        sendJson(res, 200, { results });
        return;
      }

      if (pathname.startsWith("/api/notion/articles/")) {
        const articleId = decodeURIComponent(pathname.slice("/api/notion/articles/".length));
        if (!articleId) {
          sendError(res, 400, "Identifiant article invalide.");
          return;
        }

        const article = await fetchArticleById(articleId);
        if (!article) {
          sendError(res, 404, "Article introuvable.");
          return;
        }

        sendJson(res, 200, { article });
        return;
      }

      sendError(res, 404, "Route API Notion introuvable.");
    } catch (error) {
      console.error("[notion-api]", error);
      sendError(res, 500, "Erreur lors de la recuperation des articles Notion.");
    }
  }

  return {
    name: "notion-api-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void notionApiHandler(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void notionApiHandler(req, res, next);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    createPocketBaseProxyPlugin(mode),
    createNotionProxyPlugin(mode),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
