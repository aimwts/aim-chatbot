import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../types';

interface ChatInputProps {
  onSend: (message: string, attachment?: Attachment) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | undefined>(undefined);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;
    
    onSend(input, attachment);
    setInput('');
    setAttachment(undefined);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
             // reader.result is like "data:image/png;base64,....."
             // We need to extract the base64 part for the API, but keep full string for preview
             resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Split to get pure base64
        const [meta, data] = base64Data.split(',');
        const mimeType = meta.split(':')[1].split(';')[0];

        setAttachment({
          inlineData: {
            data: data,
            mimeType: mimeType
          },
          previewUri: base64Data
        });
      } catch (err) {
        console.error("Error reading file:", err);
      }
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = () => {
    setAttachment(undefined);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => {
        const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + spacer + transcript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-6 pt-2">
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-lg ring-1 ring-white/5 focus-within:ring-primary-500/50 transition-all">
        
        {/* Attachment Preview */}
        {attachment && (
          <div className="p-3 pb-0">
            <div className="relative inline-block">
              <img 
                src={attachment.previewUri} 
                alt="Upload preview" 
                className="h-16 w-16 object-cover rounded-lg border border-gray-600"
              />
              <button
                onClick={removeAttachment}
                className="absolute -top-2 -right-2 bg-gray-700 text-gray-300 rounded-full p-0.5 hover:bg-gray-600 border border-gray-500 transition-colors"
                title="Remove image"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 p-2">
          {/* File Input Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={`
              mb-1 p-2 rounded-lg transition-colors flex-shrink-0
              ${isLoading 
                ? 'text-gray-600 cursor-not-allowed' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }
            `}
            title="Attach image"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/webp, image/heic"
              onChange={handleFileSelect}
            />
          </button>

          {/* Microphone Button */}
          <button
            onClick={toggleListening}
            disabled={isLoading}
            className={`
              mb-1 p-2 rounded-lg transition-all flex-shrink-0 relative
              ${isLoading 
                ? 'text-gray-600 cursor-not-allowed' 
                : isListening
                  ? 'text-red-500 bg-red-500/10 animate-pulse'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }
            `}
            title={isListening ? "Stop recording" : "Use microphone"}
          >
            <svg className="w-5 h-5" fill={isListening ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {isListening && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            )}
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Ask anything..."}
            className="w-full bg-transparent text-gray-100 placeholder-gray-500 text-base p-3 resize-none focus:outline-none max-h-[150px] overflow-y-auto"
            rows={1}
            disabled={isLoading}
          />
          
          <button
            onClick={() => handleSubmit()}
            disabled={(!input.trim() && !attachment) || isLoading}
            className={`
              mb-1 p-2 rounded-lg transition-colors flex-shrink-0
              ${(!input.trim() && !attachment) || isLoading 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-primary-600 text-white hover:bg-primary-500 shadow-sm'
              }
            `}
            aria-label="Send message"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className="text-center mt-2">
        <p className="text-xs text-gray-500">
          Gemini can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
};