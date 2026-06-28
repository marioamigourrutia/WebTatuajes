import { describe, expect, it } from "vitest";
import {
  areInstagramApiCredentialsConfigured,
  getInstagramSyncDisabledMessage,
  mapFirestoreInstagramMedia,
  validateManualInstagramMediaInput,
  validateInstagramMediaUpdateInput,
} from "./instagram-media";

describe("instagram media helpers", () => {
  it("validates manual media with official API-ready fields", () => {
    const result = validateManualInstagramMediaInput({
      externalId: "manual-flower-1",
      mediaType: "IMAGE",
      caption: "Flor fina",
      mediaUrl: "https://cdn.example.test/flor.webp#private",
      permalink: "https://www.instagram.com/p/example/",
      featured: true,
      showOnHome: true,
      order: "2",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        externalId: "manual-flower-1",
        mediaType: "IMAGE",
        mediaUrl: "https://cdn.example.test/flor.webp",
        featured: true,
        showOnHome: true,
        order: 2,
      },
    });
  });

  it("rejects unsafe manual media URLs and invalid media types", () => {
    const result = validateManualInstagramMediaInput({
      mediaType: "STORY",
      caption: "Unsafe",
      mediaUrl: "http://localhost/private.webp",
    });

    expect(result).toMatchObject({
      ok: false,
      errors: {
        mediaType: "El tipo debe ser IMAGE, VIDEO o CAROUSEL_ALBUM.",
        mediaUrl: "Ingresa una URL pública http:// o https:// válida.",
      },
    });
  });

  it("accepts only safe flag updates", () => {
    expect(validateInstagramMediaUpdateInput({ hidden: true, order: "10" })).toMatchObject({
      ok: true,
      value: { hidden: true, order: 10 },
    });
    expect(validateInstagramMediaUpdateInput({ order: "invalid" })).toMatchObject({
      ok: false,
      errors: { order: "El orden debe ser un entero entre 0 y 9999." },
    });
  });

  it("maps Firestore records without exposing unsafe media URLs", () => {
    const item = mapFirestoreInstagramMedia({
      id: "media-1",
      data: () => ({
        external_id: "1789",
        media_type: "CAROUSEL_ALBUM",
        caption: "Carrusel",
        media_url: "javascript:alert(1)",
        thumbnail_url: "https://cdn.example.test/thumb.jpg",
        source: "instagram_api",
        hidden: false,
      }),
    });

    expect(item).toMatchObject({
      id: "media-1",
      externalId: "1789",
      mediaType: "CAROUSEL_ALBUM",
      mediaUrl: "",
      thumbnailUrl: "https://cdn.example.test/thumb.jpg",
      source: "instagram_api",
    });
  });

  it("keeps sync disabled until all server-only credentials exist", () => {
    const env = {
      INSTAGRAM_IG_USER_ID: "1789",
      INSTAGRAM_ACCESS_TOKEN: "",
      INSTAGRAM_APP_ID: "app",
      INSTAGRAM_APP_SECRET: "secret",
    };

    expect(areInstagramApiCredentialsConfigured(env)).toBe(false);
    expect(getInstagramSyncDisabledMessage(env).missing).toEqual(["INSTAGRAM_ACCESS_TOKEN"]);
  });
});
