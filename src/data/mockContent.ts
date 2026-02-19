export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  image_url?: string;
  created_at: string;
}

export interface DailyTip {
  id: string;
  title: string;
  content: string;
}

export interface Exercise {
  id: string;
  title: string;
  zone: string;
  duration_sec: number;
  description_public: string;
  notes_kine: string | null;
  thumb_url: string | null;
  media_primary: string | null;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  order_index: number;
}

const makeDate = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return date.toISOString();
};

const embed = (videoId: string) =>
  `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;

export const placeholderThumb = "/placeholder.svg";

export const dailyTip: DailyTip = {
  id: "tip-1",
  title: "Bougez 3 minutes toutes les 45 a 60 minutes",
  content:
    "Des pauses actives courtes et regulieres reduisent la raideur, maintiennent la concentration et diminuent la fatigue en fin de journee.",
};

export const articles: Article[] = [
  {
    id: "art-1",
    title: "5 etirements rapides pour la nuque au bureau",
    summary: "Une routine simple de 3 minutes pour soulager les tensions cervicales.",
    content:
      "Installez-vous dos droit, inspirez lentement, puis inclinez la tete sur chaque cote pendant 20 secondes. Ajoutez des rotations d'epaules et terminez par une auto-grandissement de la colonne. Cette sequence diminue la sensation de raideur et relance la circulation.",
    created_at: makeDate(1),
  },
  {
    id: "art-2",
    title: "Pourquoi les micro-pauses ameliorent la productivite",
    summary: "Couper 2 a 5 minutes toutes les heures peut augmenter la qualite du travail.",
    content:
      "Le cerveau et le systeme musculaire fonctionnent mieux avec des cycles d'effort et de recuperation. Une courte pause avec quelques mouvements diminue la charge mentale et reduit la douleur percue. L'objectif est la regularite, pas la duree.",
    created_at: makeDate(3),
  },
  {
    id: "art-3",
    title: "Posture assise: les 3 reglages essentiels",
    summary: "Chaise, ecran et clavier: les reperes a verifier en moins de 2 minutes.",
    content:
      "Reglez la hauteur de chaise pour garder les pieds au sol, placez le haut de l'ecran au niveau des yeux et rapprochez le clavier pour eviter les epaules enroulees. Ces trois points limitent la surcharge cervicale et lombaire.",
    created_at: makeDate(6),
  },
  {
    id: "art-4",
    title: "Bas du dos: routine anti-raideur en fin de journee",
    summary: "Des mobilisations douces pour detendre la region lombaire.",
    content:
      "Alternez bascules de bassin assis, extension thoracique et marche active de 2 minutes. Realisez les mouvements sans douleur et en respiration calme. L'important est d'eviter de rester immobile trop longtemps.",
    created_at: makeDate(8),
  },
  {
    id: "art-5",
    title: "Hydratation et concentration au travail",
    summary: "Boire regulierement aide la vigilance et diminue la fatigue.",
    content:
      "Un niveau d'hydratation insuffisant peut impacter la concentration et la perception de l'effort. Gardez une gourde visible, associez chaque pause active a quelques gorgees d'eau et adaptez vos apports a la temperature.",
    created_at: makeDate(10),
  },
  {
    id: "art-6",
    title: "Respiration anti-stress avant une reunion",
    summary: "Une technique en 90 secondes pour baisser la tension.",
    content:
      "Inspirez 4 secondes, expirez 6 secondes, pendant 8 a 10 cycles. Cette expiration plus longue active un retour au calme utile avant un temps de parole ou une decision importante.",
    created_at: makeDate(14),
  },
];

export const exercises: Exercise[] = [
  {
    id: "ex-1",
    title: "Mobilisation cervicale assise",
    zone: "nuque",
    duration_sec: 45,
    description_public: "Inclinaisons laterales douces avec respiration lente.",
    notes_kine: "Gardez les epaules relachees, sans chercher l'amplitude maximale.",
    thumb_url: null,
    media_primary: embed("dQw4w9WgXcQ"),
  },
  {
    id: "ex-2",
    title: "Ouverture thoracique au mur",
    zone: "haut du dos",
    duration_sec: 60,
    description_public: "Rotation du buste pour liberer la cage thoracique.",
    notes_kine: "Stabilisez le bassin et respirez sur chaque repetition.",
    thumb_url: null,
    media_primary: embed("aqz-KE-bpKQ"),
  },
  {
    id: "ex-3",
    title: "Extension poignets et avant-bras",
    zone: "bras",
    duration_sec: 30,
    description_public: "Etirement des fléchisseurs et extenseurs de poignet.",
    notes_kine: "Maintenez une tension legere, jamais douloureuse.",
    thumb_url: null,
    media_primary: embed("M7lc1UVf-VE"),
  },
  {
    id: "ex-4",
    title: "Bascule du bassin sur chaise",
    zone: "bas du dos",
    duration_sec: 60,
    description_public: "Alternance retroversion/anteversion pour decompresser le bas du dos.",
    notes_kine: "Mouvement lent et fluide, sans blocage en fin de course.",
    thumb_url: null,
    media_primary: embed("ysz5S6PUM-U"),
  },
  {
    id: "ex-5",
    title: "Pompe cheville assise",
    zone: "jambes",
    duration_sec: 40,
    description_public: "Flexion/extension de cheville pour relancer la circulation.",
    notes_kine: null,
    thumb_url: null,
    media_primary: embed("ScMzIvxBSi4"),
  },
  {
    id: "ex-6",
    title: "Rotation epaules debout",
    zone: "autre",
    duration_sec: 35,
    description_public: "Grandes rotations des epaules vers l'arriere.",
    notes_kine: "Coordonnez le mouvement avec une expiration lente.",
    thumb_url: null,
    media_primary: embed("jNQXAC9IVRw"),
  },
];

export const programs: Program[] = [
  {
    id: "prog-1",
    title: "Reset nuque et epaules",
    description: "Routine courte pour detendre le haut du corps apres une longue assise.",
    order_index: 1,
  },
  {
    id: "prog-2",
    title: "Pause lombaire express",
    description: "Sequence de 3 exercices pour soulager le bas du dos.",
    order_index: 2,
  },
  {
    id: "prog-3",
    title: "Activation complete",
    description: "Routine globale de 5 minutes pour relancer l'energie.",
    order_index: 3,
  },
];

const programExerciseIds: Record<string, string[]> = {
  "prog-1": ["ex-1", "ex-2", "ex-6"],
  "prog-2": ["ex-4", "ex-5", "ex-2"],
  "prog-3": ["ex-6", "ex-1", "ex-3", "ex-4", "ex-5"],
};

export const getHomeArticles = () => articles.slice(0, 4);

export const getArticleById = (id: string) =>
  articles.find((article) => article.id === id) ?? null;

export const getAllArticles = () => [...articles].sort((a, b) => b.created_at.localeCompare(a.created_at));

export const getExercises = () => [...exercises];

export const getExerciseById = (id: string) =>
  exercises.find((exercise) => exercise.id === id) ?? null;

export const getPrograms = () => [...programs].sort((a, b) => a.order_index - b.order_index);

export const getProgramById = (id: string) =>
  programs.find((program) => program.id === id) ?? null;

export const getProgramExercises = (programId: string) => {
  const ids = programExerciseIds[programId] ?? [];
  return ids
    .map((id) => getExerciseById(id))
    .filter((exercise): exercise is Exercise => exercise !== null);
};

export const getRandomExercises = (count: number) => {
  const shuffled = [...exercises].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(count, exercises.length)));
};
