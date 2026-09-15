"use client";
import { useState } from "react";

export function AccountGovernance({
  control = false,
  manual = true,
}: {
  control?: boolean;
  manual?: boolean;
}) {
  const [controlAccount, setControl] = useState(control);
  const [allowManualPosting, setManual] = useState(manual);
  return (
    <>
      <label>
        <input
          name="controlAccount"
          type="checkbox"
          checked={controlAccount}
          onChange={(e) => {
            setControl(e.target.checked);
            if (e.target.checked) setManual(false);
          }}
        />{" "}
        Control account
      </label>
      <label>
        <input
          name="allowManualPosting"
          type="checkbox"
          checked={allowManualPosting}
          onChange={(e) => setManual(e.target.checked)}
        />{" "}
        Allow manual posting
      </label>
    </>
  );
}

type EditableAccount = {
  _id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  active: boolean;
  parentId?: string;
  controlAccount?: boolean;
  allowManualPosting?: boolean;
  revision?: number;
};
export function AccountEditor({
  account,
  accounts,
  companyName,
  busy,
  save,
  cancel,
}: {
  account: EditableAccount;
  accounts: EditableAccount[];
  companyName: string;
  busy: boolean;
  save: (data: Record<string, unknown>, reason: string) => Promise<void>;
  cancel: () => void;
}) {
  return (
    <section>
      <h2>
        Edit account {account.code} · {companyName}
      </h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await save(
            {
              name: f.get("name"),
              subtype: f.get("subtype"),
              parentId: f.get("parentId") || null,
              active: f.has("active"),
              controlAccount: f.has("controlAccount"),
              allowManualPosting: f.has("allowManualPosting"),
            },
            String(f.get("reason")),
          );
        }}
      >
        <label>
          Name
          <input name="name" required defaultValue={account.name} />
        </label>
        <label>
          Subtype
          <input name="subtype" defaultValue={account.subtype} />
        </label>
        <label>
          Parent account
          <select name="parentId" defaultValue={account.parentId || ""}>
            <option value="">No parent</option>
            {accounts
              .filter((a) => a._id !== account._id && a.type === account.type)
              .map((a) => (
                <option key={a._id} value={a._id}>
                  {a.code} · {a.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            name="active"
            defaultChecked={account.active}
          />{" "}
          Active account
        </label>
        <AccountGovernance
          control={account.controlAccount === true}
          manual={account.allowManualPosting !== false}
        />
        <label>
          Change reason
          <input name="reason" required maxLength={500} />
        </label>
        <button disabled={busy}>Save account</button>
        <button type="button" disabled={busy} onClick={cancel}>
          Cancel edit
        </button>
      </form>
    </section>
  );
}
