import React, { useState } from 'react';
import styled from 'styled-components';
import { Send, Loader2 } from 'lucide-react';

const Container = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 30px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  color: white;
  margin: 0 0 20px 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const TextArea = styled.textarea`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 15px;
  color: white;
  font-size: 1rem;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const SubmitButton = styled.button`
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
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

const Examples = styled.div`
  margin-top: 15px;
`;

const ExamplesTitle = styled.h4`
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  font-weight: 500;
`;

const ExamplesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ExampleButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.8);
  padding: 6px 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const examplePrompts = [
  "What is artificial intelligence?",
  "Explain machine learning in simple terms",
  "How do neural networks work?",
  "What are the benefits of AI?",
  "Tell me about deep learning",
];

function PromptInput({ onSubmit, isLoading, disabled }) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading && !disabled) {
      onSubmit(prompt.trim());
    }
  };

  const handleExampleClick = (example) => {
    if (!disabled && !isLoading) {
      setPrompt(example);
    }
  };

  return (
    <Container>
      <Title>Enter Your Prompt</Title>
      <Form onSubmit={handleSubmit}>
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here... (e.g., 'What is artificial intelligence?')"
          disabled={disabled || isLoading}
        />
        <ButtonContainer>
          <SubmitButton 
            type="submit" 
            disabled={!prompt.trim() || isLoading || disabled}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send size={18} />
                Generate Response
              </>
            )}
          </SubmitButton>
        </ButtonContainer>
      </Form>

      <Examples>
        <ExamplesTitle>Try these examples:</ExamplesTitle>
        <ExamplesList>
          {examplePrompts.map((example, index) => (
            <ExampleButton
              key={index}
              onClick={() => handleExampleClick(example)}
              disabled={disabled || isLoading}
            >
              {example}
            </ExampleButton>
          ))}
        </ExamplesList>
      </Examples>
    </Container>
  );
}

export default PromptInput;
