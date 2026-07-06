import { describe, expect, it } from "vitest";
import { sanitizeExternalImageUrl, validateOptionalExternalImageUrl } from "./external-image-url";

describe("external image URLs", () => {
  it("allows only public http/https URLs", () => {
    expect(sanitizeExternalImageUrl(" https://cdn.example.test/art.webp#private ")).toBe(
      "https://cdn.example.test/art.webp",
    );
    expect(sanitizeExternalImageUrl("http://example.test/art.jpg")).toBe(
      "http://example.test/art.jpg",
    );
  });

  it.each([
    "javascript:alert(1)",
    "data:image/png;base64,abc",
    "file:///tmp/private.jpg",
    "/local.jpg",
    "https:///local.jpg",
    "http:/example.com/a",
    "HTTPS://cdn.example.test/art.webp",
    "https://localhost/art.jpg",
    "https://assets.localhost/art.jpg",
    "https://webtatuajes/art.jpg",
    "http://127.0.0.1/art.jpg",
    "http://8.8.8.8/art.jpg",
    "http://10.0.0.5/art.jpg",
    "http://172.16.0.5/art.jpg",
    "http://172.31.255.255/art.jpg",
    "http://192.168.1.20/art.jpg",
    "http://169.254.10.20/art.jpg",
    "http://[::1]/art.jpg",
    "http://[2001:4860:4860::8888]/art.jpg",
    "http://[fe80::1]/art.jpg",
    "http://[fc00::1]/art.jpg",
    "http://[fd00::1]/art.jpg",
  ])("rejects unsafe image URL %s", (url) => {
    expect(sanitizeExternalImageUrl(url)).toBeNull();
    expect(validateOptionalExternalImageUrl(url)).toMatchObject({ ok: false });
  });
});
