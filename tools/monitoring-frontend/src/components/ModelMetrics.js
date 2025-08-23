import React from 'react';
import styled from 'styled-components';
import { Database, Layers, Cpu, HardDrive, Zap } from 'lucide-react';

const Container = styled.div`
  padding: 24px 28px;
`;

const Section = styled.div`
  margin-bottom: 32px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 10px;
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
  color: ${props => props.color || '#3b82f6'};
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

const ProgressBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  height: 4px;
  margin-top: 8px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  background: linear-gradient(90deg, ${props => props.color || '#3b82f6'}, ${props => props.colorEnd || '#1d4ed8'});
  height: 100%;
  width: ${props => props.percentage || 0}%;
  border-radius: 4px;
  transition: width 0.3s ease;
`;

function ModelMetrics({ data }) {
  const { model_info, context_info, memory_usage } = data;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  // Calculate memory usage percentage (assuming 8GB max for visualization)
  const maxMemoryGB = 8;
  const totalMemoryGB = (model_info?.model_size_mb || 0) / 1024 + 
                       (memory_usage?.context_size_estimate_bytes || 0) / (1024 * 1024 * 1024);
  const memoryPercentage = Math.min((totalMemoryGB / maxMemoryGB) * 100, 100);

  return (
    <Container>
      <Section>
        <SectionTitle>
          <Database size={20} />
          Model Architecture
        </SectionTitle>
        <MetricsGrid>
          <MetricCard>
            <MetricHeader color="#10b981">
              <Cpu size={14} />
              Vocabulary Size
            </MetricHeader>
            <MetricValue>{formatNumber(model_info?.n_vocab)}</MetricValue>
            <MetricSubtext>Total tokens in vocabulary</MetricSubtext>
          </MetricCard>

          <MetricCard>
            <MetricHeader color="#3b82f6">
              <Layers size={14} />
              Model Layers
            </MetricHeader>
            <MetricValue>{model_info?.n_layer}</MetricValue>
            <MetricSubtext>Transformer layers</MetricSubtext>
          </MetricCard>

          <MetricCard>
            <MetricHeader color="#f59e0b">
              <Zap size={14} />
              Embedding Dim
            </MetricHeader>
            <MetricValue>{formatNumber(model_info?.n_embd)}</MetricValue>
            <MetricSubtext>Hidden dimensions</MetricSubtext>
          </MetricCard>

          <MetricCard>
            <MetricHeader color="#ef4444">
              <Cpu size={14} />
              Attention Heads
            </MetricHeader>
            <MetricValue>{model_info?.n_head}</MetricValue>
            <MetricSubtext>Multi-head attention ({model_info?.n_head_kv} KV heads)</MetricSubtext>
          </MetricCard>
        </MetricsGrid>
      </Section>

      <Section>
        <SectionTitle>
          <HardDrive size={20} />
          Context Configuration
        </SectionTitle>
        <MetricsGrid>
          <MetricCard>
            <MetricHeader color="#8b5cf6">
              <Database size={14} />
              Context Length
            </MetricHeader>
            <MetricValue>{formatNumber(context_info?.n_ctx)}</MetricValue>
            <MetricSubtext>Current context size (trained: {formatNumber(model_info?.n_ctx_train)})</MetricSubtext>
          </MetricCard>

          <MetricCard>
            <MetricHeader color="#06b6d4">
              <Layers size={14} />
              Batch Size
            </MetricHeader>
            <MetricValue>{context_info?.n_batch}</MetricValue>
            <MetricSubtext>Processing batch size (micro: {context_info?.n_ubatch})</MetricSubtext>
          </MetricCard>

          <MetricCard>
            <MetricHeader color="#84cc16">
              <Zap size={14} />
              Max Sequences
            </MetricHeader>
            <MetricValue>{context_info?.n_seq_max}</MetricValue>
            <MetricSubtext>Maximum parallel sequences</MetricSubtext>
          </MetricCard>
        </MetricsGrid>
      </Section>

      <Section>
        <SectionTitle>
          <HardDrive size={20} />
          Memory Usage
        </SectionTitle>
        <MetricsGrid>
          <MetricCard>
            <MetricHeader color="#f97316">
              <HardDrive size={14} />
              Model Size
            </MetricHeader>
            <MetricValue>{formatBytes(memory_usage?.model_size_bytes)}</MetricValue>
            <MetricSubtext>Model parameters in memory</MetricSubtext>
          </MetricCard>

          <MetricCard>
            <MetricHeader color="#ec4899">
              <HardDrive size={14} />
              Context Memory
            </MetricHeader>
            <MetricValue>{formatBytes(memory_usage?.context_size_estimate_bytes)}</MetricValue>
            <MetricSubtext>Estimated context buffer</MetricSubtext>
          </MetricCard>

          <MetricCard>
            <MetricHeader color="#6366f1">
              <Database size={14} />
              Total Memory
            </MetricHeader>
            <MetricValue>{totalMemoryGB.toFixed(1)} GB</MetricValue>
            <MetricSubtext>Combined memory usage</MetricSubtext>
            <ProgressBar>
              <ProgressFill 
                percentage={memoryPercentage} 
                color="#6366f1" 
                colorEnd="#4f46e5"
              />
            </ProgressBar>
          </MetricCard>
        </MetricsGrid>
      </Section>
    </Container>
  );
}

export default ModelMetrics;
