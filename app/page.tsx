"use client"

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container"
import {
  Message,
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
import {
  ArrowUp,
  Copy,
  Globe,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  PlusIcon,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"
import { useRef, useState, useEffect } from "react"

// Temporary user ID (replace with actual auth later)
const USER_ID = "00000000-0000-0000-0000-000000000001"

interface Conversation {
  id: string
  title: string
  last_message: string | null
  updated_at: string
}

interface ChatSidebarProps {
  conversations: Conversation[]
  currentConversationId: string | null
  onNewChat: () => void
  onSelectConversation: (id: string) => void
}

function ChatSidebar({ conversations, currentConversationId, onNewChat, onSelectConversation }: ChatSidebarProps) {
  // Group conversations by time period
  const groupedConversations = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    const groups: { period: string; conversations: Conversation[] }[] = [
      { period: "Laatste gesprekken", conversations: [] },
      { period: "Yesterday", conversations: [] },
      { period: "Older", conversations: [] },
    ]

    conversations.forEach((conv) => {
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
  }

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <img src="/Contiweb_rag.png" alt="Contiweb RAG" className="h-12" />
        </div>
        <Button variant="ghost" className="size-8">
          <Search className="size-4" />
        </Button>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <div className="px-4">
          <Button
            variant="outline"
            className="mb-4 flex w-full items-center gap-2"
            onClick={onNewChat}
          >
            <PlusIcon className="size-4" />
            <span>New Chat</span>
          </Button>
        </div>
        {groupedConversations().map((group) => (
          <SidebarGroup key={group.period}>
            <SidebarGroupLabel>{group.period}</SidebarGroupLabel>
            <SidebarMenu>
              {group.conversations.map((conversation) => (
                <SidebarMenuButton
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  isActive={currentConversationId === conversation.id}
                >
                  <span>{conversation.title}</span>
                </SidebarMenuButton>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}

interface ChatContentProps {
  conversationId: string | null
  onConversationCreated: (id: string) => Promise<void>
  onRefreshConversations: () => Promise<void>
  onNewChat: () => void
}

function ChatContent({ conversationId, onConversationCreated, onRefreshConversations, onNewChat }: ChatContentProps) {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const assistantMessageRef = useRef("")

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadConversationMessages(conversationId)
    } else {
      // Clear messages when starting new chat
      setChatMessages([])
    }
  }, [conversationId])

  const loadConversationMessages = async (convId: string) => {
    try {
      const response = await fetch(`/api/conversations/${convId}/messages`)
      if (response.ok) {
        const messages = await response.json()
        setChatMessages(messages.map((msg: any, idx: number) => ({
          id: idx + 1,
          role: msg.role,
          content: msg.content
        })))
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) return

    const userPrompt = prompt.trim()
    setPrompt("")
    setIsLoading(true)

    // Add user message immediately
    setChatMessages(prev => {
      const newUserMessage = {
        id: prev.length + 1,
        role: "user",
        content: userPrompt,
      }
      return [...prev, newUserMessage]
    })

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
        const newMessages = [...prev, {
          id: assistantMessageId,
          role: "assistant",
          content: ""
        }]
        return newMessages
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
              const data = JSON.parse(line.slice(6))

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
      setChatMessages(prev => [...prev, {
        id: chatMessages.length + 2,
        role: "assistant",
        content: "Sorry, er is een fout opgetreden bij het verwerken van je vraag."
      }])

      setIsLoading(false)
    }
  }

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
                <Message
                  key={`${message.id}-${message.content?.length || 0}`}
                  className={cn(
                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                    isAssistant ? "items-start" : "items-end"
                  )}
                >
                  {isAssistant ? (
                    <div className="group flex w-full flex-col gap-0">
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
                        <MessageAction tooltip="Copy" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => handleCopy(message.content)}
                          >
                            <Copy />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Upvote" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <ThumbsUp />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Downvote" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <ThumbsDown />
                          </Button>
                        </MessageAction>
                      </MessageActions>
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
                        <MessageAction tooltip="Edit" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <Pencil />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Delete" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <Trash />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Copy" delayDuration={100}>
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
                </Message>
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
                placeholder="Ask anything"
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
              />

              <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="Add a new action">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Plus size={18} />
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="Search">
                    <Button variant="outline" className="rounded-full">
                      <Globe size={18} />
                      Search
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="More actions">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <MoreHorizontal size={18} />
                    </Button>
                  </PromptInputAction>
                </div>
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="Voice input">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Mic size={18} />
                    </Button>
                  </PromptInputAction>

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
                </div>
              </PromptInputActions>
            </div>
          </PromptInput>
        </div>
      </div>
    </main>
  )
}

export default function FullChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const response = await fetch(`/api/conversations?user_id=${USER_ID}`)

      if (!response.ok) {
        console.error('Failed to load conversations, status:', response.status)
        return
      }

      const data = await response.json()
      setConversations(data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const handleNewChat = () => {
    setCurrentConversationId(null)
  }

  const handleNewChatWithClear = () => {
    handleNewChat()
  }

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id)
  }

  const handleConversationCreated = async (id: string) => {
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
  }

  return (
    <SidebarProvider>
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
      />
      <SidebarInset>
        <ChatContent
          conversationId={currentConversationId}
          onConversationCreated={handleConversationCreated}
          onRefreshConversations={loadConversations}
          onNewChat={handleNewChatWithClear}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}