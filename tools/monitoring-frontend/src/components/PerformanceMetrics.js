import React, { useMemo } from 'react';
import styled from 'styled-components';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Zap, Clock, Cpu, BarChart3 } from 'lucide-react';

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

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const MetricCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
`;

const MetricTitle = styled.h3`
  color: white;
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
`;

const MetricValue = styled.div`
  font-size: 2.2rem;
  font-weight: 700;
  color: ${props => props.color || '#3b82f6'};
  margin-bottom: 5px;
`;

const MetricUnit = styled.span`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 400;
`;

const MetricSubtext = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <CustomTooltip>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{`Time: ${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: '4px 0', color: entry.color }}>
            {`${entry.dataKey}: ${typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}`}
          </p>
        ))}
      </CustomTooltip>
    );
  }
  return null;
}

function PerformanceMetrics({ logs }) {
  const metrics = useMemo(() => {
    if (!logs || !Array.isArray(logs)) {
      return {
        tokenThroughput: 0,
        avgLatency: 0,
        totalTokens: 0,
        avgStepTime: 0,
        timeSeriesData: [],
        eventDistribution: [],
        rawMetrics: []
      };
    }

    // Filter performance and timing related logs
    const performanceLogs = logs.filter(log => 
      log.event === 'performance_metric' || 
      log.event === 'step_end' ||
      log.event === 'sampling_state'
    );

    // Calculate token throughput and latency
    const sessions = new Map();
    let totalTokens = 0;
    let totalSteps = 0;
    let totalStepTime = 0;

    performanceLogs.forEach(log => {
      if (log.session_id) {
        if (!sessions.has(log.session_id)) {
          sessions.set(log.session_id, { tokens: 0, startTime: null, endTime: null });
        }
        const session = sessions.get(log.session_id);
        
        if (log.event === 'sampling_state' && log.sampling?.selected_token) {
          session.tokens++;
          totalTokens++;
        }
        
        if (log.event === 'step_end' && log.duration_ms) {
          totalSteps++;
          totalStepTime += log.duration_ms;
        }
      }
    });

    const avgStepTime = totalSteps > 0 ? totalStepTime / totalSteps : 0;
    const avgLatency = avgStepTime; // Using step time as latency proxy
    
    // Calculate tokens per second (estimate)
    let tokenThroughput = 0;
    if (sessions.size > 0 && avgStepTime > 0) {
      tokenThroughput = 1000 / avgStepTime; // tokens per second estimate
    }

    // Create time series data for charts
    const timeSeriesData = [];
    const eventCounts = {};
    
    // Group logs by time intervals (every minute)
    const timeGroups = new Map();
    
    logs.forEach(log => {
      // Handle invalid or missing timestamps
      let timestamp;
      try {
        if (log.timestamp) {
          // Handle both ISO format and custom format like "2025-08-22 22:27:42.800"
          if (typeof log.timestamp === 'string' && log.timestamp.includes(' ')) {
            // Convert "YYYY-MM-DD HH:mm:ss.sss" to ISO format
            const isoFormat = log.timestamp.replace(' ', 'T') + 'Z';
            timestamp = new Date(isoFormat);
          } else {
            timestamp = new Date(log.timestamp);
          }
          
          if (isNaN(timestamp.getTime())) {
            timestamp = new Date();
          }
        } else {
          timestamp = new Date();
        }
      } catch (e) {
        timestamp = new Date();
      }
      
      const timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), 
        timestamp.getDate(), timestamp.getHours(), timestamp.getMinutes()).toISOString();
      
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, { timestamp: timeKey, events: 0, tokens: 0, latency: [] });
      }
      
      const group = timeGroups.get(timeKey);
      group.events++;
      
      if (log.event === 'sampling_state') {
        group.tokens++;
      }
      
      if (log.event === 'step_end' && log.duration_ms) {
        group.latency.push(log.duration_ms);
      }
      
      // Count event types
      eventCounts[log.event] = (eventCounts[log.event] || 0) + 1;
    });

    // Convert to array and calculate averages
    timeGroups.forEach((group, key) => {
      try {
        const timeDate = new Date(key);
        if (!isNaN(timeDate.getTime())) {
          timeSeriesData.push({
            time: timeDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            events: group.events,
            tokens: group.tokens,
            latency: group.latency.length > 0 
              ? group.latency.reduce((a, b) => a + b, 0) / group.latency.length 
              : 0
          });
        }
      } catch (e) {
        console.warn('Invalid timestamp in time series data:', key);
      }
    });

    // Sort by time - use a more robust sorting method
    timeSeriesData.sort((a, b) => {
      try {
        return new Date('2000-01-01 ' + a.time) - new Date('2000-01-01 ' + b.time);
      } catch (e) {
        return 0; // Keep original order if comparison fails
      }
    });

    // Create event distribution data
    const eventDistribution = Object.entries(eventCounts).map(([event, count]) => ({
      name: event.replace(/_/g, ' '),
      value: count,
      percentage: ((count / logs.length) * 100).toFixed(1)
    }));

    return {
      tokenThroughput: Math.round(tokenThroughput * 100) / 100,
      avgLatency: Math.round(avgLatency * 100) / 100,
      totalTokens,
      avgStepTime: Math.round(avgStepTime * 100) / 100,
      timeSeriesData: timeSeriesData.slice(-20), // Last 20 time points
      eventDistribution,
      rawMetrics: performanceLogs
    };
  }, [logs]);

  if (!logs || logs.length === 0) {
    return (
      <Container>
        <Title>
          <BarChart3 size={20} />
          Performance Metrics
        </Title>
        <EmptyState>
          <Zap size={48} style={{ opacity: 0.3, marginBottom: '15px' }} />
          <p>No performance data available. Run inference to see metrics.</p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Title>
        <BarChart3 size={20} />
        Performance Metrics
      </Title>
      
      <MetricsGrid>
        <MetricCard>
          <MetricHeader>
            <Zap size={16} style={{ color: '#3b82f6' }} />
            <MetricTitle>Token Throughput</MetricTitle>
          </MetricHeader>
          <MetricValue color="#3b82f6">
            {metrics.tokenThroughput}
            <MetricUnit> tok/s</MetricUnit>
          </MetricValue>
          <MetricSubtext>Estimated processing rate</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <Clock size={16} style={{ color: '#10b981' }} />
            <MetricTitle>Average Latency</MetricTitle>
          </MetricHeader>
          <MetricValue color="#10b981">
            {metrics.avgLatency}
            <MetricUnit> ms</MetricUnit>
          </MetricValue>
          <MetricSubtext>Per step processing time</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <Cpu size={16} style={{ color: '#f59e0b' }} />
            <MetricTitle>Total Tokens</MetricTitle>
          </MetricHeader>
          <MetricValue color="#f59e0b">
            {metrics.totalTokens}
            <MetricUnit> tokens</MetricUnit>
          </MetricValue>
          <MetricSubtext>Across all sessions</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <BarChart3 size={16} style={{ color: '#8b5cf6' }} />
            <MetricTitle>Avg Step Time</MetricTitle>
          </MetricHeader>
          <MetricValue color="#8b5cf6">
            {metrics.avgStepTime}
            <MetricUnit> ms</MetricUnit>
          </MetricValue>
          <MetricSubtext>Processing per inference step</MetricSubtext>
        </MetricCard>
      </MetricsGrid>

      {metrics.timeSeriesData.length > 1 && (
        <ChartContainer>
          <ChartTitle>
            <Clock size={16} />
            Performance Over Time
          </ChartTitle>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.6)"
                fontSize={12}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.6)"
                fontSize={12}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Line 
                type="monotone" 
                dataKey="tokens" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                name="Tokens/min"
              />
              <Line 
                type="monotone" 
                dataKey="latency" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                name="Latency (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {metrics.eventDistribution.length > 0 && (
        <ChartContainer>
          <ChartTitle>
            <BarChart3 size={16} />
            Event Distribution
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.eventDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {metrics.eventDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
    </Container>
  );
}

export default PerformanceMetrics;
