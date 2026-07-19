# MECCAFIT APP — Relatório Oficial DNA FÊNIX
### Documento de Projecto · Arquétipo · Regras de Produto · Estado Actual

**Empresa:** FENYXIA CO-OPS  
**Projecto:** Meccafit App (vitrine n.º 1)  
**Arquétipo mitológico:** Fênix (Morte · Renascimento · Fogo)  
**Versão:** 1.1.0  
**Status:** Em forja avançada · **vitrine exclusiva · sem monetização in-app**  
**Stack:** Next.js 16 · React 19 · Supabase · ARGOS · IRIS · ANYMA FÊNIX  
**Relatório ao cliente:** `docs/MECCAFIT-RELATORIO-CLIENTE.md`

---

> *Este documento é a constituição mitológica e de produto do Meccafit. IRIS, HERMES, ARGOS e ATENA devem alinhar-se a ele. A Anima FENYXIA (fase LLM avançada) beberá daqui.*

---

## 0. DECISÃO COMERCIAL VIGENTE (JUL 2026)

| Tema | Decisão |
|------|--------|
| Posicionamento | **Vitrine exclusiva** — não produto de massa |
| Monetização in-app | **Não** — “Dentro do altar não há cobranças nem monetização.” (`fenyxia-empresa.ts`) |
| Vendas / planos comerciais | **Adiado** — retomar em conversa futura com o cliente |
| Documento de apresentação | `MECCAFIT-RELATORIO-CLIENTE.md` |

---

## 1. IDENTIDADE DO SISTEMA

| Campo | Valor |
|-------|--------|
| **Nome comercial** | Meccafit / Meccafit Center |
| **Nome PWA** | FENYXIA Meccafit |
| **Marca mãe** | FENYXIA (rodapé · ecossistema · página Empresa) |
| **Domínio** | Fitness · musculação · evolução de performance |
| **Personagem** | **Fênix** |
| **Promessa** | A app reflecte a verdade do treino — ascensão, estagnação e renascimento visíveis |
| **Tipo de entrega** | Sistema único · high code · PWA · **não** produto de massa na net |
| **Guia de voz** | **ANYMA FÊNIX** (TTS + órbita 3D + guias por área) |

---

## 2. POR QUE FÊNIX NESTE DOMÍNIO

| Símbolo fênix | Tradução Meccafit |
|---------------|-------------------|
| Cinzas | Período sem treino · subperformance · layout degradado |
| Faísca / Labareda | Retorno · consistência · volume (VTC) |
| Renascimento | Superação · transmutação de fase · mural |
| Fogo que não mente | Thermal gravity · métricas reais |

---

## 3. TRINDADE TEMPORAL (ESTADOS)

### I. Cinzas
- **Significado:** baseline honesta ou regressão por falta de manutenção
- **Produto:** layout `CINZAS` · saturação reduzida
- **Copy (tom):** verdade, não castigo — *a Fênix reflecte o teu ritmo*

### II. Fogo (Faísca → Brasa → Labareda)
- **Significado:** trabalho activo · validação · atrito produtivo
- **Produto:** `phase_tier` · VTC · exercícios em chamas · forjado
- **Métricas:** VTC sessão · VTC acumulados · séries · superação

### III. Magma / Fênix Cyber (Fogo Cósmico)
- **Significado:** ápice institucional
- **Nome de produto:** Fogo Cósmico Sagrado (`PHASE_TIER_LABELS[5]`)
- **Visual alvo:** Azul Cobalto × Ouro Solar Líquido
- **Status:** tier existe no motor · **refinamento cosmética/ritual contínuo**

---

## 4. PALETA E LINGUAGEM IRIS

| Token | Uso |
|-------|-----|
| Negro absoluto | Shell dashboard · portal |
| Magma `#FF4500` | Núcleo · acção |
| Ouro solar `#FFB800` | Métricas · ascensão |
| Vidro fumê · brasão | Painéis · cards |
| Plasma · brasas | Títulos · transmutação |
| Aura forja (ciano) | Painel staff — contraste com altar âmbar |

**Léxico sagrado:** Altar · Forja · Linhagem · Brasa · Renascimento · VTC · Superação · Portal de Brasa · ANYMA FÊNIX · Voo de Cinzas

---

## 5. REGRAS DE PRODUTO EXECUTÁVEIS

### Fases (`phase_tier` 1–5)
- Conquista permanente no perfil
- Transmutação visual ao subir tier (olho da Fênix / IRIS)
- Labels: Cinzas · Faísca · Brasa · Labareda · Fogo Cósmico Sagrado

### Thermal Gravity (gravidade térmica)
- Layout reflecte inatividade (sem apagar histórico)
- Restauração quando o atleta volta a forjar com volume relevante
- Regra mensal antiga de VTC 30d: **deprecated** no código — regressão por inatividade

### Superação
- Peso acima do PR → overlay · mural (com delay ARGOS)

### Hierarquia (AIGIS)
- Cliente · Forjador · Forjador Linhagem · Forjador Soberano
- VIP = bond pessoal activo (`forger_client_bonds`) → aba Nutrição
- ARGOS: RLS · RPC-only writes em caminhos críticos

### Entrada física
- Balcão QR → `counter-handshake` → `/instalar` → cadastro com cookie

---

## 6. MAPA TÉCNICO (REFERÊNCIA)

| Camada | Ficheiros / artefactos |
|--------|-------------------------|
| Portal | `src/app/page.tsx` · `PortalDeBrasaClient` |
| Dashboard | `src/app/dashboard/` · `DashboardClient.tsx` |
| Abas | `src/lib/dashboard-tabs.ts` (treino · evolução · comunidade · perfil · dieta VIP) |
| Motor fase | `PhoenixPhaseEngine.tsx` · `thermal-gravity.ts` |
| API bundle | `src/app/api/dashboard/bundle/route.ts` |
| Dieta | `src/app/api/diet/bundle` · `DietaPanel` |
| ANYMA TTS | `src/app/api/anima/tts` · `anyma-copy.ts` · `PhoenixHelper` |
| 3D | `PhoenixCanvas.tsx` · `PhoenixModel.tsx` |
| Config IRIS | `src/lib/dashboard-config.ts` |
| Empresa (copy) | `src/lib/fenyxia-empresa.ts` |
| Segurança | `supabase/migrations/*` · `scripts/argos/` |
| CI | `.github/workflows/argos.yml` |
| PWA | `manifest.ts` · `public/sw.js` · `/instalar` · `/balcao` |

---

## 7. ROTAS E VISÃO (HONESTIDADE THOTH)

### Implementado

| Área | Rotas |
|------|-------|
| Entrada | `/` · `/forja` · `/criar-conta` · `/balcao` · `/instalar` · register com handshake |
| Altar | `/dashboard` (+ onboarding, fenyxia, lexico, como-a-fenix-mede, forum-brasa-viva) |
| Aliases | `/treino` · `/evolucao` · `/comunidade` · `/perfil` → dashboard |
| Forja | `/dashboard/forja` · `/forjador/monitoramento` · dieta · medidas · academia |

### Deprecated / sem páginas activas
- Rotas legado `/cliente/*` em `internal-routes.ts` — **não usar**

---

## 8. ANYMA FÊNIX (MECCAFIT)

| Camada | Status |
|--------|--------|
| **ANYMA FÊNIX** (voz · guias · 3D · onboarding) | **Implementada** no altar |
| **Anima LLM conversacional completa** | Fase final · recolha em `ANIMA-FENYXIA-KNOWLEDGE-BASE.md` |
| **Restrições ARGOS** | Só dados do próprio user · sem inventar métricas |

---

## 9. REGRESSÃO E COMPAIXÃO

- Degradação visual = verdade térmica
- ANYMA: alerta suave após dias sem visita (`ANYMA_DEBT_SOFT_DAYS`)
- Revisar continuamente: copy compassiva · janela de graça · comunicação Anima

---

## 10. CHECKLIST FIM DE PROJECTO

- [x] Altar com abas Treino · Evolução · Comunidade · Perfil · Nutrição VIP
- [x] Painel Forja (treino · monitoramento · dieta · medidas · academia soberano)
- [x] Balcão + instalar + handshake
- [x] ANYMA FÊNIX (voz/UI/3D)
- [x] Página Empresa · sem monetização no altar
- [x] Relatório ao cliente (`MECCAFIT-RELATORIO-CLIENTE.md`)
- [ ] Refinamento visual completo do Fogo Cósmico (tier 5)
- [ ] Anima LLM alinhada a esta base (fase final)
- [ ] Deploy vitrine oficial estável (URL de produção a confirmar)
- [ ] PLUTUS snapshot com custos preenchidos
- [ ] Demo script 5 min (ver roteiro no relatório ao cliente §12)
- [ ] Capítulo **VENDAS** — só quando a casa reabrir a conversa

---

## 11. HISTÓRICO DE VERSÕES

| Versão | Data | Notas |
|--------|------|-------|
| 1.0.0 | 2026 | Criação oficial · estado mid-forge |
| 1.1.0 | 18/07/2026 | Actualização integral: rotas reais · VIP · ANYMA · forja · decisão vitrine sem vendas · link relatório cliente |

---

*Documento: FENYXIA CO-OPS · Meccafit · DNA Fênix v1.1.0*  
*Próxima revisão: capítulo vendas **ou** fecho de Anima LLM / deploy vitrine*
