import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronRight, FileText, Activity, Clock, Zap } from 'lucide-react';

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

const LogsList = styled.div`
  max-height: 600px;
  overflow-y: auto;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  
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

const LogEntry = styled.div`
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const LogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  cursor: pointer;
  background: ${props => props.isExpanded ? 'rgba(255, 255, 255, 0.05)' : 'transparent'};
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const LogHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const EventType = styled.span`
  background: ${props => getEventTypeColor(props.type)};
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const LogTimestamp = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
`;

const LogContent = styled.div`
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const JsonContainer = styled.pre`
  color: #e5e7eb;
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }
`;

const SamplingDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
`;

const SamplingCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
`;

const SamplingTitle = styled.h4`
  color: white;
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  font-weight: 500;
`;

const TokenList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const Token = styled.span`
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  border: 1px solid rgba(59, 130, 246, 0.3);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
`;

function getEventTypeColor(type) {
  switch (type) {
    case 'session_start': return 'linear-gradient(135deg, #10b981, #059669)';
    case 'session_end': return 'linear-gradient(135deg, #ef4444, #dc2626)';
    case 'step_begin': return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    case 'step_end': return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    case 'sampling_state': return 'linear-gradient(135deg, #f59e0b, #d97706)';
    case 'performance_metric': return 'linear-gradient(135deg, #06b6d4, #0891b2)';
    default: return 'linear-gradient(135deg, #6b7280, #4b5563)';
  }
}

function formatJsonValue(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  
  if (obj === null) return 'null';
  if (typeof obj === 'string') return `"${obj}"`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.map(item => `${spaces}  ${formatJsonValue(item, indent + 1)}`);
    return `[\n${items.join(',\n')}\n${spaces}]`;
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const items = keys.map(key => `${spaces}  "${key}": ${formatJsonValue(obj[key], indent + 1)}`);
    return `{\n${items.join(',\n')}\n${spaces}}`;
  }
  
  return String(obj);
}

function LogViewer({ logs }) {
  const [expandedEntries, setExpandedEntries] = useState(new Set());

  const sortedLogs = useMemo(() => {
    if (!logs || !Array.isArray(logs)) return [];
    return [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [logs]);

  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEntries(newExpanded);
  };

  if (!logs || logs.length === 0) {
    return (
      <Container>
        <Title>
          <FileText size={20} />
          Event Logs
        </Title>
        <EmptyState>
          <Activity size={48} style={{ opacity: 0.3, marginBottom: '15px' }} />
          <p>No logs available. Submit a prompt to see detailed inference logs.</p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Title>
        <FileText size={20} />
        Event Logs ({sortedLogs.length} events)
      </Title>
      
      <LogsList>
        {sortedLogs.map((log, index) => {
          const isExpanded = expandedEntries.has(index);
          
          return (
            <LogEntry key={index}>
              <LogHeader 
                isExpanded={isExpanded}
                onClick={() => toggleExpanded(index)}
              >
                <LogHeaderLeft>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <EventType type={log.event}>{log.event}</EventType>
                  <LogTimestamp>{log.timestamp}</LogTimestamp>
                </LogHeaderLeft>
              </LogHeader>
              
              {isExpanded && (
                <LogContent>
                  {log.event === 'sampling_state' && log.sampling && (
                    <SamplingDetails>
                      <SamplingCard>
                        <SamplingTitle>Selected Token</SamplingTitle>
                        <div style={{ color: '#4ade80', fontFamily: 'Courier New', fontSize: '0.9rem' }}>
                          ID: {log.sampling.selected_token} | Prob: {(log.sampling.selected_prob * 100).toFixed(2)}%
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginTop: '4px' }}>
                          Method: {log.sampling.sampling_method}
                        </div>
                      </SamplingCard>
                      
                      {log.sampling.top_token_texts && (
                        <SamplingCard>
                          <SamplingTitle>Top Tokens</SamplingTitle>
                          <TokenList>
                            {log.sampling.top_token_texts.slice(0, 5).map((text, i) => (
                              <Token key={i} title={`Prob: ${(log.sampling.top_probs[i] * 100).toFixed(2)}%`}>
                                {text.replace(/\n/g, '\\n')}
                              </Token>
                            ))}
                          </TokenList>
                        </SamplingCard>
                      )}
                      
                      {log.sampling.layer_details && (
                        <SamplingCard>
                          <SamplingTitle>Layer Info</SamplingTitle>
                          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                            Total Layers: {log.sampling.layer_details.length}
                          </div>
                        </SamplingCard>
                      )}
                    </SamplingDetails>
                  )}
                  
                  <JsonContainer>
                    {formatJsonValue(log)}
                  </JsonContainer>
                </LogContent>
              )}
            </LogEntry>
          );
        })}
      </LogsList>
    </Container>
  );
}

export default LogViewer;
