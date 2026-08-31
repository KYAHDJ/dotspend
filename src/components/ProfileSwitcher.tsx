import { useState } from "react";
import type { Profile } from "../store";

const PROFILE_COLORS = ["#612AD5", "#E9B380", "#CBE353", "#FF6B6B", "#4ECDC4", "#A78BFA", "#F472B6"];

interface Props {
  profiles: Profile[];
  onSelect: (id: string) => void;
  onAddProfile: (name: string, color: string, password?: string) => string;
  onDeleteProfile: (id: string) => void;
  onUpdateProfile: (id: string, updates: Partial<Profile>) => void;
  verifyProfilePassword: (id: string, password: string) => boolean;
  isProfileAuthed: (id: string) => boolean;
  adminPassword: string;
}

function ColorPicker({
  value,
  onChange,
  size,
}: {
  value: string;
  onChange: (c: string) => void;
  size?: "sm" | "md";
}) {
  const cell = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PROFILE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`${cell} rounded-full transition-all`}
          style={{
            background: c,
            border: value === c ? "2px solid white" : "2px solid transparent",
            transform: value === c ? "scale(1.15)" : "scale(1)",
          }}
        />
      ))}
      {/* Custom color picker */}
      <label
        className={`${cell} rounded-full flex items-center justify-center cursor-pointer`}
        style={{
          background:
            "conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
          border: PROFILE_COLORS.includes(value)
            ? "2px solid white"
            : "2px solid #2A2A32",
          transform: PROFILE_COLORS.includes(value) ? "scale(1)" : "scale(1.15)",
        }}
        title="Custom color"
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="opacity-0 w-0 h-0"
        />
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
          <path d="M12 2v20M2 12h20" />
        </svg>
      </label>
    </div>
  );
}

export default function ProfileSwitcher({
  profiles,
  onSelect,
  onAddProfile,
  onDeleteProfile,
  onUpdateProfile,
  verifyProfilePassword,
  isProfileAuthed,
  adminPassword,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Add profile state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedColor, setSelectedColor] = useState(PROFILE_COLORS[0]);

  // Login gate state
  const [loginProfile, setLoginProfile] = useState<Profile | null>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("150");
  const [editColor, setEditColor] = useState(PROFILE_COLORS[0]);
  const [editPassword, setEditPassword] = useState("");

  // Delete (admin) state
  const [deleteProfile, setDeleteProfile] = useState<Profile | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    const id = onAddProfile(newName.trim().slice(0, 24), selectedColor, newPassword || undefined);
    if (!id) return;
    setNewName("");
    setNewPassword("");
    setShowAdd(false);
    onSelect(id);
  };

  const handleProfileClick = (p: Profile) => {
    // Always require the profile's password when clicking it, even if it was
    // unlocked earlier in the session.
    if (!p.password) {
      onSelect(p.id);
      return;
    }
    setLoginProfile(p);
    setLoginPassword("");
    setLoginError("");
  };

  const handleLogin = () => {
    if (!loginProfile) return;
    if (verifyProfilePassword(loginProfile.id, loginPassword)) {
      onSelect(loginProfile.id);
      setLoginProfile(null);
    } else {
      setLoginError(loginProfile.password ? "Incorrect password" : "Password required");
    }
  };

  const startEdit = (p: Profile) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditBudget(String(p.dailyBudgetLimit));
    setEditColor(p.color);
    setEditPassword(p.password || "");
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const updates: Partial<Profile> = {
      name: editName.trim(),
      initial: editName.trim()[0].toUpperCase(),
      dailyBudgetLimit: parseFloat(editBudget) || 150,
      color: editColor,
    };
    if (editPassword.trim()) {
      updates.password = editPassword.trim();
    } else {
      updates.password = undefined;
    }
    onUpdateProfile(editingId, updates);
    setEditingId(null);
  };

  const confirmAdminDelete = () => {
    if (!deleteProfile) return;
    if (adminPasswordInput === adminPassword) {
      onDeleteProfile(deleteProfile.id);
      setDeleteProfile(null);
      setAdminPasswordInput("");
    } else {
      setDeleteError("Incorrect admin password");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-10 relative"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 40%, #1a0f2e 0%, #0F0F12 65%)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #612AD5, #9B6EFF)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L4 8v13h5v-7h6v7h5V8L12 3z" fill="white" opacity="0.9" />
          </svg>
        </div>
        <span className="text-white text-2xl font-bold tracking-tight">
          Dot<span style={{ color: "#612AD5" }}>Spend</span>
        </span>
      </div>

      <div className="text-center">
        <h1 className="text-white text-[2rem] font-bold leading-tight">
          {profiles.length === 0 ? "Create your first profile" : "Who is logging expenses today?"}
        </h1>
        <p className="text-[#A1A1AA] text-sm mt-2">
          {profiles.length === 0 ? "Set up a profile to start tracking" : "Select your profile to continue"}
        </p>
      </div>

      {/* Profile cards */}
      <div className="flex gap-5 flex-wrap justify-center px-4">
        {profiles.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-4">
            {editingId === p.id ? (
              <div
                className="w-52 p-3 rounded-2xl flex flex-col gap-2"
                style={{ background: `${editColor}18`, border: `2px solid ${editColor}` }}
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg outline-none text-white"
                  style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}
                  placeholder="Name"
                />
                <input
                  type="number"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg outline-none text-white font-mono-data"
                  style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}
                  placeholder="Daily budget"
                />
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg outline-none text-white"
                  style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}
                  placeholder="Password (leave blank to remove)"
                />
                <ColorPicker value={editColor} onChange={setEditColor} size="sm" />
                <div className="flex gap-1">
                  <button
                    onClick={saveEdit}
                    className="flex-1 text-[10px] py-1 rounded-md font-medium"
                    style={{ background: editColor, color: "white" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 text-[10px] py-1 rounded-md font-medium"
                    style={{ background: "#2A2A32", color: "#A1A1AA" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleProfileClick(p)}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                className="flex flex-col items-center gap-4 group"
              >
                <div
                  className="w-32 h-32 rounded-2xl flex items-center justify-center text-4xl font-bold transition-all duration-300"
                  style={{
                    background:
                      hovered === p.id
                        ? `linear-gradient(135deg, ${p.color}35, ${p.color}18)`
                        : `linear-gradient(135deg, ${p.color}18, ${p.color}08)`,
                    border:
                      hovered === p.id ? `2px solid ${p.color}` : "2px solid #2A2A32",
                    color: p.color,
                    boxShadow: hovered === p.id ? `0 0 40px ${p.color}40` : "none",
                    transform: hovered === p.id ? "translateY(-3px)" : "none",
                  }}
                >
                  {p.initial}
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">{p.name}</p>
                  <p className="text-[#A1A1AA] text-xs mt-0.5">
                    ${p.dailyBudgetLimit}/day {p.password ? "· 🔒" : ""}
                  </p>
                </div>
              </button>
            )}
            {editingId !== p.id && (
              <div className="flex gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(p);
                  }}
                  className="text-[10px] text-[#A1A1AA] hover:text-white transition-colors"
                >
                  edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteProfile(p);
                    setAdminPasswordInput("");
                    setDeleteError("");
                  }}
                  className="text-[10px] text-[#A1A1AA] hover:text-[#FF6B6B] transition-colors"
                >
                  delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add Profile */}
        {showAdd ? (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-52 p-3 rounded-2xl flex flex-col gap-2"
              style={{ border: "2px dashed #E9B380" }}
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="w-full text-xs px-2 py-1.5 rounded-lg outline-none text-white"
                style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}
                placeholder="Profile name"
                autoFocus
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="w-full text-xs px-2 py-1.5 rounded-lg outline-none text-white"
                style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}
                placeholder="Password (optional)"
              />
              <ColorPicker value={selectedColor} onChange={setSelectedColor} />
              <div className="flex gap-1">
                <button
                  onClick={handleAdd}
                  className="flex-1 text-[10px] py-1 rounded-md font-medium"
                  style={{ background: "#E9B380", color: "#0F0F12" }}
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowAdd(false); setNewName(""); setNewPassword(""); }}
                  className="flex-1 text-[10px] py-1 rounded-md font-medium"
                  style={{ background: "#2A2A32", color: "#A1A1AA" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            onMouseEnter={() => setHovered("add")}
            onMouseLeave={() => setHovered(null)}
            className="flex flex-col items-center gap-4"
          >
            <div
              className="w-32 h-32 rounded-2xl flex items-center justify-center transition-all duration-300"
              style={{
                border: hovered === "add" ? "2px dashed #E9B380" : "2px dashed #2A2A32",
                color: hovered === "add" ? "#E9B380" : "#A1A1AA",
                transform: hovered === "add" ? "translateY(-3px)" : "none",
              }}
            >
              <div className="text-center">
                <div className="text-3xl leading-none mb-1">+</div>
                <div className="text-xs font-medium">New</div>
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm transition-colors" style={{ color: hovered === "add" ? "#E9B380" : "#A1A1AA" }}>
                Add Profile
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Bottom hint */}
      <p className="text-[#A1A1AA] text-xs absolute bottom-6">
        DotSpend · Context-Aware Expense Intelligence
      </p>

      {/* Login modal */}
      {loginProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => e.target === e.currentTarget && setLoginProfile(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#18181C", border: "1px solid #2A2A32" }}
          >
            <h3 className="text-white font-semibold text-lg mb-1">Unlock {loginProfile.name}</h3>
            <p className="text-[#A1A1AA] text-xs mb-4">
              Enter your profile password to continue
            </p>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
              placeholder="Password"
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none text-white placeholder:text-[#A1A1AA] mb-3"
              style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}
            />
            {loginError && (
              <p className="text-[#FF6B6B] text-xs mb-3">{loginError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleLogin}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#612AD5" }}
              >
                Enter
              </button>
              <button
                onClick={() => setLoginProfile(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: "#2A2A32", color: "#A1A1AA" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin delete modal */}
      {deleteProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => e.target === e.currentTarget && setDeleteProfile(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#18181C", border: "1px solid #2A2A32" }}
          >
            <h3 className="text-white font-semibold text-lg mb-1">
              Delete {deleteProfile.name}?
            </h3>
            <p className="text-[#A1A1AA] text-xs mb-4">
              This deletes the profile and all its expenses. Requires admin password.
            </p>
            <input
              type="password"
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmAdminDelete()}
              autoFocus
              placeholder="Admin password"
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none text-white placeholder:text-[#A1A1AA] mb-3"
              style={{ background: "#0F0F12", border: "1px solid #FF6B6B" }}
            />
            {deleteError && (
              <p className="text-[#FF6B6B] text-xs mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={confirmAdminDelete}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#FF6B6B" }}
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteProfile(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: "#2A2A32", color: "#A1A1AA" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
