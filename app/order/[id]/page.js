import { notFound } from "next/navigation";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Order from "@/models/Order";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await dbConnect();
  const o = await Order.findById(id).lean();
  if (!o) notFound();
  return (
    <>
      <h1>🎉 Thank you, {o.customer.name}!</h1>
      <p>Order <code>{String(o._id)}</code> — status: <strong>{o.status}</strong></p>
      <ul>
        {o.items.map((i, n) => <li key={n}>{i.quantity} × {i.name} (size {i.size}) – ${(i.price * i.quantity).toFixed(2)}</li>)}
      </ul>
      <h3>Total: ${o.total.toFixed(2)}</h3>
    </>
  );
}
