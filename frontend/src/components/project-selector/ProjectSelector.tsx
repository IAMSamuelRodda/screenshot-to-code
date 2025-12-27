import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/session-store";
import { FaFolder, FaClock } from "react-icons/fa";

interface ProjectSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSelector({ open, onOpenChange }: ProjectSelectorProps) {
  const { recentProjects, setProject, clearProject } = useSessionStore();
  const [projectPath, setProjectPath] = useState("");
  const [devServerUrl, setDevServerUrl] = useState("");

  const handleSelectProject = (path: string, devUrl?: string) => {
    setProject(path, devUrl);
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (projectPath.trim()) {
      handleSelectProject(projectPath.trim(), devServerUrl.trim() || undefined);
    }
  };

  const handleSkip = () => {
    clearProject();
    onOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Select Project</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a project to work with. This enables Claude session
            persistence across edits.
          </p>
        </DialogHeader>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recent Projects</Label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {recentProjects.map((project) => (
                <button
                  key={project.path}
                  onClick={() =>
                    handleSelectProject(project.path, project.devServerUrl)
                  }
                  className="w-full flex items-center justify-between p-3 rounded-md border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FaFolder className="text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{project.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {project.path}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0 ml-2">
                    <FaClock />
                    {formatDate(project.lastOpened)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Entry */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="project-path">Project Path</Label>
            <Input
              id="project-path"
              placeholder="/path/to/your/project"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dev-server-url">
              Dev Server URL{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="dev-server-url"
              placeholder="http://localhost:3000"
              value={devServerUrl}
              onChange={(e) => setDevServerUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <p className="text-xs text-muted-foreground">
              For Live Editor mode - the URL of your running dev server
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip}>
            Skip (Screenshot-to-Code only)
          </Button>
          <Button onClick={handleSubmit} disabled={!projectPath.trim()}>
            Select Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProjectSelector;
