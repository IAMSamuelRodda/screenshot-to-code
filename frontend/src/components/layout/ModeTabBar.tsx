import { useSessionStore, ActiveMode } from "@/store/session-store";
import { FaCamera, FaEdit } from "react-icons/fa";

export function ModeTabBar() {
  const { activeMode, switchMode, projectPath } = useSessionStore();

  const tabs: { mode: ActiveMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: "screenshot-to-code",
      label: "Screenshot to Code",
      icon: <FaCamera className="text-sm" />,
    },
    {
      mode: "live-editor",
      label: "Live Editor",
      icon: <FaEdit className="text-sm" />,
    },
  ];

  return (
    <div className="flex border-b border-border bg-gray-50 dark:bg-secondary">
      {tabs.map((tab) => {
        const isActive = activeMode === tab.mode;
        const isDisabled = tab.mode === "live-editor" && !projectPath;

        return (
          <button
            key={tab.mode}
            onClick={() => !isDisabled && switchMode(tab.mode)}
            disabled={isDisabled}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }
              ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            title={
              isDisabled
                ? "Select a project to enable Live Editor"
                : tab.label
            }
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default ModeTabBar;
