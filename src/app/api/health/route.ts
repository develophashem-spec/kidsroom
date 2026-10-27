import mongoose from "mongoose";
import { jsonOk, withApi } from "@/lib/api";
import { connectDB } from "@/lib/db";

/** Liveness + database connectivity probe (503 when MongoDB is unreachable). */
export const GET = withApi(async () => {
  await connectDB();
  await mongoose.connection.db?.admin().ping();
  return jsonOk({ status: "ok", database: "up" });
});
