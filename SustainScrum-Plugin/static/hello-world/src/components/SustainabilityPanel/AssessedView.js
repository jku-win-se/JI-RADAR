import React from 'react';
import './AssessedView.css';

/**
 * Component for displaying "Assessed" state
 * Shows KPI, SusAF scores, and edit button
 */
function AssessedView({ issueInfo, assessment, onEditAssessment }) {
    const getKPIStatus = (kpi) => {
        if (kpi >= 61) return { label: 'Good', color: '#00875a' };
        if (kpi >= 41) return { label: 'Medium', color: '#ff991f' };
        return { label: 'Low', color: '#de350b' };
    };

    const kpiStatus = getKPIStatus(assessment.weightedKPI || 0);
    const maxScore = 5; // SusAF scores are on a 1-5 scale

    // Define all 5 dimensions (always show all, even if not assessed)
    const allDimensions = [
        { id: 'environment', name: 'Environment' },
        { id: 'society', name: 'Society' },
        { id: 'economy', name: 'Economy' },
        { id: 'individual', name: 'Individual' },
        { id: 'technical', name: 'Technical' }
    ];

    return (
        <div className="assessed-view">
            <h2 className="panel-title">Sustainability Panel</h2>
            
            {issueInfo && (
                <div className="issue-info">
                    <div className="info-row">
                        <span className="info-label">Issue:</span>
                        <span className="info-value">{issueInfo.issueKey}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Type:</span>
                        <span className="info-value">{issueInfo.type || 'Sustainability Story'}</span>
                    </div>
                </div>
            )}
            
            <div className="status-section">
                <div className="info-row">
                    <span className="info-label">Status:</span>
                    <span className="info-value status-assessed">Assessed</span>
                </div>
                <div className="info-row">
                    <span className="info-label">KPI:</span>
                    <span className="info-value kpi-value" style={{ color: kpiStatus.color }}>
                        {assessment.weightedKPI || 0} [{kpiStatus.label}]
                    </span>
                </div>
            </div>
            
            <div className="susaf-scores-section">
                <h3 className="scores-title">SusAF Scores:</h3>
                {allDimensions.map(dimension => {
                    const score = assessment.susafScores?.[dimension.id];
                    const hasScore = score !== undefined && score !== null && score > 0;
                    
                    return (
                        <div key={dimension.id} className="score-item">
                            <div className="score-header">
                                <span className="score-label">{dimension.name}:</span>
                                <span className="score-value">
                                    {hasScore ? `${score}/${maxScore}` : 'N/A'}
                                </span>
                            </div>
                            <div className="score-bar-container">
                                <div 
                                    className="score-bar-fill"
                                    style={{ 
                                        width: hasScore ? `${(score / maxScore) * 100}%` : '0%',
                                        backgroundColor: hasScore 
                                            ? (score >= 3 ? '#0052cc' : score >= 2 ? '#ff991f' : '#de350b')
                                            : '#dfe1e6',
                                        opacity: hasScore ? 1 : 0.3
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <button 
                className="edit-assessment-button"
                onClick={onEditAssessment}
            >
                Edit Assessment
            </button>
            
            <div className="green-dod-section">
                <h3 className="dod-title">Green DoD:</h3>
                <ul className="dod-checklist">
                    <li className="dod-item checked">✓ Code Review</li>
                    <li className="dod-item checked">✓ Tests Passed</li>
                    <li className={`dod-item ${assessment.weightedKPI >= 61 ? 'checked' : 'unchecked'}`}>
                        {assessment.weightedKPI >= 61 ? '✓' : '✗'} Sustainability Check
                    </li>
                </ul>
            </div>
        </div>
    );
}

export default AssessedView;
