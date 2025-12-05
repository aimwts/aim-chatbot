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
  video?: {
    uri: string;
    mimeType?: string;
  };
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

// Type definition for the AI Studio global object
declare global {
  // Augment the AIStudio interface which is expected by the environment's type definitions.
  // This avoids conflicts with the existing 'window.aistudio' declaration.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}
