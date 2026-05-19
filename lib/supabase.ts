export {
  getActiveSupabaseSession,
  isRlsOrPermissionError,
  normalizeSupabaseError,
  registrarTreinoComStatus,
  requireActiveSessionForProtectedMutation,
  supabase,
  withProtectedSupabaseMutation,
  withSupabaseRlsGuard,
} from "@/src/lib/supabase";
export type {
  ProtectedTableName,
  RegistrarTreinoInput,
  RegistrarTreinoResult,
  RegistrarTreinoStatus,
  SupabaseGuardError,
  SupabaseGuardErrorCode,
  SupabaseGuardResult,
  TypedSupabaseClient,
} from "@/src/lib/supabase";
