import React from 'react';
import './TrendsChart.css';

/**
 * Component for displaying KPI trends over time
 * Modern redesign with better visual appeal
 */
function TrendsChart({ trendsData, enabledDimensions, periodLabel }) {
    if (!trendsData || Object.keys(trendsData).length === 0) {
        return (
            <div className="trends-empty">
                <div className="empty-icon">📊</div>
                <p>No trend data available yet.</p>
                <p className="empty-subtitle">Create some assessments to see trends over time.</p>
            </div>
        );
    }

    const getChartData = (dimensionId) => {
        const history = trendsData[dimensionId] || [];
        if (history.length === 0) return null;

        // Use fixed scale (0-100) for ALL dimensions to ensure consistent visual appearance
        // All KPI values are already on a 0-100 scale, so normalize directly to 0-100
        // This ensures all lines look the same thickness regardless of data range
        const FIXED_MIN = 0;
        const FIXED_MAX = 100;
        const FIXED_RANGE = FIXED_MAX - FIXED_MIN;

        return history.map(entry => ({
            timestamp: new Date(entry.timestamp),
            value: entry.value,
            // Normalize to fixed 0-100 scale for all dimensions
            normalized: ((entry.value - FIXED_MIN) / FIXED_RANGE) * 100
        }));
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getTrendColor = (dimensionId) => {
        const colors = {
            environment: '#00875a',
            society: '#0052cc',
            economy: '#ff991f',
            individual: '#de350b',
            technical: '#6554c0'
        };
        return colors[dimensionId] || '#666';
    };

    const getDimensionIcon = (dimensionId) => {
        const icons = {
            environment: '🌱',
            society: '👥',
            economy: '💰',
            individual: '👤',
            technical: '⚙️'
        };
        return icons[dimensionId] || '📊';
    };

    return (
        <div className="trends-modern-container">
            <div className="trends-header">
                <h2 className="trends-main-title">Sustainability Trends</h2>
                <p className="trends-subtitle">
                    {periodLabel ? `Window: ${periodLabel}. ` : ''}
                    Track performance over time across all dimensions
                </p>
            </div>

            <div className="trends-grid">
                {enabledDimensions.map(dim => {
                    const chartData = getChartData(dim.id);
                    if (!chartData || chartData.length === 0) {
                        return (
                            <div key={dim.id} className="trend-card-empty">
                                <div className="trend-card-icon">{getDimensionIcon(dim.id)}</div>
                                <h3 className="trend-card-title">{dim.name}</h3>
                                <p className="trend-card-no-data">No data available</p>
                            </div>
                        );
                    }

                    const color = getTrendColor(dim.id);
                    const points = chartData.map((d, i) => ({
                        x: (i / (chartData.length - 1 || 1)) * 100,
                        y: 100 - d.normalized,
                        value: d.value,
                        date: d.timestamp
                    }));

                    // Calculate trend
                    const firstValue = chartData[0].value;
                    const lastValue = chartData[chartData.length - 1].value;
                    const trend = lastValue - firstValue;
                    const trendPercent = firstValue > 0 ? Math.round((trend / firstValue) * 100) : 0;

                    // Create area path for filled chart
                    const areaPath = points.length > 1 
                        ? `M ${points[0].x},100 L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},100 Z`
                        : '';

                    return (
                        <div key={dim.id} className="trend-card">
                            <div className="trend-card-header">
                                <div className="trend-card-title-section">
                                    <span className="trend-card-icon">{getDimensionIcon(dim.id)}</span>
                                    <h3 className="trend-card-title">{dim.name}</h3>
                                </div>
                                <div className="trend-card-stats">
                                    <div className="trend-stat">
                                        <span className="trend-stat-label">Current</span>
                                        <span className="trend-stat-value" style={{ color: color }}>
                                            {lastValue}
                                        </span>
                                    </div>
                                    {trend !== 0 && (
                                        <div className={`trend-stat trend-change ${trend > 0 ? 'positive' : 'negative'}`}>
                                            <span className="trend-stat-label">Change</span>
                                            <span className="trend-stat-value">
                                                {trend > 0 ? '+' : ''}{trendPercent}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="trend-chart-container">
                                <svg className="trend-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    {/* Grid lines */}
                                    <line x1="0" y1="0" x2="100" y2="0" stroke="#f4f5f7" strokeWidth="0.3" />
                                    <line x1="0" y1="25" x2="100" y2="25" stroke="#f4f5f7" strokeWidth="0.3" />
                                    <line x1="0" y1="50" x2="100" y2="50" stroke="#e0e0e0" strokeWidth="0.5" />
                                    <line x1="0" y1="75" x2="100" y2="75" stroke="#f4f5f7" strokeWidth="0.3" />
                                    <line x1="0" y1="100" x2="100" y2="100" stroke="#f4f5f7" strokeWidth="0.3" />
                                    
                                    {/* Area fill */}
                                    {areaPath && (
                                        <path
                                            d={areaPath}
                                            fill={color}
                                            fillOpacity="0.1"
                                        />
                                    )}
                                    
                                    {/* Line path - consistent width for all dimensions */}
                                    {points.length > 1 && (
                                        <polyline
                                            points={points.map(p => `${p.x},${p.y}`).join(' ')}
                                            fill="none"
                                            stroke={color}
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}
                                    
                                    {/* Data points - consistent size for all dimensions */}
                                    {points.map((point, i) => (
                                        <circle
                                            key={i}
                                            cx={point.x}
                                            cy={point.y}
                                            r="2.5"
                                            fill={color}
                                            stroke="#fff"
                                            strokeWidth="1.5"
                                        />
                                    ))}
                                </svg>
                            </div>

                            <div className="trend-card-footer">
                                <div className="trend-date-range">
                                    <span className="trend-date">{formatDate(chartData[0].timestamp)}</span>
                                    <span className="trend-date-separator">→</span>
                                    <span className="trend-date">{formatDate(chartData[chartData.length - 1].timestamp)}</span>
                                </div>
                                <div className="trend-data-points">
                                    {chartData.length} {chartData.length === 1 ? 'point' : 'points'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default TrendsChart;
