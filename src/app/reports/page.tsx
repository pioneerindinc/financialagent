import { headers, cookies } from "next/headers";
import { requestHumanSession } from "../../lib/auth/request";
import { RepairAllocationReport } from "../../components/repair-allocation-report";

export default async function Page() {
  const actor = await requestHumanSession(await cookies(), await headers()).catch(() => null);
  if (!actor) return <main><h1>Sign-in required</h1><p>Management reporting requires an authenticated finance identity.</p></main>;
  if (!actor.companies.includes("pioneer-industries") || !actor.scopes.includes("finance:read"))
    return <main><h1>Access denied</h1><p>Pioneer finance read access is required.</p></main>;
  return <RepairAllocationReport company="pioneer-industries"/>;
}
