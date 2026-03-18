import { T } from "../constants/theme.js";
import { ADMIN_UID } from "../constants/index.js";
import { useIsMobile } from "../utils/mobile.js";

function Nav({ tab, setTab, user }) {
  const isMobile = useIsMobile();
  const isAdmin = user?.uid === ADMIN_UID;

  const tabs = [
    { id: "goals",     icon: "◎",  label: "Goals" },
    { id: "habits",    icon: "✦",  label: "Habits" },
    { id: "reminders", icon: "🔔", label: "Reminders" },
    { id: "diary",     icon: "📓", label: "Journal" },
    { id: "analytics", icon: "▲",  label: "Analytics" },
    { id: "mindmap",   icon: "🗺️", label: "Mind Map" },
    ...(isAdmin ? [{ id: "admin", icon: "⚙️", label: "Admin" }] : []),
  ];

  // ── Mobile: bottom tab bar ─────────────────────────────────────────────────
  if (isMobile) {
    // Show only first 5 tabs on mobile to avoid cramping; Mind Map and Admin in overflow
    const primaryTabs = tabs.slice(0, 5);
    const moreTabs = tabs.slice(5);
    const isMore = moreTabs.some(t => t.id === tab);

    return (
      <>
        {/* Spacer so page content isn't hidden behind fixed bar */}
        <div style={{ height: 64 }} />
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: T.isDark ? "rgba(7,8,12,0.97)" : "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          paddingBottom: "env(safe-area-inset-bottom, 0px)", // iPhone home bar
        }}>
          {primaryTabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "10px 4px 8px", border: "none",
                background: "transparent", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                fontFamily: "inherit",
              }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 400,
                  color: active ? "#9B8FE8" : T.muted,
                  transition: "color 0.15s",
                }}>{t.label}</span>
                {active && (
                  <div style={{
                    position: "absolute", bottom: "calc(env(safe-area-inset-bottom, 0px) + 0px)",
                    width: 28, height: 3, borderRadius: "3px 3px 0 0",
                    background: "linear-gradient(135deg,#9B8FE8,#7EB8D4)",
                  }} />
                )}
              </button>
            );
          })}
          {/* "More" tab for Mind Map / Admin */}
          {moreTabs.length > 0 && (
            <button onClick={() => setTab(moreTabs[0].id)} style={{
              flex: 1, padding: "10px 4px 8px", border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>•••</span>
              <span style={{
                fontSize: 10, fontWeight: isMore ? 700 : 400,
                color: isMore ? "#9B8FE8" : T.muted,
              }}>More</span>
              {isMore && (
                <div style={{
                  position: "absolute", bottom: 0,
                  width: 28, height: 3, borderRadius: "3px 3px 0 0",
                  background: "linear-gradient(135deg,#9B8FE8,#7EB8D4)",
                }} />
              )}
            </button>
          )}
        </nav>

        {/* Sub-navigation when "More" tab active — shows remaining tabs */}
        {isMore && (
          <div style={{
            position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 99,
            background: T.isDark ? "rgba(14,16,24,0.97)" : "rgba(255,255,255,0.97)",
            backdropFilter: "blur(20px)",
            borderTop: `1px solid ${T.border}`,
            padding: "8px 16px",
            display: "flex", gap: 8,
          }}>
            {moreTabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "10px", border: `1px solid ${tab === t.id ? "#9B8FE8" : T.border}`,
                background: tab === t.id ? "rgba(155,143,232,0.12)" : T.inputBg,
                borderRadius: 12, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                fontFamily: "inherit",
              }}>
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: tab === t.id ? "#9B8FE8" : T.muted }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  // ── Desktop: horizontal scrollable pill bar ────────────────────────────────
  return (
    <div style={{
      display: "flex", gap: 3, background: T.surface, borderRadius: 14,
      padding: 4, border: `1px solid ${T.border}`, overflowX: "auto",
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)}
          style={{
            flexShrink: 0, padding: "8px 16px", borderRadius: 11, border: "none",
            background: tab === t.id ? "linear-gradient(135deg,#9B8FE8 0%,#7EB8D4 100%)" : "transparent",
            color: tab === t.id ? "#fff" : T.muted,
            cursor: "pointer", fontWeight: 700, fontSize: 12,
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.2s", fontFamily: "inherit",
          }}>
          <span>{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

export { Nav };