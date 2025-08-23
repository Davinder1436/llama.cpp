import React from 'react';
import styled from 'styled-components';
import { Clock, CheckCircle, BarChart, Hash } from 'lucide-react';

const Container = styled.div`
  padding: 24px 28px;
`;

const CompletionBanner = styled.div`
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const BannerIcon = styled.div`
  color: #10b981;
  flex-shrink: 0;
`;

const BannerContent = styled.div`
  flex: 1;
`;

const BannerTitle = styled.h3`
  margin: 0 0 4px 0;
  color: #6ee7b7;
  font-size: 1.1rem;
  font-weight: 600;
`;

const BannerSubtext = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const MetricCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 18px 20px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
`;

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: ${props => props.color || '#ef4444'};
  font-weight: 500;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.div`
  color: rgba(255, 255, 255, 0.95);
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 4px;
`;

const MetricSubtext = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
`;

const TimelineSection = styled.div`
  margin-top: 32px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px 24px;
`;

const TimelineHeader = styled.h3`
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TimelineItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
`;

const TimelineDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.color || '#ef4444'};
  flex-shrink: 0;
`;

const TimelineContent = styled.div`
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TimelineLabel = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
`;

const TimelineTime = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  font-family: 'SF Mono', 'Monaco', monospace;
`;

function SessionEnd({ data }) {
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

  // Calculate some session metrics if available in data
  const totalTokens = data.total_tokens || 0;
  const totalTime = data.total_time_ms || 0;
  const tokensPerSecond = totalTime > 0 ? ((totalTokens * 1000) / totalTime).toFixed(2) : '0';
  
  const averageLayerTime = data.average_layer_time_us || 0;
  const totalLayers = data.total_layers || 26; // Default based on typical model

  const sessionEvents = [
    { label: 'Session Started', time: 'T+0.000s', color: '#10b981' },
    { label: 'Model Loaded', time: 'T+0.050s', color: '#3b82f6' },
    { label: 'Token Generation', time: 'T+0.100s', color: '#f59e0b' },
    { label: 'Session Completed', time: `T+${(totalTime / 1000).toFixed(3)}s`, color: '#ef4444' }
  ];

  return (
    <Container>
      <CompletionBanner>
        <BannerIcon>
          <CheckCircle size={32} />
        </BannerIcon>
        <BannerContent>
          <BannerTitle>Generation Complete</BannerTitle>
          <BannerSubtext>
            Session finished successfully at {timeInfo.full}
          </BannerSubtext>
        </BannerContent>
      </CompletionBanner>

      <MetricsGrid>
        <MetricCard>
          <MetricHeader color="#ef4444">
            <Clock size={14} />
            Completion Time
          </MetricHeader>
          <MetricValue>{timeInfo.time}</MetricValue>
          <MetricSubtext>Session end timestamp</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricHeader color="#10b981">
            <Hash size={14} />
            Total Tokens
          </MetricHeader>
          <MetricValue>{totalTokens}</MetricValue>
          <MetricSubtext>Tokens generated</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricHeader color="#3b82f6">
            <BarChart size={14} />
            Generation Speed
          </MetricHeader>
          <MetricValue>{tokensPerSecond}</MetricValue>
          <MetricSubtext>Tokens per second</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricHeader color="#f59e0b">
            <Clock size={14} />
            Avg Layer Time
          </MetricHeader>
          <MetricValue>{(averageLayerTime / 1000).toFixed(2)}ms</MetricValue>
          <MetricSubtext>Per layer execution</MetricSubtext>
        </MetricCard>
      </MetricsGrid>

      <TimelineSection>
        <TimelineHeader>
          <BarChart size={16} />
          Session Timeline
        </TimelineHeader>
        {sessionEvents.map((event, index) => (
          <TimelineItem key={index}>
            <TimelineDot color={event.color} />
            <TimelineContent>
              <TimelineLabel>{event.label}</TimelineLabel>
              <TimelineTime>{event.time}</TimelineTime>
            </TimelineContent>
          </TimelineItem>
        ))}
      </TimelineSection>
    </Container>
  );
}

export default SessionEnd;
