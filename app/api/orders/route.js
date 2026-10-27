import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Product from "@/models/Product";
import Order from "@/models/Order";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const c = body?.customer || {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const customer = { name: str(c.name), email: str(c.email), phone: str(c.phone), address: str(c.address) };
  if (!customer.name || !customer.email || !customer.address) {
    return NextResponse.json({ error: "Name, email and address are required" }, { status: 400 });
  }
  if (!Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  await dbConnect();
  const items = [];
  const reserved = [];
  let total = 0;
  const rollback = () => Promise.all(reserved.map((r) => Product.updateOne({ _id: r.id }, { $inc: { stock: r.qty } })));
  for (const it of body.items) {
    const qty = Number(it.quantity);
    if (!mongoose.isValidObjectId(it.product) || !Number.isInteger(qty) || qty < 1) {
      await rollback();
      return NextResponse.json({ error: "Invalid item" }, { status: 400 });
    }
    const p = await Product.findOneAndUpdate(
      { _id: it.product, sizes: str(it.size), stock: { $gte: qty } },
      { $inc: { stock: -qty } }
    );
    if (!p) {
      await rollback();
      return NextResponse.json({ error: "An item is unavailable in that size/quantity" }, { status: 409 });
    }
    reserved.push({ id: p._id, qty });
    items.push({ product: p._id, name: p.name, size: str(it.size), price: p.price, quantity: qty });
    total += p.price * qty;
  }
  const order = await Order.create({ customer, items, total: Math.round(total * 100) / 100 });
  return NextResponse.json(order, { status: 201 });
}
