import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActiveMode = "screenshot-to-code" | "live-editor";

interface RecentProject {
  path: string;
  name: string;
  devServerUrl?: string;
  lastOpened: string; // ISO date string
}

interface SessionStore {
  // Current project
  projectPath: string | null;
  projectName: string | null;
  devServerUrl: string | null;
  sessionId: string | null;

  // Mode switching
  activeMode: ActiveMode;

  // Persisted recent projects
  recentProjects: RecentProject[];

  // Actions
  setProject: (path: string, devServerUrl?: string) => void;
  setSessionId: (sessionId: string) => void;
  switchMode: (mode: ActiveMode) => void;
  newSession: () => void;
  clearProject: () => void;
}

// Helper to extract project name from path
function getProjectName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      // Current project
      projectPath: null,
      projectName: null,
      devServerUrl: null,
      sessionId: null,

      // Mode
      activeMode: "screenshot-to-code",

      // Recent projects (persisted)
      recentProjects: [],

      // Actions
      setProject: (path: string, devServerUrl?: string) => {
        const name = getProjectName(path);
        const now = new Date().toISOString();

        set((state) => {
          // Update recent projects list
          const filtered = state.recentProjects.filter((p) => p.path !== path);
          const newRecent: RecentProject = {
            path,
            name,
            devServerUrl,
            lastOpened: now,
          };

          return {
            projectPath: path,
            projectName: name,
            devServerUrl: devServerUrl || null,
            sessionId: null, // Reset session when changing projects
            recentProjects: [newRecent, ...filtered].slice(0, 10), // Keep last 10
          };
        });
      },

      setSessionId: (sessionId: string) => {
        set({ sessionId });
      },

      switchMode: (mode: ActiveMode) => {
        set({ activeMode: mode });
      },

      newSession: () => {
        // Clear session ID to force new session on next request
        set({ sessionId: null });
      },

      clearProject: () => {
        set({
          projectPath: null,
          projectName: null,
          devServerUrl: null,
          sessionId: null,
        });
      },
    }),
    {
      name: "pixel-forge-session",
      // Only persist recentProjects to localStorage
      partialize: (state) => ({
        recentProjects: state.recentProjects,
      }),
    }
  )
);
