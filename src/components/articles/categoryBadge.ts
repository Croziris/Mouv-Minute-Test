const categoryPalette = [
  "bg-primary/15 text-primary border-primary/30",
  "bg-accent/15 text-accent border-accent/30",
  "bg-secondary text-secondary-foreground border-border",
];

function hashLabel(label: string): number {
  return [...label].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function getCategoryBadgeClass(category: string): string {
  const index = hashLabel(category) % categoryPalette.length;
  return categoryPalette[index];
}
