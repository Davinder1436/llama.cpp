import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Send, Activity, Database, Clock, Zap, Brain, Layers } from 'lucide-react';
import PromptInput from './components/PromptInput';
import LogViewer from './components/LogViewer';
import SessionSummary from './components/SessionSummary';
import PerformanceMetrics from './components/PerformanceMetrics';
import TokenVisualization from './components/TokenVisualization';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 20px;
`;

const Header = styled.header`
  text-align: center;
  color: white;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin: 0 0 10px 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
`;

const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const StatusBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 15px 25px;
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.status === 'connected' ? '#4ade80' : 
                     props.status === 'loading' ? '#fbbf24' : '#ef4444'};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 400px;
  }
`;

const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const RightPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

function App() {
  const [serverStatus, setServerStatus] = useState('disconnected');
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logStreamOffset, setLogStreamOffset] = useState(0);

  // Check server health on component mount
  useEffect(() => {
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Stream logs for active session
  useEffect(() => {
    if (currentSession && isLoading) {
      const streamLogs = async () => {
        try {
          const response = await fetch(`/logs/${currentSession}/stream?from_line=${logStreamOffset}`);
          if (response.ok) {
            const data = await response.json();
            if (data.new_lines && data.new_lines.length > 0) {
              // Parse new log lines
              const newParsedLogs = data.new_lines.map(line => {
                try {
                  return JSON.parse(line);
                } catch (e) {
                  console.warn('Failed to parse log line:', line);
                  return null;
                }
              }).filter(Boolean);

              // Update session data with new logs
              setSessionData(prevData => ({
                ...prevData,
                parsedLogs: [...(prevData?.parsedLogs || []), ...newParsedLogs]
              }));

              // Check if generation is complete (look for session_end event)
              const sessionEndEvent = newParsedLogs.find(log => log.event === 'session_end');
              if (sessionEndEvent) {
                setIsLoading(false);
                setServerStatus('connected');
              }

              // Update offset for next stream
              setLogStreamOffset(data.total_lines);
            }
          }
        } catch (err) {
          console.warn('Log streaming error:', err);
        }
      };

      // Start streaming immediately and then every 500ms
      streamLogs();
      const streamInterval = setInterval(streamLogs, 500);
      
      return () => clearInterval(streamInterval);
    }
  }, [currentSession, isLoading, logStreamOffset]);

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
    setLogStreamOffset(0); // Reset log streaming offset

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
      
      // Initialize session data with basic info
      setSessionData({
        session_id: data.session_id,
        prompt,
        parsedLogs: [], // Will be populated by streaming
        status: 'generating'
      });
      
      // Note: We don't set isLoading to false here yet
      // The streaming effect will handle updating logs
      // We'll detect completion when the session_end event comes through streaming
      
    } catch (err) {
      setError(err.message);
      setServerStatus('error');
      setIsLoading(false);
    }
  };

  return (
    <AppContainer>
      <Header>
        <Title>
          <Brain size={40} />
          Llama.cpp Monitoring Dashboard
        </Title>
        <Subtitle>Real-time inference monitoring and visualization</Subtitle>
      </Header>

      <MainContent>
        <StatusBar>
          <StatusItem>
            <StatusDot status={serverStatus} />
            Server: {serverStatus === 'connected' ? 'Connected' : 
                    serverStatus === 'loading' ? 'Processing...' : 
                    'Disconnected'}
          </StatusItem>
          
          {currentSession && (
            <StatusItem>
              <Database size={16} />
              Session: {currentSession}
            </StatusItem>
          )}

          {sessionData && (
            <StatusItem>
              <Activity size={16} />
              Events: {sessionData.parsedLogs?.length || 0}
            </StatusItem>
          )}

          {error && (
            <StatusItem style={{ color: '#fca5a5' }}>
              <Zap size={16} />
              {error}
            </StatusItem>
          )}
        </StatusBar>

        <Grid>
          <LeftPanel>
            <PromptInput 
              onSubmit={handlePromptSubmit} 
              isLoading={isLoading}
              disabled={serverStatus !== 'connected'}
            />

            {sessionData && (
              <>
                <TokenVisualization data={sessionData} />
                <LogViewer logs={sessionData.parsedLogs} />
              </>
            )}
          </LeftPanel>

          <RightPanel>
            {sessionData && (
              <>
                <SessionSummary data={sessionData} />
                <PerformanceMetrics logs={sessionData.parsedLogs} />
              </>
            )}
          </RightPanel>
        </Grid>
      </MainContent>
    </AppContainer>
  );
}

export default App;
