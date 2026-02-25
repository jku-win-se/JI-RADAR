import React from 'react';
import './DimensionCard.css';

/**
 * Component for displaying and editing a single SuMM dimension
 * @param {Object} props
 * @param {Object} props.dimension - Dimension data (id, name, enabled, weight, progress)
 * @param {Function} props.onToggleEnabled - Callback when enable/disable checkbox is toggled
 * @param {Function} props.onWeightChange - Callback when weight slider changes
 */
function DimensionCard({ dimension, onToggleEnabled, onWeightChange }) {
    const progressPercentage = dimension.progress || 0;
    
    return (
        <div className={`dimension-card ${!dimension.enabled ? 'disabled' : ''}`}>
            <div className="dimension-header">
                <div className="dimension-title-section">
                    <input
                        type="checkbox"
                        checked={dimension.enabled}
                        onChange={(e) => onToggleEnabled(dimension.id, e.target.checked)}
                        className="dimension-checkbox"
                    />
                    <h3 className="dimension-name">{dimension.name}</h3>
                </div>
            </div>
            
            {dimension.enabled && (
                <div className="dimension-content">
                    <div className="weight-section">
                        <label className="weight-label">
                            Weight: <span className="weight-value">{dimension.weight}/9</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="9"
                            value={dimension.weight}
                            onChange={(e) => onWeightChange(dimension.id, parseInt(e.target.value))}
                            className="weight-slider"
                        />
                    </div>
                    
                    <div className="progress-section">
                        <label className="progress-label">Progress: {progressPercentage}%</label>
                        <div className="progress-bar-container">
                            <div 
                                className="progress-bar-fill"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DimensionCard;
