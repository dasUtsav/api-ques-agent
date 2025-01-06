import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, X, FileText } from 'lucide-react';

const DocChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      type: 'system',
      content: 'Please upload the API documentation files (PDF) to begin.'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Utility functions moved from api.ts
  const validateFileSize = (file, maxSizeMB = 4) => {
    const maxSize = maxSizeMB * 1024 * 1024;
    return file.size <= maxSize;
  };

  const validateFileType = (file) => {
    return file.type === 'application/pdf';
  };

  const validateFile = (file) => {
    if (!validateFileType(file)) {
      return { valid: false, error: 'Only PDF files are allowed' };
    }
    
    if (!validateFileSize(file)) {
      return { valid: false, error: 'File size must be less than 4MB' };
    }

    return { valid: true };
  };

  const getAIResponse = async (question) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      documents.forEach((doc, index) => {
        formData.append(`pdf${index + 1}`, doc);
      });
      formData.append('question', question);

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      return {
        type: 'assistant',
        content: data.response
      };
    } catch (error) {
      return {
        type: 'system',
        content: error instanceof Error ? error.message : 'An error occurred while processing your request.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        setMessages(prev => [...prev, {
          type: 'system',
          content: validation.error || 'Invalid file'
        }]);
        return false;
      }
      return true;
    });

    if (pdfFiles.length + documents.length > 2) {
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'Maximum 2 PDF documents allowed. Please remove existing documents first.'
      }]);
      return;
    }

    if (files.length !== pdfFiles.length) {
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'Only PDF files are allowed.'
      }]);
    }

    if (pdfFiles.length > 0) {
      setDocuments(prev => [...prev, ...pdfFiles]);
      setMessages(prev => [...prev, {
        type: 'system',
        content: `Uploaded ${pdfFiles.length} PDF(s): ${pdfFiles.map(f => f.name).join(', ')}`
      }]);
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
    setMessages(prev => [...prev, {
      type: 'system',
      content: 'Document removed.'
    }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    if (documents.length === 0) {
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'Please upload PDF documentation files first.'
      }]);
      return;
    }

    const userMessage = {
      type: 'user',
      content: inputValue.trim()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    const aiResponse = await getAIResponse(inputValue);
    setMessages(prev => [...prev, aiResponse]);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg flex-1 flex flex-col overflow-hidden">
        {/* Header with document upload */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">API Documentation Assistant</h1>
            <div className="flex items-center gap-2">
              {documents.length < 2 && (
                <span className="text-sm">
                  {2 - documents.length} PDF{documents.length === 1 ? '' : 's'} remaining
                </span>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white flex items-center gap-2"
                disabled={documents.length >= 2}
              >
                <Upload size={20} />
                <span>Upload PDF</span>
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Document list */}
        {documents.length > 0 && (
          <div className="bg-gray-50 px-6 py-2 border-b">
            <div className="flex flex-wrap gap-2">
              {documents.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border"
                >
                  <FileText size={16} className="text-red-500" />
                  <span className="text-sm truncate max-w-[200px]">{doc.name}</span>
                  <button
                    onClick={() => removeDocument(index)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'system'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={documents.length === 0 
                ? "Upload PDF files to start asking questions..." 
                : "Ask a question about the API documentation..."}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={documents.length === 0}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
              disabled={documents.length === 0 || isLoading}
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocChatInterface;