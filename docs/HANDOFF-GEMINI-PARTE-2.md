# Handoff FENYXIA → Gemini · Parte 2/2

**Parte 1:** `docs/HANDOFF-GEMINI-PARTE-1.md`  
**Para:** Gemini Advanced · Ricardo · FENYXIA CO-OPS

---

## 13. ARGOS — o que é e o que faz

ARGOS = **doutrina de segurança** do projecto (não só CI):

| Camada | Implementação |
|--------|---------------|
| RLS | Todas tabelas sensíveis |
| Writes | Só RPCs `SECURITY DEFINER` — ex: `registrar_treino_com_status` |
| Profiles | Trigger bloqueia `phase_tier` manual |
| Invites | consume/validate → `service_role` only |
| App | rate limit, CSP headers, forge server validation |
| Testes | audit, RLS, SQL, adversarial, matrix (328), UI flow (38) |

Última bateria pré-commit hardening: **415 checks, 0 falhas**.

```bash
npm run argos:test        # suite completa
npm run argos:matrix      # só matrix
npm run argos:ui          # fluxo UI
```

CI: `.github/workflows/argos.yml` no push.

---

## 14. Performance (já optimizado)

Problema: RTT Brasil ~250–320 ms × vários `getUser()`.

Fixes:

- `getSession()` local (middleware/dashboard reads)
- BFF `/api/dashboard/bundle` — 1 req, cache 45s server
- Cache client `dashboard-cache.ts`

Meta warm: **≤100 ms** (cache hit ~4–8 ms).

---

## 15. Mapa de ficheiros-chave

| Ficheiro | Função |
|----------|--------|
| `src/app/page.tsx` | Portal (login/convite/forja) |
| `src/app/dashboard/DashboardClient.tsx` | Shell + tabs |
| `src/components/dashboard/PhoenixPhaseEngine.tsx` | Motor visual fases |
| `src/components/PhoenixInput.tsx` | Input carga + validação |
| `src/lib/supabase.ts` | Client + registrar treino |
| `src/lib/thermal-gravity.ts` | Lógica thermal client |
| `src/app/api/dashboard/bundle/route.ts` | BFF cache |
| `src/features/forum-brasa-viva/` | Módulo fórum |
| `src/lib/dashboard-config.ts` | Tokens IRIS, limites ARGOS |
| `scripts/apply-pending-migrations.mjs` | DDL pendentes |
| `scripts/bootstrap-forjador.mjs` | Promove forjador |
| `scripts/argos/` | Bateria testes |
| `docs/ANIMA-FENYXIA-KNOWLEDGE-BASE.md` | KB Anima (futuro) |
| `docs/MECCAFIT-PHOENIX-DNA-REPORT.md` | Constituição produto |

---

## 16. RPC principal — `registrar_treino_com_status`

Assinatura actual (pós-integração Mecca):

```
p_user_id uuid
p_exercicio_id text
p_peso_atual numeric
p_musculo text
p_repeticoes integer
p_series integer
p_exercicio_nome text
```

Retorna: `status`, `max_peso_atual`, `peso_atual`, `vtc_gerado`, `payload` (jsonb).

Payload inclui:

- `session_vtc_today`, `vtc_30d`
- `mecca_contribution_kg`
- `mecca_furnace_temperature`
- `mecca_total_weight_lifted`

Só **clientes** contribuem para Mecca; forjadores ignorados.

---

## 17. Regras para o Gemini coordenar

1. **Nunca** alterar `phase_tier` directo — só motor ARGOS.
2. Forjadores **fora** de gamificação e fórum.
3. Treinos = **sempre RPC**, nunca INSERT em `historico_treinos`.
4. Migrations = ordem cronológica, sem saltos.
5. `.env.local` **nunca** no Git.
6. Verificar se edita `meccafit-app/` ou `fenyxia-ecosystem/`.
7. **Anima não existe no código** — só `docs/`.
8. Commit grande → `npm run argos:test` antes.
9. Supabase activo = `hznyibneaportmytwxrh` (sa-east-1).
10. Fórum visual: **BRASA** (não "faísca") para tier 2–3.

---

## 18. Comandos rápidos

```bash
cd meccafit-app
npm run dev                    # http://localhost:3000
npm run argos:test             # antes de commit grande
npm run db:apply:pending       # precisa SUPABASE_DB_URL preenchido
```

**Teste Mecca manual:**

1. Login `cliente@meccafit.com` / `senha123`
2. Registar treino com carga real
3. SQL Editor: `SELECT * FROM mecca_global_metrics;`
4. `total_weight_lifted` sobe; `furnace_temperature` recalcula (0–100)

---

## 19. Feito vs pendente

### ✅ Feito

- Portal + dashboard (3 abas)
- Treino, VTC, superação, thermal gravity
- PhoenixPhaseEngine, transmutação
- Fórum Brasa-Viva (RPC + UI)
- ARGOS hardening completo
- Mecca backend (métricas + integração registrar)
- Migração US → sa-east-1
- CI GitHub Actions
- Docs DNA / Anima / FENYXIA

### ❌ Pendente

1. **Commit + push** trabalho local (assets, migrations Mecca, forum)
2. **UI Comunidade Mecca** — widget temperatura global
3. **`active_streaks_count`** — coluna existe, lógica não implementada
4. Migration **`20260527233000`** Mecca Furnace (copiar + aplicar)
5. **Anima** chatbot (só docs)
6. Abas 2, 4, 5 (planeadas, não feitas)
7. Preencher `SUPABASE_DB_URL` para scripts auto
8. Pausar projecto Supabase US antigo

---

## 20. Próxima sessão (Ricardo)

1. Confirmar treino → incremento Mecca no remoto
2. Commit único: assets + migrations + forum + apply script
3. Push origin
4. Widget "Temperatura do Forno Mecca"
5. Decidir se aplica `20260527233000` (furnace per-user)

---

## 21. Docs de referência

| Doc | Path |
|-----|------|
| DNA Fênix | `docs/MECCAFIT-PHOENIX-DNA-REPORT.md` |
| Anima KB | `docs/ANIMA-FENYXIA-KNOWLEDGE-BASE.md` |
| Corporativo | `docs/FENYXIA-CORPORATE-INSTITUTIONAL-REPORT.md` |
| Infra PLUTUS | `docs/PLUTUS-INFRA-SNAPSHOT.md` |

---

*Handoff Cursor → Gemini · Maio 2026 · Mecca migrations aplicadas manualmente; código local aguarda commit.*
