import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Eye, Hash, TrendingUp, Filter, ChevronDown } from 'lucide-react';

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
  margin: 0 0 25px 0;
  font-size: 1.4rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Controls = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  
  option {
    background: #1f2937;
    color: white;
  }
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const StatsGrid = styled.div`
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
  font-size: 1.8rem;
  font-weight: 700;
  color: ${props => props.color || '#3b82f6'};
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChartContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
`;

const ChartTitle = styled.h3`
  color: white;
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TokenGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  
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

const TokenItem = styled.div`
  background: ${props => getTokenColor(props.probability)};
  color: white;
  padding: 8px;
  border-radius: 6px;
  text-align: center;
  font-size: 0.8rem;
  font-family: 'Courier New', monospace;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const TokenText = styled.div`
  font-weight: 500;
  margin-bottom: 4px;
  word-break: break-all;
  max-height: 40px;
  overflow: hidden;
`;

const TokenProb = styled.div`
  font-size: 0.7rem;
  opacity: 0.8;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
`;

const CustomTooltip = styled.div`
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  color: white;
  font-size: 0.9rem;
`;

function getTokenColor(probability) {
  if (probability >= 0.8) return 'linear-gradient(135deg, #10b981, #059669)';
  if (probability >= 0.6) return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
  if (probability >= 0.4) return 'linear-gradient(135deg, #f59e0b, #d97706)';
  if (probability >= 0.2) return 'linear-gradient(135deg, #ef4444, #dc2626)';
  return 'linear-gradient(135deg, #6b7280, #4b5563)';
}

function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <CustomTooltip>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Token: {label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: '4px 0', color: entry.color }}>
            Probability: {(entry.value * 100).toFixed(2)}%
          </p>
        ))}
      </CustomTooltip>
    );
  }
  return null;
}

function TokenVisualization({ logs }) {
  const [selectedSession, setSelectedSession] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const tokenData = useMemo(() => {
    if (!logs || !Array.isArray(logs)) {
      return {
        sessions: [],
        tokens: [],
        distributions: [],
        stats: { totalTokens: 0, avgProb: 0, uniqueTokens: 0, maxProb: 0 }
      };
    }

    // Filter sampling state logs
    const samplingLogs = logs.filter(log => 
      log.event === 'sampling_state' && 
      log.sampling?.selected_token !== undefined &&
      (selectedSession === 'all' || log.session_id === selectedSession)
    );

    // Extract unique sessions
    const sessions = [...new Set(logs
      .filter(log => log.session_id)
      .map(log => log.session_id)
    )];

    const tokens = [];
    const tokenFrequency = new Map();
    const probabilityDistribution = [];
    let totalProb = 0;
    let maxProb = 0;

    samplingLogs.forEach((log, index) => {
      const { sampling } = log;
      const tokenText = sampling.top_token_texts?.[0] || `Token_${sampling.selected_token}`;
      const probability = sampling.selected_prob || 0;
      
      tokens.push({
        id: sampling.selected_token,
        text: tokenText.replace(/\n/g, '\\n').slice(0, 20),
        probability,
        session: log.session_id,
        timestamp: log.timestamp,
        index
      });

      // Track frequency
      const key = `${tokenText}_${probability.toFixed(4)}`;
      tokenFrequency.set(key, (tokenFrequency.get(key) || 0) + 1);

      // Probability distribution
      probabilityDistribution.push({
        token: tokenText.slice(0, 10),
        probability,
        index
      });

      totalProb += probability;
      maxProb = Math.max(maxProb, probability);
    });

    // Calculate top tokens by frequency
    const topTokens = Array.from(tokenFrequency.entries())
      .map(([key, frequency]) => {
        const [text, probStr] = key.split('_');
        return {
          text: text.slice(0, 15),
          frequency,
          avgProb: parseFloat(probStr)
        };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    const stats = {
      totalTokens: tokens.length,
      avgProb: tokens.length > 0 ? totalProb / tokens.length : 0,
      uniqueTokens: new Set(tokens.map(t => t.text)).size,
      maxProb
    };

    return {
      sessions,
      tokens: tokens.slice(-100), // Last 100 tokens for performance
      distributions: probabilityDistribution.slice(-50),
      topTokens,
      stats
    };
  }, [logs, selectedSession]);

  if (!logs || logs.length === 0) {
    return (
      <Container>
        <Title>
          <Eye size={20} />
          Token Visualization
        </Title>
        <EmptyState>
          <Hash size={48} style={{ opacity: 0.3, marginBottom: '15px' }} />
          <p>No token data available. Run inference to see token analysis.</p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Title>
        <Eye size={20} />
        Token Visualization
      </Title>
      
      <Controls>
        <FilterSelect 
          value={selectedSession} 
          onChange={(e) => setSelectedSession(e.target.value)}
        >
          <option value="all">All Sessions</option>
          {tokenData.sessions.map(session => (
            <option key={session} value={session}>{session}</option>
          ))}
        </FilterSelect>
        
        <FilterSelect 
          value={viewMode} 
          onChange={(e) => setViewMode(e.target.value)}
        >
          <option value="grid">Token Grid</option>
          <option value="chart">Probability Chart</option>
          <option value="frequency">Frequency Analysis</option>
        </FilterSelect>
      </Controls>

      <StatsGrid>
        <StatCard>
          <StatValue color="#3b82f6">{tokenData.stats.totalTokens}</StatValue>
          <StatLabel>Total Tokens</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue color="#10b981">
            {(tokenData.stats.avgProb * 100).toFixed(1)}%
          </StatValue>
          <StatLabel>Avg Probability</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue color="#f59e0b">{tokenData.stats.uniqueTokens}</StatValue>
          <StatLabel>Unique Tokens</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue color="#ef4444">
            {(tokenData.stats.maxProb * 100).toFixed(1)}%
          </StatValue>
          <StatLabel>Max Probability</StatLabel>
        </StatCard>
      </StatsGrid>

      {viewMode === 'grid' && tokenData.tokens.length > 0 && (
        <ChartContainer>
          <ChartTitle>
            <Hash size={16} />
            Recent Tokens (colored by probability)
          </ChartTitle>
          <TokenGrid>
            {tokenData.tokens.map((token, index) => (
              <TokenItem 
                key={`${token.id}-${index}`}
                probability={token.probability}
                title={`Token ID: ${token.id}\nSession: ${token.session}\nTime: ${new Date(token.timestamp).toLocaleTimeString()}`}
              >
                <TokenText>{token.text}</TokenText>
                <TokenProb>{(token.probability * 100).toFixed(1)}%</TokenProb>
              </TokenItem>
            ))}
          </TokenGrid>
        </ChartContainer>
      )}

      {viewMode === 'chart' && tokenData.distributions.length > 0 && (
        <ChartContainer>
          <ChartTitle>
            <TrendingUp size={16} />
            Token Probability Distribution
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={tokenData.distributions}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="index" 
                stroke="rgba(255,255,255,0.6)"
                fontSize={12}
                label={{ value: 'Token Index', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.6)"
                fontSize={12}
                label={{ value: 'Probability', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Scatter 
                dataKey="probability" 
                fill="#3b82f6"
                stroke="#1d4ed8"
                strokeWidth={1}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {viewMode === 'frequency' && tokenData.topTokens.length > 0 && (
        <ChartContainer>
          <ChartTitle>
            <BarChart size={16} />
            Token Frequency Analysis
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tokenData.topTokens} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                type="number"
                stroke="rgba(255,255,255,0.6)"
                fontSize={12}
              />
              <YAxis 
                type="category"
                dataKey="text"
                stroke="rgba(255,255,255,0.6)"
                fontSize={10}
                width={80}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <CustomTooltip>
                        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Token: {label}</p>
                        <p style={{ margin: '4px 0', color: '#3b82f6' }}>
                          Frequency: {payload[0].value}
                        </p>
                        <p style={{ margin: '4px 0', color: '#10b981' }}>
                          Avg Prob: {(payload[0].payload.avgProb * 100).toFixed(2)}%
                        </p>
                      </CustomTooltip>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="frequency" 
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
    </Container>
  );
}

export default TokenVisualization;
