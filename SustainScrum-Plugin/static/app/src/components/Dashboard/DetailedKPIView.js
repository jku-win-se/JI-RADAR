import React from 'react';
import './DetailedKPIView.css';

/**
 * Detailed KPI View Component
 * Shows comprehensive KPI information for each dimension
 */
function DetailedKPIView({ kpis, enabledDimensions }) {
    const getKPIStatus = (value) => {
        if (value >= 61) return { label: 'Good', color: '#00875a', bgColor: '#e3fcef' };
        if (value >= 41) return { label: 'Medium', color: '#ff991f', bgColor: '#fff4e5' };
        return { label: 'Low', color: '#de350b', bgColor: '#ffebe6' };
    };

    if (!kpis || !enabledDimensions) {
        return (
            <div className="detailed-kpi-view">
                <p className="info-text">No KPI data available</p>
            </div>
        );
    }

    return (
        <div className="detailed-kpi-view">
            <div className="kpi-view-header">
                <h3 className="kpi-view-title">Detailed KPI Analysis</h3>
                <p className="kpi-view-subtitle">
                    Comprehensive sustainability metrics for each dimension
                </p>
            </div>

            <div className="kpi-dimensions-grid">
                {enabledDimensions.map(dimension => {
                    const kpi = kpis[dimension.id];
                    if (!kpi) return null;

                    const status = getKPIStatus(kpi.current);
                    const trendIcon = kpi.trendDirection === 'up' ? '↑' : '↓';
                    const trendColor = kpi.trendDirection === 'up' ? '#00875a' : '#de350b';
                    const progressPercentage = kpi.current;

                    return (
                        <div key={dimension.id} className="kpi-dimension-card">
                            <div className="kpi-dimension-header">
                                <h4 className="kpi-dimension-name">{dimension.name}</h4>
                                <div className="kpi-dimension-status" style={{ color: status.color }}>
                                    {status.label}
                                </div>
                            </div>

                            <div className="kpi-dimension-main-score">
                                <div className="kpi-main-value" style={{ color: status.color }}>
                                    {kpi.current}
                                </div>
                                <div className="kpi-main-label">Current Score</div>
                            </div>

                            <div className="kpi-progress-section">
                                <div className="kpi-progress-bar-container">
                                    <div 
                                        className="kpi-progress-bar-fill"
                                        style={{ 
                                            width: `${progressPercentage}%`,
                                            backgroundColor: status.color
                                        }}
                                    />
                                </div>
                                <div className="kpi-progress-label">
                                    {progressPercentage}% of target
                                </div>
                            </div>

                            <div className="kpi-trend-section">
                                <div className="kpi-trend-item">
                                    <span className="kpi-trend-label">Previous:</span>
                                    <span className="kpi-trend-value">{kpi.previous}</span>
                                </div>
                                <div className="kpi-trend-item">
                                    <span className="kpi-trend-label">Trend:</span>
                                    <span className="kpi-trend-value" style={{ color: trendColor }}>
                                        {trendIcon} {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                                    </span>
                                </div>
                            </div>

                            <div className="kpi-interpretation">
                                <div className="interpretation-header">Interpretation:</div>
                                <div className="interpretation-text">
                                    {kpi.current >= 61 
                                        ? `Excellent performance in ${dimension.name.toLowerCase()}. The project demonstrates strong sustainability practices in this dimension.`
                                        : kpi.current >= 41
                                        ? `Moderate performance in ${dimension.name.toLowerCase()}. There is room for improvement to reach optimal sustainability levels.`
                                        : `Low performance in ${dimension.name.toLowerCase()}. Immediate attention is needed to improve sustainability in this area.`
                                    }
                                </div>
                            </div>

                            <div className="kpi-thresholds">
                                <div className="threshold-item">
                                    <div className="threshold-dot" style={{ backgroundColor: '#de350b' }} />
                                    <span className="threshold-label">Low: 0-40</span>
                                </div>
                                <div className="threshold-item">
                                    <div className="threshold-dot" style={{ backgroundColor: '#ff991f' }} />
                                    <span className="threshold-label">Medium: 41-60</span>
                                </div>
                                <div className="threshold-item">
                                    <div className="threshold-dot" style={{ backgroundColor: '#00875a' }} />
                                    <span className="threshold-label">Good: 61-100</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="kpi-summary-section">
                <h4 className="summary-title">Overall Summary</h4>
                <div className="summary-content">
                    <div className="summary-stat">
                        <div className="summary-stat-value">
                            {enabledDimensions.filter(dim => {
                                const kpi = kpis[dim.id];
                                return kpi && kpi.current >= 61;
                            }).length}
                        </div>
                        <div className="summary-stat-label">Dimensions in Good Range</div>
                    </div>
                    <div className="summary-stat">
                        <div className="summary-stat-value">
                            {enabledDimensions.filter(dim => {
                                const kpi = kpis[dim.id];
                                return kpi && kpi.current >= 41 && kpi.current < 61;
                            }).length}
                        </div>
                        <div className="summary-stat-label">Dimensions in Medium Range</div>
                    </div>
                    <div className="summary-stat">
                        <div className="summary-stat-value">
                            {enabledDimensions.filter(dim => {
                                const kpi = kpis[dim.id];
                                return kpi && kpi.current < 41;
                            }).length}
                        </div>
                        <div className="summary-stat-label">Dimensions in Low Range</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DetailedKPIView;
