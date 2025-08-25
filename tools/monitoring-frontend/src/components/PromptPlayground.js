import React, { useState } from 'react';
import styled from 'styled-components';
import { Send, Loader, AlertCircle, MessageSquare, Sparkles, Settings } from 'lucide-react';

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

// Sampling Configuration Section
const SamplingSection = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
`;

const SamplingHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
`;

const MethodSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
`;

const MethodButton = styled.button`
  background: ${props => props.active ? 
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
    'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.active ? '#667eea' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  color: white;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? 
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
      'rgba(255, 255, 255, 0.08)'};
    border-color: ${props => props.active ? '#667eea' : 'rgba(255, 255, 255, 0.2)'};
  }
`;

const ParametersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
`;

const ParameterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ParameterLabel = styled.label`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
`;

const ParameterInput = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: white;
  padding: 8px 12px;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ParameterDescription = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
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
  const [samplingConfig, setSamplingConfig] = useState({
    method: 'greedy',
    top_k: 40,
    top_p: 0.9,
    temperature: 0.8,
    min_p: 0.05,
    seed: Math.floor(Math.random() * 1000000)
  });

  const samplingMethods = [
    { key: 'greedy', label: 'Greedy', description: 'Always picks most likely token' },
    { key: 'top_k', label: 'Top-K', description: 'Sample from K most likely tokens' },
    { key: 'top_p', label: 'Top-P', description: 'Nucleus sampling' },
    { key: 'temperature', label: 'Temperature', description: 'Temperature scaling' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Enhanced sanitization of the prompt before submission
    let sanitizedPrompt;
    try {
      sanitizedPrompt = prompt
        // Remove control characters
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
        // Remove BOM and other zero-width characters
        .replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '')
        // Remove unpaired surrogates
        .replace(/[\uD800-\uDFFF]/g, '')
        // Normalize quotes to standard ASCII
        .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
        .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
        .trim();

      // Test JSON serialization
      JSON.stringify({ test: sanitizedPrompt });
    } catch (error) {
      console.error('Prompt sanitization failed:', error);
      return;
    }
      
    if (sanitizedPrompt && !isLoading && !disabled) {
      console.log('Submitting sanitized prompt:', sanitizedPrompt);
      console.log('Sampling config:', samplingConfig);
      onSubmit(sanitizedPrompt, samplingConfig);
    }
  };

  const handleInputChange = (e) => {
    // Enhanced filtering as users type
    const cleanValue = e.target.value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      .replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '')
      .replace(/[\uD800-\uDFFF]/g, '');
    setPrompt(cleanValue);
  };

  const handleSamplingChange = (key, value) => {
    setSamplingConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleMethodChange = (method) => {
    setSamplingConfig(prev => ({
      ...prev,
      method
    }));
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
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... (Press Ctrl/Cmd + Enter to submit)"
              disabled={disabled || isLoading}
              maxLength={2000}
            />
          </InputSection>

          <SamplingSection>
            <SamplingHeader>
              <Settings size={16} />
              Sampling Configuration
            </SamplingHeader>
            
            <MethodSelector>
              {samplingMethods.map(method => (
                <MethodButton
                  key={method.key}
                  type="button"
                  active={samplingConfig.method === method.key}
                  onClick={() => handleMethodChange(method.key)}
                >
                  {method.label}
                </MethodButton>
              ))}
            </MethodSelector>

            <ParametersGrid>
              {samplingConfig.method === 'top_k' && (
                <ParameterGroup>
                  <ParameterLabel>Top-K Value</ParameterLabel>
                  <ParameterInput
                    type="number"
                    min="1"
                    max="100"
                    value={samplingConfig.top_k}
                    onChange={(e) => handleSamplingChange('top_k', parseInt(e.target.value))}
                  />
                  <ParameterDescription>Number of top tokens to consider (1-100)</ParameterDescription>
                </ParameterGroup>
              )}

              {samplingConfig.method === 'top_p' && (
                <ParameterGroup>
                  <ParameterLabel>Top-P Value</ParameterLabel>
                  <ParameterInput
                    type="number"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={samplingConfig.top_p}
                    onChange={(e) => handleSamplingChange('top_p', parseFloat(e.target.value))}
                  />
                  <ParameterDescription>Cumulative probability threshold (0.1-1.0)</ParameterDescription>
                </ParameterGroup>
              )}

              {(samplingConfig.method === 'temperature' || samplingConfig.method === 'top_k' || samplingConfig.method === 'top_p') && (
                <ParameterGroup>
                  <ParameterLabel>Temperature</ParameterLabel>
                  <ParameterInput
                    type="number"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={samplingConfig.temperature}
                    onChange={(e) => handleSamplingChange('temperature', parseFloat(e.target.value))}
                  />
                  <ParameterDescription>Randomness factor (0.1=focused, 2.0=creative)</ParameterDescription>
                </ParameterGroup>
              )}

              <ParameterGroup>
                <ParameterLabel>Random Seed</ParameterLabel>
                <ParameterInput
                  type="number"
                  value={samplingConfig.seed}
                  onChange={(e) => handleSamplingChange('seed', parseInt(e.target.value))}
                />
                <ParameterDescription>For reproducible results</ParameterDescription>
              </ParameterGroup>
            </ParametersGrid>
          </SamplingSection>

          <ActionRow hasError={!!error} hasResponse={!!response}>
            <CharCount>
              <MessageSquare size={14} />
              {prompt.length}/2000 characters
            </CharCount>
            
            <SubmitButton 
              type="submit" 
              disabled={!prompt.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFEFF\u200B\u200C\u200D\u2060\uD800-\uDFFF]/g, '').trim() || isLoading || disabled}
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="spinner" />
                  🧠 Processing inference...
                  <div style={{ fontSize: '0.8rem', marginTop: '5px', opacity: '0.7' }}>
                    This may take 1-2 minutes as the model generates detailed logs
                  </div>
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Prompt ({samplingConfig.method})
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
                Generated Response (Method: {samplingConfig.method})
              </ResponseHeader>
              <ResponseText>{response}</ResponseText>
            </ResponseSection>
          )}

          {isLoading && !response && (
            <LoadingIndicator>
              <Loader size={16} className="spinner" />
              Processing your request using {samplingConfig.method} sampling...
            </LoadingIndicator>
          )}
        </form>
      </PlaygroundContent>
    </PlaygroundContainer>
  );
}

export default PromptPlayground;
