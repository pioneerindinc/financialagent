import { expect, it } from "vitest";
import { accountHierarchy } from "../src/lib/account-hierarchy";
it("groups children under parents while retaining code-sorted sibling input", () => {
  const accounts = [
    { _id: "child", parentId: "root" },
    { _id: "root" },
    { _id: "other" },
  ];
  expect(
    accountHierarchy(accounts).map((row) => [row.account._id, row.depth]),
  ).toEqual([
    ["root", 0],
    ["child", 1],
    ["other", 0],
  ]);
});
it("keeps malformed legacy cycles and orphan accounts visible once", () => {
  const accounts = [
    { _id: "a", parentId: "b" },
    { _id: "b", parentId: "a" },
    { _id: "orphan", parentId: "missing" },
  ];
  expect(
    new Set(accountHierarchy(accounts).map((row) => row.account._id)).size,
  ).toBe(3);
  expect(accountHierarchy(accounts)).toHaveLength(3);
});
