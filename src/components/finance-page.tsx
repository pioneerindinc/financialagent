import { cookies, headers } from "next/headers";
import Link from "next/link";
import { requestHumanSession } from "../lib/auth/request";
import { allowDevelopmentRequest } from "../lib/development/config";
import { FinanceConsole } from "./finance-console";
import { authMode } from "../lib/auth/internal-config";
export async function FinancePage({
  view,
  journalId,
}: {
  view: string;
  journalId?: string;
}) {
  const requestHeaders = await headers();
  const actor = await requestHumanSession(
    await cookies(),
    requestHeaders,
  ).catch(() => null);
  let developmentAvailable = false;
  try {
    allowDevelopmentRequest(requestHeaders);
    developmentAvailable = true;
  } catch {}
  if (!actor) {
    return (
      <main className="gate">
        <div className="brand">
          FA <span>FinancialAgent</span>
        </div>
        <p className="eyebrow">PRIVATE FINANCE WORKSPACE</p>
        <h1>Sign-in required</h1>
        <p>
          Access requires authorization and an explicit company
          assignment.
        </p>
        {authMode() === "internal" ? (
          <p>
            <a className="button" href="/sign-in">Sign in</a>
          </p>
        ) : (
          <p>
            Your administrator must configure the identity-provider session
            bridge before this workspace can be opened.
          </p>
        )}
        <small>No financial data is available without authentication.</small>
        {developmentAvailable && (
          <p>
            <Link href="/dev/sign-in">Development-only sign-in →</Link>
          </p>
        )}
      </main>
    );
  }
  return (
    <>
      {actor.session === "development" && (
        <div className="development-banner" role="status">
          <strong>Development Session · Local Finance Developer</strong>
          <span>
            financialagent_dev · Not Pioneer Production Authentication
          </span>
          <form action="/dev/session" method="post">
            <input type="hidden" name="action" value="logout" />
            <button>End development session</button>
          </form>
        </div>
      )}

      <FinanceConsole
        view={view}
        journalId={journalId}
        companyIds={actor.companies}
        canWrite={actor.scopes.includes("finance:write")}
        showSignOut={
          actor.session !== "development" && authMode() === "internal"
        }
      />
    </>
  );
}
