import { notFound } from "next/navigation";
import { authMode, internalConfig } from "../../lib/auth/internal-config";

export const dynamic = "force-dynamic";
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (authMode() !== "internal") notFound();
  let available = false;
  try {
    internalConfig();
    available = true;
  } catch {}
  const failed = (await searchParams).error === "credentials";
  return (
    <main className="gate">
      <div className="brand">
        FA <span>FinancialAgent</span>
      </div>
      <h1>Pioneer sign-in</h1>
      {!available ? (
        <p role="alert">Sign-in is unavailable. Contact your administrator.</p>
      ) : (
        <>
          <p>Use your assigned FinanceAgent account.</p>
          {failed && <p role="alert">Invalid username or password.</p>}
          <form action="/auth/session" method="post">
            <p>
              <label htmlFor="username">Username</label>
              <br />
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                maxLength={100}
                autoCapitalize="none"
                spellCheck={false}
              />
            </p>
            <p>
              <label htmlFor="password">Password</label>
              <br />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
              />
            </p>
            <button type="submit">Sign in</button>
          </form>
        </>
      )}
    </main>
  );
}
