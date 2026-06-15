import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-webtatuajes";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, "profiles/customer-a"), {
      full_name: "Customer A",
      role: "customer",
    });
    await setDoc(doc(db, "profiles/customer-b"), {
      full_name: "Customer B",
      role: "customer",
    });
    await setDoc(doc(db, "profiles/artist-a"), {
      full_name: "Artist A",
      role: "artist",
    });
    await setDoc(doc(db, "profiles/artist-b"), {
      full_name: "Artist B",
      role: "artist",
    });
    await setDoc(doc(db, "profiles/admin-a"), {
      full_name: "Admin A",
      role: "admin",
    });

    await setDoc(doc(db, "quotes/quote-a"), {
      customer_id: "customer-a",
      artist_id: "artist-a",
      status: "pending",
      description: "Private quote A",
    });
    await setDoc(doc(db, "quotes/quote-b"), {
      customer_id: "customer-b",
      artist_id: "artist-a",
      status: "pending",
      description: "Private quote B",
    });
    await setDoc(doc(db, "quote_images/image-a"), {
      customer_id: "customer-a",
      quote_id: "quote-a",
      storage_path: "quote-images/customer-a/quote-a/reference.png",
      mime_type: "image/png",
      size_bytes: 128,
    });
    await setDoc(doc(db, "appointments/appointment-a"), {
      customer_id: "customer-a",
      artist_id: "artist-a",
      quote_id: "quote-a",
      status: "scheduled",
    });
    await setDoc(doc(db, "appointments/appointment-b"), {
      customer_id: "customer-b",
      artist_id: "artist-a",
      quote_id: "quote-b",
      status: "scheduled",
    });

    await setDoc(doc(db, "portfolio_items/published-item"), {
      artist_id: "artist-a",
      title: "Published item",
      published: true,
    });
    await setDoc(doc(db, "portfolio_items/draft-item"), {
      artist_id: "artist-a",
      title: "Draft item",
      published: false,
    });
    await setDoc(doc(db, "artists/artist-b"), {
      profile_id: "artist-b",
      display_name: "Artist B",
      published: false,
    });
    await setDoc(doc(db, "portfolio_items/artist-b-item"), {
      artist_id: "artist-b",
      title: "Artist B item",
      published: false,
    });
    await setDoc(doc(db, "products/active-product"), {
      title: "Active product",
      active: true,
    });
    await setDoc(doc(db, "products/inactive-product"), {
      title: "Inactive product",
      active: false,
    });
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function anonymousDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function userDb(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

function userStorage(uid: string) {
  return testEnv.authenticatedContext(uid).storage();
}

function anonymousStorage() {
  return testEnv.unauthenticatedContext().storage();
}

function pngBlob() {
  return new Blob(["safe test image"], { type: "image/png" });
}

describe("Firestore private data rules", () => {
  it("blocks anonymous users from private profiles, quotes, quote images, and appointments", async () => {
    const db = anonymousDb();

    await assertFails(getDoc(doc(db, "profiles/customer-a")));
    await assertFails(getDoc(doc(db, "quotes/quote-a")));
    await assertFails(getDoc(doc(db, "quote_images/image-a")));
    await assertFails(getDoc(doc(db, "appointments/appointment-a")));
  });

  it("allows customers to read only their own private profile, quote, image metadata, and appointment", async () => {
    const customerA = userDb("customer-a");

    await assertSucceeds(getDoc(doc(customerA, "profiles/customer-a")));
    await assertSucceeds(getDoc(doc(customerA, "quotes/quote-a")));
    await assertSucceeds(getDoc(doc(customerA, "quote_images/image-a")));
    await assertSucceeds(getDoc(doc(customerA, "appointments/appointment-a")));

    await assertFails(getDoc(doc(customerA, "profiles/customer-b")));
    await assertFails(getDoc(doc(customerA, "quotes/quote-b")));
    await assertFails(getDoc(doc(customerA, "appointments/appointment-b")));
  });

  it("blocks customers from assigning roles, artist ownership, status, or admin-only fields", async () => {
    const customerA = userDb("customer-a");

    await assertFails(
      updateDoc(doc(customerA, "profiles/customer-a"), {
        role: "admin",
      }),
    );
    await assertFails(
      updateDoc(doc(customerA, "quotes/quote-a"), {
        artist_id: "customer-a",
      }),
    );
    await assertFails(
      updateDoc(doc(customerA, "quotes/quote-a"), {
        admin_notes: "Expose private notes",
      }),
    );
    await assertFails(
      updateDoc(doc(customerA, "quotes/quote-a"), {
        status: "approved",
      }),
    );

    await assertSucceeds(
      updateDoc(doc(customerA, "quotes/quote-a"), {
        description: "Updated customer description",
      }),
    );
  });

  it("allows artist/admin boundaries for assigned quotes and appointments", async () => {
    const artistA = userDb("artist-a");
    const adminA = userDb("admin-a");

    await assertSucceeds(getDoc(doc(artistA, "quotes/quote-a")));
    await assertSucceeds(getDoc(doc(artistA, "appointments/appointment-a")));
    await assertSucceeds(
      updateDoc(doc(artistA, "quotes/quote-a"), {
        status: "reviewing",
      }),
    );

    await assertSucceeds(
      updateDoc(doc(adminA, "quotes/quote-a"), {
        admin_notes: "Internal note",
      }),
    );
    await assertSucceeds(
      updateDoc(doc(adminA, "profiles/customer-a"), {
        role: "customer",
      }),
    );
  });

  it("blocks artists from taking over another artist profile by changing profile ownership", async () => {
    const artistA = userDb("artist-a");

    await assertFails(
      setDoc(doc(artistA, "artists/artist-b"), {
        profile_id: "artist-a",
        display_name: "Hijacked artist profile",
        published: false,
      }),
    );
  });

  it("blocks artists from taking over another portfolio item by changing artist ownership", async () => {
    const artistA = userDb("artist-a");

    await assertFails(
      setDoc(doc(artistA, "portfolio_items/artist-b-item"), {
        artist_id: "artist-a",
        title: "Hijacked portfolio item",
        published: false,
      }),
    );
  });

  it("blocks artists from changing immutable appointment ownership and quote links", async () => {
    const artistA = userDb("artist-a");

    await assertFails(
      updateDoc(doc(artistA, "appointments/appointment-a"), {
        customer_id: "customer-b",
      }),
    );
    await assertFails(
      updateDoc(doc(artistA, "appointments/appointment-a"), {
        quote_id: "quote-b",
      }),
    );
    await assertFails(
      updateDoc(doc(artistA, "appointments/appointment-a"), {
        artist_id: "artist-b",
      }),
    );
    await assertSucceeds(
      updateDoc(doc(artistA, "appointments/appointment-a"), {
        status: "completed",
      }),
    );
  });
});

describe("Public content rules", () => {
  it("allows public reads only for published or active content", async () => {
    const db = anonymousDb();

    await assertSucceeds(getDoc(doc(db, "portfolio_items/published-item")));
    await assertFails(getDoc(doc(db, "portfolio_items/draft-item")));

    await assertSucceeds(getDoc(doc(db, "products/active-product")));
    await assertFails(getDoc(doc(db, "products/inactive-product")));
  });
});

describe("Storage private quote image rules", () => {
  it("keeps private quote images non-public and accessible to owner, assigned artist, and admin", async () => {
    const path = "quote-images/customer-a/quote-a/reference.png";
    const ownerFile = ref(userStorage("customer-a"), path);

    await assertSucceeds(uploadBytes(ownerFile, pngBlob()));

    await assertFails(getBytes(ref(anonymousStorage(), path)));
    await assertFails(getBytes(ref(userStorage("customer-b"), path)));
    await assertSucceeds(getBytes(ref(userStorage("customer-a"), path)));
    await assertSucceeds(getBytes(ref(userStorage("artist-a"), path)));
    await assertSucceeds(getBytes(ref(userStorage("admin-a"), path)));
  });

  it("blocks customers from uploading private quote images outside their own quote path", async () => {
    await assertFails(
      uploadBytes(
        ref(userStorage("customer-a"), "quote-images/customer-b/quote-b/reference.png"),
        pngBlob(),
      ),
    );
  });
});
