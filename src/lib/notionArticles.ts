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

interface NotionRequestErrorPayload {
  message?: string;
  error?: string;
}

interface NotionRequestError extends Error {
  status?: number;
}

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const NOTION_API_KEY = import.meta.env.VITE_NOTION_API_KEY;
const NOTION_DB_ID = import.meta.env.VITE_NOTION_DB_ID;
const NOTION_ALLOWED_APP = import.meta.env.VITE_NOTION_ALLOWED_APP || "mouv minute";

const TITLE_PROPERTY_NAMES = ["Titre", "Title", "Name", "Nom"];
const SUMMARY_PROPERTY_NAMES = ["Excerpt/Description", "Resume", "Summary", "Description", "Excerpt"];
const SLUG_PROPERTY_NAMES = ["Slug", "slug"];
const CATEGORIES_PROPERTY_NAMES = ["Categories", "Category", "Thematique", "Tags"];
const PUBLISHED_PROPERTY_NAMES = ["Published", "Date", "Date de publication", "Publication"];
const STATUS_PROPERTY_NAMES = ["Status", "Statut", "Published", "Publie"];
const APPLICATION_PROPERTY_NAMES = ["Application", "Applications", "App", "Apps"];
const COVER_PROPERTY_NAMES = ["Cover", "Image URL", "Image", "Thumbnail"];

function ensureNotionConfig(): void {
  if (!NOTION_API_KEY || !NOTION_DB_ID) {
    throw new Error("Configuration Notion manquante: VITE_NOTION_API_KEY et VITE_NOTION_DB_ID requis.");
  }
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const normalizedAllowedApp = normalizeText(NOTION_ALLOWED_APP);

function defaultAnnotations(): NotionTextAnnotations {
  return {
    bold: false,
    italic: false,
    strikethrough: false,
    underline: false,
    code: false,
    color: "default",
  };
}

function parseNotionError(status: number, statusText: string, payload: unknown): Error {
  const defaultMessage = `${status} ${statusText}`;
  const result = new Error(defaultMessage) as NotionRequestError;
  result.status = status;

  if (payload && typeof payload === "object") {
    const apiPayload = payload as NotionRequestErrorPayload;
    const message = apiPayload.message || apiPayload.error;
    if (typeof message === "string" && message.trim()) {
      result.message = `${defaultMessage}: ${message}`;
    }
  }

  return result;
}

async function notionRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  ensureNotionConfig();

  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw parseNotionError(response.status, response.statusText, payload);
  }

  return payload as T;
}

function extractPlainText(richText: unknown): string {
  if (!Array.isArray(richText)) return "";

  return richText
    .map((part) => {
      if (part && typeof part === "object" && "plain_text" in part) {
        const plainText = (part as { plain_text?: unknown }).plain_text;
        return typeof plainText === "string" ? plainText : "";
      }
      return "";
    })
    .join("");
}

function getPropertyByNames(properties: Record<string, unknown>, candidateNames: string[]): unknown {
  const normalizedNames = new Set(candidateNames.map((name) => normalizeText(name)));

  for (const [propertyName, propertyValue] of Object.entries(properties)) {
    if (normalizedNames.has(normalizeText(propertyName))) {
      return propertyValue;
    }
  }

  return null;
}

function getFirstPropertyByType(properties: Record<string, unknown>, propertyType: string): unknown {
  for (const propertyValue of Object.values(properties)) {
    if (
      propertyValue &&
      typeof propertyValue === "object" &&
      "type" in propertyValue &&
      (propertyValue as { type?: unknown }).type === propertyType
    ) {
      return propertyValue;
    }
  }

  return null;
}

function extractTextFromProperty(property: unknown): string {
  if (!property || typeof property !== "object") return "";

  const typedProperty = property as Record<string, unknown>;
  const propertyType = typeof typedProperty.type === "string" ? typedProperty.type : "";

  switch (propertyType) {
    case "title":
      return extractPlainText(typedProperty.title);
    case "rich_text":
      return extractPlainText(typedProperty.rich_text);
    case "status": {
      const status = typedProperty.status as { name?: unknown } | undefined;
      return typeof status?.name === "string" ? status.name : "";
    }
    case "select": {
      const select = typedProperty.select as { name?: unknown } | undefined;
      return typeof select?.name === "string" ? select.name : "";
    }
    case "url":
      return typeof typedProperty.url === "string" ? typedProperty.url : "";
    case "date": {
      const date = typedProperty.date as { start?: unknown } | undefined;
      return typeof date?.start === "string" ? date.start : "";
    }
    case "number":
      return typeof typedProperty.number === "number" ? String(typedProperty.number) : "";
    case "checkbox":
      return typedProperty.checkbox ? "true" : "false";
    case "formula": {
      const formula = typedProperty.formula as Record<string, unknown> | undefined;
      if (!formula || typeof formula.type !== "string") return "";
      if (formula.type === "string") return typeof formula.string === "string" ? formula.string : "";
      if (formula.type === "number") return typeof formula.number === "number" ? String(formula.number) : "";
      if (formula.type === "boolean") return formula.boolean ? "true" : "false";
      if (formula.type === "date") {
        const formulaDate = formula.date as { start?: unknown } | undefined;
        return typeof formulaDate?.start === "string" ? formulaDate.start : "";
      }
      return "";
    }
    default:
      if (Array.isArray(typedProperty.rich_text)) return extractPlainText(typedProperty.rich_text);
      if (Array.isArray(typedProperty.title)) return extractPlainText(typedProperty.title);
      return "";
  }
}

function extractMultiSelectValues(property: unknown): string[] {
  if (!property || typeof property !== "object") return [];
  const typedProperty = property as Record<string, unknown>;
  const propertyType = typeof typedProperty.type === "string" ? typedProperty.type : "";

  if (propertyType === "multi_select" && Array.isArray(typedProperty.multi_select)) {
    return typedProperty.multi_select
      .map((option) => {
        if (option && typeof option === "object" && "name" in option) {
          const name = (option as { name?: unknown }).name;
          return typeof name === "string" ? name : "";
        }
        return "";
      })
      .filter((name) => name.trim().length > 0);
  }

  if (propertyType === "select") {
    const select = typedProperty.select as { name?: unknown } | undefined;
    return typeof select?.name === "string" ? [select.name] : [];
  }

  if (propertyType === "status") {
    const status = typedProperty.status as { name?: unknown } | undefined;
    return typeof status?.name === "string" ? [status.name] : [];
  }

  return [];
}

function extractDateFromProperty(property: unknown): string | null {
  if (!property || typeof property !== "object") return null;

  const typedProperty = property as Record<string, unknown>;
  const propertyType = typeof typedProperty.type === "string" ? typedProperty.type : "";

  if (propertyType === "date") {
    const date = typedProperty.date as { start?: unknown } | undefined;
    return typeof date?.start === "string" ? date.start : null;
  }

  if (propertyType === "formula") {
    const formula = typedProperty.formula as Record<string, unknown> | undefined;
    if (formula?.type === "date") {
      const formulaDate = formula.date as { start?: unknown } | undefined;
      return typeof formulaDate?.start === "string" ? formulaDate.start : null;
    }
  }

  const textValue = extractTextFromProperty(property);
  return textValue || null;
}

function extractUrlFromProperty(property: unknown): string {
  if (!property || typeof property !== "object") return "";

  const typedProperty = property as Record<string, unknown>;
  const propertyType = typeof typedProperty.type === "string" ? typedProperty.type : "";

  if (propertyType === "url") {
    return typeof typedProperty.url === "string" ? typedProperty.url : "";
  }

  if (propertyType === "files" && Array.isArray(typedProperty.files) && typedProperty.files.length > 0) {
    const file = typedProperty.files[0] as Record<string, unknown>;
    if (file?.type === "external") {
      const external = file.external as { url?: unknown } | undefined;
      return typeof external?.url === "string" ? external.url : "";
    }
    if (file?.type === "file") {
      const localFile = file.file as { url?: unknown } | undefined;
      return typeof localFile?.url === "string" ? localFile.url : "";
    }
  }

  if (propertyType === "formula") {
    const formula = typedProperty.formula as Record<string, unknown> | undefined;
    if (formula?.type === "string" && typeof formula.string === "string") {
      return formula.string;
    }
  }

  if (propertyType === "rich_text" && Array.isArray(typedProperty.rich_text) && typedProperty.rich_text.length > 0) {
    const textItem = typedProperty.rich_text[0] as Record<string, unknown>;
    if (typeof textItem.href === "string") return textItem.href;
    if (typeof textItem.plain_text === "string") return textItem.plain_text;
  }

  return "";
}

function extractCoverFromPage(page: Record<string, unknown>): string {
  const cover = page.cover as Record<string, unknown> | undefined;
  if (!cover) return "";

  if (cover.type === "external") {
    const external = cover.external as { url?: unknown } | undefined;
    return typeof external?.url === "string" ? external.url : "";
  }

  if (cover.type === "file") {
    const localFile = cover.file as { url?: unknown } | undefined;
    return typeof localFile?.url === "string" ? localFile.url : "";
  }

  return "";
}

function resolveCoverUrl(page: Record<string, unknown>, properties: Record<string, unknown>): string {
  const fromPage = extractCoverFromPage(page);
  if (fromPage) return fromPage;

  const coverProperty = getPropertyByNames(properties, COVER_PROPERTY_NAMES);
  return extractUrlFromProperty(coverProperty);
}

function isPublishedStatus(property: unknown): boolean {
  if (!property || typeof property !== "object") return false;
  const typedProperty = property as Record<string, unknown>;

  if (typedProperty.type === "checkbox") {
    return Boolean(typedProperty.checkbox);
  }

  const normalizedStatus = normalizeText(extractTextFromProperty(property));
  return normalizedStatus === "publie" || normalizedStatus === "published";
}

function hasAllowedApplication(property: unknown): boolean {
  const appTags = extractMultiSelectValues(property).map((tag) => normalizeText(tag));
  return appTags.includes(normalizedAllowedApp);
}

function isPageVisible(page: Record<string, unknown>): boolean {
  const properties =
    page.properties && typeof page.properties === "object"
      ? (page.properties as Record<string, unknown>)
      : {};

  const statusProperty = getPropertyByNames(properties, STATUS_PROPERTY_NAMES) || getPropertyByNames(properties, ["Publie"]);
  const applicationProperty = getPropertyByNames(properties, APPLICATION_PROPERTY_NAMES);

  return isPublishedStatus(statusProperty) && hasAllowedApplication(applicationProperty);
}

interface InternalArticlePreview extends NotionArticlePreview {
  createdAt: string | null;
}

function mapPageToPreview(page: Record<string, unknown>): InternalArticlePreview {
  const properties =
    page.properties && typeof page.properties === "object"
      ? (page.properties as Record<string, unknown>)
      : {};

  const titleProperty = getPropertyByNames(properties, TITLE_PROPERTY_NAMES) || getFirstPropertyByType(properties, "title");
  const summaryProperty = getPropertyByNames(properties, SUMMARY_PROPERTY_NAMES);
  const slugProperty = getPropertyByNames(properties, SLUG_PROPERTY_NAMES);
  const categoriesProperty = getPropertyByNames(properties, CATEGORIES_PROPERTY_NAMES);
  const publishedProperty = getPropertyByNames(properties, PUBLISHED_PROPERTY_NAMES);

  const title = extractTextFromProperty(titleProperty).trim() || "Sans titre";
  const summary = extractTextFromProperty(summaryProperty).trim();
  const slug = extractTextFromProperty(slugProperty).trim();
  const categories = extractMultiSelectValues(categoriesProperty);
  const publishedAt = extractDateFromProperty(publishedProperty);
  const createdAt = typeof page.created_time === "string" ? page.created_time : null;
  const imageUrl = resolveCoverUrl(page, properties);

  return {
    id: typeof page.id === "string" ? page.id : "",
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
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
}

function sortByPublishedDateDesc(a: InternalArticlePreview, b: InternalArticlePreview): number {
  const bTime = Math.max(toTimestamp(b.publishedAt), toTimestamp(b.createdAt));
  const aTime = Math.max(toTimestamp(a.publishedAt), toTimestamp(a.createdAt));
  return bTime - aTime;
}

function toClientPreview(article: InternalArticlePreview): NotionArticlePreview {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    imageUrl: article.imageUrl,
    categories: article.categories,
    publishedAt: article.publishedAt,
  };
}

function mapAnnotations(annotations: unknown): NotionTextAnnotations {
  const typedAnnotations = annotations as Record<string, unknown> | undefined;
  return {
    bold: Boolean(typedAnnotations?.bold),
    italic: Boolean(typedAnnotations?.italic),
    strikethrough: Boolean(typedAnnotations?.strikethrough),
    underline: Boolean(typedAnnotations?.underline),
    code: Boolean(typedAnnotations?.code),
    color: typeof typedAnnotations?.color === "string" ? typedAnnotations.color : "default",
  };
}

function toRichText(richText: unknown): NotionRichText[] {
  if (!Array.isArray(richText)) return [];

  return richText.map((item) => {
    const typedItem = (item || {}) as Record<string, unknown>;
    const text = typedItem.text as Record<string, unknown> | undefined;
    const link = text?.link as Record<string, unknown> | undefined;

    return {
      plainText: typeof typedItem.plain_text === "string" ? typedItem.plain_text : "",
      href:
        typeof typedItem.href === "string"
          ? typedItem.href
          : typeof link?.url === "string"
            ? link.url
            : null,
      annotations: mapAnnotations(typedItem.annotations),
    };
  });
}

function resolveMediaUrl(blockData: Record<string, unknown>): string | undefined {
  if (typeof blockData.url === "string") return blockData.url;

  const mediaType = typeof blockData.type === "string" ? blockData.type : "";
  const mediaData = mediaType ? (blockData[mediaType] as Record<string, unknown> | undefined) : undefined;
  return typeof mediaData?.url === "string" ? mediaData.url : undefined;
}

function resolveIconValue(icon: unknown): string | undefined {
  if (!icon || typeof icon !== "object") return undefined;
  const typedIcon = icon as Record<string, unknown>;

  if (typedIcon.type === "emoji") return typeof typedIcon.emoji === "string" ? typedIcon.emoji : undefined;

  if (typedIcon.type === "external") {
    const external = typedIcon.external as { url?: unknown } | undefined;
    return typeof external?.url === "string" ? external.url : undefined;
  }

  if (typedIcon.type === "file") {
    const localFile = typedIcon.file as { url?: unknown } | undefined;
    return typeof localFile?.url === "string" ? localFile.url : undefined;
  }

  return undefined;
}

async function fetchAllDatabasePages(): Promise<Record<string, unknown>[]> {
  const pages: Record<string, unknown>[] = [];
  let hasMore = true;
  let nextCursor: string | undefined;

  while (hasMore) {
    const body: Record<string, unknown> = {
      page_size: 100,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    };

    if (nextCursor) {
      body.start_cursor = nextCursor;
    }

    const data = await notionRequest<{ results?: unknown[]; has_more?: boolean; next_cursor?: unknown }>(
      `/databases/${NOTION_DB_ID}/query`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    const resultPages = Array.isArray(data.results) ? data.results : [];
    pages.push(...resultPages.filter((page): page is Record<string, unknown> => !!page && typeof page === "object"));

    hasMore = Boolean(data.has_more);
    nextCursor = typeof data.next_cursor === "string" ? data.next_cursor : undefined;
  }

  return pages;
}

async function fetchPublishedArticles(): Promise<NotionArticlePreview[]> {
  const pages = await fetchAllDatabasePages();

  return pages
    .filter(isPageVisible)
    .map(mapPageToPreview)
    .sort(sortByPublishedDateDesc)
    .map(toClientPreview);
}

async function fetchBlockChildren(blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let hasMore = true;
  let nextCursor: string | undefined;

  while (hasMore) {
    const params = new URLSearchParams({ page_size: "100" });
    if (nextCursor) {
      params.set("start_cursor", nextCursor);
    }

    const data = await notionRequest<{ results?: unknown[]; has_more?: boolean; next_cursor?: unknown }>(
      `/blocks/${blockId}/children?${params.toString()}`
    );

    const rawBlocks = Array.isArray(data.results) ? data.results : [];

    for (const rawBlock of rawBlocks) {
      if (!rawBlock || typeof rawBlock !== "object") continue;

      const typedRawBlock = rawBlock as Record<string, unknown>;
      const blockType = typeof typedRawBlock.type === "string" ? typedRawBlock.type : "unsupported";
      const blockData = ((typedRawBlock[blockType] || {}) as Record<string, unknown>) || {};

      const mappedBlock: NotionBlock = {
        id: typeof typedRawBlock.id === "string" ? typedRawBlock.id : `${blockType}-${Date.now()}`,
        type: blockType,
      };

      if (Array.isArray(blockData.rich_text)) {
        mappedBlock.richText = toRichText(blockData.rich_text);
      }

      switch (blockType) {
        case "to_do":
          mappedBlock.checked = Boolean(blockData.checked);
          break;
        case "callout":
          mappedBlock.icon = resolveIconValue(blockData.icon);
          break;
        case "code":
          mappedBlock.language = typeof blockData.language === "string" ? blockData.language : "plain";
          break;
        case "image":
        case "video":
        case "file":
        case "pdf":
          mappedBlock.url = resolveMediaUrl(blockData);
          mappedBlock.caption = toRichText(blockData.caption);
          break;
        case "bookmark":
        case "embed":
        case "link_preview":
          mappedBlock.url = typeof blockData.url === "string" ? blockData.url : undefined;
          mappedBlock.caption = toRichText(blockData.caption);
          break;
        case "child_page":
          mappedBlock.title = typeof blockData.title === "string" ? blockData.title : "Sous-page";
          break;
        case "equation":
          if (typeof blockData.expression === "string") {
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

      if (typedRawBlock.has_children && typeof typedRawBlock.id === "string") {
        mappedBlock.children = await fetchBlockChildren(typedRawBlock.id);
      }

      blocks.push(mappedBlock);
    }

    hasMore = Boolean(data.has_more);
    nextCursor = typeof data.next_cursor === "string" ? data.next_cursor : undefined;
  }

  return blocks;
}

export async function fetchNotionArticles(limit?: number): Promise<NotionArticlePreview[]> {
  const safeLimit = typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : null;
  const allPublished = await fetchPublishedArticles();
  return safeLimit ? allPublished.slice(0, safeLimit) : allPublished;
}

export async function fetchNotionArticleById(articleId: string): Promise<NotionArticleDetail | null> {
  if (!articleId) return null;

  let page: Record<string, unknown>;
  try {
    page = await notionRequest<Record<string, unknown>>(`/pages/${encodeURIComponent(articleId)}`);
  } catch (error) {
    const requestError = error as NotionRequestError;
    if (requestError.status === 404) {
      return null;
    }
    throw error;
  }

  if (!isPageVisible(page)) {
    return null;
  }

  const preview = toClientPreview(mapPageToPreview(page));
  const blocks = await fetchBlockChildren(articleId);

  return {
    ...preview,
    blocks,
  };
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
