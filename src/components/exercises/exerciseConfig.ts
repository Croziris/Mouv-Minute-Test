export type ExerciseZone = "Nuque" | "Bas_du_dos" | "Haut_du_dos" | "Jambes" | "Bras" | "Autre";

export const zoneConfig: Record<ExerciseZone, { label: string; color: string; value: string }> = {
  Nuque: { label: "Nuque", color: "bg-primary/10 text-primary", value: "Nuque" },
  Bas_du_dos: { label: "Bas du dos", color: "bg-accent/10 text-accent", value: "Bas du dos" },
  Haut_du_dos: { label: "Haut du dos", color: "bg-primary/15 text-primary", value: "Haut du dos" },
  Jambes: { label: "Jambes", color: "bg-accent/15 text-accent", value: "Jambes" },
  Bras: { label: "Bras", color: "bg-primary/20 text-primary", value: "Bras" },
  Autre: { label: "Autre", color: "bg-secondary text-secondary-foreground", value: "Autre" },
};

export const exerciseZones = Object.keys(zoneConfig) as ExerciseZone[];

export const isExerciseZone = (value: string): value is ExerciseZone => value in zoneConfig;

export const getExerciseZoneFromPocketBaseValue = (value: string): ExerciseZone | null => {
  for (const zone of exerciseZones) {
    if (zoneConfig[zone].value === value) return zone;
  }
  return null;
};
