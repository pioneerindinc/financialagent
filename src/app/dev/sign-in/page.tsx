import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { allowDevelopmentRequest } from "../../../lib/development/config";
export default async function Page() {
  try {
    allowDevelopmentRequest(await headers());
  } catch {
    notFound();
  }
  return (
    <main className="gate">
      <p className="eyebrow">DEVELOPMENT ONLY</p>
      <h1>Local FinancialAgent Session</h1>
      <p>Not Pioneer Production Authentication</p>
      <p>
        Sign in to the isolated financialagent_dev database as Local Finance
        Developer. This operator can read and write accounting records for the
        four local companies.
      </p>
      <form action="/dev/session" method="post">
        <button>Sign in as Local Finance Developer</button>
      </form>
    </main>
  );
}
