/**
 * ChatMessages Component
 *
 * Displays chat messages with markdown rendering, streaming indicator,
 * and tool activity cards.
 *
 * Pattern: Adapted from aim-up/dashboard/frontend/src/components/chat/ChatMessages.tsx
 */

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLiveEditorStore } from './store/chat-store'
import { ToolCard } from './ToolCard'

export function ChatMessages() {
  const { messages, isStreaming, currentStreamContent } = useLiveEditorStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentStreamContent])

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-4 space-y-4">
        {/* Empty state */}
        {messages.length === 0 && !isStreaming && (
          <div className="py-4">
            <p className="text-muted-foreground">
              Select elements and describe what to change.
            </p>
            <p className="text-sm text-muted-foreground/60 mt-2">
              Claude will find and edit the source files.
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'tool' && msg.toolActivity ? (
              <ToolCard activity={msg.toolActivity} />
            ) : (
              <div
                className={
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl px-4 py-3 ml-8'
                    : 'bg-muted rounded-2xl px-4 py-3 mr-8'
                }
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && currentStreamContent && (
          <div className="bg-muted rounded-2xl px-4 py-3 mr-8">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              <ReactMarkdown>{currentStreamContent}</ReactMarkdown>
            </div>
            <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-1" />
          </div>
        )}

        {/* Loading indicator */}
        {isStreaming && !currentStreamContent && (
          <div className="bg-muted rounded-2xl px-4 py-3 mr-8">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
