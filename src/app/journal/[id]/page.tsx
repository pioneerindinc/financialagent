import { FinancePage } from "../../../components/finance-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <FinancePage view="detail" journalId={(await params).id} />;
}
