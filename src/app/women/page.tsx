import type { Metadata } from "next";
import { CatalogPage } from "@/components/catalog";

export const metadata: Metadata = {
  title: "Women",
  description: "Women's dresses, tops, denim, knitwear, jackets and shoes – with a size finder to get the fit right.",
};

export default function WomenPage(props: PageProps<"/women">) {
  return <CatalogPage department="women" basePath="/women" searchParams={props.searchParams} />;
}
