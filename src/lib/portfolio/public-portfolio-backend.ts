import net from "node:net";
import {
  getFirebaseAdminServiceAccount,
  isFirebaseAdminEmulatorEnabled,
} from "../config/firebase-admin";
import type { FirestorePortfolioItem } from "./portfolio";

const emulatorConnectionTimeoutMs = 75;

function parseEmulatorHost(value: string | undefined): { host: string; port: number } | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const [host, rawPort] = trimmed.replace(/^https?:\/\//, "").split(":");
  const port = Number(rawPort);

  if (!host || !Number.isInteger(port) || port <= 0) {
    return null;
  }

  return { host, port };
}

async function isFirestoreEmulatorReachable(): Promise<boolean> {
  const emulator = parseEmulatorHost(process.env.FIRESTORE_EMULATOR_HOST);

  if (!emulator) {
    return false;
  }

  return new Promise((resolve) => {
    const socket = net.createConnection(emulator);
    const finish = (reachable: boolean) => {
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(emulatorConnectionTimeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function listPublicBackendPortfolioItems(): Promise<FirestorePortfolioItem[]> {
  const hasServiceAccount = getFirebaseAdminServiceAccount() !== null;
  const hasReachableEmulator =
    !hasServiceAccount &&
    isFirebaseAdminEmulatorEnabled() &&
    (await isFirestoreEmulatorReachable());

  if (!hasServiceAccount && !hasReachableEmulator) {
    return [];
  }

  const { listPublishedFirestorePortfolioItems } = await import("./admin-portfolio");

  return listPublishedFirestorePortfolioItems();
}

export async function canUsePublicBackend(): Promise<boolean> {
  const hasServiceAccount = getFirebaseAdminServiceAccount() !== null;
  const hasReachableEmulator =
    !hasServiceAccount &&
    isFirebaseAdminEmulatorEnabled() &&
    (await isFirestoreEmulatorReachable());

  return hasServiceAccount || hasReachableEmulator;
}
