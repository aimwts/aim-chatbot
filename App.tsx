import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { streamGeminiResponse, resetSession, generateVideo } from './services/geminiService';
import { Message, Role, Attachment } from './types';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for API Key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          // Fallback for development outside of AI Studio environment
          // If process.env.API_KEY is present, we assume it's good.
          if (process.env.API_KEY) {
            setHasApiKey(true);
          }
        }
      } catch (e) {
        console.error("Error checking API key:", e);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkApiKey();
    resetSession();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success after the dialog interaction, as per instructions
      setHasApiKey(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Shared function to handle generating a response for a specific bot message ID
  const generateResponse = useCallback(async (prompt: string, attachment: Attachment | undefined, botMessageId: string) => {
    setIsLoading(true);
    
    try {
      // Check for Video Generation Request
      const lowerPrompt = prompt.toLowerCase();
      const isVideoRequest = !attachment && (
        lowerPrompt.includes("generate a video") || 
        lowerPrompt.includes("create a video") ||
        lowerPrompt.includes("make a video")
      );

      if (isVideoRequest) {
        setMessages((prev) => prev.map(msg => 
          msg.id === botMessageId ? { ...msg, content: "Generating video... This may take a moment." } : msg
        ));

        const videoUri = await generateVideo(prompt);
        
        setMessages((prev) => prev.map(msg => 
          msg.id === botMessageId ? { 
            ...msg, 
            content: "Here is your generated video:", 
            video: { uri: videoUri } 
          } : msg
        ));
      } else {
        // Standard Text/Image Analysis
        await streamGeminiResponse(prompt, attachment, (chunk, sources) => {
          setMessages((prev) => {
            return prev.map((msg) => {
              if (msg.id === botMessageId) {
                const updatedMsg = { ...msg, content: msg.content + chunk };
                
                // If we receive sources, attach them to the message
                if (sources && sources.length > 0) {
                  updatedMsg.groundingSources = sources;
                }
                
                return updatedMsg;
              }
              return msg;
            });
          });
        });
      }
    } catch (error: any) {
      console.error("Failed to generate response", error);
      
      // If error is about API key, reset UI state to force re-selection logic if needed
      if (error.message?.includes("API key")) {
         // Optionally reset hasApiKey to false here if you want to force the screen again
         // setHasApiKey(false);
      }

      // Reset the session to clear any invalid state on error
      resetSession();

      setMessages((prev) => 
        prev.map((msg) => {
          if (msg.id === botMessageId) {
            return {
              ...msg,
              content: error.message || "I'm sorry, I encountered an error while processing your request.",
              isStreaming: false,
              isError: true,
            };
          }
          return msg;
        })
      );
    } finally {
      // Remove streaming flag if it hasn't been handled by catch
      setMessages((prev) => 
        prev.map(msg => msg.id === botMessageId ? { ...msg, isStreaming: false } : msg)
      );
      setIsLoading(false);
    }
  }, []);

  const handleSendMessage = useCallback(async (text: string, attachment?: Attachment) => {
    const userMessage: Message = {
      id: uuidv4(),
      role: Role.USER,
      content: text,
      timestamp: Date.now(),
      attachment: attachment // store attachment for display
    };

    const botMessageId = uuidv4();
    const botMessagePlaceholder: Message = {
      id: botMessageId,
      role: Role.MODEL,
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, botMessagePlaceholder]);
    
    // Trigger generation
    await generateResponse(text, attachment, botMessageId);
  }, [generateResponse]);

  const handleRetry = useCallback(async (botMessageId: string) => {
    // Find the index of the failed bot message
    const botMsgIndex = messages.findIndex(m => m.id === botMessageId);
    if (botMsgIndex === -1) return;

    // Find the preceding user message to get the prompt again
    const previousMsg = messages[botMsgIndex - 1];
    if (!previousMsg || previousMsg.role !== Role.USER) {
      console.error("Could not find original user prompt for retry");
      return;
    }

    // Reset the bot message to a loading state
    setMessages(prev => prev.map(msg => {
      if (msg.id === botMessageId) {
        return {
          ...msg,
          content: '',
          isError: false,
          isStreaming: true,
          groundingSources: undefined,
          video: undefined
        };
      }
      return msg;
    }));

    // Re-run generation with the original prompt and attachment
    await generateResponse(previousMsg.content, previousMsg.attachment, botMessageId);

  }, [messages, generateResponse]);

  const handleFeedback = useCallback((messageId: string, type: 'up' | 'down') => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        // Toggle feedback if clicking the same button again
        const newFeedback = msg.feedback === type ? undefined : type;
        return { ...msg, feedback: newFeedback };
      }
      return msg;
    }));
  }, []);

  const handleClearChat = useCallback(() => {
    resetSession();
    setMessages([]);
  }, []);

  if (isCheckingKey) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center text-gray-400">
        <div className="animate-pulse">Checking configuration...</div>
      </div>
    );
  }

  // API Key Selection Screen
  if (!hasApiKey) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl text-center">
          <div className="w-16 h-16 bg-primary-600/20 rounded-xl flex items-center justify-center mx-auto mb-6 text-primary-500">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">API Key Required</h2>
          <p className="text-gray-400 mb-6 leading-relaxed">
            To use the AIM Chatbot, you need to select a Google Cloud Project with the Gemini API enabled.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
          >
            <span>Select API Key</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          <div className="mt-6 text-xs text-gray-500">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-gray-300 underline underline-offset-2"
            >
              Billing Information
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="flex-none p-4 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              AIM Chatbot
            </h1>
          </div>
          
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              disabled={isLoading}
              className={`
                text-sm px-3 py-1.5 rounded-md border transition-all flex items-center gap-2
                ${isLoading 
                  ? 'text-gray-600 border-transparent cursor-not-allowed' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800 border-transparent hover:border-gray-700'
                }
              `}
              title="Clear conversation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-gray-700 shadow-2xl">
                <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">How can I help you today?</h2>
              <p className="text-gray-400 max-w-md">
                Experience the speed of Gemini 2.5 Flash. Ask questions, analyze images, or get instant explanations.
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              {messages.map((msg) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  onRetry={msg.isError ? handleRetry : undefined}
                  onFeedback={handleFeedback}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-none bg-gradient-to-t from-gray-950 via-gray-950 to-transparent pt-4">
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
};

export default App;