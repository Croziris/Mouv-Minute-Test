export type ExerciseZone = "Nuque" | "Bas_du_dos" | "Haut_du_dos" | "Jambes" | "Bras" | "Autre";

export const zoneConfig: Record<ExerciseZone, { label: string; color: string }> = {
  Nuque: { label: "Nuque", color: "bg-primary/10 text-primary" },
  Bas_du_dos: { label: "Bas du dos", color: "bg-accent/10 text-accent" },
  Haut_du_dos: { label: "Haut du dos", color: "bg-primary/15 text-primary" },
  Jambes: { label: "Jambes", color: "bg-accent/15 text-accent" },
  Bras: { label: "Bras", color: "bg-primary/20 text-primary" },
  Autre: { label: "Autre", color: "bg-secondary text-secondary-foreground" },
};
