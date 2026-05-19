import {
  createClient,
  type PostgrestError,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database, Enums } from "@/src/types/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;
type ProtectedTableName = "matriz_forca" | "fenix_pureza_diaria" | "historico_treino";
type ProtectedInsert<TableName extends ProtectedTableName> =
  Database["public"]["Tables"][TableName]["Insert"];
type ProtectedUpdate<TableName extends ProtectedTableName> =
  Database["public"]["Tables"][TableName]["Update"];
type ProtectedMutationPayload<TableName extends ProtectedTableName> =
  | ProtectedInsert<TableName>
  | ProtectedUpdate<TableName>;

type SupabaseOperationResult<Data> = {
  data: Data | null;
  error: PostgrestError | null;
};

export type SupabaseGuardErrorCode =
  | "SESSION_REQUIRED"
  | "OWNER_MISMATCH"
  | "RLS_DENIED"
  | "SUPABASE_ERROR"
  | "UNKNOWN_ERROR";

export type SupabaseGuardError = {
  code: SupabaseGuardErrorCode;
  message: string;
  cause?: unknown;
};

export type SupabaseGuardResult<Data> =
  | { data: Data; error: null }
  | { data: null; error: SupabaseGuardError };

type AuthUserId = Session["user"]["id"];

export type RegistrarTreinoStatus = "SUPERAÇÃO" | "CONCLUÍDO";

export type RegistrarTreinoInput = {
  clienteId: AuthUserId;
  exercicioId: string;
  pesoAtual: number;
  musculo?: Enums<"subgrupo_muscular">;
  repeticoes?: number;
  series?: number;
  exercicioNome?: string;
};

export type RegistrarTreinoResult = {
  status: RegistrarTreinoStatus;
  max_peso_atual: number;
  peso_atual: number;
  vtc_gerado: number;
  payload: Database["public"]["Functions"]["registrar_treino_com_status"]["Returns"][number]["payload"];
};

let client: TypedSupabaseClient | null = null;

function createSupabaseClient(): TypedSupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY antes de usar o Supabase."
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

function getSupabaseClient(): TypedSupabaseClient {
  client ??= createSupabaseClient();
  return client;
}

export const supabase = new Proxy({} as TypedSupabaseClient, {
  get(_target, prop: keyof TypedSupabaseClient) {
    const instance = getSupabaseClient();
    const value = Reflect.get(instance, prop);

    if (typeof value === "function") {
      return value.bind(instance);
    }

    return value;
  },
});

function isPostgrestError(error: unknown): error is PostgrestError {
  if (typeof error !== "object" || error === null) return false;

  const maybeError = error as Partial<PostgrestError>;
  return typeof maybeError.message === "string" && typeof maybeError.code === "string";
}

export function isRlsOrPermissionError(error: unknown): boolean {
  if (!isPostgrestError(error)) return false;

  const message = error.message.toLowerCase();
  return (
    error.code === "42501" ||
    message.includes("row-level security") ||
    message.includes("rls") ||
    message.includes("permission denied") ||
    message.includes("not authorized") ||
    message.includes("unauthorized")
  );
}

export function normalizeSupabaseError(error: unknown): SupabaseGuardError {
  if (isRlsOrPermissionError(error)) {
    return {
      code: "RLS_DENIED",
      message: "Você não tem permissão para executar esta ação.",
      cause: error,
    };
  }

  if (isPostgrestError(error)) {
    return {
      code: "SUPABASE_ERROR",
      message: error.message || "Erro ao comunicar com o Supabase.",
      cause: error,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Erro inesperado ao comunicar com o Supabase.",
    cause: error,
  };
}

export async function getActiveSupabaseSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export async function requireActiveSessionForProtectedMutation<
  TableName extends ProtectedTableName,
>(payload: ProtectedMutationPayload<TableName>): Promise<SupabaseGuardResult<Session>> {
  const session = await getActiveSupabaseSession();

  if (!session?.user.id || !session.access_token) {
    return {
      data: null,
      error: {
        code: "SESSION_REQUIRED",
        message: "Faça login novamente antes de alterar dados protegidos.",
      },
    };
  }

  const ownerId = "cliente_id" in payload ? payload.cliente_id : undefined;

  if (typeof ownerId === "string" && ownerId !== session.user.id) {
    return {
      data: null,
      error: {
        code: "OWNER_MISMATCH",
        message: "A sessão ativa não corresponde ao dono dos dados.",
      },
    };
  }

  return { data: session, error: null };
}

export async function withSupabaseRlsGuard<Data>(
  operation: () => Promise<SupabaseOperationResult<Data>>,
): Promise<SupabaseGuardResult<Data>> {
  try {
    const { data, error } = await operation();

    if (error) {
      return { data: null, error: normalizeSupabaseError(error) };
    }

    if (data === null) {
      return {
        data: null,
        error: {
          code: "SUPABASE_ERROR",
          message: "O Supabase não retornou dados para esta operação.",
        },
      };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) };
  }
}

export async function withProtectedSupabaseMutation<TableName extends ProtectedTableName, Data>(
  payload: ProtectedMutationPayload<TableName>,
  operation: () => Promise<SupabaseOperationResult<Data>>,
): Promise<SupabaseGuardResult<Data>> {
  const sessionGuard = await requireActiveSessionForProtectedMutation(payload);

  if (sessionGuard.error) {
    return { data: null, error: sessionGuard.error };
  }

  return withSupabaseRlsGuard(operation);
}

export async function registrarTreinoComStatus(
  input: RegistrarTreinoInput,
): Promise<SupabaseGuardResult<RegistrarTreinoResult>> {
  const musculo = input.musculo ?? "costas";
  const repeticoes = input.repeticoes ?? 1;
  const series = input.series ?? 1;
  const exercicioNome = input.exercicioNome ?? "Treino geral";

  return withProtectedSupabaseMutation(
    {
      cliente_id: input.clienteId,
      musculo,
      exercicio_id: input.exercicioId,
      exercicio_nome: exercicioNome,
      peso: input.pesoAtual,
      repeticoes,
      series,
    },
    async () => {
      const { data, error } = await supabase.rpc("registrar_treino_com_status", {
        p_user_id: input.clienteId,
        p_exercicio_id: input.exercicioId,
        p_peso_atual: input.pesoAtual,
        p_musculo: musculo,
        p_repeticoes: repeticoes,
        p_series: series,
        p_exercicio_nome: exercicioNome,
      });

      const row = Array.isArray(data) ? data[0] : null;

      return {
        data: row
          ? {
              status: row.status === "SUPERAÇÃO" ? "SUPERAÇÃO" : "CONCLUÍDO",
              max_peso_atual: row.max_peso_atual,
              peso_atual: row.peso_atual,
              vtc_gerado: row.vtc_gerado,
              payload: row.payload,
            }
          : null,
        error,
      };
    },
  );
}

export type { ProtectedTableName, TypedSupabaseClient };
