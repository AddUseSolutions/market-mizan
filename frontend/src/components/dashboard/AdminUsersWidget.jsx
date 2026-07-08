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

function InviteLinkBox({ url, email }) {
  if (!url) return null;
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
      <p className="font-medium text-brand-deep">
        Share this link with {email || "the user"} (valid 72 hours):
      </p>
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
        They open the link, set a password, and land in the broker dashboard — no public registration needed.
      </p>
    </div>
  );
}

export default function AdminUsersWidget() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: ROLES.AGENCY_BROKER,
    agencyName: "",
    autoVerify: true
  });

  const load = () => {
    api
      .get("/admin/users")
      .then((r) => setUsers(r.data.users || []))
      .catch(() => setMsg("Could not load users."));
  };

  useEffect(load, []);

  async function createUser(e) {
    e.preventDefault();
    setMsg("");
    setInviteLink("");
    try {
      const r = await api.post("/admin/users/invite", form);
      setInviteEmail(form.email);
      setInviteLink(r.data.setPasswordUrl || "");
      setMsg(
        r.data.inviteSent
          ? `Invite email sent to ${form.email}. You can also copy the link below.`
          : `User created. Email not sent — copy the link below and share it (e.g. WhatsApp).`
      );
      setForm((f) => ({ ...f, email: "", firstName: "", lastName: "", agencyName: "" }));
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || "Could not create user.");
    }
  }

  async function resendInvite(userId, email) {
    try {
      const r = await api.post(`/admin/users/${userId}/resend-invite`);
      setInviteEmail(email);
      setInviteLink(r.data.setPasswordUrl || "");
      setMsg(
        r.data.inviteSent
          ? `Invite resent to ${email}. Link also shown below.`
          : `New invite link created — copy and share manually.`
      );
    } catch {
      setMsg("Resend failed.");
    }
  }

  return (
    <Card className="mt-10">
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-heading">User management</h2>
          <p className="text-sm text-muted">Create broker accounts and send password-setup emails.</p>
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
          <Button type="submit" className="sm:col-span-2">Create & send invite</Button>
        </form>

        {msg ? <p className="text-sm text-success">{msg}</p> : null}
        <InviteLinkBox url={inviteLink} email={inviteEmail} />

        <div className="max-h-64 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-brand-muted/30 text-left text-xs uppercase text-muted">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Agency</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{u.agency_name || "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => resendInvite(u.id, u.email)}
                    >
                      Resend invite
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
