import { useEffect, useState } from "react";
import api from "../../api";
import { ROLES } from "../../constants/roles";
import { Input, Button, Select, Card, CardContent } from "../ui";

const ROLE_OPTIONS = [
  { value: ROLES.AGENCY_BROKER, label: "Agency / Broker" },
  { value: ROLES.PRIVATE_LANDLORD, label: "Private landlord" },
  { value: ROLES.PREMIUM_BUYER, label: "Premium buyer" },
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.STANDARD_USER, label: "Standard user" }
];

function InviteLinkBox({ url, email, emailSent, mailError }) {
  if (!url) return null;
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
      {emailSent ? (
        <p className="font-medium text-success">
          Invite email sent to {email || "the user"} from hello@mmizan.com (link valid 72 hours).
        </p>
      ) : (
        <p className="font-medium text-brand-deep">
          Email could not be sent{mailError ? `: ${mailError}` : ""}. Copy the link below for{" "}
          {email || "the user"} (valid 72 hours):
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="block max-w-full break-all rounded-lg bg-white px-3 py-2 text-xs text-brand-deep">{url}</code>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigator.clipboard?.writeText(url)}
        >
          Copy link
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        The email contains a &quot;Set your password&quot; button. They sign in and land in their dashboard — no public registration needed.
      </p>
    </div>
  );
}

export default function AdminUsersWidget() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [inviteMailError, setInviteMailError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ agencyName: "", shortName: "", autoVerify: false });
  const [savingId, setSavingId] = useState(null);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: ROLES.AGENCY_BROKER,
    agencyName: "",
    shortName: "",
    autoVerify: true
  });

  const load = () => {
    api
      .get("/admin/users")
      .then((r) => {
        setUsers(r.data.users || []);
        setMsg("");
      })
      .catch((err) => {
        const status = err.response?.status;
        const apiMsg = err.response?.data?.message;
        if (status === 401) {
          setMsg("Session expired — please log out and log in again as admin.");
        } else if (status === 403) {
          setMsg("Admin access required.");
        } else {
          setMsg(apiMsg || "Could not load users.");
        }
      });
  };

  useEffect(load, []);

  async function createUser(e) {
    e.preventDefault();
    setMsg("");
    setInviteLink("");
    setInviteEmailSent(false);
    setInviteMailError("");
    try {
      const r = await api.post("/admin/users/invite", form);
      setInviteEmail(form.email);
      setInviteLink(r.data.setPasswordUrl || "");
      setInviteEmailSent(Boolean(r.data.inviteSent));
      setInviteMailError(r.data.mailError || "");
      setMsg(
        r.data.inviteSent
          ? `Invite email sent to ${form.email} with password-setup link.`
          : `User created. Email not sent${r.data.mailError ? ` (${r.data.mailError})` : ""} — copy the link below.`
      );
      setForm((f) => ({ ...f, email: "", firstName: "", lastName: "", agencyName: "", shortName: "" }));
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || "Could not create user.");
    }
  }

  async function sendInviteEmail(userId, email) {
    setMsg("");
    setInviteEmailSent(false);
    setInviteMailError("");
    try {
      const r = await api.post(`/admin/users/${userId}/resend-invite`);
      setInviteEmail(email);
      setInviteLink(r.data.setPasswordUrl || "");
      setInviteEmailSent(Boolean(r.data.inviteSent));
      setInviteMailError(r.data.mailError || "");
      if (r.data.setPasswordUrl) {
        setMsg(
          r.data.inviteSent
            ? `Invite email sent to ${email} with password-setup link.`
            : `Invite link ready for ${email}. Email not sent${r.data.mailError ? ` (${r.data.mailError})` : ""} — copy the link below.`
        );
      } else {
        setMsg("Could not create invite link.");
      }
    } catch (err) {
      setMsg(err.response?.data?.message || "Could not send invite email.");
    }
  }

  function startEdit(user) {
    setEditingId(user.id);
    setEditForm({
      agencyName: user.agency_name || "",
      shortName: user.short_name || "",
      autoVerify: Boolean(user.auto_verify_listings)
    });
    setMsg("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ agencyName: "", shortName: "", autoVerify: false });
  }

  async function saveBrokerProfile(userId, email) {
    setSavingId(userId);
    setMsg("");
    try {
      await api.patch(`/admin/users/${userId}/broker-profile`, {
        agencyName: editForm.agencyName,
        shortName: editForm.shortName,
        autoVerify: editForm.autoVerify
      });
      setMsg(`Broker profile updated for ${email}.`);
      cancelEdit();
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || "Could not update broker profile.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card className="mt-10">
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-heading">User management</h2>
          <p className="text-sm text-muted">
            Create broker accounts — invite emails are sent from hello@mmizan.com with a password-setup link.
          </p>
        </div>

        <form className="grid gap-3 sm:grid-cols-2" onSubmit={createUser}>
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            placeholder="First name"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          />
          <Input
            placeholder="Last name"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          />
          <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          {form.role === ROLES.AGENCY_BROKER ? (
            <>
              <Input
                placeholder="Agency name"
                value={form.agencyName}
                onChange={(e) => setForm((f) => ({ ...f, agencyName: e.target.value }))}
              />
              <Input
                placeholder="Short name (max 10)"
                maxLength={10}
                value={form.shortName}
                onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value.slice(0, 10) }))}
              />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.autoVerify}
                  onChange={(e) => setForm((f) => ({ ...f, autoVerify: e.target.checked }))}
                />
                Trusted broker — auto-verify listings
              </label>
            </>
          ) : null}
          <Button type="submit" className="sm:col-span-2">Create user & send invite email</Button>
        </form>

        {msg ? (
          <p className={`text-sm ${msg.includes("Session expired") || msg.includes("Could not") || msg.includes("required") ? "text-destructive" : "text-success"}`}>
            {msg}
          </p>
        ) : null}
        <InviteLinkBox
          url={inviteLink}
          email={inviteEmail}
          emailSent={inviteEmailSent}
          mailError={inviteMailError}
        />

        <div className="max-h-96 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-brand-muted/30 text-left text-xs uppercase text-muted">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Agency</th>
                <th className="px-3 py-2">Short</th>
                <th className="px-3 py-2">Auto-verify</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isBroker = u.role === ROLES.AGENCY_BROKER;
                const isEditing = editingId === u.id;

                return (
                  <tr key={u.id} className="border-b border-line last:border-0 align-top">
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <Input
                          value={editForm.agencyName}
                          onChange={(e) => setEditForm((f) => ({ ...f, agencyName: e.target.value }))}
                          placeholder="Agency name"
                        />
                      ) : (
                        u.agency_name || "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <Input
                          value={editForm.shortName}
                          maxLength={10}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, shortName: e.target.value.slice(0, 10) }))
                          }
                          placeholder="Max 10"
                        />
                      ) : (
                        u.short_name || "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={editForm.autoVerify}
                            onChange={(e) => setEditForm((f) => ({ ...f, autoVerify: e.target.checked }))}
                          />
                          Enabled
                        </label>
                      ) : isBroker ? (
                        u.auto_verify_listings ? "Yes" : "No"
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        {isBroker && isEditing ? (
                          <>
                            <button
                              type="button"
                              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                              disabled={savingId === u.id}
                              onClick={() => saveBrokerProfile(u.id, u.email)}
                            >
                              {savingId === u.id ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              className="text-xs text-muted hover:underline"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {isBroker ? (
                              <button
                                type="button"
                                className="text-xs font-medium text-primary hover:underline"
                                onClick={() => startEdit(u)}
                              >
                                Edit broker
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="text-xs font-medium text-primary hover:underline"
                              onClick={() => sendInviteEmail(u.id, u.email)}
                            >
                              Send invite email
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
