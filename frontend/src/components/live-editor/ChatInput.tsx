/**
 * ChatInput Component
 *
 * Auto-expanding textarea with send button for chat input.
 * Enter to send, Shift+Enter for newline.
 *
 * Pattern: Adapted from aim-up/dashboard/frontend/src/components/chat/ChatInput.tsx
 */

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLiveEditorStore } from './store/chat-store'

export function ChatInput() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage, isStreaming, selectedElements } = useLiveEditorStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [input])

  // Focus textarea on mount with delay to handle iframe focus conflicts
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Handle click on container to ensure focus reaches textarea
  const handleContainerClick = () => {
    textareaRef.current?.focus()
  }


  const canSubmit = input.trim() && !isStreaming
  const hasElements = selectedElements.length > 0

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border-t border-border flex-shrink-0 isolate relative z-50"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Element count indicator */}
      {hasElements && (
        <div className="text-xs text-muted-foreground mb-2">
          {selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''} selected
        </div>
      )}

      <div
        className="bg-muted rounded-xl relative cursor-text"
        style={{ pointerEvents: 'auto' }}
        onClick={handleContainerClick}
      >
        <div className="px-3 pt-3 pb-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasElements
                ? 'Describe what to change...'
                : 'Select an element first...'
            }
            disabled={isStreaming}
            rows={1}
            className="w-full resize-none bg-transparent text-sm focus:outline-none disabled:opacity-50 placeholder:text-muted-foreground/60 relative z-10"
            style={{ pointerEvents: 'auto' }}
          />
        </div>
        <div className="flex justify-between items-center px-2 pb-2">
          <span className="text-xs text-muted-foreground/50 pl-1">
            {isStreaming ? 'Claude is working...' : 'Enter to send'}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit}
            className="h-8 w-8 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
