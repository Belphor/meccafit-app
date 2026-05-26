# MECCAFIT APP — Relatório Oficial DNA FÊNIX
### Documento de Projecto · Arquétipo · Regras de Produto · Estado Actual

**Empresa:** FENYXIA CO-OPS  
**Projecto:** Meccafit App (vitrine n.º 1)  
**Arquétipo mitológico:** Fênix (Morte · Renascimento · Fogo)  
**Versão:** 1.0.0 — **Rascunho vivo**  
**Status:** Em forja · **Actualizar integralmente no fim do projecto**  
**Stack:** Next.js 16 · Supabase · ARGOS · IRIS

---

> *Este documento é a constituição mitológica e de produto do Meccafit. IRIS, HERMES, ARGOS e ATENA devem alinhar-se a ele. A Anima FENYXIA (fase final) beberá daqui.*

---

## 1. IDENTIDADE DO SISTEMA

| Campo | Valor |
|-------|--------|
| **Nome comercial** | Meccafit / Meccafit Center |
| **Marca mãe** | FENYXIA (rodapé · ecossistema) |
| **Domínio** | Fitness · musculação · evolução de performance |
| **Personagem** | **Fênix** |
| **Promessa** | A app reflecte a verdade do treino — ascensão, estagnação e renascimento visíveis |
| **Tipo de entrega** | Sistema único · high code · **não** produto de massa na net |

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
- **Métricas:** VTC sessão · VTC 30 dias · séries · superação

### III. Magma / Fênix Cyber (Fogo Cósmico)
- **Significado:** ápice institucional
- **Visual alvo:** Azul Cobalto × Ouro Solar Líquido
- **Status:** **A definir na criação** (tier 5 · cosmética · ritual final)

---

## 4. PALETA E LINGUAGEM IRIS

| Token | Uso |
|-------|-----|
| Negro absoluto | Shell dashboard · portal |
| Magma `#FF4500` | Núcleo · acção |
| Ouro solar `#FFB800` | Métricas · ascensão |
| Vidro fumê · brasão | Painéis · cards |
| Plasma · brasas | Títulos · transmutação |

**Léxico sagrado (amostra):** Altar · Forja · Linhagem · Brasa · Renascimento · VTC · Superação · Portal de Brasa · Matrix da Alma *(rotas planeadas)*

---

## 5. REGRAS DE PRODUTO EXECUTÁVEIS

### Fases (`phase_tier` 1–5)
- Conquista permanente no perfil
- Transmutação ~12s ao subir tier (olho da Fênix)

### Thermal Gravity (gravidade térmica)
- **Faísca:** manter 4.000 kg VTC / 30 dias
- **Labareda:** manter 16.000 kg VTC / 30 dias
- Abaixo → degradar layout (sem apagar histórico)
- Restauração: sessão ≥ 1.000 kg VTC → flash de brasas

### Superação
- Peso acima do PR → overlay · mural (com delay ARGOS)

### Hierarquia (AIGIS)
- Cliente · Forjador · Forjador Linhagem · Soberano
- ARGOS: RLS · RPC-only writes

---

## 6. MAPA TÉCNICO (REFERÊNCIA)

| Camada | Ficheiros / artefactos |
|--------|-------------------------|
| Portal | `src/app/page.tsx` |
| Dashboard | `src/app/dashboard/` · `DashboardClient.tsx` |
| Motor fase | `AnimaFenixEngine.tsx` · `thermal-gravity.ts` |
| API bundle | `src/app/api/dashboard/bundle/route.ts` |
| Config IRIS | `src/lib/dashboard-config.ts` |
| Segurança | `supabase/migrations/*argos*` · `scripts/argos/` |
| CI | `.github/workflows/argos.yml` |

---

## 7. ROTAS E VISÃO (HONESTIDADE THOTH)

**Implementado hoje:** `/` · `/dashboard` (abas: treino, evolução, mural)

**Planeado em `internal-routes.ts`:** rotas `/cliente/*` · `/forjador/*` — **ainda sem páginas**

**Decisão pendente (fim de projecto):** construir · podar · ou integrar no dashboard

---

## 8. ANIMA FENYXIA (MECCAFIT)

- **Implementação:** última fase do projecto
- **Recolha actual:** `docs/ANIMA-FENYXIA-KNOWLEDGE-BASE.md`
- **Papel:** explicar app · imersão Fênix + musculação · ligar lore a dados do bundle
- **Restrições ARGOS:** só dados do próprio user · sem inventar métricas

---

## 9. REGRESSÃO E COMPAIXÃO (REVISAR NA CRIAÇÃO)

- Degradação visual = verdade térmica
- **Revisar no fim:** janela de graça · copy compassiva · comunicação Anima

---

## 10. CHECKLIST FIM DE PROJECTO (ACTUALIZAR ESTE DOC)

- [ ] Trindade visual completa incl. Fogo Cósmico
- [ ] Rotas fantasma resolvidas
- [ ] Subgrupos musculares populados além do peitoral
- [ ] Forjador: esconder ou implementar
- [ ] Deploy Vercel · URL vitrine
- [ ] Anima implementada e alinhada a esta base
- [ ] PLUTUS snapshot actualizado
- [ ] Demo script 5 min documentado

---

## 11. HISTÓRICO DE VERSÕES

| Versão | Data | Notas |
|--------|------|-------|
| 1.0.0 | 2026 | Criação oficial · estado mid-forge |

---

*Documento: FENYXIA CO-OPS · Meccafit · DNA Fênix v1.0.0*  
*Próxima revisão: **fim do projecto***
