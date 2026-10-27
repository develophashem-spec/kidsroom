import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/Product";

export async function GET(req) {
  await dbConnect();
  const category = new URL(req.url).searchParams.get("category");
  const products = await Product.find(category ? { category: String(category) } : {});
  return NextResponse.json(products);
}

export async function POST(req) {
  if (!process.env.ADMIN_KEY || req.headers.get("x-admin-key") !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();
  try {
    const { name, description, price, category, emoji, sizes, stock } = await req.json();
    const p = await Product.create({ name, description, price, category, emoji, sizes, stock });
    return NextResponse.json(p, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
