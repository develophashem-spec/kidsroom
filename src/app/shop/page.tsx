import type { Metadata } from "next";
import { CatalogPage } from "@/components/catalog";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Browse men's and women's clothing, shoes and accessories. Filter by size, colour, fit and price.",
};

export default function ShopPage(props: PageProps<"/shop">) {
  return <CatalogPage basePath="/shop" searchParams={props.searchParams} />;
}
