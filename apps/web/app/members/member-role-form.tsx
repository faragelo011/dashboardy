"use client";

type Props = {
  workspaceId: string;
  membershipId: string;
  email: string;
  role: string;
  disabled?: boolean;
  roleOptions: readonly (readonly [value: string, label: string, description: string])[];
  action: (formData: FormData) => void | Promise<void>;
};

export function MemberRoleForm({
  workspaceId,
  membershipId,
  email,
  role,
  disabled,
  roleOptions,
  action,
}: Props) {
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="membership_id" value={membershipId} />
      <label className="sr-only" htmlFor={`role-${membershipId}`}>
        Role for {email}
      </label>
      <select
        id={`role-${membershipId}`}
        name="role"
        defaultValue={role}
        className="ds-select ds-select--sm min-w-[9.5rem]"
        disabled={disabled}
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {roleOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="ds-btn ds-btn-ghost ds-btn--sm" disabled={disabled}>
          Apply
        </button>
      </noscript>
    </form>
  );
}
