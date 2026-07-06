import { getPublicShopProducts, type ShopProduct } from "./catalog";
import { listPublicFirestoreProductsResult } from "./product";
import type { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

type FirestoreLike = NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;

export type PublicShopProductsResult = {
  products: ShopProduct[];
  source: "firestore" | "fallback";
};

export async function getPublicShopProductsWithFirestoreFallback(firestore?: FirestoreLike | null) {
  const firestoreProducts = await listPublicFirestoreProductsResult(firestore);

  return firestoreProducts.ok
    ? ({
        products: firestoreProducts.products,
        source: "firestore",
      } satisfies PublicShopProductsResult)
    : ({
        products: getPublicShopProducts(),
        source: "fallback",
      } satisfies PublicShopProductsResult);
}
