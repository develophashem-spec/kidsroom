import Link from "next/link";
import dbConnect from "@/lib/db";
import Product from "@/models/Product";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products = [];
  try {
    await dbConnect();
    products = JSON.parse(JSON.stringify(await Product.find().sort({ createdAt: -1 }).limit(4)));
  } catch {}
  return (
    <>
      <section className="hero">
        <h1>Stylish fashion for little ones 🌈</h1>
        <p>Order online and find the perfect fit for every age.</p>
        <Link href="/products" className="btn">Shop now</Link>
      </section>
      <h2>New arrivals</h2>
      <div className="grid">{products.map((p) => <ProductCard key={p._id} p={p} />)}</div>
    </>
  );
}
