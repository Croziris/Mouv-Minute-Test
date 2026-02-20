import PocketBase from 'pocketbase'

const configuredPocketBaseUrl = (import.meta.env.VITE_POCKETBASE_URL || '').trim()

const pocketBaseUrl =
  /^https?:\/\//i.test(configuredPocketBaseUrl)
    ? '/api/pb'
    : configuredPocketBaseUrl || '/api/pb'


// Instance unique PocketBase partagée dans toute l'app
export const pb = new PocketBase(pocketBaseUrl)
pb.autoCancellation(false)

// ============================================================
// TYPES
// ============================================================

export interface Exercise {
  id: string
  title: string
  zone: 'nuque' | 'epaules' | 'dos' | 'trapezes' | 'tronc' | 'jambes' | 'general'
  duration_sec: number
  youtube_id: string
  thumb_url: string
  description_public: string
  notes_kine: string
}

export interface ExercisePayload {
  title: string
  zone: Exercise['zone']
  duration_sec: number
  youtube_id: string
  thumb_url: string
  description_public: string
  notes_kine: string
}

export interface Program {
  id: string
  title: string
  description: string
  zone: string
  order_index: number
  expand?: { program_exercises_via_program: ProgramExercise[] }
}

export interface ProgramExercise {
  id: string
  program: string
  exercise: string
  order_index: number
  expand?: { exercise: Exercise }
}

export interface Session {
  id: string
  user: string
  ended_at: string
  completed: boolean
  duration_minute: number
  created: string
}

export interface ActiveTimer {
  id: string
  user: string
  session: string
  start_at: string
  end_at: string
  duration_ms: number
  is_active: boolean
  paused_remaining_ms: number
}

export interface UserProfile {
  id: string
  email: string
  display_name: string
  role: 'user' | 'admin'
  stripe_customer_id: string
  subscription_status: 'free' | 'active' | 'cancelled'
}

// ============================================================
// AUTH
// ============================================================

export const authService = {

  // Inscription
  async signUp(email: string, password: string, displayName: string) {
    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      display_name: displayName,
      role: 'user',
      subscription_status: 'free',
    })
    await pb.collection('users').authWithPassword(email, password)
    return user
  },

  // Connexion
  async signIn(email: string, password: string) {
    return await pb.collection('users').authWithPassword(email, password)
  },

  // Déconnexion
  signOut() {
    pb.authStore.clear()
  },

  // Utilisateur actuellement connecté
  getCurrentUser(): UserProfile | null {
    return pb.authStore.model as UserProfile | null
  },

  // Est-ce que l'utilisateur est connecté ?
  isLoggedIn(): boolean {
    return pb.authStore.isValid
  },

  // Réinitialisation mot de passe
  async resetPassword(email: string) {
    return await pb.collection('users').requestPasswordReset(email)
  },
}

// ============================================================
// EXERCICES
// ============================================================

export const exerciseService = {

  // Récupérer tous les exercices
  async getAll(zone?: string) {
    const filter = zone ? `zone = "${zone}"` : ''
    return await pb.collection('exercises').getFullList<Exercise>({
      filter,
      sort: 'title',
      requestKey: null,
    })
  },

  // Récupérer un exercice par ID
  async getById(id: string) {
    return await pb.collection('exercises').getOne<Exercise>(id)
  },

  // Creer un exercice
  async create(payload: ExercisePayload) {
    return await pb.collection('exercises').create<Exercise>(payload)
  },

  // Mettre a jour un exercice
  async update(id: string, payload: ExercisePayload) {
    return await pb.collection('exercises').update<Exercise>(id, payload)
  },

  // Supprimer un exercice
  async remove(id: string) {
    return await pb.collection('exercises').delete(id)
  },
}

// ============================================================
// PROGRAMMES
// ============================================================

export const programService = {

  // Récupérer tous les programmes avec leurs exercices
  async getAll(zone?: string) {
    const filter = zone ? `zone = "${zone}"` : ''
    return await pb.collection('programs').getFullList<Program>({
      filter,
      sort: 'order_index',
    })
  },

  // Récupérer les exercices d'un programme
  async getExercises(programId: string) {
    return await pb.collection('program_exercises').getFullList<ProgramExercise>({
      filter: `program = "${programId}"`,
      sort: 'order_index',
      expand: 'exercise',
    })
  },
}

// ============================================================
// SESSIONS DE TRAVAIL
// ============================================================

export const sessionService = {

  // Démarrer une nouvelle session
  async start(durationMinutes: number = 45) {
    const userId = pb.authStore.model?.id
    if (!userId) throw new Error('Non connecté')
    return await pb.collection('sessions').create<Session>({
      user: userId,
      duration_minute: durationMinutes,
      completed: false,
    })
  },

  // Terminer une session
  async end(sessionId: string) {
    return await pb.collection('sessions').update<Session>(sessionId, {
      ended_at: new Date().toISOString(),
      completed: true,
    })
  },

  // Historique des sessions de l'utilisateur
  async getHistory() {
    const userId = pb.authStore.model?.id
    if (!userId) throw new Error('Non connecté')
    return await pb.collection('sessions').getFullList<Session>({
      filter: `user = "${userId}"`,
      sort: '-created',
    })
  },
}

// ============================================================
// TIMER
// ============================================================

export const timerService = {

  // Démarrer un timer
  async start(durationMs: number, sessionId?: string) {
    const userId = pb.authStore.model?.id
    if (!userId) throw new Error('Non connecté')
    const now = new Date()
    const endAt = new Date(now.getTime() + durationMs)
    return await pb.collection('active_timers').create<ActiveTimer>({
      user: userId,
      session: sessionId || '',
      start_at: now.toISOString(),
      end_at: endAt.toISOString(),
      duration_ms: durationMs,
      is_active: true,
    })
  },

  // Récupérer le timer actif
  async getActive() {
    const userId = pb.authStore.model?.id
    if (!userId) return null
    const result = await pb.collection('active_timers').getList<ActiveTimer>(1, 1, {
      filter: `user = "${userId}" && is_active = true`,
      sort: '-created',
    })
    return result.items[0] || null
  },

  // Arrêter le timer
  async stop(timerId: string) {
    return await pb.collection('active_timers').update<ActiveTimer>(timerId, {
      is_active: false,
    })
  },

  // Mettre en pause
  async pause(timerId: string, remainingMs: number) {
    return await pb.collection('active_timers').update<ActiveTimer>(timerId, {
      is_active: false,
      paused_remaining_ms: remainingMs,
    })
  },

  // Reprendre
  async resume(timerId: string, remainingMs: number) {
    const now = new Date()
    const endAt = new Date(now.getTime() + remainingMs)
    return await pb.collection('active_timers').update<ActiveTimer>(timerId, {
      start_at: now.toISOString(),
      end_at: endAt.toISOString(),
      is_active: true,
      paused_remaining_ms: 0,
    })
  },
}

// ============================================================
// NOTIFICATIONS PUSH
// ============================================================

export const pushService = {

  async save(subscription: PushSubscription) {
    const userId = pb.authStore.model?.id
    if (!userId) throw new Error('Non connecté')
    const json = subscription.toJSON()
    return await pb.collection('push_subscriptions').create({
      user: userId,
      endpoint: json.endpoint,
      p256dh: (json.keys as Record<string, string>)?.p256dh,
      auth_key: (json.keys as Record<string, string>)?.auth,
      device_type: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop',
    })
  },
}
