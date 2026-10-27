import { notFound } from "next/navigation";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Product from "@/models/Product";
import AddToCart from "@/components/AddToCart";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await dbConnect();
  const doc = await Product.findById(id);
  if (!doc) notFound();
  const p = JSON.parse(JSON.stringify(doc));
  return (
    <div className="detail">
      <div className="emoji">{p.emoji}</div>
      <div>
        <h1>{p.name}</h1>
        <p className="price">${p.price.toFixed(2)}</p>
        <p>{p.description}</p>
        <AddToCart product={p} />
      </div>
    </div>
  );
}
