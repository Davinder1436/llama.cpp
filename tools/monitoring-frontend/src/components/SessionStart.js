import React from 'react';
import styled from 'styled-components';
import { Clock, User, Hash } from 'lucide-react';

const Container = styled.div`
  padding: 24px 28px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;

const InfoCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 18px 20px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }
`;

const InfoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: ${props => props.color || '#10b981'};
  font-weight: 500;
  font-size: 0.9rem;
`;

const InfoValue = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  font-weight: 600;
  word-break: break-all;
`;

const InfoSubtext = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  margin-top: 4px;
`;

const PromptSection = styled.div`
  margin-top: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
`;

const PromptHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  color: #667eea;
  font-weight: 500;
  font-size: 0.95rem;
`;

const PromptText = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
`;

function SessionStart({ data }) {
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return {
        time: date.toLocaleTimeString(),
        date: date.toLocaleDateString(),
        full: date.toLocaleString()
      };
    } catch (e) {
      return { time: timestamp, date: '', full: timestamp };
    }
  };

  const timeInfo = formatTimestamp(data.timestamp);

  return (
    <Container>
      <InfoGrid>
        <InfoCard>
          <InfoHeader color="#10b981">
            <Hash size={16} />
            Session ID
          </InfoHeader>
          <InfoValue>{data.session_id}</InfoValue>
          <InfoSubtext>Unique session identifier</InfoSubtext>
        </InfoCard>

        <InfoCard>
          <InfoHeader color="#3b82f6">
            <Clock size={16} />
            Started At
          </InfoHeader>
          <InfoValue>{timeInfo.time}</InfoValue>
          <InfoSubtext>{timeInfo.date}</InfoSubtext>
        </InfoCard>

        <InfoCard>
          <InfoHeader color="#f59e0b">
            <User size={16} />
            Event Type
          </InfoHeader>
          <InfoValue>session_start</InfoValue>
          <InfoSubtext>Initialization event</InfoSubtext>
        </InfoCard>
      </InfoGrid>

      {data.prompt && (
        <PromptSection>
          <PromptHeader>
            <User size={16} />
            User Prompt
          </PromptHeader>
          <PromptText>{data.prompt}</PromptText>
        </PromptSection>
      )}
    </Container>
  );
}

export default SessionStart;
