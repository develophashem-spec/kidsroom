import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";

export const USER_ROLES = ["customer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserAttrs {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRecord = UserAttrs & { _id: Types.ObjectId };

// Indexes are created explicitly by `ensureIndexes()` in `@/lib/db` (autoIndex is off on
// purpose so a database that is down at import time can never poison model initialisation).
const userSchema = new Schema<UserAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "customer", required: true },
  },
  { timestamps: true, autoIndex: false, autoCreate: false },
);

export const User: Model<UserAttrs> =
  (models.User as Model<UserAttrs> | undefined) ?? model<UserAttrs>("User", userSchema);
