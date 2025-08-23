import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronRight, Layers, Clock, Zap, Hash, Target } from 'lucide-react';

const Container = styled.div`
  padding: 24px 28px;
`;

const TokenChain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TokenBlock = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }
`;

const TokenHeader = styled.div`
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
`;

const TokenInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const TokenIndex = styled.div`
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  min-width: 60px;
  text-align: center;
`;

const TokenText = styled.div`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
  padding: 8px 12px;
  border-radius: 8px;
  font-family: 'SF Mono', 'Monaco', monospace;
  font-weight: 600;
  font-size: 0.9rem;
`;

const TokenStats = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }
`;

const TokenDetails = styled.div`
  padding: 20px;
  display: ${props => props.expanded ? 'block' : 'none'};
`;

const DetailSection = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TokenTable = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 2fr;
  background: rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
  font-weight: 600;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 2fr;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.85rem;
  transition: background 0.1s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  &.selected {
    background: rgba(16, 185, 129, 0.1);
    color: #6ee7b7;
  }
`;

const LayerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
`;

const LayerCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 14px 16px;
`;

const LayerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const LayerType = styled.div`
  background: ${props => props.type === 'attention' ? 
    'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 
    'linear-gradient(135deg, #f59e0b, #d97706)'};
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const LayerTime = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  font-family: 'SF Mono', 'Monaco', monospace;
`;

const LayerMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  font-size: 0.8rem;
`;

const LayerMetric = styled.div`
  color: rgba(255, 255, 255, 0.7);
`;

const ProbabilityBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  height: 4px;
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
`;

const ProbabilityFill = styled.div`
  background: linear-gradient(90deg, #10b981, #059669);
  height: 100%;
  width: ${props => (props.probability * 100).toFixed(1)}%;
  border-radius: 2px;
  transition: width 0.3s ease;
`;

function SamplingChain({ events }) {
  const [expandedTokens, setExpandedTokens] = useState(new Set());

  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedTokens);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTokens(newExpanded);
  };

  const formatTime = (microseconds) => {
    if (microseconds < 1000) return `${microseconds}μs`;
    if (microseconds < 1000000) return `${(microseconds / 1000).toFixed(1)}ms`;
    return `${(microseconds / 1000000).toFixed(2)}s`;
  };

  const formatNumber = (num) => {
    return num.toFixed(4);
  };

  return (
    <Container>
      <TokenChain>
        {events.map((event, index) => {
          const sampling = event.sampling;
          const selectedIndex = sampling.top_tokens?.indexOf(sampling.selected_token) ?? -1;
          const isExpanded = expandedTokens.has(index);

          return (
            <TokenBlock key={index}>
              <TokenHeader onClick={() => toggleExpanded(index)}>
                <TokenInfo>
                  <TokenIndex>#{index + 1}</TokenIndex>
                  <TokenText>
                    "{sampling.top_token_texts?.[selectedIndex] || 'N/A'}"
                  </TokenText>
                  <TokenStats>
                    <Stat>
                      <Target size={14} />
                      Token: {sampling.selected_token}
                    </Stat>
                    <Stat>
                      <Hash size={14} />
                      Prob: {(sampling.selected_prob * 100).toFixed(2)}%
                    </Stat>
                    <Stat>
                      <Zap size={14} />
                      Method: {sampling.sampling_method}
                    </Stat>
                  </TokenStats>
                </TokenInfo>
                
                <ExpandButton>
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </ExpandButton>
              </TokenHeader>

              <TokenDetails expanded={isExpanded}>
                <DetailSection>
                  <DetailTitle>
                    <Target size={16} />
                    Top Token Candidates
                  </DetailTitle>
                  <TokenTable>
                    <TableHeader>
                      <div>Rank</div>
                      <div>Token ID</div>
                      <div>Probability</div>
                      <div>Text</div>
                    </TableHeader>
                    {sampling.top_tokens?.slice(0, 10).map((token, idx) => (
                      <TableRow 
                        key={idx} 
                        className={idx === selectedIndex ? 'selected' : ''}
                      >
                        <div>#{idx + 1}</div>
                        <div>{token}</div>
                        <div>
                          {(sampling.top_probs[idx] * 100).toFixed(3)}%
                          <ProbabilityBar>
                            <ProbabilityFill probability={sampling.top_probs[idx]} />
                          </ProbabilityBar>
                        </div>
                        <div>"{sampling.top_token_texts[idx] || 'N/A'}"</div>
                      </TableRow>
                    ))}
                  </TokenTable>
                </DetailSection>

                {sampling.layer_details && (
                  <DetailSection>
                    <DetailTitle>
                      <Layers size={16} />
                      Layer Execution Details ({sampling.layer_details.length} layers)
                    </DetailTitle>
                    <LayerGrid>
                      {sampling.layer_details.map((layer, layerIdx) => (
                        <LayerCard key={layerIdx}>
                          <LayerHeader>
                            <LayerType type={layer.layer_type}>
                              {layer.layer_type}
                            </LayerType>
                            <LayerTime>
                              <Clock size={12} style={{ marginRight: '4px', display: 'inline' }} />
                              {formatTime(layer.execution_time_us)}
                            </LayerTime>
                          </LayerHeader>
                          <div style={{ fontSize: '0.8rem', marginBottom: '8px', color: 'rgba(255,255,255,0.6)' }}>
                            Layer {layer.layer_id} • {layer.operation}
                          </div>
                          {layer.layer_metrics && (
                            <LayerMetrics>
                              {layer.layer_metrics.attention_heads > 0 && (
                                <LayerMetric>Heads: {layer.layer_metrics.attention_heads}</LayerMetric>
                              )}
                              {layer.layer_metrics.hidden_dim > 0 && (
                                <LayerMetric>Hidden: {layer.layer_metrics.hidden_dim}</LayerMetric>
                              )}
                              {layer.layer_metrics.intermediate_dim > 0 && (
                                <LayerMetric>Intermediate: {layer.layer_metrics.intermediate_dim}</LayerMetric>
                              )}
                            </LayerMetrics>
                          )}
                        </LayerCard>
                      ))}
                    </LayerGrid>
                  </DetailSection>
                )}
              </TokenDetails>
            </TokenBlock>
          );
        })}
      </TokenChain>
    </Container>
  );
}

export default SamplingChain;
