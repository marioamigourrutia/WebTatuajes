import { FieldValue } from "firebase-admin/firestore";

type FirestoreLike = {
  collection: (path: string) => {
    add: (data: Record<string, unknown>) => Promise<unknown>;
  };
};

type AuditLogQueryFirestoreLike = {
  collection: (path: string) => {
    orderBy: (field: string, direction: "desc") => {
      limit: (limit: number) => {
        get: () => Promise<{
          docs: Array<{ id: string; data: () => Record<string, unknown> }>;
        }>;
      };
    };
  };
};

export type AuditLogEvent = {
  action: string;
  actorUid?: string | null;
  actorEmail?: string | null;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};

export type RecentAuditLog = {
  id: string;
  action: string;
  actorUid: string | null;
  actorEmail: string | null;
  targetType: string;
  targetId: string;
  createdAt: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export async function appendAuditLog(firestore: FirestoreLike, event: AuditLogEvent) {
  try {
    // Audit logging is intentionally fail-open: admin mutations should not be
    // rolled back because the secondary audit write is temporarily unavailable.
    await firestore.collection("audit_logs").add({
      action: event.action,
      actor_uid: event.actorUid ?? null,
      actor_email: event.actorEmail ?? null,
      target_type: event.targetType,
      target_id: event.targetId,
      metadata: event.metadata ?? {},
      created_at: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to append audit log", error);
  }
}

function serializeAuditDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === "object" && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function sanitizeMetadata(metadata: unknown): Record<string, string | number | boolean | null> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>)
      .filter(([key]) => !/(token|secret|password|credential|authorization|cookie)/i.test(key))
      .flatMap(([key, value]) => {
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null
        ) {
          return [[key, value] as const];
        }

        return [];
      }),
  );
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function listRecentAuditLogs(
  firestore: AuditLogQueryFirestoreLike,
  limit = 25,
): Promise<RecentAuditLog[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const snapshot = await firestore
    .collection("audit_logs")
    .orderBy("created_at", "desc")
    .limit(safeLimit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      action: readString(data.action) ?? "acción desconocida",
      actorUid: readString(data.actor_uid),
      actorEmail: readString(data.actor_email),
      targetType: readString(data.target_type) ?? "recurso",
      targetId: readString(data.target_id) ?? "sin id",
      createdAt: serializeAuditDate(data.created_at),
      metadata: sanitizeMetadata(data.metadata),
    };
  });
}
