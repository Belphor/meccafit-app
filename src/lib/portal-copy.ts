import { CONTA_SUSPENSA } from "@/lib/client-lore-copy";

/** Textos fixos do portal — fonte única para evitar corrupção de encoding nos TSX. */
export const PORTAL_COPY = {
  leaveYesterday: "DEIXE O ONTEM PARA TRÁS.",
  rebirthToday: "RENASÇA HOJE.",
  rebirthTodayAria: "Lema RENASÇA HOJE",
  brandName: "MECCAFIT CENTER",
  portalBrasaAria: "Portal de Brasa, dashboard principal",
  loadError: "Não foi possível carregar o altar.",
  profileUnavailable: "Perfil indisponível.",
  loginIdle: "Aproxime-se do altar para reacender sua jornada.",
  loginAltarAccess: "Clientes VIP e comuns acessam pelo Portal de Brasa.",
  loginPasswordHint:
    process.env.NODE_ENV === "development"
      ? "Informe a senha de teste. Use senha123 para os usuários criados no Supabase."
      : "Informe sua senha de acesso para reacender sua chama.",
  loginOpening: "Abrindo o Portal de Brasa...",
  loginSessionError: "Não foi possível confirmar a sessão. Tente novamente.",
  loginProfileMissing:
    "Login reconhecido, mas o perfil não foi encontrado no altar. Contate o Forjador.",
  loginConfirmed: "Acesso confirmado no altar. Entrando no dashboard...",
  loginInvalidCredentials: "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.",
  loginRateLimited:
    "Muitas tentativas de acesso. Aguarde um minuto e tente novamente.",
  loginRoleUnauthorized:
    "Este altar não reconhece o seu papel de acesso. Utilize o portal correto da sua linhagem.",
  loginWrongPortalForjador:
    "Esta conta é de Forjador. Acesse pelo portal da Forja.",
  loginWrongPortalCliente:
    "Esta conta é de Cliente. Acesse pelo Portal de Brasa.",
  loginDbError: "Falha ao validar o login no banco de dados. Tente novamente.",
  loginActionFailedCliente:
    "Não foi possível abrir o Portal de Brasa agora. Recarregue a página e tente novamente.",
  loginActionFailedForja:
    "Não foi possível abrir o Portal da Forja agora. Recarregue a página e tente novamente.",
  loginAccountSuspended: CONTA_SUSPENSA,
  loginSubtitle: "Pronto para queimar os velhos hábitos?",
  rememberCredentials: "Lembrar usuário e senha",
  createAccountCta: "Criar conta",
  forjaLoginTitle: "Portal da",
  forjaLoginHighlight: "Forja.",
  forjaLoginSubtitle: "Acesso exclusivo de Forjadores e Soberanos.",
  forjaLoginIdle: "Entre com a conta provisionada no altar da Forja.",
  forjaLoginPasswordHint: "Informe a senha da sua conta de Forjador.",
  forjaLoginOpening: "Abrindo o Portal da Forja...",
  forjaLoginConfirmed: "Forja reconhecida. Entrando no painel...",
  forjaLoginCta: "Sou um Forjador. Entrar na Forja",
  forjaBackToCliente: "Voltar ao Portal de Brasa",
  submitForjaLogin: "ENTRAR NA FORJA",
  loginBurning: "Sua chama está reacendendo...",
  forjaLoginBurning: "A forja está acendendo...",
  onboardingTitle: "Criar conta",
  onboardingHighlight: "Sua linhagem começa aqui.",
  onboardingSubtitle: "Preencha seus dados para acender sua linhagem.",
  onboardingEmailRequired: "Informe o e-mail de acesso.",
  onboardingEmailInvalid: "Informe um e-mail válido.",
  onboardingPasswordMin: "A senha deve ter no mínimo 6 caracteres.",
  onboardingFullNameRequired: "Informe seu nome completo.",
  onboardingBirthInvalid: "Informe uma data de nascimento válida.",
  onboardingProcessing: "Forjando sua conta no altar...",
  onboardingSuccess: "Linhagem acesa. Entrando no dashboard...",
  onboardingSignupFailed: "Não foi possível criar a conta. Tente novamente.",
  onboardingConfirmEmail: "Conta criada. Confirme seu e-mail antes de acessar o altar.",
  onboardingEmailAlreadyExists:
    "Este e-mail já possui conta no altar. Entre com seu login ou use outro e-mail.",
  onboardingAlreadyHaveAccount: "Já possuo conta. Ir para o login",
  submitOnboarding: "ACENDER MINHA LINHAGEM",
  submitProcessing: "PROCESSANDO...",
  submitLogin: "REACENDER MINHA CHAMA",
} as const;
