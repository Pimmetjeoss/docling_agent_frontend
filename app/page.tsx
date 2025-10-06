"use client"

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container"
import {
  Message as MessageComponent,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { ScrollButton } from "@/components/ui/scroll-button"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Message, Conversation, BackendMessage, ChatStreamEvent } from "@/lib/types"
import {
  ArrowUp,
  Copy,
  PlusIcon,
  Search,
  X,
  Pencil,
  Trash2,
} from "lucide-react"
import { useRef, useState, useEffect, useCallback, useMemo, memo } from "react"

// Temporary user ID (replace with actual auth later)
const USER_ID = "00000000-0000-0000-0000-000000000001"

interface ChatSidebarProps {
  conversations: Conversation[]
  currentConversationId: string | null
  onNewChat: () => void
  onSelectConversation: (id: string) => void
  onRenameConversation: (id: string, newTitle: string) => void
  onDeleteConversation: (id: string) => void
}

function ChatSidebar({ conversations, currentConversationId, onNewChat, onSelectConversation, onRenameConversation, onDeleteConversation }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleStartRename = useCallback((conversation: Conversation) => {
    setEditingId(conversation.id)
    setEditTitle(conversation.title)
  }, [])

  const handleSaveRename = useCallback(() => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim())
      setEditingId(null)
      setEditTitle("")
    }
  }, [editingId, editTitle, onRenameConversation])

  const handleCancelRename = useCallback(() => {
    setEditingId(null)
    setEditTitle("")
  }, [])

  const handleDeleteClick = useCallback((id: string) => {
    if (confirm("Weet je zeker dat je dit gesprek wilt verwijderen?")) {
      onDeleteConversation(id)
    }
  }, [onDeleteConversation])

  // Filter conversations based on search query - memoized for performance
  const filteredConversations = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return conversations

    const query = debouncedSearchQuery.toLowerCase()
    return conversations.filter(conv =>
      conv.title.toLowerCase().includes(query)
    )
  }, [conversations, debouncedSearchQuery])

  // Group conversations by time period - memoized for performance
  const groupedConversations = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    const groups: { period: string; conversations: Conversation[] }[] = [
      { period: "Laatste gesprekken", conversations: [] },
      { period: "Gisteren", conversations: [] },
      { period: "Ouder", conversations: [] },
    ]

    filteredConversations.forEach((conv) => {
      const convDate = new Date(conv.updated_at)
      if (convDate >= today) {
        groups[0].conversations.push(conv)
      } else if (convDate >= yesterday) {
        groups[1].conversations.push(conv)
      } else {
        groups[2].conversations.push(conv)
      }
    })

    return groups.filter((group) => group.conversations.length > 0)
  }, [filteredConversations])

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-col gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <img src="/Contiweb_rag.png" alt="Contiweb RAG" className="h-12" />
        </div>
        <div className="relative px-2">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Zoek gesprekken..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 size-6 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <div className="px-4">
          <Button
            variant="outline"
            className="mb-4 flex w-full items-center gap-2"
            onClick={onNewChat}
          >
            <PlusIcon className="size-4" />
            <span>Nieuw gesprek</span>
          </Button>
        </div>
        {groupedConversations.map((group) => (
          <SidebarGroup key={group.period}>
            <SidebarGroupLabel>{group.period}</SidebarGroupLabel>
            <SidebarMenu>
              {group.conversations.map((conversation) => (
                <div key={conversation.id} className="group/conversation relative">
                  {editingId === conversation.id ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename()
                          if (e.key === "Escape") handleCancelRename()
                        }}
                        className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={handleSaveRename}
                      >
                        <X className="size-3 rotate-45" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={handleCancelRename}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <SidebarMenuButton
                        onClick={() => onSelectConversation(conversation.id)}
                        isActive={currentConversationId === conversation.id}
                        className="flex-1"
                      >
                        <span className="truncate">{conversation.title}</span>
                      </SidebarMenuButton>
                      <div className="flex gap-0 opacity-0 transition-opacity group-hover/conversation:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartRename(conversation)
                          }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(conversation.id)
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}

const MemoizedChatSidebar = memo(ChatSidebar)
MemoizedChatSidebar.displayName = "ChatSidebar"

interface ChatContentProps {
  conversationId: string | null
  onConversationCreated: (id: string) => Promise<void>
  onRefreshConversations: () => Promise<void>
  onNewChat: () => void
}

function ChatContent({ conversationId, onConversationCreated, onRefreshConversations, onNewChat }: ChatContentProps) {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const assistantMessageRef = useRef("")

  // Smart auto-scroll: only scroll if user is near bottom
  const scrollToBottomIfNeeded = useCallback(() => {
    const container = chatContainerRef.current
    if (!container) return

    // Check if user is near bottom (within 100px)
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100

    if (isNearBottom) {
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        })
      })
    }
  }, [])

  const loadConversationMessages = useCallback(async (convId: string) => {
    try {
      const response = await fetch(`/api/conversations/${convId}/messages`)
      if (response.ok) {
        const messages: BackendMessage[] = await response.json()
        setChatMessages(messages.map((msg, idx) => ({
          id: idx + 1,
          role: msg.role,
          content: msg.content
        })))
        // Scroll to bottom after loading messages
        setTimeout(() => scrollToBottomIfNeeded(), 100)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }, [scrollToBottomIfNeeded])

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadConversationMessages(conversationId)
    } else {
      // Clear messages when starting new chat
      setChatMessages([])
    }
  }, [conversationId, loadConversationMessages])

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) return

    const userPrompt = prompt.trim()
    setPrompt("")
    setIsLoading(true)

    // Add user message immediately
    setChatMessages(prev => {
      const newUserMessage: Message = {
        id: prev.length + 1,
        role: "user" as const,
        content: userPrompt,
      }
      return [...prev, newUserMessage]
    })

    // Scroll to show the user's message
    setTimeout(() => scrollToBottomIfNeeded(), 50)

    try {
      // Call the backend API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userPrompt,
          conversation_id: conversationId,
          user_id: USER_ID
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      // Reset assistant message ref for new response
      assistantMessageRef.current = ""

      // Add empty assistant message that we'll update
      setChatMessages(prev => {
        const assistantMessageId = prev.length + 1
        const newMessage: Message = {
          id: assistantMessageId,
          role: "assistant" as const,
          content: ""
        }
        return [...prev, newMessage]
      })

      let buffer = ""
      let newConversationId = conversationId

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Split by SSE message delimiter
        const lines = buffer.split('\n')
        buffer = lines.pop() || "" // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: ChatStreamEvent = JSON.parse(line.slice(6))

              if (data.type === 'conversation_id') {
                // New conversation created - just store it, don't update yet
                newConversationId = data.conversation_id
              } else if (data.type === 'token') {
                assistantMessageRef.current += data.content

                // Update the assistant message with accumulated content
                setChatMessages(prev => {
                  const updated = [...prev]
                  const lastIndex = updated.length - 1

                  if (updated[lastIndex]?.role === "assistant") {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: assistantMessageRef.current
                    }
                  }

                  return updated
                })

                // Auto-scroll during streaming
                scrollToBottomIfNeeded()
              } else if (data.type === 'done') {
                setIsLoading(false)

                // Now update conversation after streaming is done
                if (newConversationId && newConversationId !== conversationId) {
                  void onConversationCreated(newConversationId).catch((err) => {
                    console.error('Error updating conversation:', err)
                  })
                } else {
                  // Just refresh conversation list to update last message
                  void onRefreshConversations()
                }
              } else if (data.type === 'error') {
                console.error('Stream error:', data.message)
                throw new Error(data.message)
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE message:', line, parseError)
            }
          }
        }
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Chat error:', error)

      // Add error message
      const errorMessage: Message = {
        id: chatMessages.length + 2,
        role: "assistant" as const,
        content: "Sorry, er is een fout opgetreden bij het verwerken van je vraag."
      }
      setChatMessages(prev => [...prev, errorMessage])

      setIsLoading(false)
    }
  }, [prompt, conversationId, onConversationCreated, onRefreshConversations, scrollToBottomIfNeeded])

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {chatMessages.map((message, index) => {
              const isAssistant = message.role === "assistant"
              const isLastMessage = index === chatMessages.length - 1

              return (
                <MessageComponent
                  key={`${message.id}-${message.content?.length || 0}`}
                  className={cn(
                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                    isAssistant ? "items-start" : "items-end"
                  )}
                >
                  {isAssistant ? (
                    <div className="group flex w-full flex-col gap-0">
                      {message.content === "" && isLoading ? (
                        <div className="flex gap-1.5 px-4 py-3">
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                      ) : (
                        <>
                          <MessageContent
                            className="text-foreground prose flex-1 rounded-lg bg-transparent p-0"
                            markdown
                          >
                            {message.content}
                          </MessageContent>
                          <MessageActions
                            className={cn(
                              "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                              isLastMessage && "opacity-100"
                            )}
                          >
                            <MessageAction tooltip="Kopiëren" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                                onClick={() => handleCopy(message.content)}
                              >
                                <Copy />
                              </Button>
                            </MessageAction>
                          </MessageActions>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="group flex flex-col items-end gap-1">
                      <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                        {message.content}
                      </MessageContent>
                      <MessageActions
                        className={cn(
                          "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                        )}
                      >
                        <MessageAction tooltip="Kopiëren" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => handleCopy(message.content)}
                          >
                            <Copy />
                          </Button>
                        </MessageAction>
                      </MessageActions>
                    </div>
                  )}
                </MessageComponent>
              )
            })}
          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerRoot>
      </div>

      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            isLoading={isLoading}
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={handleSubmit}
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder="Vraag wat je wilt (Ctrl+Enter om te versturen)"
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
              />

              <PromptInputActions className="mt-5 flex w-full items-center justify-end gap-2 px-3 pb-3">
                <Button
                  size="icon"
                  disabled={!prompt.trim() || isLoading}
                  onClick={handleSubmit}
                  className="size-9 rounded-full"
                >
                  {!isLoading ? (
                    <ArrowUp size={18} />
                  ) : (
                    <span className="size-3 rounded-xs bg-white" />
                  )}
                </Button>
              </PromptInputActions>
            </div>
          </PromptInput>
        </div>
      </div>
    </main>
  )
}

const MemoizedChatContent = memo(ChatContent)
MemoizedChatContent.displayName = "ChatContent"

export default function FullChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations?user_id=${USER_ID}`)

      if (!response.ok) {
        console.error('Failed to load conversations, status:', response.status)
        return
      }

      const data: Conversation[] = await response.json()
      setConversations(data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }, [])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const handleNewChat = useCallback(() => {
    setCurrentConversationId(null)
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    setCurrentConversationId(id)
  }, [])

  const handleConversationCreated = useCallback(async (id: string) => {
    try {
      // Small delay to ensure backend has committed to database
      await new Promise(resolve => setTimeout(resolve, 200))

      // Load conversations first to update sidebar
      await loadConversations()

      // Then set the current conversation
      setCurrentConversationId(id)
    } catch (error) {
      console.error('Error in handleConversationCreated:', error)
    }
  }, [loadConversations])

  const handleRenameConversation = useCallback(async (id: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      })

      if (!response.ok) {
        throw new Error(`Failed to rename conversation: ${response.status}`)
      }

      // Reload conversations to reflect the change
      await loadConversations()
    } catch (error) {
      console.error('Error renaming conversation:', error)
      alert('Kan gesprek niet hernoemen. Probeer het opnieuw.')
    }
  }, [loadConversations])

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.status}`)
      }

      // If we deleted the current conversation, clear it
      if (currentConversationId === id) {
        setCurrentConversationId(null)
      }

      // Reload conversations to reflect the change
      await loadConversations()
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Kan gesprek niet verwijderen. Probeer het opnieuw.')
    }
  }, [currentConversationId, loadConversations])

  return (
    <SidebarProvider>
      <MemoizedChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <SidebarInset>
        <MemoizedChatContent
          conversationId={currentConversationId}
          onConversationCreated={handleConversationCreated}
          onRefreshConversations={loadConversations}
          onNewChat={handleNewChat}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}