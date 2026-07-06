import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  areInstagramApiCredentialsConfigured,
  getInstagramSyncDisabledMessage,
  mapFirestoreInstagramMedia,
  syncInstagramMediaFromGraph,
  validateManualInstagramMediaInput,
  validateInstagramMediaUpdateInput,
} from "./instagram-media";

function createFirestoreDouble(
  existingDocs: Array<{ id: string; data: Record<string, unknown> }> = [],
) {
  const set = vi.fn().mockResolvedValue(undefined);
  const update = vi.fn().mockResolvedValue(undefined);
  const get = vi.fn().mockResolvedValue({
    docs: existingDocs.map((doc) => ({ id: doc.id, data: () => doc.data })),
  });
  const query = { where: vi.fn(), limit: vi.fn(), orderBy: vi.fn(), get };
  query.where.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.orderBy.mockReturnValue(query);
  const collection = vi.fn(() => ({
    where: query.where,
    orderBy: query.orderBy,
    doc: vi.fn((id?: string) => ({ id: id ?? "new-media", set, update, get: vi.fn() })),
  }));

  return { firestore: { collection }, set, update, get };
}

const completeEnv = {
  INSTAGRAM_IG_USER_ID: "1789",
  INSTAGRAM_ACCESS_TOKEN: "server-token",
  INSTAGRAM_APP_ID: "app",
  INSTAGRAM_APP_SECRET: "secret",
};

describe("instagram media helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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

  it("returns a config summary without calling Meta when credentials are missing", async () => {
    const { firestore } = createFirestoreDouble();
    const fetcher = vi.fn();

    const result = await syncInstagramMediaFromGraph(firestore as never, {
      env: { ...completeEnv, INSTAGRAM_ACCESS_TOKEN: "" },
      fetcher,
    });

    expect(result.ok).toBe(false);
    expect(result.summary.missing).toEqual(["INSTAGRAM_ACCESS_TOKEN"]);
    expect(result.summary.imported).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps Graph API media and imports new Firestore records", async () => {
    const { firestore, set } = createFirestoreDouble();
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "ig-1",
              caption: "Flor desde Instagram",
              media_type: "IMAGE",
              media_url: "https://cdn.example.test/flor.jpg?token=cdn",
              permalink: "https://www.instagram.com/p/flor/",
              thumbnail_url: "https://cdn.example.test/thumb.jpg",
              timestamp: "2026-06-01T10:00:00+0000",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await syncInstagramMediaFromGraph(firestore as never, {
      env: completeEnv,
      fetcher,
    });
    const requestedUrl = new URL(fetcher.mock.calls[0]?.[0] as string);
    const expectedProof = createHmac("sha256", completeEnv.INSTAGRAM_APP_SECRET)
      .update(completeEnv.INSTAGRAM_ACCESS_TOKEN)
      .digest("hex");

    expect(result).toMatchObject({ ok: true, summary: { imported: 1, updated: 0 } });
    expect(requestedUrl.searchParams.get("fields")).toBe(
      "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp",
    );
    expect(requestedUrl.searchParams.get("appsecret_proof")).toBe(expectedProof);
    expect(requestedUrl.searchParams.get("appsecret_proof")).toMatch(/^[a-f0-9]{64}$/);
    expect(requestedUrl.searchParams.get("appsecret_proof")).not.toContain(
      completeEnv.INSTAGRAM_APP_SECRET,
    );
    expect(requestedUrl.searchParams.get("appsecret_proof")).not.toContain(
      completeEnv.INSTAGRAM_ACCESS_TOKEN,
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        external_id: "ig-1",
        media_type: "IMAGE",
        caption: "Flor desde Instagram",
        media_url: "https://cdn.example.test/flor.jpg?token=cdn",
        thumbnail_url: "https://cdn.example.test/thumb.jpg",
        permalink: "https://www.instagram.com/p/flor/",
        source: "instagram_api",
        hidden: false,
        featured: false,
        pinned: false,
        show_on_home: false,
      }),
    );
  });

  it("handles Graph API errors without leaking the access token", async () => {
    const { firestore } = createFirestoreDouble();
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: "Bad token server-token", type: "OAuthException", code: 190 },
        }),
        { status: 400 },
      ),
    );

    const result = await syncInstagramMediaFromGraph(firestore as never, {
      env: completeEnv,
      fetcher,
    });

    expect(result.ok).toBe(false);
    expect(result.summary.errors[0]).toContain("Meta Graph API respondió 400 code 190");
    expect(result.summary.errors.join(" ")).not.toContain("server-token");
  });

  it("sanitizes unexpected fetch errors that include credential-bearing URLs", async () => {
    const { firestore } = createFirestoreDouble();
    const leakedUrl =
      "https://graph.facebook.com/v25.0/1789/media?access_token=server-token&appsecret_proof=fake-proof";
    const fetcher = vi.fn().mockRejectedValue(new Error(`fetch failed for ${leakedUrl}`));

    const result = await syncInstagramMediaFromGraph(firestore as never, {
      env: completeEnv,
      fetcher,
    });
    const serializedResult = JSON.stringify(result);

    expect(result).toMatchObject({
      ok: false,
      status: 502,
      summary: { errors: ["No se pudo sincronizar Instagram."] },
    });
    expect(serializedResult).not.toContain("server-token");
    expect(serializedResult).not.toContain("fake-proof");
    expect(serializedResult).not.toContain("graph.facebook.com");
    expect(serializedResult).not.toContain("access_token");
    expect(serializedResult).not.toContain("appsecret_proof");
  });

  it("updates existing media while preserving local admin flags", async () => {
    const { firestore, update } = createFirestoreDouble([
      {
        id: "existing-doc",
        data: {
          external_id: "ig-existing",
          hidden: true,
          featured: true,
          pinned: true,
          show_on_home: true,
        },
      },
    ]);
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "ig-existing",
              caption: "Actualizado",
              media_type: "VIDEO",
              media_url: "https://cdn.example.test/video.mp4",
              thumbnail_url: "https://cdn.example.test/video.jpg",
              permalink: "https://www.instagram.com/reel/example/",
              timestamp: "2026-06-02T10:00:00+0000",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await syncInstagramMediaFromGraph(firestore as never, {
      env: completeEnv,
      fetcher,
    });

    expect(result).toMatchObject({ ok: true, summary: { imported: 0, updated: 1 } });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        external_id: "ig-existing",
        caption: "Actualizado",
        media_type: "VIDEO",
      }),
    );
    const updatePayload = update.mock.calls[0]?.[0];
    expect(updatePayload).toBeDefined();
    expect(updatePayload).not.toHaveProperty("hidden");
    expect(updatePayload).not.toHaveProperty("featured");
    expect(updatePayload).not.toHaveProperty("pinned");
    expect(updatePayload).not.toHaveProperty("show_on_home");
  });
});
