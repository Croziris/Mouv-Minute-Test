import { Fragment, type ReactNode } from "react";
import { CheckSquare, ExternalLink, Square } from "lucide-react";
import type { NotionBlock, NotionRichText } from "@/lib/notionArticles";
import { cn } from "@/lib/utils";

const notionColorClasses: Record<string, string> = {
  gray: "text-muted-foreground",
  brown: "text-accent",
  orange: "text-accent",
  yellow: "text-accent",
  green: "text-primary",
  blue: "text-primary",
  purple: "text-primary",
  pink: "text-accent",
  red: "text-accent",
  gray_background: "bg-muted/70 rounded px-1 py-0.5",
  brown_background: "bg-accent/10 rounded px-1 py-0.5",
  orange_background: "bg-accent/10 rounded px-1 py-0.5",
  yellow_background: "bg-accent/10 rounded px-1 py-0.5",
  green_background: "bg-primary/10 rounded px-1 py-0.5",
  blue_background: "bg-primary/10 rounded px-1 py-0.5",
  purple_background: "bg-primary/10 rounded px-1 py-0.5",
  pink_background: "bg-accent/10 rounded px-1 py-0.5",
  red_background: "bg-accent/10 rounded px-1 py-0.5",
};

function extractCaption(block: NotionBlock): string {
  return (block.caption || []).map((part) => part.plainText).join("").trim();
}

function getColorClass(color: string): string {
  return notionColorClasses[color] || "";
}

function renderRichText(richText: NotionRichText[], keyPrefix: string): ReactNode {
  if (!richText.length) return null;

  return richText.map((part, index) => {
    const tokenKey = `${keyPrefix}-${index}`;
    const className = cn(
      "whitespace-pre-wrap",
      part.annotations.bold && "font-semibold",
      part.annotations.italic && "italic",
      part.annotations.underline && "underline",
      part.annotations.strikethrough && "line-through",
      part.annotations.code && "rounded bg-secondary px-1 py-0.5 font-mono text-sm",
      getColorClass(part.annotations.color)
    );

    const content = <span className={className}>{part.plainText}</span>;
    if (!part.href) return <Fragment key={tokenKey}>{content}</Fragment>;

    return (
      <a
        key={tokenKey}
        href={part.href}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-primary/50 underline-offset-4 hover:text-primary"
      >
        {content}
      </a>
    );
  });
}

function renderListItems(items: NotionBlock[], ordered: boolean, depth: number): ReactNode {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <ListTag
      className={cn(
        "space-y-3 pl-6 text-foreground",
        ordered ? "list-decimal marker:text-primary" : "list-disc marker:text-primary",
        depth > 0 && "mt-2"
      )}
    >
      {items.map((item) => (
        <li key={item.id} className="space-y-2">
          <div className="leading-relaxed">{renderRichText(item.richText || [], `${item.id}-item`)}</div>
          {item.children && item.children.length > 0 ? (
            <div className="pl-4">{renderBlocks(item.children, depth + 1)}</div>
          ) : null}
        </li>
      ))}
    </ListTag>
  );
}

function renderSingleBlock(block: NotionBlock, depth: number): ReactNode {
  const richText = block.richText || [];
  const nestedChildren =
    block.children && block.children.length > 0 ? (
      <div className="mt-3 space-y-3 border-l border-border/60 pl-4">{renderBlocks(block.children, depth + 1)}</div>
    ) : null;

  switch (block.type) {
    case "paragraph":
      if (!richText.length && !nestedChildren) return <div className="h-3" />;
      return (
        <div className="space-y-2">
          <p className="leading-relaxed text-foreground/95">{renderRichText(richText, `${block.id}-paragraph`)}</p>
          {nestedChildren}
        </div>
      );

    case "heading_1":
      return (
        <div className="space-y-2 pt-2">
          <h2 className="text-3xl font-heading font-bold leading-tight text-foreground">
            {renderRichText(richText, `${block.id}-h1`)}
          </h2>
          {nestedChildren}
        </div>
      );

    case "heading_2":
      return (
        <div className="space-y-2 pt-1">
          <h3 className="text-2xl font-heading font-semibold leading-tight text-foreground">
            {renderRichText(richText, `${block.id}-h2`)}
          </h3>
          {nestedChildren}
        </div>
      );

    case "heading_3":
      return (
        <div className="space-y-2 pt-1">
          <h4 className="text-xl font-heading font-semibold leading-tight text-foreground">
            {renderRichText(richText, `${block.id}-h3`)}
          </h4>
          {nestedChildren}
        </div>
      );

    case "quote":
      return (
        <blockquote className="rounded-r-lg border-l-4 border-primary/40 bg-primary/5 px-4 py-3 text-foreground/90">
          <p className="leading-relaxed">{renderRichText(richText, `${block.id}-quote`)}</p>
          {nestedChildren}
        </blockquote>
      );

    case "to_do":
      return (
        <div className="flex items-start gap-3 rounded-lg bg-secondary/40 px-3 py-2">
          {block.checked ? (
            <CheckSquare className="mt-0.5 h-4 w-4 text-primary" />
          ) : (
            <Square className="mt-0.5 h-4 w-4 text-muted-foreground" />
          )}
          <div className="space-y-2 text-foreground">
            <p className={cn("leading-relaxed", block.checked && "text-muted-foreground line-through")}>
              {renderRichText(richText, `${block.id}-todo`)}
            </p>
            {nestedChildren}
          </div>
        </div>
      );

    case "toggle":
      return (
        <details className="rounded-lg border border-border/70 bg-secondary/20 px-4 py-3">
          <summary className="cursor-pointer font-medium text-foreground">
            {renderRichText(richText, `${block.id}-toggle`)}
          </summary>
          {nestedChildren}
        </details>
      );

    case "callout": {
      const icon = block.icon || "!";
      const iconNode = icon.startsWith("http") ? (
        <img src={icon} alt="" className="mt-0.5 h-5 w-5 rounded" />
      ) : (
        <span className="mt-0.5 text-lg leading-none">{icon}</span>
      );

      return (
        <div className="flex gap-3 rounded-lg border border-border/70 bg-secondary/40 px-4 py-3">
          {iconNode}
          <div className="space-y-2 leading-relaxed text-foreground/95">
            <p>{renderRichText(richText, `${block.id}-callout`)}</p>
            {nestedChildren}
          </div>
        </div>
      );
    }

    case "code": {
      const codeContent = richText.map((part) => part.plainText).join("");
      return (
        <figure className="space-y-2">
          {block.language ? <figcaption className="text-xs uppercase tracking-wide text-muted-foreground">{block.language}</figcaption> : null}
          <pre className="overflow-x-auto rounded-lg border border-border/70 bg-secondary/70 p-4 text-sm">
            <code className="font-mono text-foreground">{codeContent}</code>
          </pre>
          {nestedChildren}
        </figure>
      );
    }

    case "divider":
      return <hr className="my-8 border-border" />;

    case "image": {
      if (!block.url) return null;
      const caption = extractCaption(block);
      return (
        <figure className="space-y-2">
          <img src={block.url} alt={caption || "Illustration"} className="w-full rounded-lg border border-border/60 object-cover shadow-soft" />
          {caption ? <figcaption className="text-sm text-muted-foreground">{caption}</figcaption> : null}
        </figure>
      );
    }

    case "video":
    case "file":
    case "pdf":
    case "bookmark":
    case "embed":
    case "link_preview":
      if (!block.url) return null;
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/25 px-3 py-2 text-sm text-primary hover:bg-secondary/40"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="truncate">{block.url}</span>
        </a>
      );

    case "child_page":
      return (
        <div className="space-y-2 rounded-lg border border-border/70 bg-secondary/25 px-4 py-3">
          <p className="font-heading text-lg font-semibold text-foreground">{block.title || "Sous-page"}</p>
          {nestedChildren}
        </div>
      );

    default:
      if (!richText.length && !nestedChildren) return null;
      return (
        <div className="space-y-2">
          <p className="leading-relaxed text-foreground/95">{renderRichText(richText, `${block.id}-fallback`)}</p>
          {nestedChildren}
        </div>
      );
  }
}

function renderBlocks(blocks: NotionBlock[], depth = 0): ReactNode[] {
  const rendered: ReactNode[] = [];

  for (let index = 0; index < blocks.length; ) {
    const block = blocks[index];

    if (block.type === "bulleted_list_item" || block.type === "numbered_list_item") {
      const ordered = block.type === "numbered_list_item";
      const groupedItems: NotionBlock[] = [];

      while (index < blocks.length && blocks[index].type === block.type) {
        groupedItems.push(blocks[index]);
        index += 1;
      }

      rendered.push(
        <Fragment key={`${block.type}-${groupedItems[0].id}`}>
          {renderListItems(groupedItems, ordered, depth)}
        </Fragment>
      );
      continue;
    }

    rendered.push(<Fragment key={block.id}>{renderSingleBlock(block, depth)}</Fragment>);
    index += 1;
  }

  return rendered;
}

interface NotionContentProps {
  blocks: NotionBlock[];
  className?: string;
}

export function NotionContent({ blocks, className }: NotionContentProps) {
  if (!blocks.length) {
    return <p className="text-muted-foreground">Le contenu de cet article est vide pour le moment.</p>;
  }

  return <div className={cn("space-y-5", className)}>{renderBlocks(blocks)}</div>;
}
