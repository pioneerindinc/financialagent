export function accountHierarchy<T extends { _id: string; parentId?: string }>(
  accounts: T[],
) {
  const ids = new Set(accounts.map((account) => account._id));
  const visited = new Set<string>();
  const result: { account: T; depth: number }[] = [];
  const children = new Map<string | undefined, T[]>();
  for (const account of accounts) {
    const parent =
      account.parentId && ids.has(account.parentId)
        ? account.parentId
        : undefined;
    children.set(parent, [...(children.get(parent) || []), account]);
  }
  function visit(account: T, depth: number) {
    if (visited.has(account._id)) return;
    visited.add(account._id);
    result.push({ account, depth });
    for (const child of children.get(account._id) || [])
      visit(child, depth + 1);
  }
  for (const root of children.get(undefined) || []) visit(root, 0);
  // Malformed legacy cycles must not hide accounts or hang the UI.
  for (const account of accounts) visit(account, 0);
  return result;
}
