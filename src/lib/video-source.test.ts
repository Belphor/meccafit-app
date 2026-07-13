import {
  resolveVideoSourceKind,
  toPlayableVideoUrl,
} from "@/lib/video-source";

describe("toPlayableVideoUrl", () => {
  it("converte YouTube watch para embed", () => {
    expect(toPlayableVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converte youtu.be para embed", () => {
    expect(toPlayableVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converte YouTube shorts para embed", () => {
    expect(toPlayableVideoUrl("https://www.youtube.com/shorts/abc123XYZ_-")).toBe(
      "https://www.youtube.com/embed/abc123XYZ_-",
    );
  });

  it("mantém embed existente", () => {
    expect(toPlayableVideoUrl("https://www.youtube.com/embed/rT7DgCr-3pg")).toBe(
      "https://www.youtube.com/embed/rT7DgCr-3pg",
    );
  });

  it("converte Vimeo para player", () => {
    expect(toPlayableVideoUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });
});

describe("resolveVideoSourceKind", () => {
  it("usa iframe para YouTube watch após normalização", () => {
    expect(resolveVideoSourceKind("https://www.youtube.com/watch?v=abc")).toBe("iframe");
  });

  it("usa html5 para mp4", () => {
    expect(resolveVideoSourceKind("https://cdn.example.com/demo.mp4")).toBe("html5");
  });

  it("usa external para Instagram", () => {
    expect(resolveVideoSourceKind("https://www.instagram.com/reel/xyz/")).toBe("external");
  });
});
