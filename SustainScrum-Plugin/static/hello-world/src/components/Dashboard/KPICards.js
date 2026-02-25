import React from 'react';
import './KPICards.css';

/**
 * Component for displaying KPI Cards with trend indicators
 */
function KPICards({ kpis, enabledDimensions }) {
    const getKPIStatus = (value) => {
        if (value >= 61) return { label: 'Good', color: '#00875a', bgColor: '#e3fcef' };
        if (value >= 41) return { label: 'Medium', color: '#ff991f', bgColor: '#fff4e5' };
        return { label: 'Low', color: '#de350b', bgColor: '#ffebe6' };
    };

    const getDimensionAbbreviation = (dimensionId) => {
        const abbreviations = {
            environment: 'Env',
            society: 'Soc',
            economy: 'Econ',
            individual: 'Ind',
            technical: 'Tec'
        };
        return abbreviations[dimensionId] || dimensionId.substring(0, 4).toUpperCase();
    };

    if (!kpis || !enabledDimensions) {
        return <div className="kpi-cards-container">No KPI data available</div>;
    }

    return (
        <div className="kpi-cards-container">
            {enabledDimensions.map(dimension => {
                const kpi = kpis[dimension.id];
                if (!kpi) return null;

                const status = getKPIStatus(kpi.current);
                const trendIcon = kpi.trendDirection === 'up' ? '↑' : '↓';
                const trendColor = kpi.trendDirection === 'up' ? '#00875a' : '#de350b';
                const progressPercentage = kpi.current;

                return (
                    <div key={dimension.id} className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-label">{getDimensionAbbreviation(dimension.id)}:</span>
                            <span className="kpi-value" style={{ color: status.color }}>
                                {kpi.current}
                            </span>
                        </div>
                        <div className="kpi-bar-container">
                            <div 
                                className="kpi-bar-fill"
                                style={{ 
                                    width: `${progressPercentage}%`,
                                    backgroundColor: status.color
                                }}
                            />
                        </div>
                        <div className="kpi-trend">
                            <span style={{ color: trendColor }}>
                                {trendIcon} {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default KPICards;
