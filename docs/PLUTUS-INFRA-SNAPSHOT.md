# PLUTUS — Snapshot de Infraestrutura
### Controlo interno de custos · Actualizar quando infra mudar

**Empresa:** FENYXIA CO-OPS  
**Propósito:** Saber quanto custa manter os sistemas **mesmo sem cobrar clientes**  
**Regra:** Documento **interno** · não comercial · não partilhar com clientes  
**Última actualização:** 18/07/2026 · Meccafit em vitrine exclusiva · vendas adiadas

---

## Fase actual da empresa

- Entrada no mercado · projectos vitrine · **receita cliente: R$ 0 ou simbólica**
- Meccafit: **vitrine exclusiva** · sem monetização in-app · **vendas adiadas** (Jul 2026)
- Infra real existe e deve ser monitorizada
- Passo mais difícil: **entrar** — PLUTUS protege o fundador de surpresas

**Última actualização:** 18/07/2026

---

## Meccafit App (projecto 1)

| Serviço | Plano | Região / notas | Custo/mês (est.) | Link painel |
|---------|-------|----------------|------------------|-------------|
| **Supabase** | Free / Pro | sa-east-1 · ref `hznyibneaportmytwxrh` | R$ / USD | supabase.com/dashboard |
| **GitHub** | Free (privado) | Actions ARGOS · minutos/mês | R$ / USD | github.com/settings/billing |
| **Vercel** | *(não deployado)* | Hobby/Pro quando activar | — | vercel.com |
| **Domínio** | — | — | — | — |
| **Cursor** | Pro | Assinatura fundador | R$ / USD | cursor.com |
| **Gemini** | | Criação / aulas | R$ / USD | |
| **Anima (futuro)** | | API LLM · só fase final | — | — |

### Totais Meccafit

| | Valor |
|---|--------|
| **Subtotal infra cloud** | |
| **Subtotal ferramentas** | |
| **Total estimado/mês** | |

### Limites free tier a vigiar

- Supabase: DB size · MAU · egress
- GitHub Actions: minutos/mês (workflow ARGOS)
- Vercel (futuro): bandwidth · serverless invocations

---

## Projecto vitrine 2

*(Adicionar quando existir)*

---

## Projecto vitrine 3

*(Adicionar quando existir)*

---

## Histórico de actualizações

| Data | Alteração | Total/mês |
|------|-----------|-----------|
| | Criação snapshot | |

---

## Acções PLUTUS recomendadas

- [ ] Revisar este doc **1× por mês** ou após deploy
- [x] Alerta Supabase quando > 80% free tier — `npm run argos:plutus`
- [ ] Antes de Anima: estimar custo por 1000 mensagens
- [ ] Separar projecto Supabase **CI** vs **produção** quando escalar

### Monitor automático (Jun 2026)

| Comando | Função |
|---------|--------|
| `npm run argos:plutus` | Mede DB (se `SUPABASE_DB_URL`), egress amostra, latência RPC · WARN ≥80% · CRIT ≥95% |
| `npm run argos:unit` | Testes unitários das bandas de tolerância PLUTUS |

Overrides opcionais em `.env.local`: `PLUTUS_DB_SIZE_MB`, `PLUTUS_EGRESS_GB`.

---

*PLUTUS · FENYXIA CO-OPS · Documento interno*
