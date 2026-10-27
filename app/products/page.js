import Link from "next/link";
import dbConnect from "@/lib/db";
import Product from "@/models/Product";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";
const CATS = ["girls", "boys", "baby", "accessories"];

export default async function Products({ searchParams }) {
  const { category } = await searchParams;
  const filter = CATS.includes(category) ? { category } : {};
  await dbConnect();
  const products = JSON.parse(JSON.stringify(await Product.find(filter).sort({ name: 1 })));
  return (
    <>
      <h1>Shop</h1>
      <div className="filters">
        <Link href="/products" className={`chip ${!filter.category ? "active" : ""}`}>All</Link>
        {CATS.map((c) => (
          <Link key={c} href={`/products?category=${c}`} className={`chip ${category === c ? "active" : ""}`}>{c}</Link>
        ))}
      </div>
      <div className="grid">{products.map((p) => <ProductCard key={p._id} p={p} />)}</div>
      {products.length === 0 && <p>No products yet. Run <code>npm run seed</code>.</p>}
    </>
  );
}
