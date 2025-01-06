interface AIResponse {
    type: 'assistant';
    content: string;
  }
  
  interface ErrorResponse {
    error: string;
  }
  
  export async function sendChatMessage(
    question: string,
    documents: File[]
  ): Promise<AIResponse> {
    try {
      const formData = new FormData();
      
      // Add documents to form data
      documents.forEach((doc, index) => {
        formData.append(`pdf${index + 1}`, doc);
      });
      
      // Add question to form data
      formData.append('question', question);
  
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }
  
      const data = await response.json();
      return {
        type: 'assistant',
        content: data.response
      };
    } catch (error) {
      console.error('Error in sendChatMessage:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process request');
    }
  }
  
  // File size validation (optional)
  export function validateFileSize(file: File, maxSizeMB: number = 4): boolean {
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    return file.size <= maxSize;
  }
  
  // File type validation (optional)
  export function validateFileType(file: File): boolean {
    return file.type === 'application/pdf';
  }
  
  // Utility function to handle file validation
  export function validateFile(file: File, maxSizeMB: number = 4): { valid: boolean; error?: string } {
    if (!validateFileType(file)) {
      return { valid: false, error: 'Only PDF files are allowed' };
    }
    
    if (!validateFileSize(file, maxSizeMB)) {
      return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
    }
  
    return { valid: true };
  }