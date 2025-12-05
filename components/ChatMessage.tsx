import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
  onRetry?: (messageId: string) => void;
  onFeedback?: (messageId: string, type: 'up' | 'down') => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRetry, onFeedback }) => {
  const isUser = message.role === Role.USER;
  const isError = message.isError;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`
          max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-2xl px-5 py-4 shadow-md transition-all group relative
          ${isUser 
            ? 'bg-primary-600 text-white rounded-br-none' 
            : isError
              ? 'bg-red-900/20 text-red-200 border border-red-800 rounded-bl-none'
              : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
          }
        `}
      >
        <div className="flex items-center justify-between mb-1 min-h-[20px]">
          <div className={`text-xs font-semibold uppercase tracking-wider ${isError ? 'text-red-400' : 'opacity-50'}`}>
            {isUser ? 'You' : isError ? 'Error' : 'Gemini'}
          </div>
          
          {/* Actions: Feedback & Copy - only for AI messages that aren't errors */}
          {!isUser && !isError && (
            <div className="flex items-center gap-1">
              {/* Thumbs Up */}
              <button
                onClick={() => onFeedback?.(message.id, 'up')}
                className={`
                  p-1.5 rounded-md transition-all duration-200
                  ${message.feedback === 'up'
                    ? 'text-green-400 bg-green-400/10 opacity-100'
                    : 'text-gray-500 hover:text-green-300 hover:bg-gray-700/50 opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }
                `}
                title="Good response"
                aria-label="Thumbs up"
              >
                <svg className="w-3.5 h-3.5" fill={message.feedback === 'up' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>

              {/* Thumbs Down */}
              <button
                onClick={() => onFeedback?.(message.id, 'down')}
                className={`
                  p-1.5 rounded-md transition-all duration-200
                  ${message.feedback === 'down'
                    ? 'text-orange-400 bg-orange-400/10 opacity-100'
                    : 'text-gray-500 hover:text-orange-300 hover:bg-gray-700/50 opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }
                `}
                title="Bad response"
                aria-label="Thumbs down"
              >
                <svg className="w-3.5 h-3.5" fill={message.feedback === 'down' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l2.969.94m-7.472 10V19a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </button>

              {/* Divider */}
              <div className="w-px h-3 bg-gray-700 mx-1 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className={`
                  p-1.5 rounded-md transition-all duration-200 
                  ${copied 
                    ? 'text-blue-400 bg-blue-400/10 opacity-100' 
                    : 'text-gray-500 hover:text-gray-200 hover:bg-gray-700/50 opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }
                `}
                title="Copy to clipboard"
                aria-label="Copy to clipboard"
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
        
        {/* Render Attachment if present */}
        {message.attachment && (
          <div className="mb-3">
             <img 
               src={message.attachment.previewUri} 
               alt="User attachment" 
               className="rounded-lg max-h-60 max-w-full border border-white/20"
             />
          </div>
        )}

        <div className="leading-relaxed break-words text-sm md:text-base font-light">
           <ReactMarkdown
             components={{
               // Headings
               h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
               h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
               h3: ({node, ...props}) => <h3 className="text-base font-bold mt-3 mb-1" {...props} />,
               // Lists
               ul: ({node, ...props}) => <ul className="list-disc ml-5 my-2 space-y-1" {...props} />,
               ol: ({node, ...props}) => <ol className="list-decimal ml-5 my-2 space-y-1" {...props} />,
               li: ({node, ...props}) => <li className="pl-1" {...props} />,
               // Links
               a: ({node, ...props}) => (
                 <a 
                   className={`underline hover:no-underline transition-colors ${isUser ? 'text-white' : 'text-blue-400'}`} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   {...props} 
                 />
               ),
               // Code blocks and inline code
               code({node, inline, className, children, ...props}: any) {
                 const match = /language-(\w+)/.exec(className || '');
                 return !inline ? (
                   <div className={`my-3 rounded-lg overflow-hidden border ${isUser ? 'bg-primary-700 border-primary-500' : 'bg-gray-900 border-gray-700'}`}>
                     <div className="overflow-x-auto p-3 text-sm font-mono">
                       <code className={className} {...props}>
                         {children}
                       </code>
                     </div>
                   </div>
                 ) : (
                   <code 
                     className={`px-1.5 py-0.5 rounded text-sm font-mono ${isUser ? 'bg-primary-700' : 'bg-gray-700/50'}`} 
                     {...props}
                   >
                     {children}
                   </code>
                 );
               },
               // Blockquotes
               blockquote: ({node, ...props}) => (
                 <blockquote className={`border-l-4 pl-4 italic my-2 ${isUser ? 'border-primary-400' : 'border-gray-600'}`} {...props} />
               ),
               // Paragraphs (default spacing)
               p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
             }}
           >
             {message.content}
           </ReactMarkdown>

           {message.isStreaming && (
             <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-current animate-pulse" />
           )}
        </div>

        {/* Retry Button for Errors */}
        {isError && onRetry && (
           <div className="mt-3 pt-2 border-t border-red-800/50">
             <button 
               onClick={() => onRetry(message.id)}
               className="text-xs flex items-center gap-1.5 bg-red-900/40 hover:bg-red-800 text-red-100 px-3 py-1.5 rounded transition-colors"
             >
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
               </svg>
               Try Again
             </button>
           </div>
        )}

        {/* Display Sources for Model Responses */}
        {!isUser && !isError && message.groundingSources && message.groundingSources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-700/50">
            <p className="text-xs font-semibold mb-2 opacity-60 uppercase tracking-wide">Sources</p>
            <div className="flex flex-wrap gap-2">
              {message.groundingSources.map((source, idx) => (
                <a 
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-gray-900/40 hover:bg-gray-700 hover:text-white transition-colors px-3 py-1.5 rounded-md border border-gray-700/50 truncate max-w-full flex items-center gap-1.5"
                  title={source.title}
                >
                  <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0"></span>
                  <span className="truncate max-w-[180px]">{source.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};