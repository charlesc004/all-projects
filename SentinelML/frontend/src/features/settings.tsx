"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, KeyRound, Copy } from "lucide-react";
import { toast } from "sonner";
import { api, setCSRF, timestamp } from "@/lib/api";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge, Drawer, ErrorState, Skeleton } from "@/components/ui/shared";

const profileSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email(),
  current_password: z.string(),
  password: z
    .string()
    .refine(
      (value) => !value || value.length >= 12,
      "Use at least 12 characters",
    ),
  alerts: z.boolean(),
});
function ProfileForm({ profile }: { profile: User }) {
  const client = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name,
      email: profile.email,
      current_password: "",
      password: "",
      alerts: profile.notification_preferences?.alerts ?? true,
    },
  });
  return (
    <form
      className="detail-content"
      onSubmit={handleSubmit(async (values) => {
        try {
          const result = await api<{ user: User; csrf_token: string }>(
            "/profile",
            {
              method: "PATCH",
              body: JSON.stringify({
                name: values.name,
                ...(values.email !== profile.email
                  ? { email: values.email }
                  : {}),
                ...(values.password ? { password: values.password } : {}),
                current_password: values.current_password,
                notification_preferences: { alerts: values.alerts },
              }),
            },
          );
          setCSRF(result.csrf_token);
          await client.invalidateQueries();
          toast.success("Profile updated");
        } catch (error) {
          toast.error((error as Error).message);
        }
      })}
    >
      <label>
        Full name
        <input autoComplete="name" {...register("name")} />
      </label>
      <label>
        Work email
        <input type="email" autoComplete="email" {...register("email")} />
      </label>
      <div className="form-grid">
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            {...register("current_password")}
          />
        </label>
        <label>
          New password (optional)
          <input
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
        </label>
      </div>
      <p className="muted">
        Changing your email or password requires your current password. A
        password change revokes other sessions.
      </p>
      <label className="checkbox-label">
        <input type="checkbox" {...register("alerts")} />
        Receive in-app fraud alert notifications
      </label>
      {Object.entries(errors).map(([field, error]) => (
        <p key={field} className="field-error">
          {error.message}
        </p>
      ))}
      <Button disabled={isSubmitting}>Save profile</Button>
    </form>
  );
}
function OrganizationForm({
  profile,
  retention,
}: {
  profile: User;
  retention: number;
}) {
  const client = useQueryClient();
  const [name, setName] = useState(profile.organization.name);
  const [days, setDays] = useState(retention);
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="detail-content"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          await api("/organization", {
            method: "PATCH",
            body: JSON.stringify({ name, retention_days: days }),
          });
          await client.invalidateQueries();
          toast.success("Organization updated");
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setSaving(false);
        }
      }}
    >
      <label>
        Organization name
        <input
          required
          minLength={2}
          maxLength={120}
          disabled={profile.role !== "admin"}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Retain closed transaction records for (days)
        <input
          type="number"
          min={7}
          max={3650}
          required
          disabled={profile.role !== "admin"}
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        />
      </label>
      <p className="muted">
        Scheduled retention removes eligible closed records across all three
        services in batches. Open investigations are held. Audit records are
        retained.
      </p>
      {profile.role === "admin" && (
        <Button disabled={saving}>Save organization settings</Button>
      )}
    </form>
  );
}
const memberSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email(),
  role: z.enum(["admin", "analyst", "risk_manager", "viewer"]),
  password: z.string().min(12),
});
function Members({ users, admin }: { users: User[]; admin: boolean }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: { role: "analyst" },
  });
  async function update(user: User, values: Record<string, unknown>) {
    if (
      !window.confirm(
        `Update access for ${user.name}? Active sessions may be revoked.`,
      )
    )
      return;
    try {
      await api(`/members/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      await client.invalidateQueries();
      toast.success("Member access updated");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }
  return (
    <section className="panel settings-users">
      <div className="panel-heading">
        <div>
          <h2>Users & permissions</h2>
          <p>Organization-scoped access, enforced by the control plane.</p>
        </div>
        {admin && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} />
            Add member
          </Button>
        )}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                </td>
                <td>{user.email}</td>
                <td>
                  {admin ? (
                    <select
                      aria-label={`Role for ${user.name}`}
                      value={user.role}
                      onChange={(event) =>
                        update(user, { role: event.target.value })
                      }
                    >
                      {["admin", "analyst", "risk_manager", "viewer"].map(
                        (role) => (
                          <option key={role} value={role}>
                            {role.replaceAll("_", " ")}
                          </option>
                        ),
                      )}
                    </select>
                  ) : (
                    <Badge value={user.role} />
                  )}
                </td>
                <td>
                  <Badge value={user.disabled ? "disabled" : "active"} />
                </td>
                <td>
                  {admin && (
                    <Button
                      variant="ghost"
                      onClick={() => update(user, { disabled: !user.disabled })}
                    >
                      {user.disabled ? "Enable" : "Disable"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer
        title="Add organization member"
        open={open}
        onClose={() => setOpen(false)}
      >
        <form
          className="detail-content"
          onSubmit={handleSubmit(async (values) => {
            try {
              await api("/members", {
                method: "POST",
                body: JSON.stringify(values),
              });
              toast.success("Member created");
              reset();
              setOpen(false);
              await client.invalidateQueries({ queryKey: ["settings"] });
            } catch (error) {
              toast.error((error as Error).message);
            }
          })}
        >
          <label>
            Full name
            <input {...register("name")} />
          </label>
          <label>
            Work email
            <input type="email" {...register("email")} />
          </label>
          <label>
            Role
            <select {...register("role")}>
              {["admin", "analyst", "risk_manager", "viewer"].map((role) => (
                <option key={role} value={role}>
                  {role.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Initial password
            <input
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
          </label>
          <p className="muted">
            Share the initial password through your organization’s approved
            secure channel. No email is sent.
          </p>
          {Object.entries(errors).map(([field, error]) => (
            <p className="field-error" key={field}>
              {error.message}
            </p>
          ))}
          <Button disabled={isSubmitting}>Create member</Button>
        </form>
      </Drawer>
    </section>
  );
}
type Credential = {
  id: string;
  name: string;
  prefix: string;
  revoked: boolean;
  created_at: string;
};
function Credentials() {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const query = useQuery({
    queryKey: ["credentials"],
    queryFn: () => api<{ items: Credential[] }>("/credentials"),
  });
  async function create(rotate?: Credential) {
    if (
      rotate &&
      !window.confirm(
        `Rotate ${rotate.name}? Its existing key will stop working immediately.`,
      )
    )
      return;
    setSaving(true);
    try {
      const result = await api<{ credential: string }>("/credentials", {
        method: "POST",
        body: JSON.stringify({
          name: rotate ? rotate.name : name,
          ...(rotate ? { rotate_id: rotate.id } : {}),
        }),
      });
      setSecret(result.credential);
      setName("");
      await client.invalidateQueries({ queryKey: ["credentials"] });
      toast.success(rotate ? "Credential rotated" : "Credential created");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel settings-users">
      <div className="panel-heading">
        <div>
          <h2>
            <KeyRound size={16} /> Ingestion credentials
          </h2>
          <p>Secrets are shown once; only their hashes are stored.</p>
        </div>
      </div>
      <form
        className="credential-create"
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <label>
          Integration name
          <input
            required
            minLength={3}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Commerce integration"
          />
        </label>
        <Button disabled={saving}>
          <Plus size={15} />
          Create API key
        </Button>
      </form>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Integration</th>
                <th>Key prefix</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((key) => (
                <tr key={key.id}>
                  <td>
                    <strong>{key.name}</strong>
                  </td>
                  <td className="mono">{key.prefix}…</td>
                  <td>
                    <Badge value={key.revoked ? "revoked" : "active"} />
                  </td>
                  <td>{timestamp(key.created_at)}</td>
                  <td>
                    {!key.revoked &&
                      (key.prefix === "synthetic-demo" ? (
                        <small>Managed by demo environment</small>
                      ) : (
                        <div className="policy-actions">
                          <Button
                            variant="outline"
                            disabled={saving}
                            onClick={() => create(key)}
                          >
                            Rotate
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Revoke ${key.name}? Clients using it will lose ingestion access.`,
                                )
                              )
                                return;
                              try {
                                await api(`/credentials/${key.id}`, {
                                  method: "PATCH",
                                  body: "{}",
                                });
                                await client.invalidateQueries({
                                  queryKey: ["credentials"],
                                });
                                toast.success("Credential revoked");
                              } catch (error) {
                                toast.error((error as Error).message);
                              }
                            }}
                          >
                            Revoke
                          </Button>
                        </div>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Drawer
        title="Save your API credential"
        open={!!secret}
        onClose={() => setSecret("")}
      >
        <div className="detail-content">
          <p>
            This credential is shown only once. Store it securely before closing
            this panel.
          </p>
          <label>
            New API key
            <textarea
              aria-label="New API key"
              readOnly
              rows={3}
              value={secret}
            />
          </label>
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(secret);
                toast.success("Credential copied");
              } catch {
                toast.error(
                  "Clipboard unavailable; copy the credential manually.",
                );
              }
            }}
          >
            <Copy size={15} />
            Copy credential
          </Button>
        </div>
      </Drawer>
    </section>
  );
}
export function SettingsScreen() {
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () =>
      api<{ profile: User; users: User[]; retention_days: number }>(
        "/settings",
      ),
  });
  if (query.isPending) return <Skeleton />;
  if (query.error) return <ErrorState error={query.error} />;
  const data = query.data;
  return (
    <div className="settings-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Profile & security</h2>
            <p>Keep your identity, password, and notifications up to date.</p>
          </div>
        </div>
        <ProfileForm key={data.profile.id} profile={data.profile} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Organization preferences</h2>
            <p>UTC timestamps · tokenized transaction data only.</p>
          </div>
        </div>
        <OrganizationForm
          profile={data.profile}
          retention={data.retention_days}
        />
      </section>
      <Members users={data.users} admin={data.profile.role === "admin"} />
      {data.profile.role === "admin" && <Credentials />}
    </div>
  );
}
