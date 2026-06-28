/**
 * Captura de câmera — fallbacks progressivos para iOS, Android e desktop.
 */

type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  onSuccess: (stream: MediaStream) => void,
  onError: (error: Error) => void,
) => void;

type NavigatorWithLegacyCamera = Navigator & {
  getUserMedia?: LegacyGetUserMedia;
  webkitGetUserMedia?: LegacyGetUserMedia;
  mozGetUserMedia?: LegacyGetUserMedia;
};

const VIDEO_CONSTRAINT_CANDIDATES: Array<boolean | MediaTrackConstraints> = [
  {
    facingMode: { ideal: "user" },
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
  },
  { facingMode: { ideal: "user" } },
  { facingMode: "user" },
  {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  { width: { ideal: 640 }, height: { ideal: 480 } },
  true,
];

function resolveGetUserMedia(): (
  constraints: MediaStreamConstraints,
) => Promise<MediaStream> {
  if (typeof navigator === "undefined") {
    return async () => {
      throw new DOMException("Navigator indisponível", "NotSupportedError");
    };
  }

  if (navigator.mediaDevices?.getUserMedia) {
    return (constraints) => navigator.mediaDevices.getUserMedia(constraints);
  }

  const legacyNav = navigator as NavigatorWithLegacyCamera;
  const legacyFn =
    legacyNav.getUserMedia ?? legacyNav.webkitGetUserMedia ?? legacyNav.mozGetUserMedia;

  if (!legacyFn) {
    return async () => {
      throw new DOMException("getUserMedia não suportado", "NotSupportedError");
    };
  }

  return (constraints) =>
    new Promise((resolve, reject) => {
      legacyFn.call(navigator, constraints, resolve, reject);
    });
}

export async function requestFrontCameraStream(): Promise<MediaStream> {
  return requestCameraStream({ preferFront: true });
}

/** Tenta câmera frontal, traseira ou genérica — máxima compatibilidade com celulares. */
export async function requestCameraStream(options?: {
  preferFront?: boolean;
}): Promise<MediaStream> {
  const preferFront = options?.preferFront ?? true;
  const getUserMedia = resolveGetUserMedia();
  let lastError: unknown;

  const orderedCandidates = preferFront
    ? VIDEO_CONSTRAINT_CANDIDATES
    : [
        ...VIDEO_CONSTRAINT_CANDIDATES.slice(2),
        ...VIDEO_CONSTRAINT_CANDIDATES.slice(0, 2),
      ];

  for (const video of orderedCandidates) {
    try {
      return await getUserMedia({ video, audio: false });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new DOMException("Câmera indisponível", "NotReadableError");
}

export async function requestAnyCameraStream(): Promise<MediaStream> {
  try {
    return await requestCameraStream({ preferFront: true });
  } catch {
    return requestCameraStream({ preferFront: false });
  }
}

export function configureVideoElement(video: HTMLVideoElement): void {
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.setAttribute("autoplay", "true");
}

export async function bindStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  configureVideoElement(video);
  video.srcObject = stream;
  await video.play().catch(() => undefined);
  await waitForVideoFrame(video);
}

export async function waitForVideoFrame(
  video: HTMLVideoElement,
  timeoutMs = 12_000,
): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado aguardando frame da câmera"));
    }, timeoutMs);

    const onReady = () => {
      if (video.videoWidth <= 0 || video.videoHeight <= 0) return;
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
    };

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);

    if (video.readyState >= 1) {
      window.requestAnimationFrame(onReady);
    }
  });
}

export function captureVideoFrameDataUrl(
  video: HTMLVideoElement,
  options?: { mirror?: boolean; quality?: number },
): string {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas indisponível");
  }

  if (options?.mirror) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(video, 0, 0, width, height);

  const quality = options?.quality ?? 0.92;

  try {
    const webp = canvas.toDataURL("image/webp", quality);
    if (webp.startsWith("data:image/webp")) return webp;
  } catch {
    /* Safari antigo pode rejeitar webp no canvas */
  }

  return canvas.toDataURL("image/jpeg", quality);
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function formatCameraError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Permissão da câmera negada. Libere o acesso nas configurações do navegador.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "Nenhuma câmera encontrada neste dispositivo.";
      case "NotReadableError":
      case "TrackStartError":
        return "Câmera em uso por outro aplicativo. Feche outros apps e tente de novo.";
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return "Câmera indisponível com estas configurações.";
      case "SecurityError":
        return "Câmera bloqueada. Use HTTPS ou o navegador nativo do celular.";
      case "NotSupportedError":
        return "Câmera não suportada neste navegador. Use importar foto com a câmera.";
      default:
        break;
    }
  }

  if (error instanceof Error && error.message.includes("Tempo esgotado")) {
    return "A câmera demorou para responder. Tente novamente ou importe uma foto.";
  }

  return "Câmera indisponível neste dispositivo.";
}
