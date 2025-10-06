// Message Types
export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface BackendMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// Conversation Types
export interface Conversation {
  id: string;
  title: string;
  last_message: string | null;
  updated_at: string;
  created_at?: string;
  user_id?: string;
}

// API Request Types
export interface ChatRequest {
  message: string;
  conversation_id?: string | null;
  user_id: string;
}

export interface CreateConversationRequest {
  user_id: string;
  title?: string;
}

// SSE Stream Event Types
export type StreamEventType = 'conversation_id' | 'token' | 'done' | 'error';

export interface StreamEvent {
  type: StreamEventType;
}

export interface ConversationIdEvent extends StreamEvent {
  type: 'conversation_id';
  conversation_id: string;
}

export interface TokenEvent extends StreamEvent {
  type: 'token';
  content: string;
}

export interface DoneEvent extends StreamEvent {
  type: 'done';
}

export interface ErrorEvent extends StreamEvent {
  type: 'error';
  message: string;
}

export type ChatStreamEvent = ConversationIdEvent | TokenEvent | DoneEvent | ErrorEvent;
