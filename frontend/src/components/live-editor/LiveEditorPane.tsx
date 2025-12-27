import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/store/session-store";
import { WS_BACKEND_URL, HTTP_BACKEND_URL } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FaMousePointer, FaSync } from "react-icons/fa";
import toast from "react-hot-toast";

interface SelectedElement {
  tagName: string;
  id: string;
  classList: string[];
  textContent: string;
  xpath: string;
  outerHTML: string;
}

export function LiveEditorPane() {
  const { projectPath, devServerUrl, sessionId, setSessionId } =
    useSessionStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [instruction, setInstruction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState(devServerUrl || "http://localhost:3000");

  // Load the dev server URL into the proxy
  const loadApp = useCallback(async () => {
    if (!targetUrl) return;

    try {
      await fetch(`${HTTP_BACKEND_URL}/config/app-proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_url: targetUrl }),
      });

      // Reload iframe
      if (iframeRef.current) {
        iframeRef.current.src = `${HTTP_BACKEND_URL}/app/`;
      }
    } catch (error) {
      console.error("Failed to configure app proxy:", error);
      toast.error("Failed to load app");
    }
  }, [targetUrl]);

  // Load app on mount if devServerUrl is set
  useEffect(() => {
    if (devServerUrl) {
      setTargetUrl(devServerUrl);
      loadApp();
    }
  }, [devServerUrl]);

  // Toggle select mode
  const toggleSelectMode = useCallback(() => {
    const newMode = !selectMode;
    setSelectMode(newMode);

    // Send message to iframe
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "pixel-forge-toggle-select",
          enabled: newMode,
        },
        "*"
      );
    }
  }, [selectMode]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === "pixel-forge-element-selected") {
        setSelectedElement(e.data.data);
      } else if (e.data.type === "pixel-forge-cancel-select") {
        setSelectMode(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Send edit to Claude
  const sendToCloud = useCallback(async () => {
    if (!selectedElement || !instruction.trim()) return;

    if (!projectPath) {
      toast.error("Please select a project first");
      return;
    }

    setIsLoading(true);
    setResponse("Connecting to Claude...");

    try {
      const wsUrl = `${WS_BACKEND_URL}/edit-element`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setResponse("Sending request to Claude...");
        ws.send(
          JSON.stringify({
            element: selectedElement,
            instruction: instruction,
            projectPath: projectPath,
            session_id: sessionId,
          })
        );
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "status") {
          setResponse(data.message);
        } else if (data.type === "result") {
          setResponse(data.message);
          setIsLoading(false);

          // Update session ID if returned
          if (data.session_id) {
            setSessionId(data.session_id);
          }

          // Reload the iframe to show changes
          setTimeout(() => {
            if (iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.location.reload();
            }
          }, 500);
        } else if (data.type === "error") {
          setResponse("Error: " + data.message);
          setIsLoading(false);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setResponse("Connection error. Is the proxy running?");
        setIsLoading(false);
      };
    } catch (error) {
      console.error("Error:", error);
      setResponse("Error: " + String(error));
      setIsLoading(false);
    }
  }, [selectedElement, instruction, projectPath, sessionId, setSessionId]);

  // Escape HTML for display
  const escapeHtml = (text: string) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div className="flex h-full">
      {/* Left: App Viewer */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-100 dark:bg-gray-800 p-3 flex items-center justify-between gap-2">
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadApp()}
            placeholder="http://localhost:3000"
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={loadApp}>
            <FaSync className="mr-1" /> Load
          </Button>
          <Button
            variant={selectMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectMode}
            className={selectMode ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <FaMousePointer className="mr-1" />
            Select: {selectMode ? "ON" : "OFF"}
          </Button>
        </div>
        <div className="flex-1 bg-white">
          <iframe
            ref={iframeRef}
            src={`${HTTP_BACKEND_URL}/app/`}
            className="w-full h-full border-0"
          />
        </div>
      </div>

      {/* Right: Selection Info & Controls */}
      <div className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold">Selected Element</h3>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {selectedElement ? (
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">
                  Tag
                </Label>
                <p className="font-mono text-blue-600 dark:text-blue-400">
                  &lt;{selectedElement.tagName.toLowerCase()}&gt;
                </p>
              </div>

              {selectedElement.id && (
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">
                    ID
                  </Label>
                  <p className="font-mono text-green-600 dark:text-green-400">
                    #{selectedElement.id}
                  </p>
                </div>
              )}

              {selectedElement.classList.length > 0 && (
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">
                    Classes
                  </Label>
                  <p className="font-mono text-yellow-600 dark:text-yellow-400">
                    .{selectedElement.classList.join(".")}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs uppercase text-muted-foreground">
                  Text
                </Label>
                <p className="truncate">
                  {selectedElement.textContent.slice(0, 100)}
                </p>
              </div>

              <div>
                <Label className="text-xs uppercase text-muted-foreground">
                  XPath
                </Label>
                <p className="font-mono text-xs text-purple-600 dark:text-purple-400 break-all">
                  {selectedElement.xpath}
                </p>
              </div>

              <div>
                <Label className="text-xs uppercase text-muted-foreground">
                  Outer HTML
                </Label>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-40">
                  {escapeHtml(selectedElement.outerHTML)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Click "Select: ON" then click on an element in the app to inspect
              it.
            </p>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div>
            <Label htmlFor="instruction" className="text-xs uppercase">
              Instruction
            </Label>
            <Textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Tell Claude what to change about this element..."
              rows={3}
              className="resize-none mt-1"
            />
          </div>

          <Button
            onClick={sendToCloud}
            disabled={!selectedElement || !instruction.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? "Processing..." : "Send to Claude"}
          </Button>

          {response && (
            <div>
              <Label className="text-xs uppercase text-muted-foreground">
                Response
              </Label>
              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                {response}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveEditorPane;
