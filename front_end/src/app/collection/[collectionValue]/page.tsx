import { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import BreadcrumbSchema, { BreadcrumbItem } from "@/components/SEO/BreadcrumbSchema";
import ItemListSchema, { ItemListItem } from "@/components/SEO/ItemListSchema";
import CollectionBundle from "@/components/collection/CollectionBundle";
import { fetchCollectionBundleItems, fetchShopCollection } from "@/lib/shop-collections";

interface CollectionPageProps {
  params: Promise<{ collectionValue: string }>;
}

const SITE_URL = "https://voxcina.com";

/** The route param is a collection id; anything else is a stale season URL. */
async function getCollection(collectionValue: string) {
  return fetchShopCollection(decodeURIComponent(collectionValue));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { collectionValue } = await params;
  const collection = await getCollection(collectionValue);

  // Unknown id (or a legacy season path): the page redirects to /collection,
  // so point the metadata there instead of describing a page that never renders.
  if (!collection) {
    return { title: "کالکشن‌ها", alternates: { canonical: `${SITE_URL}/collection` } };
  }

  const canonicalUrl = `${SITE_URL}/collection/${collection.id}`;
  const description =
    collection.description || `مجموعه ${collection.title} از فروشگاه آنلاین ${APP_NAME}`;

  return {
    title: `کالکشن ${collection.title}`,
    description,
    keywords: [collection.title, "کالکشن", "ست لباس", "خرید آنلاین", "وکسینا"],
    openGraph: {
      title: `کالکشن ${collection.title} | ${APP_NAME}`,
      description,
      locale: "fa_IR",
      type: "website",
      url: canonicalUrl,
      images: collection.images?.[0] ? [{ url: collection.images[0] }] : undefined,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "fa-IR": canonicalUrl,
        "x-default": canonicalUrl,
      },
    },
  };
}

/**
 * Single Collection Page — Server Component.
 *
 * The buying side of a curated collection: the set is presented with its own
 * image and price, and every piece is listed with the size inventory of the
 * exact color the admin picked, so the whole set goes into the cart in one
 * action with a size chosen per piece.
 *
 * The route used to take a season name; those paths (and any unknown or
 * unpublished id) redirect to /collection.
 */
export default async function CollectionPage({ params }: CollectionPageProps) {
  const { collectionValue } = await params;
  const collection = await getCollection(collectionValue);

  if (!collection) redirect("/collection");

  const items = await fetchCollectionBundleItems(collection);

  const title = `کالکشن ${collection.title}`;
  const tagline = collection.description || `مجموعه ${collection.title}`;

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: "خانه", url: "/" },
    { name: "کالکشن‌ها", url: "/collection" },
    { name: collection.title, url: `/collection/${collection.id}` },
  ];

  const itemListItems: ItemListItem[] = items.map((item) => ({
    name: item.name,
    url: item.link,
    image: item.image || "",
  }));

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />

      {itemListItems.length > 0 && (
        <ItemListSchema
          listName={title}
          description={tagline}
          listUrl={`/collection/${collection.id}`}
          items={itemListItems}
        />
      )}

      <CollectionBundle collection={collection} items={items} />
    </>
  );
}
