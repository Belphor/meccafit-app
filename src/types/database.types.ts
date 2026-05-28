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
          created_at: string;
          full_name: string | null;
          nome_linhagem: string | null;
          data_nascimento: string;
          role: Database["public"]["Enums"]["user_role"];
          forjador_id: string | null;
          status_altar: string;
          phase_tier: number;
          phase_setup_at: string;
          custom_preferences: Json;
        };
        Insert: {
          id: string;
          updated_at?: string;
          created_at?: string;
          full_name?: string | null;
          nome_linhagem?: string | null;
          data_nascimento: string;
          role?: Database["public"]["Enums"]["user_role"];
          forjador_id?: string | null;
          status_altar?: string;
          phase_tier?: number;
          phase_setup_at?: string;
          custom_preferences?: Json;
        };
        Update: {
          id?: string;
          updated_at?: string;
          created_at?: string;
          full_name?: string | null;
          nome_linhagem?: string | null;
          data_nascimento?: string;
          role?: Database["public"]["Enums"]["user_role"];
          forjador_id?: string | null;
          status_altar?: string;
          phase_tier?: number;
          phase_setup_at?: string;
          custom_preferences?: Json;
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
          vtc_atual: number;
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
          vtc_atual?: number;
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
          vtc_atual?: number;
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
      balanco_termico_diario: {
        Row: {
          user_id: string;
          data_treino: string;
          vtc_total: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          data_treino: string;
          vtc_total?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          data_treino?: string;
          vtc_total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "balanco_termico_diario_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      historico_treinos: {
        Row: {
          id: number;
          user_id: string | null;
          cliente_id: string | null;
          exercicio_id: number;
          exercicio_nome: string;
          musculo: string;
          peso: number | null;
          peso_atual: number;
          repeticoes: number;
          series: number;
          status: string | null;
          registrado_em: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          cliente_id?: string | null;
          exercicio_id: number;
          exercicio_nome: string;
          musculo: string;
          peso?: number | null;
          peso_atual: number;
          repeticoes?: number;
          series?: number;
          status?: string | null;
          registrado_em?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          cliente_id?: string | null;
          exercicio_id?: number;
          exercicio_nome?: string;
          musculo?: string;
          peso?: number | null;
          peso_atual?: number;
          repeticoes?: number;
          series?: number;
          status?: string | null;
          registrado_em?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "historico_treinos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invite_tokens: {
        Row: {
          id: string;
          token_hash: string;
          forjador_id: string | null;
          expires_at: string;
          used_at: string | null;
          used_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token_hash: string;
          forjador_id?: string | null;
          expires_at: string;
          used_at?: string | null;
          used_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token_hash?: string;
          forjador_id?: string | null;
          expires_at?: string;
          used_at?: string | null;
          used_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invite_tokens_forjador_id_fkey";
            columns: ["forjador_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invite_tokens_used_by_fkey";
            columns: ["used_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
          p_exercicio_id?: string | null;
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
      argos_fetch_mural_comunidade: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          id: number;
          exercicio_nome: string;
          peso: number;
          series: number;
          registrado_em: string;
          atleta_nome: string;
          nome_linhagem: string;
        }[];
      };
      argos_fetch_forum_brasa_viva: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          id: number;
          topic_title: string;
          topic_body: string;
          author_name: string;
          author_lineage: string;
          author_phase_tier: number;
          peso: number;
          series: number;
          registrado_em: string;
        }[];
      };
      argos_consume_invite_for_user: {
        Args: {
          p_token: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      fetch_dashboard_bundle: {
        Args: {
          p_musculo?: Database["public"]["Enums"]["subgrupo_muscular"];
          p_mural_limit?: number;
        };
        Returns: Json;
      };
      argos_advance_phase_if_eligible: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      argos_compute_vtc_30d: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      argos_compute_session_vtc_today: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      argos_validate_invite_token: {
        Args: {
          p_token: string;
        };
        Returns: boolean;
      };
      argos_consume_invite_token: {
        Args: {
          p_token: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "forjador" | "forjador_linhagem" | "forjador_soberano" | "cliente";
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
