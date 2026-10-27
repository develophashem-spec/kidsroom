import "server-only";
import { ApiError } from "@/lib/api";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/auth/password";
import { connectDB } from "@/lib/db";
import { isDuplicateKeyError } from "@/lib/mongo-errors";
import type { SessionUser } from "@/lib/types";
import type { LoginInput, RegisterInput } from "@/lib/validation";
import { User } from "@/models";

const toSessionUser = (user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: "customer" | "admin";
}): SessionUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
});

/** Creates a customer account. Admins are only ever created by the seed script. */
export async function registerUser(input: RegisterInput): Promise<SessionUser> {
  await connectDB();
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "customer",
    });
    return toSessionUser(user);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, "An account with this email already exists");
    }
    throw error;
  }
}

/** Verifies credentials. Always answers with the same message so emails cannot be probed. */
export async function authenticate(input: LoginInput): Promise<SessionUser> {
  await connectDB();
  const user = await User.findOne({ email: input.email }).select("+passwordHash").lean();
  if (!user) {
    await burnPasswordCheck(input.password);
    throw new ApiError(401, "Invalid email or password");
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw new ApiError(401, "Invalid email or password");
  }
  return toSessionUser(user);
}
