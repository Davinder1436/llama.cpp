import React from 'react';
import styled from 'styled-components';
import { Users, Clock, Activity, CheckCircle, XCircle } from 'lucide-react';

const Container = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 25px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  color: white;
  margin: 0 0 20px 0;
  font-size: 1.4rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SessionsGrid = styled.div`
  display: grid;
  gap: 15px;
  max-height: 400px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
`;

const SessionCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const SessionId = styled.h3`
  color: white;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  font-family: 'Courier New', monospace;
`;

const SessionStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${props => props.status === 'active' ? `
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  ` : `
    background: rgba(156, 163, 175, 0.2);
    color: #9ca3af;
    border: 1px solid rgba(156, 163, 175, 0.3);
  `}
`;

const SessionDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DetailLabel = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DetailValue = styled.span`
  color: white;
  font-size: 0.95rem;
  font-weight: 500;
`;

const PromptPreview = styled.div`
  grid-column: 1 / -1;
  margin-top: 10px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
`;

const PromptText = styled.p`
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  font-style: italic;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.color || 'white'};
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

function formatDuration(startTime, endTime) {
  if (!startTime) return 'Unknown';
  
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;
  
  if (diffMs < 1000) return `${diffMs}ms`;
  if (diffMs < 60000) return `${(diffMs / 1000).toFixed(1)}s`;
  return `${(diffMs / 60000).toFixed(1)}m`;
}

function extractPromptFromLogs(logs, sessionId) {
  if (!logs || !Array.isArray(logs)) return null;
  
  const sessionStart = logs.find(log => 
    log.event === 'session_start' && log.session_id === sessionId
  );
  
  return sessionStart?.prompt || null;
}

function SessionSummary({ logs }) {
  // Extract sessions from logs
  const sessions = React.useMemo(() => {
    if (!logs || !Array.isArray(logs)) return [];
    
    const sessionMap = new Map();
    
    logs.forEach(log => {
      if (!log.session_id) return;
      
      if (!sessionMap.has(log.session_id)) {
        sessionMap.set(log.session_id, {
          id: log.session_id,
          startTime: null,
          endTime: null,
          status: 'active',
          eventCount: 0,
          prompt: null
        });
      }
      
      const session = sessionMap.get(log.session_id);
      session.eventCount++;
      
      if (log.event === 'session_start') {
        session.startTime = log.timestamp;
        session.prompt = log.prompt;
      } else if (log.event === 'session_end') {
        session.endTime = log.timestamp;
        session.status = 'completed';
      }
    });
    
    return Array.from(sessionMap.values()).sort((a, b) => 
      new Date(b.startTime || 0) - new Date(a.startTime || 0)
    );
  }, [logs]);

  const stats = React.useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter(s => s.status === 'active').length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const avgDuration = sessions
      .filter(s => s.startTime && s.endTime)
      .reduce((acc, s) => {
        const duration = new Date(s.endTime) - new Date(s.startTime);
        return acc + duration;
      }, 0) / Math.max(1, completed);

    return { total, active, completed, avgDuration };
  }, [sessions]);

  if (!logs || logs.length === 0) {
    return (
      <Container>
        <Title>
          <Users size={20} />
          Session Summary
        </Title>
        <EmptyState>
          <Users size={48} style={{ opacity: 0.3, marginBottom: '15px' }} />
          <p>No sessions available. Submit a prompt to start tracking sessions.</p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Title>
        <Users size={20} />
        Session Summary
      </Title>
      
      <StatsRow>
        <StatCard>
          <StatValue color="#3b82f6">{stats.total}</StatValue>
          <StatLabel>Total Sessions</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue color="#10b981">{stats.active}</StatValue>
          <StatLabel>Active</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue color="#6b7280">{stats.completed}</StatValue>
          <StatLabel>Completed</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue color="#f59e0b">
            {stats.avgDuration > 0 ? `${(stats.avgDuration / 1000).toFixed(1)}s` : 'N/A'}
          </StatValue>
          <StatLabel>Avg Duration</StatLabel>
        </StatCard>
      </StatsRow>
      
      <SessionsGrid>
        {sessions.map(session => (
          <SessionCard key={session.id}>
            <SessionHeader>
              <SessionId>{session.id}</SessionId>
              <SessionStatus status={session.status}>
                {session.status === 'active' ? (
                  <><Activity size={14} /> Active</>
                ) : (
                  <><CheckCircle size={14} /> Completed</>
                )}
              </SessionStatus>
            </SessionHeader>
            
            <SessionDetails>
              <DetailItem>
                <DetailLabel>Started</DetailLabel>
                <DetailValue>
                  {session.startTime 
                    ? new Date(session.startTime).toLocaleTimeString()
                    : 'Unknown'
                  }
                </DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailLabel>Duration</DetailLabel>
                <DetailValue>
                  {formatDuration(session.startTime, session.endTime)}
                </DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailLabel>Events</DetailLabel>
                <DetailValue>{session.eventCount}</DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailLabel>Status</DetailLabel>
                <DetailValue style={{ 
                  color: session.status === 'active' ? '#10b981' : '#6b7280'
                }}>
                  {session.status === 'active' ? 'Running' : 'Completed'}
                </DetailValue>
              </DetailItem>
              
              {session.prompt && (
                <PromptPreview>
                  <PromptText>"{session.prompt}"</PromptText>
                </PromptPreview>
              )}
            </SessionDetails>
          </SessionCard>
        ))}
      </SessionsGrid>
    </Container>
  );
}

export default SessionSummary;
