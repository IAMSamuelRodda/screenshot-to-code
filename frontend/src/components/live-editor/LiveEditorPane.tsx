/**
 * LiveEditorPane Component
 *
 * Main container for the Live Editor feature.
 * Embeds a web app via proxy iframe and provides chat-based editing
 * with Claude, persistent element selection, and tool visualization.
 *
 * Features:
 * - App proxy with script injection for element selection
 * - Multi-element selection with persistent visual highlighting
 * - Full chat interface with streaming responses
 * - Tool execution visualization
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSessionStore } from '@/store/session-store'
import { HTTP_BACKEND_URL } from '@/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MousePointer2,
  RefreshCw,
  Play,
  MessageSquare,
  Layers,
  Settings,
} from 'lucide-react'
import toast from 'react-hot-toast'

// New chat components
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { SelectedElementsList } from './SelectedElementsList'
import { useLiveEditorStore } from './store/chat-store'

export function LiveEditorPane() {
  const { projectPath, devServerUrl } = useSessionStore()

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [targetUrl, setTargetUrl] = useState(
    devServerUrl || 'http://localhost:3000'
  )
  const [activeTab, setActiveTab] = useState('chat')

  // Get store actions and state
  const {
    connect,
    disconnect,
    connected,
    addElement,
    removeElement,
    clearElements,
    selectedElements,
    setProjectPath,
  } = useLiveEditorStore()

  // Initialize connection on mount
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // KNOWN ISSUE: Chat textarea unresponsive after hard refresh
  // Manual workaround: Switch to Elements/Settings tab, then back to Chat
  // Root cause: Unknown conflict with iframe's chat interface on initial load
  // This auto-switch attempt doesn't work reliably - keeping for documentation
  // TODO: Investigate iframe focus/pointer-events interaction
  useEffect(() => {
    const timer1 = setTimeout(() => setActiveTab('elements'), 500)
    const timer2 = setTimeout(() => setActiveTab('chat'), 600)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  // Sync project path to store
  useEffect(() => {
    if (projectPath) {
      setProjectPath(projectPath)
    }
  }, [projectPath, setProjectPath])

  // Load the dev server URL into the proxy
  const loadApp = useCallback(async () => {
    if (!targetUrl) return

    try {
      await fetch(`${HTTP_BACKEND_URL}/config/app-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_url: targetUrl }),
      })

      // Clear selections when loading new app
      clearElements()

      // Reload iframe
      if (iframeRef.current) {
        iframeRef.current.src = `${HTTP_BACKEND_URL}/app/`
      }

      toast.success('App loaded')
    } catch (error) {
      console.error('Failed to configure app proxy:', error)
      toast.error('Failed to load app')
    }
  }, [targetUrl, clearElements])

  // Refresh the iframe with cache busting (harder reload)
  const refreshApp = useCallback(() => {
    if (iframeRef.current) {
      // Force hard reload by resetting src with cache-busting param
      const currentSrc = iframeRef.current.src.split('?')[0]
      iframeRef.current.src = `${currentSrc}?t=${Date.now()}`
      toast.success('Refreshed', { duration: 1000 })
    }
  }, [])

  // Load app on mount if devServerUrl is set
  useEffect(() => {
    if (devServerUrl) {
      setTargetUrl(devServerUrl)
      loadApp()
    }
  }, [devServerUrl])

  // Toggle select mode
  const toggleSelectMode = useCallback(() => {
    const newMode = !selectMode
    setSelectMode(newMode)

    // Send message to iframe
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'pixel-forge-toggle-select',
          enabled: newMode,
        },
        '*'
      )
    }

    if (newMode) {
      toast.success('Select mode ON - click elements to select', {
        duration: 2000,
      })
    }
  }, [selectMode])

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'pixel-forge-element-selected') {
        // Add to store (store handles deduplication)
        addElement({
          tagName: e.data.data.tagName,
          elementId: e.data.data.elementId || e.data.data.id,
          classList: e.data.data.classList || [],
          textContent: e.data.data.textContent || '',
          xpath: e.data.data.xpath,
          outerHTML: e.data.data.outerHTML,
        })
      } else if (e.data.type === 'pixel-forge-element-deselected') {
        // Find and remove from store by xpath
        const element = selectedElements.find(
          (el) => el.xpath === e.data.data.xpath
        )
        if (element) {
          removeElement(element.id)
        }
      } else if (e.data.type === 'pixel-forge-cancel-select') {
        setSelectMode(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [addElement, removeElement, selectedElements])

  // Handle clearing selections from parent (sync to iframe)
  const handleClearElements = useCallback(() => {
    clearElements()
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'pixel-forge-clear-selections' },
        '*'
      )
    }
  }, [clearElements])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: App Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-muted/50 border-b border-border p-2 flex items-center gap-2 flex-shrink-0">
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadApp()}
            placeholder="http://localhost:3000"
            className="flex-1 h-8"
          />
          <Button variant="outline" size="sm" onClick={loadApp} className="h-8">
            <Play className="w-4 h-4 mr-1" />
            Load
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshApp}
            title="Refresh app"
            className="h-8"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant={selectMode ? 'default' : 'outline'}
            size="sm"
            onClick={toggleSelectMode}
            className={`h-8 ${selectMode ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            <MousePointer2 className="w-4 h-4 mr-1" />
            {selectMode ? 'Selecting' : 'Select'}
          </Button>

          {/* Connection status */}
          <div
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>

        {/* Iframe */}
        <div className="flex-1 min-h-0 bg-white dark:bg-card overflow-hidden">
          <iframe
            ref={iframeRef}
            src={`${HTTP_BACKEND_URL}/app/`}
            className="w-full h-full border-0"
          />
        </div>
      </div>

      {/* Right: Chat & Selection Panel */}
      <div className="w-96 border-l border-border flex flex-col bg-background overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 m-2 mb-0 flex-shrink-0">
            <TabsTrigger value="chat" className="gap-1">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="elements" className="gap-1">
              <Layers className="w-4 h-4" />
              Elements
              {selectedElements.length > 0 && (
                <span className="ml-1 bg-green-500 text-white text-xs rounded-full px-1.5">
                  {selectedElements.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Tab Content Container */}
          <div className="flex-1 min-h-0 overflow-hidden mt-2">
            {/* Chat Tab - only ChatMessages, ChatInput rendered outside */}
            <TabsContent
              value="chat"
              className="h-full overflow-y-auto m-0"
            >
              <ChatMessages />
            </TabsContent>

            {/* Elements Tab */}
            <TabsContent
              value="elements"
              className="h-full overflow-y-auto m-0 p-3"
            >
              <SelectedElementsList />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent
              value="settings"
              className="h-full overflow-y-auto m-0 p-3"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Project Path</label>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    {projectPath || 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Dev Server</label>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    {targetUrl}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Connection</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {connected ? '✓ Connected' : '✗ Disconnected'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearElements}
                  disabled={selectedElements.length === 0}
                >
                  Clear All Selections
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* ChatInput rendered OUTSIDE Tabs to avoid Radix initialization issues */}
        {activeTab === 'chat' && <ChatInput />}
      </div>
    </div>
  )
}

export default LiveEditorPane
