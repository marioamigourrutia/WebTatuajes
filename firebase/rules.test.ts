import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";

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

    await setDoc(doc(db, "artists/artist-a"), {
      profile_id: "artist-a",
      display_name: "Artist A",
      published: true,
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

function textBlob() {
  return new Blob(["not an image"], { type: "text/plain" });
}

function oversizedPngBlob() {
  return new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/png" });
}

function quoteImageMetadata(customerId = "customer-a", quoteId = "quote-a") {
  return {
    contentType: "image/png",
    customMetadata: {
      customer_id: customerId,
      quote_id: quoteId,
    },
  };
}

describe("Firestore private data rules", () => {
  it("blocks anonymous users from private profiles, quotes, quote images, and appointments", async () => {
    const db = anonymousDb();

    await assertFails(getDoc(doc(db, "profiles/customer-a")));
    await assertFails(getDoc(doc(db, "quotes/quote-a")));
    await assertFails(
      setDoc(doc(db, "quotes/public-write-attempt"), {
        customer_id: "anonymous",
        status: "pending",
        description: "Public writes must go through the server Admin SDK route.",
      }),
    );
    await assertFails(getDoc(doc(db, "quote_images/image-a")));
    await assertFails(getDoc(doc(db, "appointments/appointment-a")));
  });

  it("blocks unsafe list/query access to private and admin-only collections", async () => {
    const customerA = userDb("customer-a");

    await assertFails(getDocs(collection(customerA, "profiles")));
    await assertFails(getDocs(collection(customerA, "quotes")));
    await assertFails(getDocs(collection(customerA, "quote_images")));
    await assertFails(getDocs(collection(customerA, "appointments")));
    await assertFails(getDocs(collection(customerA, "contact_leads")));
  });

  it("keeps quote collection listing closed to client SDKs, including admins", async () => {
    await assertFails(getDocs(collection(userDb("admin-a"), "quotes")));
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

  it("blocks malformed quote payloads with extra fields or invalid types", async () => {
    const customerA = userDb("customer-a");

    await assertFails(
      setDoc(doc(customerA, "quotes/malformed-extra"), {
        customer_id: "customer-a",
        status: "pending",
        description: "Quote with an injected field",
        is_admin: true,
      }),
    );
    await assertFails(
      setDoc(doc(customerA, "quotes/malformed-type"), {
        customer_id: "customer-a",
        status: "pending",
        description: "Quote with a bad budget type",
        budget_clp: "100000",
      }),
    );
    await assertSucceeds(
      setDoc(doc(customerA, "quotes/valid-customer-quote"), {
        customer_id: "customer-a",
        status: "pending",
        description: "Valid quote",
        budget_clp: 100000,
      }),
    );
  });

  it("blocks malformed quote image metadata and mismatched quote ownership", async () => {
    const customerA = userDb("customer-a");

    await assertFails(
      setDoc(doc(customerA, "quote_images/bad-mime"), {
        customer_id: "customer-a",
        quote_id: "quote-a",
        storage_path: "quote-images/customer-a/quote-a/reference.svg",
        mime_type: "image/svg+xml",
        size_bytes: 128,
      }),
    );
    await assertFails(
      setDoc(doc(customerA, "quote_images/bad-owner"), {
        customer_id: "customer-a",
        quote_id: "quote-b",
        storage_path: "quote-images/customer-a/quote-b/reference.png",
        mime_type: "image/png",
        size_bytes: 128,
      }),
    );
    await assertFails(
      setDoc(doc(customerA, "quote_images/extra-field"), {
        customer_id: "customer-a",
        quote_id: "quote-a",
        storage_path: "quote-images/customer-a/quote-a/reference.png",
        mime_type: "image/png",
        size_bytes: 128,
        public_url: "https://example.invalid/reference.png",
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

  it("blocks customers from creating or publishing artist profiles", async () => {
    const customerA = userDb("customer-a");

    await assertFails(
      setDoc(doc(customerA, "artists/customer-a"), {
        profile_id: "customer-a",
        display_name: "Self promoted customer",
        published: false,
      }),
    );
    await assertFails(
      setDoc(doc(customerA, "artists/customer-a-published"), {
        profile_id: "customer-a",
        display_name: "Published self promotion",
        published: true,
      }),
    );
  });

  it("allows artists and admins to create legitimate artist profiles", async () => {
    const artistA = userDb("artist-a");
    const adminA = userDb("admin-a");

    await assertSucceeds(
      setDoc(doc(artistA, "artists/artist-a-draft"), {
        profile_id: "artist-a",
        display_name: "Artist draft",
        published: false,
      }),
    );
    await assertSucceeds(
      setDoc(doc(adminA, "artists/admin-created-artist"), {
        profile_id: "artist-b",
        display_name: "Admin created artist",
        published: true,
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

  it("blocks customers from creating or publishing portfolio items", async () => {
    const customerA = userDb("customer-a");

    await assertFails(
      setDoc(doc(customerA, "portfolio_items/customer-a-draft"), {
        artist_id: "customer-a",
        title: "Self promoted portfolio item",
        published: false,
      }),
    );
    await assertFails(
      setDoc(doc(customerA, "portfolio_items/customer-a-published"), {
        artist_id: "customer-a",
        title: "Published self promoted item",
        published: true,
      }),
    );
  });

  it("allows artists and admins to create legitimate portfolio items", async () => {
    const artistA = userDb("artist-a");
    const adminA = userDb("admin-a");

    await assertSucceeds(
      setDoc(doc(artistA, "portfolio_items/artist-a-new-item"), {
        artist_id: "artist-a",
        title: "Artist owned portfolio item",
        published: true,
      }),
    );
    await assertSucceeds(
      setDoc(doc(adminA, "portfolio_items/admin-created-item"), {
        artist_id: "artist-b",
        title: "Admin created portfolio item",
        published: true,
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

  it("blocks appointment creation when quote, customer, or artist consistency does not match", async () => {
    const artistA = userDb("artist-a");

    await assertFails(
      setDoc(doc(artistA, "appointments/mismatched-customer"), {
        customer_id: "customer-b",
        artist_id: "artist-a",
        quote_id: "quote-a",
        status: "scheduled",
      }),
    );
    await assertFails(
      setDoc(doc(artistA, "appointments/mismatched-artist"), {
        customer_id: "customer-a",
        artist_id: "artist-b",
        quote_id: "quote-a",
        status: "scheduled",
      }),
    );
    await assertSucceeds(
      setDoc(doc(artistA, "appointments/valid-appointment"), {
        customer_id: "customer-a",
        artist_id: "artist-a",
        quote_id: "quote-a",
        status: "scheduled",
      }),
    );
  });

  it("keeps contact leads admin-only and validates admin payloads", async () => {
    const customerA = userDb("customer-a");
    const adminA = userDb("admin-a");

    await assertFails(getDoc(doc(customerA, "contact_leads/lead-a")));
    await assertFails(
      setDoc(doc(customerA, "contact_leads/lead-a"), {
        full_name: "Customer A",
        message: "I want a tattoo",
        status: "new",
      }),
    );
    await assertFails(
      setDoc(doc(adminA, "contact_leads/bad-lead"), {
        full_name: "Lead",
        status: "owned",
      }),
    );
    await assertFails(setDoc(doc(adminA, "contact_leads/empty-lead"), { status: "new" }));
    await assertSucceeds(
      setDoc(doc(adminA, "contact_leads/valid-lead"), {
        full_name: "Lead",
        message: "I want a tattoo",
        status: "new",
      }),
    );
  });
});

describe("Storage public content write rules", () => {
  it("blocks customers from uploading artist profile or portfolio assets", async () => {
    await assertFails(
      uploadBytes(
        ref(userStorage("customer-a"), "artist-profiles/customer-a/avatar.png"),
        pngBlob(),
        {
          contentType: "image/png",
        },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(userStorage("customer-a"), "portfolio/customer-a/customer-item/reference.png"),
        pngBlob(),
        { contentType: "image/png" },
      ),
    );
  });

  it("allows artists and admins to upload legitimate public content assets", async () => {
    await assertSucceeds(
      uploadBytes(ref(userStorage("artist-a"), "artist-profiles/artist-a/avatar.png"), pngBlob(), {
        contentType: "image/png",
      }),
    );
    await assertSucceeds(
      uploadBytes(
        ref(userStorage("artist-a"), "portfolio/artist-a/published-item/reference.png"),
        pngBlob(),
        { contentType: "image/png" },
      ),
    );
    await assertSucceeds(
      uploadBytes(ref(userStorage("admin-a"), "artist-profiles/artist-b/avatar.png"), pngBlob(), {
        contentType: "image/png",
      }),
    );
    await assertSucceeds(
      uploadBytes(
        ref(userStorage("admin-a"), "portfolio/artist-b/artist-b-item/reference.png"),
        pngBlob(),
        { contentType: "image/png" },
      ),
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

    await assertSucceeds(uploadBytes(ownerFile, pngBlob(), quoteImageMetadata()));

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
        quoteImageMetadata("customer-b", "quote-b"),
      ),
    );
  });

  it("blocks private quote image uploads with unsafe MIME type, oversize, or mismatched metadata", async () => {
    await assertFails(
      uploadBytes(
        ref(userStorage("customer-a"), "quote-images/customer-a/quote-a/reference.txt"),
        textBlob(),
        {
          contentType: "text/plain",
          customMetadata: {
            customer_id: "customer-a",
            quote_id: "quote-a",
          },
        },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(userStorage("customer-a"), "quote-images/customer-a/quote-a/too-large.png"),
        oversizedPngBlob(),
        quoteImageMetadata(),
      ),
    );
    await assertFails(
      uploadBytes(
        ref(userStorage("customer-a"), "quote-images/customer-a/quote-a/wrong-metadata.png"),
        pngBlob(),
        quoteImageMetadata("customer-a", "quote-b"),
      ),
    );
  });
});
