import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { GroundingSource, Attachment } from "../types";

// Maintain a singleton chat session instance in memory
let chatSession: Chat | null = null;

/**
 * Resets the current chat session. Useful when the user clears the chat or reloads.
 */
export const resetSession = () => {
  chatSession = null;
};

/**
 * Streams a response from the Gemini model based on the provided prompt.
 * Uses `ai.chats.create` for text-only context.
 * Uses `ai.models.generateContentStream` with `gemini-3-pro-preview` for image analysis.
 * 
 * @param prompt The user's input question.
 * @param attachment Optional image attachment for analysis.
 * @param onChunk Callback function to handle each chunk of text and optional grounding sources.
 */
export const streamGeminiResponse = async (
  prompt: string,
  attachment: Attachment | undefined,
  onChunk: (text: string, sources?: GroundingSource[]) => void
): Promise<void> => {
  // CRITICAL: Initialize AI client here to ensure we grab the latest API key 
  // from process.env after the user has completed the selection flow.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please select an API key.");
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    let responseStream;

    // Route 1: Image Analysis (Single turn, specialized model)
    if (attachment) {
      // Use gemini-3-pro-preview for image understanding as requested
      responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
             // Wrap inlineData in an object as required by the new SDK structure for some models
             // or simply pass the inlineData object if the SDK expects it directly in parts.
             // Based on latest usage:
            { inlineData: attachment.inlineData }, 
            { text: prompt }
          ]
        }
      });
    } 
    // Route 2: Text Chat (Context-aware, Flash model)
    else {
      // Initialize chat session if it doesn't exist
      if (!chatSession) {
        chatSession = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: "You are a helpful, knowledgeable, and concise AI assistant. Provide clear and accurate answers.",
            thinkingConfig: { thinkingBudget: 0 }, 
            tools: [{ googleSearch: {} }],
          }
        });
      }

      // Send message to the existing chat session
      responseStream = await chatSession.sendMessageStream({
        message: prompt
      });
    }

    // Process the stream (common for both routes)
    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      const text = c.text || '';
      
      let sources: GroundingSource[] | undefined;
      const groundingChunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      if (groundingChunks) {
        sources = groundingChunks
          .map((chunk: any) => chunk.web)
          .filter((web: any) => web)
          .map((web: any) => ({ title: web.title, uri: web.uri }));
      }

      onChunk(text, sources);
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    let errorMessage = "An unexpected error occurred. Please try again.";
    
    if (error.message) {
        if (error.message.includes("429")) {
            errorMessage = "You are sending requests too quickly. Please wait a moment before trying again.";
        } else if (error.message.includes("503")) {
            errorMessage = "The AI service is currently overloaded. Please try again in a few seconds.";
        } else if (error.message.includes("API key")) {
            errorMessage = "There is an issue with the API configuration. Please check the API key.";
        } else if (error.message.includes("SAFETY")) {
             errorMessage = "I cannot generate a response to that request due to safety guidelines.";
        } else {
            errorMessage = `Error: ${error.message}`;
        }
    }

    throw new Error(errorMessage);
  }
};

export const generateVideo = async (prompt: string): Promise<string> => {
  // CRITICAL: Initialize AI client here
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please select an API key.");
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
      throw new Error("No video URI returned from the model.");
    }

    // The URI requires the API key to be appended
    return `${videoUri}&key=${apiKey}`;

  } catch (error: any) {
    console.error("Gemini Video Generation Error:", error);
    throw new Error("Failed to generate video. Please try again.");
  }
};