import React from 'react';
import './NotAssessedView.css';

/**
 * Component for displaying "Not Assessed" state
 * Shows issue info, start button, and Green DoD checklist
 */
function NotAssessedView({ issueInfo, onStartAssessment }) {
    return (
        <div className="not-assessed-view">
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
                    <div className="info-row">
                        <span className="info-label">Status:</span>
                        <span className="info-value">{issueInfo.status || 'Not Assessed'}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">KPI:</span>
                        <span className="info-value">--</span>
                    </div>
                </div>
            )}
            
            <button 
                className="start-assessment-button"
                onClick={onStartAssessment}
            >
                Start Sustainability Assessment
            </button>
            
            <div className="green-dod-section">
                <h3 className="dod-title">Green DoD:</h3>
                <ul className="dod-checklist">
                    <li className="dod-item checked">✓ Code Review</li>
                    <li className="dod-item checked">✓ Tests Passed</li>
                    <li className="dod-item unchecked">✗ Sustainability Check</li>
                </ul>
            </div>
        </div>
    );
}

export default NotAssessedView;
