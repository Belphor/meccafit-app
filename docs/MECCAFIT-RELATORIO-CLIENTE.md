# MECCAFIT CENTER
## Relatório Completo do Sistema — Apresentação ao Cliente

**Empresa:** FENYXIA CO-OPS  
**Produto:** Meccafit Center (Meccafit App)  
**Classificação:** Documento de apresentação · vitrine exclusiva  
**Versão:** 1.0.0  
**Data:** 18 de julho de 2026  
**Idioma:** Português do Brasil  

---

> **Posicionamento atual:** o Meccafit permanece como **obra vitrine e entrega exclusiva** da FENYXIA.  
> Não há cobranças nem monetização dentro do altar. A conversa sobre **vendas / planos comerciais** fica para uma etapa posterior, quando a casa e o cliente decidirem abrir esse capítulo.

---

## 1. O que é o Meccafit

O **Meccafit Center** é um ecossistema digital de musculação e evolução de performance, forjado sob medida pela **FENYXIA**.

Não é um aplicativo genérico de academia baixado de uma loja e pintado com outra cor. É um **sistema único**, com identidade própria, narrativa da **Fênix** e engenharia de alto nível (high code), pensado para refletir a **verdade do treino**: progresso, estagnação e renascimento ficam visíveis na interface e nos dados.

| Campo | Valor |
|-------|--------|
| Nome comercial | Meccafit / Meccafit Center |
| Marca no app (PWA) | FENYXIA Meccafit |
| Marca mãe | FENYXIA |
| Tipo | Aplicação web + **PWA** (pode ir para a tela de início do celular) |
| Domínio de uso | Fitness · musculação · evolução · comunidade · acompanhamento profissional |
| Papel na casa | **Vitrine n.º 1** — primeira obra que demonstra o método FENYXIA |

### Promessa ao atleta

A app não esconde o ritmo real. Quem treina com consistência **ascende**. Quem para vê a interface **esfriar** com honestidade — sem apagar o histórico, sem fingir que nada aconteceu.

---

## 2. Por que a Fênix

Cada sistema FENYXIA recebe um arquétipo mitológico adequado ao domínio. No Meccafit, o personagem é a **Fênix**.

| Símbolo | Tradução no produto |
|---------|---------------------|
| Cinzas | Período sem treino · layout atenuado · verdade sem castigo teatral |
| Faísca → Brasa → Labareda | Consistência · volume · disciplina ativa |
| Renascimento | Superação de marcas · mudança de fase · mural |
| Fogo que não mente | Métricas reais (Volume Total de Carga · fases · gravidade térmica) |

A mitologia **não é decoração**. Ela governa cores, linguagem, rituais de tela e máquina de estados do produto.

---

## 3. Para quem serve

### Cliente (atleta)

Acessa pelo **Portal de Brasa**. Registra treinos, acompanha evolução, participa da comunidade e — se for VIP — recebe nutrição e medidas do profissional vinculado.

### Forjador (profissional / staff)

Acessa pelo portal **Forja**. Prescreve treinos, monitora atletas, gerencia vínculos VIP, dieta e medidas. O **Forjador Soberano** ainda configura a academia.

### Academia (presença física)

O fluxo de **Balcão + QR** liga o mundo físico ao digital: o atleta escaneia, instala o app e só então segue o cadastro com handshake de presença.

---

## 4. Como o sistema funciona — visão do usuário

### 4.1 Entrada e instalação

1. Cartaz no balcão com QR (`/balcao`)  
2. Handshake de presença → página de instalação PWA (`/instalar`)  
3. Cadastro protegido (sem handshake, o registro não abre)  
4. Login no Portal de Brasa (`/`)  
5. Onboarding: termos, manifesto e introdução pela **ANYMA FÊNIX**  

### 4.2 O Altar (dashboard do atleta)

Hub principal em `/dashboard`, com abas:

| Aba | Quem vê | O que faz |
|-----|---------|-----------|
| **Treino** | Todos | Registrar exercícios, cargas, séries, Volume Total de Carga (VTC), vídeos, cardio (Voo de Cinzas), superações |
| **Evolução** | Todos | Mapa corporal térmico, chama, ritmo, fases da linhagem, selfies de ciclo, insights |
| **Comunidade** | Todos | Perfil comunitário, Arena, títulos, rankings, mural de superações, meta coletiva |
| **Perfil** | Todos | Identidade, conhecimento da evolução, empresa FENYXIA, léxico, suporte |
| **Nutrição** | Só **VIP** | Plano alimentar do forjador: refeições, macros, metas |

Atalhos `/treino`, `/evolucao`, `/comunidade` e `/perfil` redirecionam para a aba correspondente no dashboard.

### 4.3 Treino — o núcleo da forja

- Registro de carga e séries com validação de segurança  
- Cálculo de **Volume Total de Carga (VTC)** por sessão e acumulados  
- Subgrupos musculares e feedback visual (“em chamas”, forjado)  
- Overlay de **superação** quando o peso passa o recorde pessoal  
- Cardio dedicado (**Voo de Cinzas**)  

### 4.4 Evolução — o corpo como mapa

- Visualização térmica do progresso corporal  
- Fases da linhagem (ver seção 5)  
- Consistência e ritmo  
- Selfies de ciclo e leitura de evolução  
- Camada extra de insights para VIP  

### 4.5 Comunidade — prova social sem virar rede social genérica

- Mural de superações  
- Arena (duelos)  
- Títulos e rankings  
- Meta coletiva da academia  

### 4.6 Nutrição e medidas (VIP)

Atletas com vínculo pessoal ativo (`forger_client_bonds`) recebem:

- Aba **Nutrição** no altar  
- Plano alimentar prescrito pelo forjador  
- Acompanhamento de medidas no painel do profissional  

### 4.7 Painel Forja (profissional)

| Área | Função |
|------|--------|
| Painel de atletas | Lista e vínculo de clientes |
| Prescrição de treino | Upload e gestão via planilha Excel |
| Monitoramento | Segmentos VIP / comum / suspenso · acompanhamento de VTC |
| Dieta | Planos alimentares VIP |
| Medidas | Antropometria / medidas científicas |
| Academia | Configuração da casa (somente Forjador Soberano) |

### 4.8 ANYMA FÊNIX — guia por voz

A **ANYMA FÊNIX** é a camada de voz e orientação no canto da tela:

- Apresentação no onboarding  
- Explicações por área (treino, evolução, comunidade, nutrição)  
- Lembretes suaves (ex.: retorno após dias sem visita)  
- Avatar / órbita 3D da Fênix  
- Síntese de voz (TTS)  

> **Nota honesta:** a ANYMA já opera como **guia falada e imersiva**. Um chatbot conversacional completo com LLM genérico permanece como evolução futura (fase Anima avançada), alinhada à política de implementação no fim do ciclo.

### 4.9 Páginas de conhecimento no altar

- Empresa FENYXIA  
- Léxico da lore  
- Como a Fênix mede a evolução  
- Fórum Brasa Viva  

---

## 5. Fases da linhagem (máquina de estados)

| Nível | Nome | Significado |
|-------|------|-------------|
| 1 | Cinzas | Baseline ou regressão honesta |
| 2 | Faísca | Retorno e início de consistência |
| 3 | Brasa | Ritmo estabelecido |
| 4 | Labareda | Alta intensidade e volume |
| 5 | Fogo Cósmico Sagrado | Ápice institucional da linhagem |

Ao subir de fase, o sistema dispara o ritual visual de **transmutação** (olho da Fênix / cerimônia de tela).

A **gravidade térmica** faz o layout refletir inatividade: a interface pode “esfriar” sem apagar o histórico. Quando o atleta volta a forjar com volume relevante, a chama restaura.

---

## 6. Papéis e hierarquia de acesso

| Papel | Entrada | Escopo |
|-------|---------|--------|
| **Cliente** | Portal de Brasa `/` | Altar completo (Nutrição se VIP) |
| **Cliente VIP** | Idem | + nutrição + medidas + insights |
| **Cliente suspenso** | Bloqueado no altar | Retorno ao portal com aviso |
| **Forjador** | `/forja` | Painel profissional |
| **Forjador Linhagem** | `/forja` | Painel profissional |
| **Forjador Soberano** | `/forja` | Painel + configuração da academia |

Cadastro público aberto na internet **não** é o modelo. O fluxo privilegiado passa pelo balcão da academia (handshake).

---

## 7. Design e identidade visual

### Direção estética

Experiência **dark** de alto contraste, atmosfera de forja e altar — preto absoluto, magma e ouro solar.

| Token | Valor | Uso |
|-------|--------|-----|
| Negro / obsidiana | `#000000` / `#050505` | Shell do altar e portal |
| Magma | `#FF4500` | Ação · núcleo · chama |
| Ouro solar | `#FFB800` | Métricas · ascensão · destaques |
| Vidro fumê | painéis semi-transparentes | Cards e superfícies de leitura |
| Aura da Forja | tons azul-ciano | Contraste visual do painel staff |

### Linguagem

Títulos e microcopy usam o léxico sagrado da casa: Altar, Forja, Linhagem, Brasa, Renascimento, Portal de Brasa, Volume Total de Carga.

### Motion

Brasas, pulsos, burn-in, transmutação de fase e a órbita 3D da Fênix criam presença — não ruído decorativo.

### Instalação (PWA)

O atleta pode **adicionar à tela de início** e usar o Meccafit com sensação de app nativo, sem depender de loja pública de massa.

---

## 8. Estrutura técnica (resumo executivo)

Informação suficiente para o cliente entender a solidez do craft — sem expor detalhes internos sensíveis.

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 |
| Backend / BFF | Rotas API e Server Actions no próprio app |
| Dados e autenticação | Supabase (Auth · Postgres · RLS · RPCs) |
| Segurança | Doutrina **ARGOS** — zero-trust, RLS, suite de testes e CI |
| 3D | Three.js + React Three Fiber (Fênix / ANYMA) |
| Motion | Framer Motion |
| Voz | TTS da ANYMA |
| Planilhas (forja) | Importação Excel (SheetJS) |
| Rate limit | Upstash Redis |
| Qualidade | Jest · Playwright · scripts ARGOS · GitHub Actions |
| Hospedagem alvo | Vercel / domínio Fenyxia |

### Princípios de engenharia que o cliente sente

- Dados do atleta isolados por regras de segurança (ninguém “olha a conta do vizinho” por atalho)  
- Escritas críticas preferencialmente via RPC server-side  
- Performance e custo de infra monitorados internamente (PLUTUS)  
- Código e produto **privados** — não é SaaS de prateleira clonável  

---

## 9. Mapa de rotas (referência)

### Públicas / entrada

| Rota | Função |
|------|--------|
| `/` | Portal de Brasa (login cliente) |
| `/forja` | Login de forjadores |
| `/criar-conta` | Abre fluxo de conta |
| `/balcao` | Cartaz / QR da academia |
| `/instalar` | Instalação PWA pós-handshake |

### Altar do cliente

| Rota | Função |
|------|--------|
| `/dashboard` | Hub (Treino · Evolução · Comunidade · Perfil · Nutrição VIP) |
| `/dashboard/onboarding` | Cerimônia de entrada |
| `/dashboard/fenyxia` | Empresa FENYXIA |
| `/dashboard/lexico` | Glossário |
| `/dashboard/como-a-fenix-mede` | Explicação das métricas |
| `/dashboard/forum-brasa-viva` | Fórum |

### Forja

| Rota | Função |
|------|--------|
| `/dashboard/forja` | Painel principal |
| `/dashboard/forja/[clientId]` | Treino do atleta |
| `/forjador/monitoramento` | Monitoramento |
| `/forjador/dieta` | Nutrição VIP |
| `/forjador/medidas` | Medidas VIP |
| `/forjador/academia` | Academia (soberano) |

---

## 10. O que está dentro / o que fica para depois

### Dentro do escopo atual (vitrine exclusiva)

- Treino mensurável com VTC e superações  
- Evolução térmica e fases da linhagem  
- Comunidade (mural, arena, rankings, títulos)  
- VIP: nutrição + medidas + painel forjador  
- Balcão → instalar → cadastro com presença  
- ANYMA FÊNIX (voz, guias, 3D)  
- Página institucional da empresa no perfil  
- Segurança ARGOS e stack moderna  

### Explicitamente fora / adiado

| Tema | Status |
|------|--------|
| **Vendas, planos pagos, checkout, assinatura in-app** | **Fora por enquanto** — conversa futura |
| Monetização dentro do altar | Não existe (“não há cobranças nem monetização”) |
| Chat LLM conversacional completo (Anima avançada) | Evolução futura |
| Refinamento visual máximo do tier 5 (Fogo Cósmico) | Em evolução contínua |
| Marketplace / publicação em loja de massa | Fora do modelo FENYXIA |

---

## 11. Posicionamento comercial da entrega

| O que o Meccafit é | O que o Meccafit não é |
|--------------------|------------------------|
| Sistema exclusivo forjado pela FENYXIA | SaaS genérico de academia |
| Vitrine viva do método da casa | Produto de massa na internet |
| Experiência high code + mitologia executável | Template com logo trocado |
| Demonstração soberana para o cliente | Lista de features em landing page |

**Mensagem oficial da casa no produto:**  
*O MECCAFIT é a primeira obra neste modelo, vitrine viva do que a casa forja. Dentro do altar não há cobranças nem monetização.*

Quando a FENYXIA e o cliente quiserem abrir o capítulo de **vendas**, esse relatório serve de base — a conversa comercial começa a partir daqui, não antes.

---

## 12. Roteiro sugerido de apresentação (≈ 8–12 min)

1. **Portal de Brasa** — identidade e login (30s)  
2. **Balcão + instalar** — como a academia entra no digital (1 min)  
3. **Treino** — registrar carga, VTC, superação (2 min)  
4. **Evolução** — mapa térmico e fases (2 min)  
5. **Comunidade** — mural e rankings (1 min)  
6. **VIP** — nutrição (1 min)  
7. **Forja** — visão do profissional (2 min)  
8. **ANYMA + 3D** — voz e presença da Fênix (1 min)  
9. **Empresa FENYXIA** — exclusividade, vitrine, sem monetização agora (1 min)  

---

## 13. Contato e próximos passos

- Interesse na casa FENYXIA: canal de atendimento indicado no próprio app (Perfil → Empresa / suporte).  
- Próximo capítulo **quando a casa decidir:** desenho comercial (vendas), sem alterar a natureza exclusiva da forja.  
- Documentação interna irmã (não substituem este relatório de cliente):  
  - `docs/MECCAFIT-PHOENIX-DNA-REPORT.md` — constituição DNA Fênix  
  - `docs/FENYXIA-CORPORATE-INSTITUTIONAL-REPORT.md` — carta institucional da casa  
  - `docs/ANIMA-FENYXIA-KNOWLEDGE-BASE.md` — recolha Anima  
  - `docs/PLUTUS-INFRA-SNAPSHOT.md` — custos internos (não partilhar com cliente)

---

## 14. Histórico deste documento

| Versão | Data | Notas |
|--------|------|-------|
| 1.0.0 | 18/07/2026 | Criação do relatório completo para apresentação · status vitrine exclusiva · vendas adiadas |

---

*FENYXIA CO-OPS · Meccafit Center · Relatório ao Cliente v1.0.0*  
*Forjado uma vez. Para um só nome. Por enquanto: vitrine — não prateleira.*
