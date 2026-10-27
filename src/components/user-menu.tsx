import Link from "next/link";
import { UserIcon } from "@/components/icons";
import { getOptionalUser } from "@/lib/auth/current-user";

const iconLink =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-medium hover:bg-line/70";

/** Reads the session cookie, so it is always rendered inside a <Suspense> boundary. */
export async function UserMenu() {
  const user = await getOptionalUser();

  if (!user) {
    return (
      <Link href="/login" className={iconLink}>
        <UserIcon width={22} height={22} />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const firstName = user.name.split(" ")[0];
  return (
    <>
      {user.role === "admin" ? (
        <Link href="/admin" className={`${iconLink} hidden md:inline-flex`}>
          Admin
        </Link>
      ) : null}
      <Link href="/account" className={iconLink} aria-label={`Your account (${user.name})`}>
        <UserIcon width={22} height={22} />
        <span className="hidden max-w-24 truncate sm:inline">{firstName}</span>
      </Link>
    </>
  );
}

export function UserMenuFallback() {
  return <span aria-hidden="true" className="inline-block h-10 w-10" />;
}
