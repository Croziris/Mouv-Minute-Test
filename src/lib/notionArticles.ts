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
  author?: string;
}

export interface NotionArticleDetail extends NotionArticlePreview {
  blocks: NotionBlock[];
}

interface ProxyEnvelope {
  results?: unknown[];
  page?: unknown;
  blocks?: unknown[];
}

const notionProxyBaseUrl = (import.meta.env.VITE_NOTION_PROXY_BASE_URL || "").trim();

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

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

function resolveProxyUrl(params: URLSearchParams): string {
  if (!notionProxyBaseUrl) {
    throw new Error("Configuration manquante: VITE_NOTION_PROXY_BASE_URL.");
  }

  const separator = notionProxyBaseUrl.includes("?") ? "&" : "?";
  return `${notionProxyBaseUrl}${separator}${params.toString()}`;
}

async function fetchProxyEnvelope(params: URLSearchParams): Promise<ProxyEnvelope> {
  const response = await fetch(resolveProxyUrl(params), {
    headers: { Accept: "application/json" },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Format proxy invalide: tableau attendu.");
  }

  const first = asRecord(payload[0]);
  if (!first) {
    throw new Error("Format proxy invalide: objet attendu a l'index 0.");
  }

  return first as ProxyEnvelope;
}

function mapAnnotations(value: unknown): NotionTextAnnotations {
  const annotations = asRecord(value);
  if (!annotations) return defaultAnnotations();

  return {
    bold: Boolean(annotations.bold),
    italic: Boolean(annotations.italic),
    strikethrough: Boolean(annotations.strikethrough),
    underline: Boolean(annotations.underline),
    code: Boolean(annotations.code),
    color: typeof annotations.color === "string" ? annotations.color : "default",
  };
}

function mapRichText(richText: unknown): NotionRichText[] {
  if (!Array.isArray(richText)) return [];

  return richText.map((item) => {
    const textItem = asRecord(item) || {};
    const textData = asRecord(textItem.text);
    const linkData = asRecord(textData?.link);

    return {
      plainText: typeof textItem.plain_text === "string" ? textItem.plain_text : "",
      href:
        typeof textItem.href === "string"
          ? textItem.href
          : typeof linkData?.url === "string"
            ? linkData.url
            : null,
      annotations: mapAnnotations(textItem.annotations),
    };
  });
}

function getPlainTextFromRichText(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  const first = asRecord(value[0]);
  return typeof first?.plain_text === "string" ? first.plain_text : "";
}

function resolveImageUrl(page: Record<string, unknown>): string {
  const properties = asRecord(page.properties) || {};

  const coverProperty = asRecord(properties.Cover);
  const coverPropertyUrl = typeof coverProperty?.url === "string" ? coverProperty.url : "";
  if (coverPropertyUrl && !coverPropertyUrl.startsWith("data:")) {
    return coverPropertyUrl;
  }

  const cover = asRecord(page.cover);
  const externalCover = asRecord(cover?.external);
  if (typeof externalCover?.url === "string") {
    return externalCover.url;
  }

  const fileCover = asRecord(cover?.file);
  if (typeof fileCover?.url === "string") {
    return fileCover.url;
  }

  return "";
}

function mapPageToPreview(page: Record<string, unknown>): NotionArticlePreview {
  const properties = asRecord(page.properties) || {};

  const titre = asRecord(properties.Titre);
  const slugProp = asRecord(properties.Slug);
  const excerpt = asRecord(properties["Excerpt/Description"]);
  const categories = asRecord(properties.Categories);
  const published = asRecord(properties.Published);
  const publishedDate = asRecord(published?.date);
  const authorProp = asRecord(properties.Author);

  const mappedAuthor = getPlainTextFromRichText(authorProp?.rich_text);

  return {
    id: typeof page.id === "string" ? page.id : "",
    title: getPlainTextFromRichText(titre?.title) || "Sans titre",
    slug: getPlainTextFromRichText(slugProp?.rich_text),
    summary: getPlainTextFromRichText(excerpt?.rich_text),
    categories: Array.isArray(categories?.multi_select)
      ? categories.multi_select
          .map((item) => {
            const option = asRecord(item);
            return typeof option?.name === "string" ? option.name : "";
          })
          .filter((name) => name.trim().length > 0)
      : [],
    publishedAt: typeof publishedDate?.start === "string" ? publishedDate.start : null,
    author: mappedAuthor || undefined,
    imageUrl: resolveImageUrl(page),
  };
}

function resolveFileLikeUrl(typeData: Record<string, unknown>): string | undefined {
  const fileData = asRecord(typeData.file);
  if (typeof fileData?.url === "string") return fileData.url;

  const externalData = asRecord(typeData.external);
  if (typeof externalData?.url === "string") return externalData.url;

  if (typeof typeData.url === "string") return typeData.url;

  return undefined;
}

function resolveCalloutIcon(typeData: Record<string, unknown>): string | undefined {
  const icon = asRecord(typeData.icon);
  if (!icon) return undefined;

  if (icon.type === "emoji" && typeof icon.emoji === "string") return icon.emoji;

  const external = asRecord(icon.external);
  if (typeof external?.url === "string") return external.url;

  const fileData = asRecord(icon.file);
  if (typeof fileData?.url === "string") return fileData.url;

  return undefined;
}

function mapBlock(rawBlock: unknown): NotionBlock | null {
  const block = asRecord(rawBlock);
  if (!block) return null;

  const type = typeof block.type === "string" ? block.type : "";
  if (!type) return null;

  const typeData = asRecord(block[type]) || {};

  const mapped: NotionBlock = {
    id: typeof block.id === "string" ? block.id : `${type}-${Date.now()}`,
    type,
  };

  if (Array.isArray(typeData.rich_text)) {
    mapped.richText = mapRichText(typeData.rich_text);
  }

  if (Array.isArray(typeData.caption)) {
    mapped.caption = mapRichText(typeData.caption);
  }

  if (type === "to_do") {
    mapped.checked = Boolean(typeData.checked);
  }

  if (type === "code") {
    mapped.language = typeof typeData.language === "string" ? typeData.language : "plain";
  }

  if (type === "callout") {
    mapped.icon = resolveCalloutIcon(typeData);
  }

  if (type === "child_page") {
    mapped.title = typeof typeData.title === "string" ? typeData.title : "Sous-page";
  }

  if (["image", "video", "file", "pdf", "bookmark", "embed", "link_preview"].includes(type)) {
    mapped.url = resolveFileLikeUrl(typeData);
  }

  if (type === "equation" && typeof typeData.expression === "string") {
    mapped.richText = [
      {
        plainText: typeData.expression,
        href: null,
        annotations: defaultAnnotations(),
      },
    ];
  }

  if (Array.isArray(block.children)) {
    mapped.children = block.children
      .map((child) => mapBlock(child))
      .filter((child): child is NotionBlock => Boolean(child));
  }

  return mapped;
}

export async function fetchNotionArticles(limit?: number): Promise<NotionArticlePreview[]> {
  const envelope = await fetchProxyEnvelope(new URLSearchParams({ type: "articles" }));
  const rawResults = Array.isArray(envelope.results) ? envelope.results : [];

  const articles = rawResults
    .map((item) => {
      const page = asRecord(item);
      return page ? mapPageToPreview(page) : null;
    })
    .filter((article): article is NotionArticlePreview => Boolean(article));

  const safeLimit = typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : null;
  return safeLimit ? articles.slice(0, safeLimit) : articles;
}

export async function fetchNotionArticleById(articleId: string): Promise<NotionArticleDetail | null> {
  if (!articleId) return null;

  const envelope = await fetchProxyEnvelope(
    new URLSearchParams({ type: "article", id: articleId })
  );

  const page = asRecord(envelope.page);
  if (!page) return null;

  const preview = mapPageToPreview(page);
  const blocks = (Array.isArray(envelope.blocks) ? envelope.blocks : [])
    .map((item) => mapBlock(item))
    .filter((block): block is NotionBlock => Boolean(block));

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
