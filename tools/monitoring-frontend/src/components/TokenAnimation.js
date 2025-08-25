import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { ArrowLeft, Play, Pause, RotateCcw, Zap, ArrowRight, Cpu } from 'lucide-react';

// Animations
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const typewriter = keyframes`
  from {
    border-right: 2px solid #10b981;
  }
  to {
    border-right: 2px solid transparent;
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.02);
    opacity: 1;
  }
`;

// Top-K specific animations
const topKFilter = keyframes`
  0% {
    transform: scale(1) rotate(0deg);
    filter: brightness(0.5);
  }
  50% {
    transform: scale(1.05) rotate(2deg);
    filter: brightness(1.2);
  }
  100% {
    transform: scale(1) rotate(0deg);
    filter: brightness(1);
  }
`;

const topKEliminate = keyframes`
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  50% {
    opacity: 0.3;
    transform: translateX(-10px);
  }
  100% {
    opacity: 0.2;
    transform: translateX(-20px) scale(0.8);
  }
`;

// Temperature scaling animations
const temperatureGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px rgba(255, 165, 0, 0.3);
    border-color: rgba(255, 165, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 15px rgba(255, 165, 0, 0.6);
    border-color: rgba(255, 165, 0, 0.8);
  }
`;

const temperatureFlow = keyframes`
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 100% 50%;
  }
`;

const probabilityShift = keyframes`
  0% {
    transform: scaleX(1);
  }
  50% {
    transform: scaleX(1.1);
  }
  100% {
    transform: scaleX(1);
  }
`;

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
  color: white;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
`;

const Header = styled.header`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px 0;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
`;

const Title = styled.h1`
  font-size: 1.8rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Controls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const SpeedControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px 12px;
`;

const SpeedLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
`;

const SpeedButton = styled.button`
  background: ${props => props.active ? 
    'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
    'rgba(255, 255, 255, 0.08)'};
  border: 1px solid ${props => props.active ? 
    'rgba(16, 185, 129, 0.5)' : 
    'rgba(255, 255, 255, 0.15)'};
  border-radius: 8px;
  color: ${props => props.active ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  padding: 6px 10px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 35px;
  
  &:hover {
    background: ${props => props.active ? 
      'linear-gradient(135deg, #059669 0%, #047857 100%)' : 
      'rgba(255, 255, 255, 0.12)'};
    border-color: ${props => props.active ? 
      'rgba(16, 185, 129, 0.7)' : 
      'rgba(255, 255, 255, 0.25)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ControlButton = styled.button`
  background: ${props => props.primary ? 
    'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
    'rgba(255, 255, 255, 0.1)'};
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  font-weight: 500;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px;
`;

const InputSection = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 30px;
  animation: ${fadeIn} 0.6s ease;
`;

const InputLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
`;

const InputText = styled.div`
  font-size: 1.2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.95);
  min-height: 40px;
  word-wrap: break-word;
`;

const ResponseArea = styled.div`
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 30px;
  margin-top: 20px;
  min-height: calc(100vh - 300px);
  position: relative;
  animation: ${fadeIn} 0.6s ease;
`;

const ResponseLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
`;

const ResponseText = styled.div`
  font-size: 1.4rem;
  line-height: 1.8;
  color: white;
  min-height: calc(100vh - 400px);
  font-family: 'Georgia', serif;
  position: relative;
  
  .cursor {
    animation: ${typewriter} 1s infinite;
    display: inline-block;
    width: 3px;
    height: 1.4em;
    background: #10b981;
    margin-left: 3px;
    vertical-align: text-bottom;
  }
`;

const ProcessingBox = styled.div`
  background: ${props => {
    switch(props.samplingMethod) {
      case 'top-k':
        return 'linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)';
      case 'temperature':
        return 'linear-gradient(135deg, #2d1b1b 0%, #4e2d1b 50%, #2d1b1b 100%)';
      default:
        return '#000000';
    }
  }};
  border: 2px solid ${props => {
    switch(props.samplingMethod) {
      case 'top-k':
        return '#7c3aed';
      case 'temperature':
        return '#f59e0b';
      default:
        return '#333333';
    }
  }};
  border-radius: 12px;
  padding: 16px;
  min-width: 320px;
  max-width: 450px;
  width: auto;
  min-height: 200px;
  max-height: ${props => props.samplingMethod === 'temperature' ? '500px' : '350px'};
  height: auto;
  position: fixed;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  ${props => props.cursorPosition && css`
    left: ${props.cursorPosition.x}px;
    top: ${props.cursorPosition.y}px;
    transition: all 0.3s ease;
  `}
  
  ${props => props.samplingMethod === 'top-k' && css`
    animation: ${topKFilter} 2s ease-in-out infinite;
  `}
  
  ${props => props.samplingMethod === 'temperature' && css`
    animation: ${temperatureGlow} 3s ease-in-out infinite;
    background-size: 200% 200%;
    background: linear-gradient(45deg, #2d1b1b, #4e2d1b, #6b2d1b, #4e2d1b);
    animation: ${temperatureGlow} 3s ease-in-out infinite, ${temperatureFlow} 4s linear infinite;
  `}
`;

const BoxHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #333333;
  flex-shrink: 0;
`;

const BoxTitle = styled.div`
  color: ${props => {
    switch(props.samplingMethod) {
      case 'top-k':
        return '#a855f7';
      case 'temperature':
        return '#f59e0b';
      default:
        return '#10b981';
    }
  }};
  font-weight: 600;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
  
  ${props => props.samplingMethod === 'temperature' && css`
    text-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
  `}
`;

const StepIndicator = styled.div`
  background: ${props => {
    switch(props.samplingMethod) {
      case 'top-k':
        return 'rgba(168, 85, 247, 0.1)';
      case 'temperature':
        return 'rgba(245, 158, 11, 0.1)';
      default:
        return 'rgba(16, 185, 129, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch(props.samplingMethod) {
      case 'top-k':
        return 'rgba(168, 85, 247, 0.3)';
      case 'temperature':
        return 'rgba(245, 158, 11, 0.3)';
      default:
        return 'rgba(16, 185, 129, 0.3)';
    }
  }};
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 0.7rem;
  color: ${props => {
    switch(props.samplingMethod) {
      case 'top-k':
        return '#a855f7';
      case 'temperature':
        return '#f59e0b';
      default:
        return '#10b981';
    }
  }};
  font-weight: 500;
`;

const TokenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => {
      switch(props.samplingMethod) {
        case 'top-k':
          return 'rgba(168, 85, 247, 0.5)';
        case 'temperature':
          return 'rgba(245, 158, 11, 0.5)';
        default:
          return 'rgba(16, 185, 129, 0.5)';
      }
    }};
    border-radius: 2px;
  }
`;

const TokenRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  background: ${props => {
    const intensity = Math.min(props.probability * 1.5, 1);
    const alpha = 0.1 + (intensity * 0.4);
    
    switch(props.samplingMethod) {
      case 'top-k':
        return props.eliminated 
          ? `rgba(168, 85, 247, 0.05)` 
          : `rgba(168, 85, 247, ${alpha})`;
      case 'temperature':
        return `rgba(245, 158, 11, ${alpha})`;
      default:
        return `rgba(16, 185, 129, ${alpha})`;
    }
  }};
  border-left: 3px solid ${props => {
    const intensity = Math.min(props.probability * 1.5, 1);
    const alpha = 0.3 + (intensity * 0.7);
    
    switch(props.samplingMethod) {
      case 'top-k':
        return props.eliminated 
          ? 'rgba(168, 85, 247, 0.1)' 
          : `rgba(168, 85, 247, ${alpha})`;
      case 'temperature':
        return `rgba(245, 158, 11, ${alpha})`;
      default:
        return `rgba(16, 185, 129, ${alpha})`;
    }
  }};
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.75rem;
  transition: all 0.3s ease;
  min-height: 40px;
  flex-shrink: 0;
  
  ${props => props.isSelected && css`
    background: ${
      props.samplingMethod === 'top-k' 
        ? 'linear-gradient(90deg, rgba(168, 85, 247, 0.4), rgba(168, 85, 247, 0.2))'
        : props.samplingMethod === 'temperature'
        ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.4), rgba(245, 158, 11, 0.2))'
        : 'linear-gradient(90deg, rgba(16, 185, 129, 0.4), rgba(16, 185, 129, 0.2))'
    };
    border-left-color: ${
      props.samplingMethod === 'top-k' 
        ? '#a855f7'
        : props.samplingMethod === 'temperature'
        ? '#f59e0b'
        : '#10b981'
    };
    box-shadow: 0 1px 4px ${
      props.samplingMethod === 'top-k' 
        ? 'rgba(168, 85, 247, 0.3)'
        : props.samplingMethod === 'temperature'
        ? 'rgba(245, 158, 11, 0.3)'
        : 'rgba(16, 185, 129, 0.3)'
    };
  `}
  
  ${props => props.eliminated && css`
    animation: ${topKEliminate} 1s ease-out forwards;
    opacity: 0.3;
  `}
  
  ${props => props.samplingMethod === 'temperature' && css`
    position: relative;
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: ${props => (props.probability * 100)}%;
      background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.3), transparent);
      animation: ${probabilityShift} 2s ease-in-out infinite;
      z-index: 0;
    }
    
    > * {
      position: relative;
      z-index: 1;
    }
  `}
`;

const TokenInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`;

const TokenText = styled.span`
  color: white;
  font-weight: 600;
  font-size: 0.8rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  line-height: 1.2;
  margin-bottom: 2px;
`;

const TokenProbability = styled.span`
  color: ${props => {
    switch(props.samplingMethod) {
      case 'top-k':
        return '#a855f7';
      case 'temperature':
        return '#f59e0b';
      default:
        return '#10b981';
    }
  }};
  font-weight: 600;
  font-size: 0.7rem;
  margin-top: 1px;
`;

const SelectedToken = styled.div`
  background: ${props => {
    switch(props.samplingMethod) {
      case 'top-k':
        return 'linear-gradient(135deg, #a855f7, #7c3aed)';
      case 'temperature':
        return 'linear-gradient(135deg, #f59e0b, #d97706)';
      default:
        return 'linear-gradient(135deg, #10b981, #059669)';
    }
  }};
  border: 1px solid ${props => {
    switch(props.samplingMethod) {
      case 'top-k':
        return '#6d28d9';
      case 'temperature':
        return '#b45309';
      default:
        return '#047857';
    }
  }};
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  flex-shrink: 0;
  margin-top: auto;
  
  .label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 4px;
  }
  
  .token {
    font-size: 0.9rem;
    font-weight: 700;
    color: white;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    word-wrap: break-word;
    overflow-wrap: break-word;
    line-height: 1.2;
  }
`;

const ProgressIndicator = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  margin: 20px 0;
  
  .current {
    color: #10b981;
    font-weight: 600;
  }
  
  .total {
    color: rgba(255, 255, 255, 0.8);
  }
`;

const StatusMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.6);
  
  .icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  h3 {
    margin: 0 0 8px 0;
    color: rgba(255, 255, 255, 0.8);
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

function TokenAnimation({ samplingEvents, initialPrompt, onBack, samplingConfig }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showProcessingBox, setShowProcessingBox] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1); // 1x speed by default

  const speedOptions = [0.5, 1, 2, 3, 5, 10];
  
  // Detect sampling method from samplingConfig
  const samplingMethod = samplingConfig?.method || 'greedy';
  const topK = samplingConfig?.top_k || 40;
  const temperature = samplingConfig?.temperature || 0.8;
  
  const getSamplingMethodLabel = () => {
    switch(samplingMethod) {
      case 'top-k':
        return `Top-K (k=${topK})`;
      case 'temperature':
        return `Temperature (T=${temperature})`;
      case 'top-p':
        return `Top-P (p=${samplingConfig?.top_p || 0.9})`;
      default:
        return 'Greedy';
    }
  };

  // Calculate delay based on speed (base delay is 2000ms at 1x speed)
  const getAnimationDelay = () => {
    return Math.max(200, 2000 / animationSpeed); // Minimum 200ms delay for 10x speed
  };

  const tokenSteps = samplingEvents?.filter(event => event.sampling).map((event, index) => {
    const sampling = event.sampling;
    const topTokens = sampling.top_tokens || [];
    const topProbs = sampling.top_probs || [];
    const topTexts = sampling.top_token_texts || [];
    
    // Show more tokens for temperature sampling to demonstrate the probability distribution
    const maxTokensToShow = samplingMethod === 'temperature' ? 12 : 8;
    
    // For top-k method, determine which tokens are eliminated
    const candidates = topTokens.slice(0, maxTokensToShow).map((token, i) => ({
      token,
      text: topTexts[i] || `Token_${token}`,
      probability: topProbs[i] || 0,
      eliminated: samplingMethod === 'top-k' && i >= topK
    }));
    
    return {
      stepNumber: index + 1,
      selectedToken: sampling.selected_token,
      selectedText: topTexts[0] || '',
      selectedProb: topProbs[0] || 0,
      candidates,
      samplingMethod,
      topK,
      temperature
    };
  }) || [];

  // Update cursor position with better bounds checking
  const updateCursorPosition = () => {
    const responseText = document.querySelector('.response-text');
    const cursor = document.querySelector('.cursor');
    
    if (responseText && cursor) {
      const rect = responseText.getBoundingClientRect();
      const cursorRect = cursor.getBoundingClientRect();
      
      // Ensure the processing box stays within viewport bounds
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const boxWidth = samplingMethod === 'temperature' ? 450 : 350;
      const boxHeight = samplingMethod === 'temperature' ? 500 : 350;
      
      let x = cursorRect.left;
      let y = cursorRect.top;
      
      // Adjust position to keep box within viewport
      if (x + boxWidth + 40 > viewportWidth) {
        x = cursorRect.left - boxWidth - 20;
      }
      
      if (y - boxHeight < 20) {
        y = Math.max(cursorRect.top + 20, 20);
      } else {
        y = cursorRect.top - boxHeight / 2;
      }
      
      setCursorPosition({ x, y });
    }
  };

  useEffect(() => {
    if (showProcessingBox) {
      updateCursorPosition();
      // Update cursor position more frequently for faster speeds
      const intervalTime = Math.max(50, 100 / animationSpeed);
      const interval = setInterval(updateCursorPosition, intervalTime);
      return () => clearInterval(interval);
    }
  }, [showProcessingBox, generatedText, animationSpeed]);

  useEffect(() => {
    if (!isPlaying || currentStep >= tokenSteps.length) {
      if (currentStep >= tokenSteps.length) {
        setShowProcessingBox(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      const currentToken = tokenSteps[currentStep];
      if (currentToken) {
        setGeneratedText(prev => prev + currentToken.selectedText);
        setCurrentStep(prev => prev + 1);
      }
    }, getAnimationDelay());

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, tokenSteps.length, animationSpeed]);

  const handlePlay = () => {
    if (tokenSteps.length === 0) return;
    setIsPlaying(true);
    setShowProcessingBox(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setGeneratedText('');
    setShowProcessingBox(false);
  };

  const handleSpeedChange = (speed) => {
    setAnimationSpeed(speed);
  };

  const currentTokenData = tokenSteps[currentStep];

  return (
    <Container>
      <Header>
        <HeaderContent>
          <BackButton onClick={onBack}>
            <ArrowLeft size={20} />
            Back to Dashboard
          </BackButton>
          <Title>
            <Zap size={32} />
            Token Generation Visualization ({getSamplingMethodLabel()})
          </Title>
          <Controls>
            <SpeedControlGroup>
              <SpeedLabel>Speed:</SpeedLabel>
              {speedOptions.map(speed => (
                <SpeedButton
                  key={speed}
                  active={animationSpeed === speed}
                  onClick={() => handleSpeedChange(speed)}
                  disabled={isPlaying}
                >
                  {speed}x
                </SpeedButton>
              ))}
            </SpeedControlGroup>
            
            <ControlButton 
              primary 
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={tokenSteps.length === 0}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </ControlButton>
            
            <ControlButton onClick={handleReset}>
              <RotateCcw size={16} />
              Reset
            </ControlButton>
          </Controls>
        </HeaderContent>
      </Header>

      <MainContent>
        <InputSection>
          <InputLabel>
            <ArrowRight size={16} />
            Original Input Prompt
          </InputLabel>
          <InputText>{initialPrompt}</InputText>
        </InputSection>

        {tokenSteps.length > 0 && (
          <ProgressIndicator>
            Processing step <span className="current">{currentStep + 1}</span> of{' '}
            <span className="total">{tokenSteps.length}</span>
            {isPlaying && (
              <span style={{ marginLeft: '16px', color: '#10b981' }}>
                • Playing at {animationSpeed}x speed
              </span>
            )}
          </ProgressIndicator>
        )}

        {showProcessingBox && currentTokenData && (
          <ProcessingBox 
            cursorPosition={cursorPosition}
            samplingMethod={samplingMethod}
          >
            <BoxHeader>
              <BoxTitle samplingMethod={samplingMethod}>
                <Cpu size={14} />
                Token Selection ({getSamplingMethodLabel()})
              </BoxTitle>
              <StepIndicator samplingMethod={samplingMethod}>
                {currentTokenData.stepNumber}
              </StepIndicator>
            </BoxHeader>

            <TokenList samplingMethod={samplingMethod}>
              {currentTokenData.candidates.map((candidate, index) => (
                <TokenRow
                  key={`${candidate.token}-${index}`}
                  probability={candidate.probability}
                  isSelected={index === 0}
                  samplingMethod={samplingMethod}
                  eliminated={candidate.eliminated}
                >
                  <TokenInfo>
                    <TokenText>"{candidate.text}"</TokenText>
                    <TokenProbability samplingMethod={samplingMethod}>
                      {(candidate.probability * 100).toFixed(1)}%
                      {candidate.eliminated && ' (filtered)'}
                    </TokenProbability>
                  </TokenInfo>
                </TokenRow>
              ))}
            </TokenList>

            <SelectedToken samplingMethod={samplingMethod}>
              <div className="label">Selected:</div>
              <div className="token">"{currentTokenData.selectedText}"</div>
            </SelectedToken>
          </ProcessingBox>
        )}

        {tokenSteps.length === 0 && (
          <StatusMessage>
            <div className="icon">🧠</div>
            <h3>No Token Data Available</h3>
            <p>Generate some text first to see the token animation in action.</p>
          </StatusMessage>
        )}

        <ResponseArea>
          <ResponseLabel>
            <ArrowRight size={16} />
            Generated Response ({generatedText.length} characters)
          </ResponseLabel>
          <ResponseText className="response-text">
            {generatedText}
            {(isPlaying || showProcessingBox) && <span className="cursor"></span>}
          </ResponseText>
        </ResponseArea>
      </MainContent>
    </Container>
  );
}

export default TokenAnimation;
