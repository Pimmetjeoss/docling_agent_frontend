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
      { period: "Today", conversations: [] },
      { period: "Yesterday", conversations: [] },
      { period: "Last 7 days", conversations: [] },
      { period: "Older", conversations: [] },
    ]

    conversations.forEach((conv) => {
      const convDate = new Date(conv.updated_at)
      if (convDate >= today) {
        groups[0].conversations.push(conv)
      } else if (convDate >= yesterday) {
        groups[1].conversations.push(conv)
      } else if (convDate >= lastWeek) {
        groups[2].conversations.push(conv)
      } else {
        groups[3].conversations.push(conv)
      }
    })

    return groups.filter((group) => group.conversations.length > 0)
  }

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <div className="bg-primary/10 size-8 rounded-md"></div>
          <div className="text-md font-base text-primary tracking-tight">
            Docling RAG
          </div>
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
  onConversationCreated: (id: string) => void
  onRefreshConversations: () => void
  onNewChat: () => void
}

function ChatContent({ conversationId, onConversationCreated, onRefreshConversations, onNewChat }: ChatContentProps) {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadConversationMessages(conversationId)
    } else {
      // Clear messages when starting new chat
      console.log('Clearing messages for new chat')
      setChatMessages([])
    }
  }, [conversationId])

  const loadConversationMessages = async (convId: string) => {
    try {
      console.log('Loading messages for conversation:', convId)
      const response = await fetch(`/api/conversations/${convId}/messages`)
      if (response.ok) {
        const messages = await response.json()
        console.log('Loaded messages:', messages.length)
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

  const handleSubmit = async () => {
    if (!prompt.trim()) return

    const userPrompt = prompt.trim()
    setPrompt("")
    setIsLoading(true)

    // Add user message immediately
    const newUserMessage = {
      id: chatMessages.length + 1,
      role: "user",
      content: userPrompt,
    }

    console.log('Adding user message:', newUserMessage)
    setChatMessages([...chatMessages, newUserMessage])
    console.log('Current messages after adding user:', chatMessages.length + 1)

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

      let assistantMessage = ""
      const assistantMessageId = chatMessages.length + 2

      // Add empty assistant message that we'll update
      console.log('Adding empty assistant message')
      setChatMessages(prev => {
        const newMessages = [...prev, {
          id: assistantMessageId,
          role: "assistant",
          content: ""
        }]
        console.log('Messages after adding assistant:', newMessages.length)
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
                // New conversation created
                newConversationId = data.conversation_id
                console.log('Conversation created:', newConversationId)
                onConversationCreated(newConversationId)
              } else if (data.type === 'token') {
                assistantMessage += data.content

                // Update the assistant message with accumulated content
                setChatMessages(prev => {
                  const updated = [...prev]
                  const lastMessage = updated[updated.length - 1]
                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.content = assistantMessage
                  }
                  console.log('Updated assistant message, length:', assistantMessage.length)
                  return updated
                })
              } else if (data.type === 'done') {
                console.log('Stream complete, final message length:', assistantMessage.length)
                setIsLoading(false)
                // Refresh conversation list to update last message
                onRefreshConversations()
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
        <div className="text-foreground">Project roadmap discussion</div>
      </header>

      <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {chatMessages.map((message, index) => {
              const isAssistant = message.role === "assistant"
              const isLastMessage = index === chatMessages.length - 1

              return (
                <Message
                  key={message.id}
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
      console.log('Loading conversations for user:', USER_ID)
      const response = await fetch(`/api/conversations?user_id=${USER_ID}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded conversations:', data.length, data)
        setConversations(data)
      } else {
        console.error('Failed to load conversations, status:', response.status)
      }
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

  const handleConversationCreated = (id: string) => {
    console.log('handleConversationCreated called with id:', id)
    setCurrentConversationId(id)
    loadConversations()
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