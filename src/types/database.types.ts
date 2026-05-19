export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          updated_at: string;
          full_name: string | null;
          nome_linhagem: string | null;
          data_nascimento: string;
          role: Database["public"]["Enums"]["user_role"];
          forjador_id: string | null;
          status_altar: string;
        };
        Insert: {
          id: string;
          updated_at?: string;
          full_name?: string | null;
          nome_linhagem?: string | null;
          data_nascimento: string;
          role?: Database["public"]["Enums"]["user_role"];
          forjador_id?: string | null;
          status_altar?: string;
        };
        Update: {
          id?: string;
          updated_at?: string;
          full_name?: string | null;
          nome_linhagem?: string | null;
          data_nascimento?: string;
          role?: Database["public"]["Enums"]["user_role"];
          forjador_id?: string | null;
          status_altar?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_forjador_id_fkey";
            columns: ["forjador_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      matriz_forca: {
        Row: {
          id: string;
          cliente_id: string;
          musculo: Database["public"]["Enums"]["subgrupo_muscular"];
          estagio: Database["public"]["Enums"]["estagio_forca"];
          max_peso: number;
          vtc_total: number;
          total_sessoes: number;
          ultima_evolucao_em: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          musculo: Database["public"]["Enums"]["subgrupo_muscular"];
          estagio?: Database["public"]["Enums"]["estagio_forca"];
          max_peso?: number;
          vtc_total?: number;
          total_sessoes?: number;
          ultima_evolucao_em?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          musculo?: Database["public"]["Enums"]["subgrupo_muscular"];
          estagio?: Database["public"]["Enums"]["estagio_forca"];
          max_peso?: number;
          vtc_total?: number;
          total_sessoes?: number;
          ultima_evolucao_em?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matriz_forca_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fenix_pureza_diaria: {
        Row: {
          id: string;
          cliente_id: string;
          data: string;
          pureza_percentual: number;
          agua_litros: number | null;
          sono_horas: number | null;
          treino_realizado: boolean;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          data: string;
          pureza_percentual?: number;
          agua_litros?: number | null;
          sono_horas?: number | null;
          treino_realizado?: boolean;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          data?: string;
          pureza_percentual?: number;
          agua_litros?: number | null;
          sono_horas?: number | null;
          treino_realizado?: boolean;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fenix_pureza_diaria_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      historico_treino: {
        Row: {
          id: string;
          cliente_id: string;
          matriz_forca_id: string | null;
          musculo: Database["public"]["Enums"]["subgrupo_muscular"];
          exercicio_id: string;
          exercicio_nome: string;
          peso: number;
          repeticoes: number;
          series: number;
          vtc_gerado: number;
          status: string;
          registrado_em: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          matriz_forca_id?: string | null;
          musculo: Database["public"]["Enums"]["subgrupo_muscular"];
          exercicio_id?: string;
          exercicio_nome?: string;
          peso: number;
          repeticoes?: number;
          series?: number;
          status?: string;
          registrado_em?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          matriz_forca_id?: string | null;
          musculo?: Database["public"]["Enums"]["subgrupo_muscular"];
          exercicio_id?: string;
          exercicio_nome?: string;
          peso?: number;
          repeticoes?: number;
          series?: number;
          status?: string;
          registrado_em?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "historico_treino_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historico_treino_matriz_forca_id_fkey";
            columns: ["matriz_forca_id"];
            isOneToOne: false;
            referencedRelation: "matriz_forca";
            referencedColumns: ["id"];
          },
        ];
      };
      planos_semanais: {
        Row: {
          id: number;
          cliente_id: string;
          forjador_id: string;
          semana_inicio: string;
          treinos_prescritos: number;
          observacoes: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          cliente_id: string;
          forjador_id: string;
          semana_inicio: string;
          treinos_prescritos: number;
          observacoes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          cliente_id?: string;
          forjador_id?: string;
          semana_inicio?: string;
          treinos_prescritos?: number;
          observacoes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planos_semanais_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planos_semanais_forjador_id_fkey";
            columns: ["forjador_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      vw_renascimento_fenix: {
        Row: {
          plano_id: number;
          cliente_id: string;
          forjador_id: string;
          semana_inicio: string;
          treinos_prescritos: number;
          treinos_concluidos_semana: number;
          fenix_renasceu: boolean;
          treinos_faltantes: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      registrar_treino_com_status: {
        Args: {
          p_user_id: string;
          p_exercicio_id: string;
          p_peso_atual: number;
          p_musculo?: Database["public"]["Enums"]["subgrupo_muscular"];
          p_repeticoes?: number;
          p_series?: number;
          p_exercicio_nome?: string;
        };
        Returns: {
          status: string;
          max_peso_atual: number;
          peso_atual: number;
          vtc_gerado: number;
          payload: Json;
        }[];
      };
    };
    Enums: {
      user_role: "forjador" | "cliente";
      estagio_forca: "cinzas" | "faisca" | "brasa" | "labareda" | "fogo_cosmico_sagrado";
      subgrupo_muscular: "costas" | "peito" | "ombros" | "bracos" | "pernas";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Row"];

export type TablesInsert<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Insert"];

export type TablesUpdate<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Update"];

export type Enums<EnumName extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][EnumName];
