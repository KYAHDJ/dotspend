import { useState } from "react";
import ProfileSwitcher from "./components/ProfileSwitcher";
import Dashboard from "./components/Dashboard";
import CalendarView from "./components/CalendarView";
import { useStore } from "./store";

type View = "profile" | "dashboard";

function LoadingScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "#0F0F12" }}>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse"
        style={{ background: "linear-gradient(135deg, #612AD5, #9B6EFF)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 3L4 8v13h5v-7h6v7h5V8L12 3z" fill="white" opacity="0.9" />
        </svg>
      </div>
      <p className="text-[#A1A1AA] text-sm">Loading DotSpend...</p>
    </div>
  );
}

export default function App() {
  const store = useStore();
  const [view, setView] = useState<View>(
    store.activeProfile ? "dashboard" : "profile"
  );
  const [showCalendar, setShowCalendar] = useState(false);

  if (store.loading) return <LoadingScreen />;

  const handleProfileSelect = (id: string) => {
    if (!id || !store.state.profiles.some((p) => p.id === id)) return;
    store.setActiveProfile(id);
    setView("dashboard");
  };

  const todayExpenses = store.getExpensesForDate(store.today);
  const dailyTotals = store.getDailyTotals();

  const effectiveProfile =
    store.activeProfile || store.state.profiles[0] || null;
  const effectiveView =
    view === "dashboard" && !effectiveProfile ? "profile" : view;

  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      {effectiveView === "profile" ? (
        <div style={{ height: "100%", overflowY: "auto" }}>
          <ProfileSwitcher
            profiles={store.state.profiles}
            onSelect={handleProfileSelect}
            onAddProfile={store.addProfile}
            onDeleteProfile={store.deleteProfile}
            onUpdateProfile={store.updateProfile}
            verifyProfilePassword={store.verifyProfilePassword}
            isProfileAuthed={store.isProfileAuthed}
            adminPassword={store.adminPassword}
          />
        </div>
      ) : (
        <div style={{ height: "100%", overflow: "hidden" }}>
          <Dashboard
            profile={effectiveProfile as NonNullable<typeof effectiveProfile>}
            currency={store.state.currency}
            expenses={todayExpenses}
            allExpenses={store.state.expenses}
            messages={store.state.messages.filter(
              (m) =>
                m.profileId === store.state.activeProfileId &&
                m.date === store.today
            )}
            onAddExpense={store.addExpense}
            onDeleteExpense={store.deleteExpense}
            onUpdateExpense={store.updateExpense}
            onAddMessage={store.addMessage}
            onCurrencyToggle={() =>
              store.setCurrency(store.state.currency === "USD" ? "PHP" : "USD")
            }
            onOpenCalendar={() => setShowCalendar(true)}
            onSwitchProfile={() => setView("profile")}
            onUpdateBudget={(amount) =>
              effectiveProfile &&
              store.updateProfile(effectiveProfile.id, { dailyBudgetLimit: amount })
            }
            getWeekTotal={store.getWeekTotal}
            getMonthTotal={store.getMonthTotal}
            getExpensesForDate={store.getExpensesForDate}
            today={store.today}
          />
          {showCalendar && effectiveProfile && (
            <CalendarView
              onClose={() => setShowCalendar(false)}
              expenses={store.state.expenses}
              activeProfileId={store.state.activeProfileId}
              dailyBudget={effectiveProfile.dailyBudgetLimit}
              dailyTotals={dailyTotals}
              getExpensesForDate={store.getExpensesForDate}
              onDeleteExpense={store.deleteExpense}
            />
          )}
        </div>
      )}
    </div>
  );
}