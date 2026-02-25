import React from 'react';
import './OverviewContent.css';

/**
 * Overview Content Component
 * Shows summary statistics and quick insights
 */
function OverviewContent({ dashboardData, kpis, enabledDimensions }) {
    if (!dashboardData || !kpis || !enabledDimensions) {
        return (
            <div className="overview-content">
                <p className="info-text">No data available</p>
            </div>
        );
    }

    // Use weighted overall KPI from backend (calculated with SuMM weights)
    // If not available, fallback to simple average
    const overallKPI = dashboardData.overallKPI !== undefined 
        ? dashboardData.overallKPI 
        : (() => {
            const dimensionKPIs = enabledDimensions
                .map(dim => {
                    const kpi = kpis[dim.id];
                    return kpi ? kpi.current : 0;
                })
                .filter(kpi => kpi > 0);
            if (dimensionKPIs.length === 0) return 0;
            return Math.round(dimensionKPIs.reduce((sum, kpi) => sum + kpi, 0) / dimensionKPIs.length);
        })();
    const getKPIStatus = (value) => {
        if (value >= 61) return { label: 'Good', color: '#00875a', bgColor: '#e3fcef' };
        if (value >= 41) return { label: 'Medium', color: '#ff991f', bgColor: '#fff4e5' };
        return { label: 'Low', color: '#de350b', bgColor: '#ffebe6' };
    };

    const overallStatus = getKPIStatus(overallKPI);

    // Find best and worst dimensions
    const dimensionScores = enabledDimensions
        .map(dim => ({
            id: dim.id,
            name: dim.name,
            score: kpis[dim.id]?.current || 0
        }))
        .filter(d => d.score > 0)
        .sort((a, b) => b.score - a.score);

    const bestDimension = dimensionScores.length > 0 ? dimensionScores[0] : null;
    const worstDimension = dimensionScores.length > 0 ? dimensionScores[dimensionScores.length - 1] : null;

    // Count assessments
    const assessmentCount = dashboardData.heatmap?.length || 0;

    return (
        <div className="overview-content">
            {/* Overall KPI Summary */}
            <div className="overview-summary-section">
                <h3 className="overview-section-title">Overall Sustainability Score</h3>
                <div className="overall-kpi-card" style={{ backgroundColor: overallStatus.bgColor }}>
                    <div className="overall-kpi-value" style={{ color: overallStatus.color }}>
                        {overallKPI}
                    </div>
                    <div className="overall-kpi-label" style={{ color: overallStatus.color }}>
                        {overallStatus.label}
                    </div>
                    <div className="overall-kpi-bar-container">
                        <div 
                            className="overall-kpi-bar-fill"
                            style={{ 
                                width: `${overallKPI}%`,
                                backgroundColor: overallStatus.color
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="overview-stats-section">
                <h3 className="overview-section-title">Quick Statistics</h3>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{assessmentCount}</div>
                        <div className="stat-label">Assessed Issues</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{enabledDimensions.length}</div>
                        <div className="stat-label">Active Dimensions</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{dimensionScores.length}</div>
                        <div className="stat-label">Dimensions with Data</div>
                    </div>
                </div>
            </div>

            {/* Dimension Insights */}
            {bestDimension && worstDimension && (
                <div className="overview-insights-section">
                    <h3 className="overview-section-title">Dimension Insights</h3>
                    <div className="insights-grid">
                        <div className="insight-card positive">
                            <div className="insight-icon">✓</div>
                            <div className="insight-content">
                                <div className="insight-label">Best Performing</div>
                                <div className="insight-value">{bestDimension.name}</div>
                                <div className="insight-score">{bestDimension.score}%</div>
                            </div>
                        </div>
                        <div className="insight-card negative">
                            <div className="insight-icon">!</div>
                            <div className="insight-content">
                                <div className="insight-label">Needs Improvement</div>
                                <div className="insight-value">{worstDimension.name}</div>
                                <div className="insight-score">{worstDimension.score}%</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dimension Comparison Chart */}
            <div className="overview-comparison-section">
                <h3 className="overview-section-title">Dimension Comparison</h3>
                <div className="comparison-chart">
                    {enabledDimensions.map(dim => {
                        const kpi = kpis[dim.id];
                        const score = kpi?.current || 0;
                        const status = getKPIStatus(score);
                        const dimensionName = dim.name.length > 12 ? dim.name.substring(0, 12) + '...' : dim.name;
                        
                        return (
                            <div key={dim.id} className="comparison-bar-item">
                                <div className="comparison-bar-label">{dimensionName}</div>
                                <div className="comparison-bar-container">
                                    <div 
                                        className="comparison-bar-fill"
                                        style={{ 
                                            width: `${score}%`,
                                            backgroundColor: status.color
                                        }}
                                    />
                                    <span className="comparison-bar-value">{score}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Next Steps / Recommendations */}
            {worstDimension && worstDimension.score < 61 && (
                <div className="overview-recommendations-section">
                    <h3 className="overview-section-title">Recommendations</h3>
                    <div className="recommendation-card">
                        <div className="recommendation-icon">💡</div>
                        <div className="recommendation-text">
                            Focus on improving <strong>{worstDimension.name}</strong> dimension 
                            (currently at {worstDimension.score}%). Consider reviewing assessments 
                            and identifying areas for sustainability improvements.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OverviewContent;
