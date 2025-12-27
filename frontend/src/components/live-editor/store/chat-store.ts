/**
 * Live Editor Chat Store
 *
 * Manages chat state, streaming responses, tool visualization,
 * and element selection for the Live Editor.
 *
 * Pattern: Adapted from aim-up/dashboard/frontend/src/store/chat-store.ts
 */

import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

export interface ToolActivity {
  id: string
  tool: string
  input: Record<string, unknown>
  result?: string
  isError?: boolean
  status: 'running' | 'complete'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: Date
  toolActivity?: ToolActivity
}

export interface SelectedElement {
  id: string
  tagName: string
  elementId: string | null  // The element's actual id attribute
  classList: string[]
  textContent: string
  xpath: string
  outerHTML: string
  timestamp: Date
}

interface LiveEditorChatStore {
  // Chat state
  messages: ChatMessage[]
  sessionId: string | null
  isStreaming: boolean
  currentStreamContent: string
  currentTool: ToolActivity | null

  // Connection state
  ws: WebSocket | null
  connected: boolean

  // Selection state (task_2_3)
  selectedElements: SelectedElement[]
  maxSelectedElements: number

  // Project context
  projectPath: string

  // Actions - Chat
  connect: (endpoint?: string) => void
  disconnect: () => void
  sendMessage: (content: string) => void
  clearMessages: () => void
  newSession: () => void

  // Actions - Selection
  addElement: (element: Omit<SelectedElement, 'id' | 'timestamp'>) => void
  removeElement: (id: string) => void
  clearElements: () => void
  setProjectPath: (path: string) => void

  // Helpers
  buildElementContext: () => string
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function isValidUUID(str: string | null): boolean {
  if (!str) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function getStoredSessionId(): string | null {
  const stored = localStorage.getItem('pixel-forge-live-editor-session')
  // Clear invalid session IDs (must be valid UUID)
  if (stored && !isValidUUID(stored)) {
    console.log('[live-editor] Clearing invalid session ID:', stored)
    localStorage.removeItem('pixel-forge-live-editor-session')
    return null
  }
  return stored
}

function storeSessionId(id: string): void {
  // Only store valid UUIDs
  if (isValidUUID(id)) {
    localStorage.setItem('pixel-forge-live-editor-session', id)
  } else {
    console.warn('[live-editor] Refusing to store invalid session ID:', id)
  }
}

function getStoredProjectPath(): string {
  return localStorage.getItem('pixel-forge-project-path') || ''
}

function storeProjectPath(path: string): void {
  localStorage.setItem('pixel-forge-project-path', path)
}

// ============================================================================
// Store
// ============================================================================

export const useLiveEditorStore = create<LiveEditorChatStore>((set, get) => ({
  // Initial state
  messages: [],
  sessionId: getStoredSessionId(),
  isStreaming: false,
  currentStreamContent: '',
  currentTool: null,
  ws: null,
  connected: false,
  selectedElements: [],
  maxSelectedElements: 10,
  projectPath: getStoredProjectPath(),

  // -------------------------------------------------------------------------
  // Connection Management
  // -------------------------------------------------------------------------

  connect: (endpoint = '/ws/live-editor') => {
    const { ws } = get()
    if (ws && ws.readyState === WebSocket.OPEN) return

    const wsUrl = `ws://${window.location.hostname}:7001${endpoint}`
    const newWs = new WebSocket(wsUrl)

    newWs.onopen = () => {
      set({ connected: true })
      console.log('[live-editor] WebSocket connected')
    }

    newWs.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'chunk':
          // Streaming text content
          set((state) => ({
            currentStreamContent: state.currentStreamContent + data.content,
          }))
          break

        case 'tool_use':
          // Tool execution started
          const toolActivity: ToolActivity = {
            id: generateId(),
            tool: data.tool,
            input: data.input,
            status: 'running',
          }
          set((state) => ({
            currentTool: toolActivity,
            messages: [
              ...state.messages,
              {
                id: toolActivity.id,
                role: 'tool',
                content: '',
                timestamp: new Date(),
                toolActivity,
              },
            ],
          }))
          break

        case 'tool_result':
          // Tool execution completed
          const { currentTool, messages } = get()
          if (currentTool) {
            const updatedMessages = messages.map((msg) =>
              msg.id === currentTool.id
                ? {
                    ...msg,
                    toolActivity: {
                      ...currentTool,
                      result: data.content,
                      isError: data.is_error,
                      status: 'complete' as const,
                    },
                  }
                : msg
            )
            set({ messages: updatedMessages, currentTool: null })
          }
          break

        case 'complete':
          // Response complete
          const { currentStreamContent, messages: msgs } = get()
          if (currentStreamContent) {
            set({
              messages: [
                ...msgs,
                {
                  id: generateId(),
                  role: 'assistant',
                  content: currentStreamContent,
                  timestamp: new Date(),
                },
              ],
              currentStreamContent: '',
              isStreaming: false,
            })
          } else {
            set({ isStreaming: false })
          }
          // Store session ID if returned
          if (data.session_id) {
            storeSessionId(data.session_id)
            set({ sessionId: data.session_id })
          }
          break

        case 'error':
          set({
            messages: [
              ...get().messages,
              {
                id: generateId(),
                role: 'assistant',
                content: `Error: ${data.message}`,
                timestamp: new Date(),
              },
            ],
            isStreaming: false,
            currentStreamContent: '',
          })
          break

        case 'status':
          // Status updates (e.g., "Finding element...")
          // Could add to a separate statusMessage state if needed
          console.log('[live-editor] Status:', data.message)
          break
      }
    }

    newWs.onclose = () => {
      set({ ws: null, connected: false })
      console.log('[live-editor] WebSocket disconnected')
    }

    newWs.onerror = (error) => {
      console.error('[live-editor] WebSocket error:', error)
    }

    set({ ws: newWs })
  },

  disconnect: () => {
    get().ws?.close()
    set({ ws: null, connected: false })
  },

  // -------------------------------------------------------------------------
  // Chat Actions
  // -------------------------------------------------------------------------

  sendMessage: (content: string) => {
    const { ws, sessionId, messages, projectPath, buildElementContext } = get()

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      get().connect()
      setTimeout(() => get().sendMessage(content), 500)
      return
    }

    if (!projectPath) {
      set({
        messages: [
          ...messages,
          {
            id: generateId(),
            role: 'assistant',
            content: 'Error: No project path configured. Please set a project path first.',
            timestamp: new Date(),
          },
        ],
      })
      return
    }

    // Build element context
    const elementContext = buildElementContext()

    // Add user message to chat
    set({
      messages: [
        ...messages,
        {
          id: generateId(),
          role: 'user',
          content,
          timestamp: new Date(),
        },
      ],
      isStreaming: true,
      currentStreamContent: '',
    })

    // Send to backend - only include session_id if it's a valid UUID
    const payload: Record<string, unknown> = {
      message: content,
      project_path: projectPath,
      element_context: elementContext,
    }

    // Only include session_id if it's valid
    if (sessionId && isValidUUID(sessionId)) {
      payload.session_id = sessionId
    }

    ws.send(JSON.stringify(payload))
  },

  clearMessages: () => {
    set({ messages: [], currentStreamContent: '' })
  },

  newSession: () => {
    localStorage.removeItem('pixel-forge-live-editor-session')
    set({
      sessionId: null,
      messages: [],
      currentStreamContent: '',
      selectedElements: [],
    })
  },

  // -------------------------------------------------------------------------
  // Selection Actions (task_2_3)
  // -------------------------------------------------------------------------

  addElement: (element) => {
    const { selectedElements, maxSelectedElements } = get()

    // Check if already selected (by xpath)
    if (selectedElements.some(e => e.xpath === element.xpath)) {
      console.log('[live-editor] Element already selected')
      return
    }

    // Enforce max limit
    if (selectedElements.length >= maxSelectedElements) {
      console.warn(`[live-editor] Max ${maxSelectedElements} elements allowed`)
      return
    }

    const newElement: SelectedElement = {
      ...element,
      id: generateId(),
      timestamp: new Date(),
    }

    set({ selectedElements: [...selectedElements, newElement] })
  },

  removeElement: (id: string) => {
    set((state) => ({
      selectedElements: state.selectedElements.filter((e) => e.id !== id),
    }))
  },

  clearElements: () => {
    set({ selectedElements: [] })
  },

  setProjectPath: (path: string) => {
    storeProjectPath(path)
    set({ projectPath: path })
  },

  // -------------------------------------------------------------------------
  // Context Building
  // -------------------------------------------------------------------------

  buildElementContext: () => {
    const { selectedElements } = get()

    if (selectedElements.length === 0) {
      return ''
    }

    if (selectedElements.length === 1) {
      const el = selectedElements[0]
      return `<selected-element>
<tag>${el.tagName}</tag>
${el.elementId ? `<id>${el.elementId}</id>` : ''}
${el.classList.length > 0 ? `<classes>${el.classList.join(' ')}</classes>` : ''}
<xpath>${el.xpath}</xpath>
<html>
${el.outerHTML.slice(0, 2000)}${el.outerHTML.length > 2000 ? '... (truncated)' : ''}
</html>
</selected-element>`
    }

    // Multiple elements
    return selectedElements
      .map((el, index) => {
        return `<selected-element index="${index + 1}">
<tag>${el.tagName}</tag>
${el.elementId ? `<id>${el.elementId}</id>` : ''}
${el.classList.length > 0 ? `<classes>${el.classList.join(' ')}</classes>` : ''}
<xpath>${el.xpath}</xpath>
<html>
${el.outerHTML.slice(0, 1000)}${el.outerHTML.length > 1000 ? '... (truncated)' : ''}
</html>
</selected-element>`
      })
      .join('\n\n')
  },
}))
