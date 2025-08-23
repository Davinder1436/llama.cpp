import React, { useState } from 'react';
import styled from 'styled-components';
import { Send, Loader, AlertCircle, MessageSquare, Sparkles } from 'lucide-react';

const PlaygroundContainer = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
  backdrop-filter: blur(20px);
`;

const PlaygroundHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 28px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const PlaygroundTitle = styled.h2`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
`;

const PlaygroundContent = styled.div`
  padding: 28px;
`;

const InputSection = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
`;

const PromptInput = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: ${props => props.hasError || props.hasResponse ? '24px' : '0'};
`;

const SubmitButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  min-width: 120px;
  justify-content: center;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CharCount = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ErrorAlert = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fca5a5;
  margin-bottom: 24px;
  
  .icon {
    flex-shrink: 0;
  }
`;

const ResponseSection = styled.div`
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 24px;
`;

const ResponseHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  color: #6ee7b7;
  font-weight: 500;
  font-size: 0.95rem;
`;

const ResponseText = styled.div`
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  white-space: pre-wrap;
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 0.95rem;
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  
  .spinner {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

function PromptPlayground({ onSubmit, isLoading, disabled, error, response }) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading && !disabled) {
      onSubmit(prompt.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <PlaygroundContainer>
      <PlaygroundHeader>
        <Sparkles size={24} />
        <PlaygroundTitle>AI Playground</PlaygroundTitle>
      </PlaygroundHeader>
      
      <PlaygroundContent>
        <form onSubmit={handleSubmit}>
          <InputSection>
            <Label htmlFor="prompt">Enter your prompt</Label>
            <PromptInput
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... (Press Ctrl/Cmd + Enter to submit)"
              disabled={disabled || isLoading}
              maxLength={2000}
            />
          </InputSection>

          <ActionRow hasError={!!error} hasResponse={!!response}>
            <CharCount>
              <MessageSquare size={14} />
              {prompt.length}/2000 characters
            </CharCount>
            
            <SubmitButton 
              type="submit" 
              disabled={!prompt.trim() || isLoading || disabled}
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="spinner" />
                  Generating...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Prompt
                </>
              )}
            </SubmitButton>
          </ActionRow>

          {error && (
            <ErrorAlert>
              <AlertCircle size={20} className="icon" />
              <div>
                <strong>Error:</strong> {error}
              </div>
            </ErrorAlert>
          )}

          {response && (
            <ResponseSection>
              <ResponseHeader>
                <Sparkles size={16} />
                Generated Response
              </ResponseHeader>
              <ResponseText>{response}</ResponseText>
            </ResponseSection>
          )}

          {isLoading && !response && (
            <LoadingIndicator>
              <Loader size={16} className="spinner" />
              Processing your request... This may take a moment.
            </LoadingIndicator>
          )}
        </form>
      </PlaygroundContent>
    </PlaygroundContainer>
  );
}

export default PromptPlayground;
