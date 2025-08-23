import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Send, Activity, Database, Clock, Zap, Brain, Layers, Play } from 'lucide-react';
import PromptPlayground from './components/PromptPlayground';
import SessionStart from './components/SessionStart';
import ModelMetrics from './components/ModelMetrics';
import SamplingChain from './components/SamplingChain';
import SessionEnd from './components/SessionEnd';

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
      const response = await fetch('/health');
      if (response.ok) {
        setServerStatus('connected');
        setError(null);
      } else {
        setServerStatus('error');
      }
    } catch (err) {
      setServerStatus('disconnected');
      setError('Cannot connect to monitoring server');
    }
  };

  const handlePromptSubmit = async (prompt) => {
    setIsLoading(true);
    setError(null);
    setServerStatus('loading');
    setLogs([]);
    setResponse('');
    setCurrentSession(null);

    try {
      const response = await fetch('/log-monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setCurrentSession(data.session_id);
      
      // Start polling for logs
      pollForLogs(data.session_id);
      
    } catch (err) {
      setError(err.message);
      setServerStatus('error');
      setIsLoading(false);
    }
  };

  const pollForLogs = async (sessionId) => {
    try {
      const response = await fetch(`/logs/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Parse the log content into individual events
        const logLines = data.logs.split('\n').filter(line => line.trim());
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
        } else if (isLoading) {
          // Continue polling
          setTimeout(() => pollForLogs(sessionId), 1000);
        }
      }
    } catch (err) {
      console.warn('Log polling error:', err);
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
          
          <StatusIndicator>
            <StatusDot status={serverStatus} />
            {serverStatus === 'connected' ? 'Connected' : 
             serverStatus === 'loading' ? 'Generating...' : 
             'Disconnected'}
          </StatusIndicator>
        </HeaderContent>
      </Header>

      <MainContent>
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
      </MainContent>
    </AppContainer>
  );
}

export default App;
