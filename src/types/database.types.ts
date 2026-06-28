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
          target_days_per_week: number;
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
          target_days_per_week?: number;
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
          target_days_per_week?: number;
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
      purity_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          is_pure: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_date?: string;
          is_pure?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_date?: string;
          is_pure?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purity_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      planos_atletas: {
        Row: {
          atleta_id: string;
          total_treinos_mensais_planejados: number;
          grupos_obrigatorios: string[];
          tem_cinturao_duelo: boolean;
          tem_cinturao_superiores: boolean;
          tem_cinturao_inferiores: boolean;
          is_rei_das_chamas: boolean;
          is_rei_chamas_superiores: boolean;
          is_rei_chamas_inferiores: boolean;
          is_pilar_cooperativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          atleta_id: string;
          total_treinos_mensais_planejados?: number;
          grupos_obrigatorios?: string[];
          tem_cinturao_duelo?: boolean;
          tem_cinturao_superiores?: boolean;
          tem_cinturao_inferiores?: boolean;
          is_rei_das_chamas?: boolean;
          is_rei_chamas_superiores?: boolean;
          is_rei_chamas_inferiores?: boolean;
          is_pilar_cooperativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          atleta_id?: string;
          total_treinos_mensais_planejados?: number;
          grupos_obrigatorios?: string[];
          tem_cinturao_duelo?: boolean;
          tem_cinturao_superiores?: boolean;
          tem_cinturao_inferiores?: boolean;
          is_rei_das_chamas?: boolean;
          is_rei_chamas_superiores?: boolean;
          is_rei_chamas_inferiores?: boolean;
          is_pilar_cooperativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      duelos_supergrupos: {
        Row: {
          id: string;
          atleta_desafiante_id: string;
          atleta_desafiado_id: string;
          tipo_confronto: Database["public"]["Enums"]["tipo_confronto_duelo"];
          vtc_desafiante: number;
          vtc_desafiado: number;
          status: Database["public"]["Enums"]["status_duelo_supergrupo"];
          inicio_em: string;
          fim_em: string;
          vencedor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          atleta_desafiante_id: string;
          atleta_desafiado_id: string;
          tipo_confronto: Database["public"]["Enums"]["tipo_confronto_duelo"];
          vtc_desafiante?: number;
          vtc_desafiado?: number;
          status?: Database["public"]["Enums"]["status_duelo_supergrupo"];
          inicio_em?: string;
          fim_em?: string;
          vencedor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          atleta_desafiante_id?: string;
          atleta_desafiado_id?: string;
          tipo_confronto?: Database["public"]["Enums"]["tipo_confronto_duelo"];
          vtc_desafiante?: number;
          vtc_desafiado?: number;
          status?: Database["public"]["Enums"]["status_duelo_supergrupo"];
          inicio_em?: string;
          fim_em?: string;
          vencedor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      metas_coletivas_academia: {
        Row: {
          id: string;
          mes_referencia: string;
          tonelagem_alvo_kg: number;
          tonelagem_atual_acumulada: number;
          fechado_em: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mes_referencia: string;
          tonelagem_alvo_kg?: number;
          tonelagem_atual_acumulada?: number;
          fechado_em?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mes_referencia?: string;
          tonelagem_alvo_kg?: number;
          tonelagem_atual_acumulada?: number;
          fechado_em?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendario_ignicao: {
        Row: {
          id: string;
          atleta_id: string;
          data_registro: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          atleta_id: string;
          data_registro: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          atleta_id?: string;
          data_registro?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      cardio_sessoes_diarias: {
        Row: {
          atleta_id: string;
          dia_civil: string;
          snapshot: Json;
          updated_at: string;
        };
        Insert: {
          atleta_id: string;
          dia_civil: string;
          snapshot: Json;
          updated_at?: string;
        };
        Update: {
          atleta_id?: string;
          dia_civil?: string;
          snapshot?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      historico_cargas: {
        Row: {
          id: string;
          atleta_id: string;
          grupo_muscular: Database["public"]["Enums"]["grupo_muscular_evolucao"];
          exercicio_id: string;
          carga_maxima: number;
          repeticoes_acumuladas: number;
          data_registro: string;
        };
        Insert: {
          id?: string;
          atleta_id: string;
          grupo_muscular: Database["public"]["Enums"]["grupo_muscular_evolucao"];
          exercicio_id: string;
          carga_maxima?: number;
          repeticoes_acumuladas?: number;
          data_registro?: string;
        };
        Update: {
          id?: string;
          atleta_id?: string;
          grupo_muscular?: Database["public"]["Enums"]["grupo_muscular_evolucao"];
          exercicio_id?: string;
          carga_maxima?: number;
          repeticoes_acumuladas?: number;
          data_registro?: string;
        };
        Relationships: [];
      };
      planilhas_forjador: {
        Row: {
          id: string;
          atleta_id: string;
          dia_semana: number;
          grupo_muscular: string;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          atleta_id: string;
          dia_semana: number;
          grupo_muscular: string;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          atleta_id?: string;
          dia_semana?: number;
          grupo_muscular?: string;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      config_treino_atleta: {
        Row: {
          atleta_id: string;
          forjador_id: string;
          descanso_padrao_seg: number;
          cardio_meta_minutos: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          atleta_id: string;
          forjador_id: string;
          descanso_padrao_seg?: number;
          cardio_meta_minutos?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          atleta_id?: string;
          forjador_id?: string;
          descanso_padrao_seg?: number;
          cardio_meta_minutos?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prescricoes_treino_forjador: {
        Row: {
          id: string;
          atleta_id: string;
          forjador_id: string;
          dia_semana: number;
          grupo_muscular: string;
          exercicio_id: string;
          ordem: number;
          series_alvo: number;
          repeticoes_alvo: number;
          peso_prescrito: number | null;
          descanso_segundos: number | null;
          progressao_alternativas: unknown;
          repeticoes_por_serie: unknown;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          atleta_id: string;
          forjador_id: string;
          dia_semana: number;
          grupo_muscular: string;
          exercicio_id: string;
          ordem?: number;
          series_alvo: number;
          repeticoes_alvo: number;
          peso_prescrito?: number | null;
          descanso_segundos?: number | null;
          progressao_alternativas?: unknown;
          repeticoes_por_serie?: unknown;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          atleta_id?: string;
          forjador_id?: string;
          dia_semana?: number;
          grupo_muscular?: string;
          exercicio_id?: string;
          ordem?: number;
          series_alvo?: number;
          repeticoes_alvo?: number;
          peso_prescrito?: number | null;
          descanso_segundos?: number | null;
          progressao_alternativas?: unknown;
          repeticoes_por_serie?: unknown;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      evolucao_membro_estase: {
        Row: {
          user_id: string;
          membro_principal: Database["public"]["Enums"]["membro_principal_soberano"];
          nivel_calculado: string;
          metrica_bruta: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          membro_principal: Database["public"]["Enums"]["membro_principal_soberano"];
          nivel_calculado?: string;
          metrica_bruta?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          membro_principal?: Database["public"]["Enums"]["membro_principal_soberano"];
          nivel_calculado?: string;
          metrica_bruta?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evolucao_membro_estase_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      historico_treinos_comuns: {
        Row: {
          id: string;
          user_id: string;
          exercicio_id: string;
          peso_atual: number;
          repeticoes: number;
          series: number;
          criado_em: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercicio_id: string;
          peso_atual: number;
          repeticoes: number;
          series: number;
          criado_em?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercicio_id?: string;
          peso_atual?: number;
          repeticoes?: number;
          series?: number;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "historico_treinos_comuns_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      forger_client_bonds: {
        Row: {
          id: string;
          forger_id: string;
          client_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          forger_id: string;
          client_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          forger_id?: string;
          client_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      diet_blueprints: {
        Row: {
          id: string;
          client_id: string;
          forger_id: string;
          titulo: string;
          objetivo: string;
          calorias_alvo: number;
          proteinas_g: number;
          carboidratos_g: number;
          gorduras_g: number;
          agua_litros: number;
          refeicoes: Json;
          observacoes: string | null;
          activo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          forger_id: string;
          titulo: string;
          objetivo?: string;
          calorias_alvo: number;
          proteinas_g: number;
          carboidratos_g: number;
          gorduras_g: number;
          agua_litros?: number;
          refeicoes?: Json;
          observacoes?: string | null;
          activo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          forger_id?: string;
          titulo?: string;
          objetivo?: string;
          calorias_alvo?: number;
          proteinas_g?: number;
          carboidratos_g?: number;
          gorduras_g?: number;
          agua_litros?: number;
          refeicoes?: Json;
          observacoes?: string | null;
          activo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      vip_dieta_semanal: {
        Row: {
          id: string;
          client_id: string;
          forger_id: string;
          semana_ref: string;
          dias: Json;
          activo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          forger_id: string;
          semana_ref: string;
          dias?: Json;
          activo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          forger_id?: string;
          semana_ref?: string;
          dias?: Json;
          activo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      vip_medidas_corporais: {
        Row: {
          id: string;
          client_id: string;
          forger_id: string;
          peso_kg: number;
          altura_cm: number;
          perimetros: Json;
          activo: boolean;
          medido_em: string;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          forger_id: string;
          peso_kg: number;
          altura_cm: number;
          perimetros?: Json;
          activo?: boolean;
          medido_em?: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          forger_id?: string;
          peso_kg?: number;
          altura_cm?: number;
          perimetros?: Json;
          activo?: boolean;
          medido_em?: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      mecca_global_metrics: {
        Row: {
          id: string;
          total_weight_lifted: number;
          active_streaks_count: number;
          furnace_temperature: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          total_weight_lifted?: number;
          active_streaks_count?: number;
          furnace_temperature?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          total_weight_lifted?: number;
          active_streaks_count?: number;
          furnace_temperature?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      historico_treinos_personais: {
        Row: {
          id: string;
          client_id: string;
          forger_id: string;
          exercicio_id: string;
          peso_prescrito: number;
          repeticoes_alvo: number;
          series_alvo: number;
          observacoes: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          forger_id: string;
          exercicio_id: string;
          peso_prescrito: number;
          repeticoes_alvo: number;
          series_alvo: number;
          observacoes?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          forger_id?: string;
          exercicio_id?: string;
          peso_prescrito?: number;
          repeticoes_alvo?: number;
          series_alvo?: number;
          observacoes?: string | null;
          criado_em?: string;
        };
        Relationships: [];
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
          author_id: string;
          tem_cinturao_duelo: boolean;
          is_rei_das_chamas: boolean;
          is_rei_chamas_superiores: boolean;
          is_rei_chamas_inferiores: boolean;
          is_pilar_cooperativo: boolean;
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
          author_id: string;
          tem_cinturao_duelo: boolean;
          is_rei_das_chamas: boolean;
          is_rei_chamas_superiores: boolean;
          is_rei_chamas_inferiores: boolean;
          is_pilar_cooperativo: boolean;
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
      argos_forja_upsert_prescricao_treino: {
        Args: {
          p_atleta_id: string;
          p_payload: Json;
        };
        Returns: Json;
      };
      argos_forja_publish_vip_medidas: {
        Args: {
          p_client_id: string;
          p_payload: Json;
        };
        Returns: Json;
      };
      obter_calor_muscular_atleta: {
        Args: {
          target_atleta_id: string;
        };
        Returns: Json;
      };
      get_muscular_evolution: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      calcular_indice_ignicao_atleta: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      get_perfil_publico_atleta: {
        Args: {
          p_atleta_id: string;
        };
        Returns: Json;
      };
      get_comunidade_arena_snapshot: {
        Args: { p_skip_side_effects?: boolean };
        Returns: Json;
      };
      get_rankings_por_membro: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_rankings_thoth: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      comunidade_apply_demo_titulos: {
        Args: {
          p_cinturao_superiores_id: string;
          p_cinturao_inferiores_id: string;
          p_rei_superiores_id: string;
          p_rei_inferiores_id: string;
          p_pilar_id: string;
          p_todos_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: "forjador" | "forjador_linhagem" | "forjador_soberano" | "cliente";
      estagio_forca: "cinzas" | "faisca" | "brasa" | "labareda" | "fogo_cosmico_sagrado";
      subgrupo_muscular: "costas" | "peito" | "ombros" | "bracos" | "abdomen" | "pernas";
      grupo_muscular_evolucao: "PEITO" | "COSTAS" | "PERNAS" | "OMBROS" | "BRACOS" | "ABDOMEN";
      membro_principal_soberano: "PEITO" | "BRACOS" | "ABDOMEN" | "PERNAS" | "COSTAS" | "OMBROS";
      tipo_confronto_duelo: "SUPERIORES" | "INFERIORES";
      status_duelo_supergrupo: "EM_ANDAMENTO" | "FINALIZADO" | "CANCELADO";
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
