import net from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFirebaseAdminServiceAccount,
  isFirebaseAdminEmulatorEnabled,
} from "../config/firebase-admin";
import { listPublishedFirestorePortfolioItems } from "./admin-portfolio";
import { listPublicBackendPortfolioItems } from "./public-portfolio-backend";

vi.mock("../config/firebase-admin", () => ({
  getFirebaseAdminServiceAccount: vi.fn(),
  isFirebaseAdminEmulatorEnabled: vi.fn(),
}));

vi.mock("./admin-portfolio", () => ({
  listPublishedFirestorePortfolioItems: vi.fn(),
}));

vi.mock("node:net", () => ({
  default: {
    createConnection: vi.fn(),
  },
}));

const getFirebaseAdminServiceAccountMock = vi.mocked(getFirebaseAdminServiceAccount);
const isFirebaseAdminEmulatorEnabledMock = vi.mocked(isFirebaseAdminEmulatorEnabled);
const listPublishedFirestorePortfolioItemsMock = vi.mocked(listPublishedFirestorePortfolioItems);
const createConnectionMock = vi.mocked(net.createConnection);

function mockEmulatorConnection(result: "connect" | "error") {
  const socket = {
    destroy: vi.fn(),
    setTimeout: vi.fn(),
    once: vi.fn((event: string, listener: () => void) => {
      if (event === result) {
        queueMicrotask(listener);
      }

      return socket;
    }),
  };

  createConnectionMock.mockReturnValue(socket as never);

  return socket;
}

describe("public portfolio backend loading", () => {
  beforeEach(() => {
    getFirebaseAdminServiceAccountMock.mockReturnValue(null);
    isFirebaseAdminEmulatorEnabledMock.mockReturnValue(false);
    listPublishedFirestorePortfolioItemsMock.mockResolvedValue([]);
    mockEmulatorConnection("error");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("does not import or call the Admin portfolio backend when unconfigured", async () => {
    await expect(listPublicBackendPortfolioItems()).resolves.toEqual([]);

    expect(listPublishedFirestorePortfolioItemsMock).not.toHaveBeenCalled();
  });

  it("does not call the Admin portfolio backend when the emulator is configured but unavailable", async () => {
    isFirebaseAdminEmulatorEnabledMock.mockReturnValue(true);
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:1");

    await expect(listPublicBackendPortfolioItems()).resolves.toEqual([]);

    expect(listPublishedFirestorePortfolioItemsMock).not.toHaveBeenCalled();
  });

  it("loads the Admin portfolio backend when the Firestore emulator is reachable", async () => {
    isFirebaseAdminEmulatorEnabledMock.mockReturnValue(true);
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    mockEmulatorConnection("connect");
    listPublishedFirestorePortfolioItemsMock.mockResolvedValue([
      {
        id: "emulator-item-1",
        title: "Publicado desde emulador",
        style: "Blackwork",
        bodyArea: "Pierna",
        description: "Trabajo publicado desde Admin local.",
        tags: [],
        published: true,
        featured: false,
        gradient: "linear-gradient(#111, #222)",
        imageUrl: null,
        createdAt: null,
        imagePath: null,
        imageMimeType: null,
        imageSizeBytes: null,
        imageOriginalFilename: null,
      },
    ]);

    await expect(listPublicBackendPortfolioItems()).resolves.toMatchObject([
      { id: "emulator-item-1", published: true },
    ]);
    expect(createConnectionMock).toHaveBeenCalledWith({ host: "127.0.0.1", port: 8080 });
    expect(listPublishedFirestorePortfolioItemsMock).toHaveBeenCalledTimes(1);
  });

  it("loads the Admin portfolio backend when service account credentials are configured", async () => {
    getFirebaseAdminServiceAccountMock.mockReturnValue({
      projectId: "webtatuajes-test",
      clientEmail: "firebase-adminsdk@example.iam.gserviceaccount.com",
      privateKey: "private-key",
    });
    listPublishedFirestorePortfolioItemsMock.mockResolvedValue([
      {
        id: "admin-item-1",
        title: "Publicado",
        style: "Línea fina",
        bodyArea: "Brazo",
        description: "Trabajo publicado.",
        tags: [],
        published: true,
        featured: false,
        gradient: "linear-gradient(#000, #111)",
        imageUrl: null,
        createdAt: null,
        imagePath: null,
        imageMimeType: null,
        imageSizeBytes: null,
        imageOriginalFilename: null,
      },
    ]);

    await expect(listPublicBackendPortfolioItems()).resolves.toMatchObject([
      { id: "admin-item-1", published: true },
    ]);
    expect(listPublishedFirestorePortfolioItemsMock).toHaveBeenCalledTimes(1);
  });
});
