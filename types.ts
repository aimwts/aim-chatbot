export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Attachment {
  inlineData: {
    data: string; // Base64 encoded string
    mimeType: string;
  };
  previewUri?: string; // For displaying in the UI
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  groundingSources?: GroundingSource[];
  isError?: boolean;
  feedback?: 'up' | 'down';
  attachment?: Attachment;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}