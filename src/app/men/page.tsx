import type { Metadata } from "next";
import { CatalogPage } from "@/components/catalog";

export const metadata: Metadata = {
  title: "Men",
  description: "Men's shirts, tees, denim, knitwear, jackets and shoes – with a size finder to get the fit right.",
};

export default function MenPage(props: PageProps<"/men">) {
  return <CatalogPage department="men" basePath="/men" searchParams={props.searchParams} />;
}
