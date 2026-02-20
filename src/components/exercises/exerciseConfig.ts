import { Exercise } from "@/lib/pocketbase";

export type ExerciseZone = Exercise["zone"];

export const zoneConfig: Record<ExerciseZone, { label: string; color: string }> = {
  nuque: { label: "Nuque", color: "bg-primary/10 text-primary" },
  epaules: { label: "Epaules", color: "bg-accent/10 text-accent" },
  dos: { label: "Dos", color: "bg-primary/15 text-primary" },
  trapezes: { label: "Trapezes", color: "bg-accent/15 text-accent" },
  tronc: { label: "Tronc", color: "bg-primary/20 text-primary" },
  jambes: { label: "Jambes", color: "bg-accent/20 text-accent" },
  general: { label: "General", color: "bg-secondary text-secondary-foreground" },
};
