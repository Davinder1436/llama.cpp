import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Brain, Activity, Play, Database, Layers, Clock, Zap } from 'lucide-react';
import PromptPlayground from './components/PromptPlayground';
import SessionStart from './components/SessionStart';
import ModelMetrics from './components/ModelMetrics';
import SamplingChain from './components/SamplingChain';
import SessionEnd from './components/SessionEnd';
import TokenAnimation from './components/TokenAnimation';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
  color: white;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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

const Title = styled.h1`
  font-size: 1.8rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    if (props.status === 'connected') return '#10b981';
    if (props.status === 'loading') return '#f59e0b';
    return '#ef4444';
  }};
  box-shadow: 0 0 12px ${props => {
    if (props.status === 'connected') return '#10b98150';
    if (props.status === 'loading') return '#f59e0b50';
    return '#ef444450';
  }};
`;

const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px;
`;

const LogContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin-top: 30px;
`;

const EventSection = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(20px);
`;

const SectionHeader = styled.div`
  background: linear-gradient(135deg, ${props => props.color || '#667eea'} 0%, ${props => props.colorEnd || '#764ba2'} 100%);
  padding: 16px 24px;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AnimationButton = styled.button`
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
  border-radius: 12px;
  color: white;
  padding: 12px 20px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
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

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const AnimationButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 20px 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
  
  .icon {
    margin-bottom: 20px;
    opacity: 0.5;
  }
  
  h3 {
    margin: 0 0 10px 0;
    color: rgba(255, 255, 255, 0.8);
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

function App() {
  const [serverStatus, setServerStatus] = useState('disconnected');
  const [currentSession, setCurrentSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [response, setResponse] = useState('');
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard' or 'animation'
  const [initialPrompt, setInitialPrompt] = useState('');
  const [currentSamplingConfig, setCurrentSamplingConfig] = useState({ method: 'greedy' });

  // Parse logs into categorized events
  const sessionStartEvent = logs.find(log => log.event === 'session_start');
  const modelMetricsEvent = logs.find(log => log.event === 'model_metrics');
  const samplingEvents = logs.filter(log => log.event === 'sampling_state');
  const sessionEndEvent = logs.find(log => log.event === 'session_end');

  useEffect(() => {
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 30000);
    return () => clearInterval(interval);
  }, []);

    const checkServerHealth = async () => {
    try {
      console.log('Checking server health...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check
      
      const response = await fetch('http://localhost:8080/health', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      console.log('Health check response:', data);
      
      if (response.ok && data.model_loaded) {
        setServerStatus('connected');
      } else {
        setServerStatus('disconnected');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setServerStatus('disconnected');
    }
  };

  const handlePromptSubmit = async (prompt, samplingConfig = { method: 'greedy' }) => {
    setIsLoading(true);
    setError(null);
    setServerStatus('loading');
    setLogs([]);
    setResponse('');
    setCurrentSession(null);
    setInitialPrompt(prompt);
    setCurrentSamplingConfig(samplingConfig); // Store the sampling config

    try {
      // Enhanced sanitization and validation of the prompt
      let sanitizedPrompt;
      try {
        sanitizedPrompt = prompt
          // Remove control characters
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
          // Remove BOM and other zero-width characters
          .replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '')
          // Remove any remaining problematic Unicode characters
          .replace(/[\uD800-\uDFFF]/g, '') // Remove unpaired surrogates
          // Normalize quotes to standard ASCII
          .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
          .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
          .trim();

        // Additional validation - ensure it's valid JSON-serializable
        JSON.stringify({ test: sanitizedPrompt });
      } catch (error) {
        console.error('JSON serialization test failed:', error);
        throw new Error('Prompt contains characters that cannot be safely transmitted');
      }

      if (!sanitizedPrompt) {
        throw new Error('Prompt cannot be empty after sanitization');
      }

      // Limit prompt length to prevent oversized payloads
      if (sanitizedPrompt.length > 10000) {
        sanitizedPrompt = sanitizedPrompt.substring(0, 10000);
        console.warn('Prompt truncated to 10000 characters');
      }

      if (!sanitizedPrompt) {
        throw new Error('Prompt cannot be empty after sanitization');
      }

      console.log('Sending request to:', 'http://localhost:8080/log-monitoring');
      console.log('Original prompt length:', prompt.length);
      console.log('Sanitized prompt length:', sanitizedPrompt.length);
      console.log('Sampling config:', samplingConfig);
      
      // Create request body with safe JSON serialization including sampling config
      let requestBody;
      try {
        const requestData = { 
          prompt: sanitizedPrompt,
          sampling: samplingConfig
        };
        requestBody = JSON.stringify(requestData);
        console.log('Request body length:', requestBody.length);
        console.log('Request body preview:', requestBody.substring(0, 200) + '...');
      } catch (jsonError) {
        console.error('Failed to create JSON request body:', jsonError);
        throw new Error('Failed to prepare request data');
      }
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
      
      const response = await fetch('http://localhost:8080/log-monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: requestBody,
        signal: controller.signal
      });

      clearTimeout(timeoutId); // Clear timeout if request completes
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response body:', errorText);
        
        // Try to parse error as JSON, fallback to text
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.details || errorText;
        } catch (parseError) {
          errorMessage = errorText;
        }
        
        throw new Error(`Server error: ${response.status} - ${errorMessage}`);
      }

      // Handle response parsing with better error handling
      let data;
      try {
        const responseText = await response.text();
        console.log('Raw response text length:', responseText.length);
        data = JSON.parse(responseText);
        console.log('Success response:', data);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error(`Invalid response format from server: ${parseError.message}`);
      }
      
      if (!data.session_id) {
        throw new Error('Server response missing session_id');
      }
      
      setCurrentSession(data.session_id);
      
      // Start polling for logs
      pollForLogs(data.session_id);
      
    } catch (err) {
      console.error('Request failed:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. The model is taking longer than expected to process your prompt.');
      } else {
        setError(err.message);
      }
      setServerStatus('error');
      setIsLoading(false);
    }
  };

  const pollForLogs = async (sessionId) => {
    try {
      console.log('Polling logs for session:', sessionId);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for log polling
      
  const response = await fetch(`http://localhost:8080/logs/${sessionId}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();

        // Support base64 logs to avoid UTF-8 issues
        let rawLogText = '';
        if (data.logs_b64) {
          try {
            // atob handles base64; replace non-ASCII gracefully
            rawLogText = atob(data.logs_b64);
          } catch (e) {
            console.warn('Failed to decode base64 logs, falling back:', e);
            rawLogText = data.logs || '';
          }
        } else {
          rawLogText = data.logs || '';
        }

        // Parse the log content into individual events
        const logLines = rawLogText.split('\n').filter(line => line.trim());
        const parsedLogs = logLines.map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            console.warn('Failed to parse log line:', line);
            return null;
          }
        }).filter(Boolean);
        
        setLogs(parsedLogs);
        
        // Extract response text from logs if available
        const responseText = parsedLogs
          .filter(log => log.event === 'sampling_state')
          .map(log => log.sampling?.top_token_texts?.[0] || '')
          .join('');
        
        setResponse(responseText);
        
        // Check if session is complete (look for session_end event)
        const hasSessionEnd = parsedLogs.some(log => log.event === 'session_end');
        if (hasSessionEnd) {
          setIsLoading(false);
          setServerStatus('connected');
          console.log('Session completed, stopping polling');
        } else if (isLoading) {
          // Continue polling
          console.log('Session still active, continuing to poll...');
          setTimeout(() => pollForLogs(sessionId), 1000);
        }
      }
    } catch (err) {
      console.warn('Log polling error:', err);
      if (err.name === 'AbortError') {
        console.log('Log polling timed out, retrying...');
      }
      if (isLoading) {
        setTimeout(() => pollForLogs(sessionId), 2000);
      }
    }
  };

  return (
    <AppContainer>
      <Header>
        <HeaderContent>
          <Title>
            <Brain size={32} />
            Llama.cpp Playground
          </Title>
          
          <HeaderActions>
            <AnimationButton 
              active={currentPage === 'animation'}
              onClick={() => setCurrentPage(currentPage === 'animation' ? 'dashboard' : 'animation')}
            >
              <Zap size={16} />
              {currentPage === 'animation' ? 'Back to Dashboard' : 'Token Animation'}
            </AnimationButton>
          </HeaderActions>
          
          <StatusIndicator>
            <StatusDot status={serverStatus} />
            {serverStatus === 'connected' ? 'Connected' : 
             serverStatus === 'loading' ? 'Generating...' : 
             'Disconnected'}
          </StatusIndicator>
        </HeaderContent>
      </Header>

      <MainContent>
        {currentPage === 'dashboard' && (
          <>
            <PromptPlayground 
              onSubmit={handlePromptSubmit}
              isLoading={isLoading}
              disabled={serverStatus !== 'connected'}
              error={error}
              response={response}
            />

            {currentSession && (
              <LogContainer>
                {sessionStartEvent && (
                  <EventSection>
                    <SectionHeader color="#10b981" colorEnd="#059669">
                      <Play size={20} />
                      Session Start
                    </SectionHeader>
                    <SessionStart data={sessionStartEvent} />
                  </EventSection>
                )}

                {modelMetricsEvent && (
                  <EventSection>
                    <SectionHeader color="#3b82f6" colorEnd="#1d4ed8">
                      <Database size={20} />
                      Model Metrics
                    </SectionHeader>
                    <ModelMetrics data={modelMetricsEvent} />
                  </EventSection>
                )}

                {samplingEvents.length > 0 && (
                  <EventSection>
                    <SectionHeader color="#f59e0b" colorEnd="#d97706">
                      <Layers size={20} />
                      Sampling Chain ({samplingEvents.length} tokens)
                    </SectionHeader>
                    <SamplingChain events={samplingEvents} />
                  </EventSection>
                )}

                {sessionEndEvent && (
                  <EventSection>
                    <SectionHeader color="#ef4444" colorEnd="#dc2626">
                      <Clock size={20} />
                      Session End
                    </SectionHeader>
                    <SessionEnd data={sessionEndEvent} />
                  </EventSection>
                )}

                {!sessionStartEvent && !modelMetricsEvent && samplingEvents.length === 0 && !sessionEndEvent && (
                  <EmptyState>
                    <div className="icon">
                      <Activity size={48} />
                    </div>
                    <h3>Waiting for logs...</h3>
                    <p>The model is processing your request. Events will appear here as they are generated.</p>
                  </EmptyState>
                )}
              </LogContainer>
            )}
            
            {samplingEvents.length > 0 && (
              <AnimationButtonContainer>
                <AnimationButton onClick={() => setCurrentPage('animation')}>
                  <Zap size={16} />
                  View Token Animation
                </AnimationButton>
              </AnimationButtonContainer>
            )}
          </>
        )}

        {currentPage === 'animation' && (
          <TokenAnimation 
            samplingEvents={samplingEvents}
            initialPrompt={initialPrompt}
            samplingConfig={currentSamplingConfig}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
      </MainContent>
    </AppContainer>
  );
}

export default App;
