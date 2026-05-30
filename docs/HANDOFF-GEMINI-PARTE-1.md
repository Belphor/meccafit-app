# Handoff FENYXIA → Gemini · Parte 1/2

**Para:** Gemini Advanced (coordenação)  
**De:** Ricardo · FENYXIA CO-OPS  
**Repo:** https://github.com/Belphor/meccafit-app  
**Path local:** `d:\FENYXIA - EMPRESA\2 - PROJETO APP FITNESS\`  
**Parte 2:** `docs/HANDOFF-GEMINI-PARTE-2.md`

---

## 1. O que é isto (30 segundos)

**Meccafit App** = vitrine n.º 1 da **FENYXIA** — fitness **high code, privado**, Next.js + Supabase.

- Atleta regista treinos reais → **VTC** (Volume Total de Carga)
- **Fênix** (UI) reflecte evolução, estagnação, renascimento
- **ARGOS** = segurança + RLS + regras no Postgres
- **IRIS** = design (preto, magma, ouro, vidro fumê)
- **Anima** = chatbot narrativo — **só documentado, zero código**

---

## 2. Pastas

```
2 - PROJETO APP FITNESS/
├── meccafit-app/              ← APP (Next.js 16 · React 19)
│   ├── src/app/               ← portal, dashboard, API
│   ├── src/features/          ← ex: forum-brasa-viva
│   ├── src/lib/               ← Supabase, thermal, cache
│   ├── supabase/migrations/   ← 26 SQL (fonte de verdade remota)
│   ├── scripts/               ← ARGOS, migrations, seed
│   └── docs/                  ← DNA, Anima KB, FENYXIA
│
└── fenyxia-ecosystem/         ← migrations canónicas (espelho)
    └── supabase/migrations/
        └── 20260527233000_*   ← Mecca Furnace — SÓ aqui, ainda
```

**Regra:** o que corre no Supabase = `meccafit-app/supabase/migrations/`.

---

## 3. Stack

| Camada | Tech |
|--------|------|
| Frontend | Next.js 16.2.4, React 19, TS, Tailwind 4 |
| Backend | Supabase Auth + Postgres + RLS + RPCs |
| Auth | `@supabase/ssr` |
| CI | GitHub Actions → `npm run argos:test` |
| DDL | `pg` + scripts Node |

```bash
npm run dev              # :3000
npm run argos:test       # ~415 checks
npm run db:apply:pending # migrations pendentes
npm run seed:test-users  # users teste
```

---

## 4. Supabase activo

| Item | Valor |
|------|-------|
| Região | **sa-east-1** (São Paulo) |
| Ref | `hznyibneaportmytwxrh` |
| URL | `https://hznyibneaportmytwxrh.supabase.co` |

**Obsoleto:** `srhftwluwxbnoirrtyuz` (US) — pausar após cutover.

### `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
FORGE_KEY=...              # server-only, ignição forjador
SUPABASE_DB_URL=           # VAZIO — scripts DDL não correm auto
```

---

## 5. Users de teste

| Email | Senha | Role |
|-------|-------|------|
| `cliente@meccafit.com` | `senha123` | cliente |
| `atleta2@meccafit.com` | `senha123` | cliente (RLS) |
| `master@meccafit.com` | `senha123` | forjador_soberano |

Repor: `node scripts/seed-test-users.mjs`

---

## 6. Roles

| Role | Gamificação | Fórum |
|------|-------------|-------|
| `cliente` | ✅ | ✅ no feed |
| `forjador` | ❌ | ❌ |
| `forjador_soberano` | ❌ | ❌ |

**ARGOS crítico:**

- `phase_tier` **ninguém altera à mão** — só RPC com flag `meccafit.phase_rpc_update`
- Signup → `role = cliente` forçado
- Invite consume → só `service_role`
- Promover forjador → `node scripts/bootstrap-forjador.mjs <uuid>`

---

## 7. Jornada do atleta

```
Portal /  →  Login | ?invite= | Ignição Forja
     ↓
Dashboard
  ├─ Aba 1 · Treino      → PhoenixInput → registrar_treino_com_status
  ├─ Aba 3 · Evolução    → selfie
  └─ Aba 6 · Fórum       → argos_fetch_forum_brasa_viva
```

Subgrupo: `/dashboard?subgrupo=peitoral-superior`

---

## 8. Conceitos de produto

### VTC

Soma dos **kg máximos** da sessão (Σ kg máx).

### Fases (`phase_tier` 1–5)

| Tier | Nome |
|------|------|
| 1 | Cinzas |
| 2 | Faísca |
| 3 | Brasa |
| 4 | Labareda |
| 5 | Fogo Cósmico |

Conquista permanente; evolui via ARGOS.

### Thermal Gravity

- Fases altas exigem VTC 30d
- Sem manutenção → layout **degrada** (tier fica)
- Restauração: 1.000 kg VTC na sessão de hoje
- UI: `PhoenixPhaseEngine.tsx` (ex-AnimaFenixEngine)

### Superação

PR batido → status `SUPERAÇÃO` → overlay + mural/fórum.

### Comunidade Mecca (backend ✅ · UI ❌)

- Tabela singleton `mecca_global_metrics`
- `total_weight_lifted`, `furnace_temperature` (0–100), `active_streaks_count`
- Treino de **cliente** incrementa global via `registrar_treino_com_status`
- Payload RPC: `mecca_contribution_kg`, `mecca_furnace_temperature`, `mecca_total_weight_lifted`

---

## 9. Fórum Brasa-Viva (Aba 6)

RPC: `argos_fetch_forum_brasa_viva` · só clientes no feed.

**Skins IRIS (tier → fase):**

- 1 → CINZA
- 2–3 → BRASA
- 4 → LABAREDA
- 5 → MAGMA

Assets: `/public/assets/forum/{cinza,brasa,labareda,magma}.png`  
Código: `src/features/forum-brasa-viva/`

---

## 10. Migrations — estado remoto

### ✅ Aplicadas (confirmado)

- Bootstrap + ARGOS RLS (`20260523100000` … `20260524260000`)
- Fórum (`20260525100000`)
- Security hardening (`20260525110000`)
- Mecca global metrics (`20260527240000`)
- Integração registrar (`20260527241000`) — Ricardo aplicou **manual** no SQL Editor

### ❌ Pendente

| Ficheiro | Onde | Notas |
|----------|------|-------|
| `20260527233000_create_mecca_furnace_system` | só `fenyxia-ecosystem/` | per-user furnace; não copiada nem aplicada |

Ordem migrations: **sempre cronológica**, nunca saltar.

---

## 11. Git (18 Mai 2026)

**No origin:**

- `740c6be` — docs FENYXIA + Anima KB
- `1817f1f` — Fórum Brasa-Viva
- `2a659d8` — ARGOS hardening + PhoenixPhaseEngine

**Local, NÃO commitado:**

- `public/assets/forum/*.png`
- `forum-phase-assets.ts`, alterações ForumPostCard
- migrations `20260527240000` + `20260527241000`
- `scripts/apply-pending-migrations.mjs` (lista Mecca)

---

## 12. Mitologia (não confundir)

| Termo | Significado |
|-------|-------------|
| FENYXIA | Empresa, forja high code |
| ARGOS | Segurança + regras DB |
| IRIS | Design system |
| Anima | Voz Fênix (futuro) |
| Portal de Brasa | Login `/` |
| Altar | Dashboard treino |
| Comunidade Mecca | Métricas globais colectivas |

---

**Continua em:** `docs/HANDOFF-GEMINI-PARTE-2.md`
