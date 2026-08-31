import { useState } from "react";
import type { Profile } from "../store";

const PROFILE_COLORS = ["#612AD5", "#E9B380", "#CBE353", "#FF6B6B", "#4ECDC4", "#A78BFA", "#F472B6"];

interface Props {
  profiles: Profile[];
  onSelect: (id: string) => void;
  onAddProfile: (name: string, color: string) => string;
  onDeleteProfile: (id: string) => void;
  onUpdateProfile: (id: string, updates: Partial<Profile>) => void;
}

export default function ProfileSwitcher({
  profiles,
  onSelect,
  onAddProfile,
  onDeleteProfile,
  onUpdateProfile,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PROFILE_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("150");

  const handleAdd = () => {
    if (!newName.trim()) return;
    const id = onAddProfile(newName.trim(), selectedColor);
    setNewName("");
    setShowAdd(false);
    onSelect(id);
  };

  const startEdit = (p: Profile) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditBudget(String(p.dailyBudgetLimit));
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    onUpdateProfile(editingId, {
      name: editName.trim(),
      initial: editName.trim()[0].toUpperCase(),
      dailyBudgetLimit: parseFloat(editBudget) || 150,
    });
    setEditingId(null);
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
            <path
              d="M12 3L4 8v13h5v-7h6v7h5V8L12 3z"
              fill="white"
              opacity="0.9"
            />
          </svg>
        </div>
        <span className="text-white text-2xl font-bold tracking-tight">
          Dot<span style={{ color: "#612AD5" }}>Spend</span>
        </span>
      </div>

      <div className="text-center">
        <h1 className="text-white text-[2rem] font-bold leading-tight">
          Who is logging expenses today?
        </h1>
        <p className="text-[#A1A1AA] text-sm mt-2">
          Select your profile to continue
        </p>
      </div>

      {/* Profile cards */}
      <div className="flex gap-5 flex-wrap justify-center px-4">
        {profiles.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-4">
            {editingId === p.id ? (
              <div
                className="w-32 p-3 rounded-2xl flex flex-col gap-2"
                style={{
                  background: `${p.color}18`,
                  border: `2px solid ${p.color}`,
                }}
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
                <div className="flex gap-1">
                  <button
                    onClick={saveEdit}
                    className="flex-1 text-[10px] py-1 rounded-md font-medium"
                    style={{ background: p.color, color: "white" }}
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
                onClick={() => onSelect(p.id)}
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
                      hovered === p.id
                        ? `2px solid ${p.color}`
                        : "2px solid #2A2A32",
                    color: p.color,
                    boxShadow:
                      hovered === p.id ? `0 0 40px ${p.color}40` : "none",
                    transform: hovered === p.id ? "translateY(-3px)" : "none",
                  }}
                >
                  {p.initial}
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">{p.name}</p>
                  <p className="text-[#A1A1AA] text-xs mt-0.5">
                    ${p.dailyBudgetLimit}/day
                  </p>
                </div>
              </button>
            )}
            {editingId !== p.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(p);
                }}
                className="text-[10px] text-[#A1A1AA] hover:text-white transition-colors"
              >
                edit
              </button>
            )}
          </div>
        ))}

        {/* Add Profile */}
        {showAdd ? (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-32 p-3 rounded-2xl flex flex-col gap-2"
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
              <div className="flex gap-1 flex-wrap justify-center">
                {PROFILE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className="w-5 h-5 rounded-full transition-all"
                    style={{
                      background: c,
                      border: selectedColor === c ? "2px solid white" : "2px solid transparent",
                      transform: selectedColor === c ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleAdd}
                  className="flex-1 text-[10px] py-1 rounded-md font-medium"
                  style={{ background: "#E9B380", color: "#0F0F12" }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAdd(false); setNewName(""); }}
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
                border:
                  hovered === "add"
                    ? "2px dashed #E9B380"
                    : "2px dashed #2A2A32",
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
              <p
                className="font-semibold text-sm transition-colors"
                style={{ color: hovered === "add" ? "#E9B380" : "#A1A1AA" }}
              >
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
    </div>
  );
}
