import React, { useState } from 'react';
import './HeatmapTable.css';

/**
 * Component for displaying Heatmap: Issues × Dimensions
 */
function HeatmapTable({ heatmapData, enabledDimensions }) {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const getScoreColor = (score) => {
        if (score >= 61) return { color: '#00875a', label: 'Good' };
        if (score >= 41) return { color: '#ff991f', label: 'Medium' };
        return { color: '#de350b', label: 'Low' };
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedData = [...(heatmapData || [])].sort((a, b) => {
        if (!sortColumn) return 0;
        
        if (sortColumn === 'issue') {
            return sortDirection === 'asc' 
                ? a.issueKey.localeCompare(b.issueKey)
                : b.issueKey.localeCompare(a.issueKey);
        }
        
        const aScore = a.scores?.[sortColumn] || 0;
        const bScore = b.scores?.[sortColumn] || 0;
        return sortDirection === 'asc' ? aScore - bScore : bScore - aScore;
    });

    if (!heatmapData || heatmapData.length === 0) {
        return (
            <div className="heatmap-container">
                <p className="no-data-message">No heatmap data available</p>
            </div>
        );
    }

    return (
        <div className="heatmap-container">
            <h3 className="heatmap-title">Heatmap: Issues × Dimension</h3>
            <table className="heatmap-table">
                <thead>
                    <tr>
                        <th 
                            className="sortable-header"
                            onClick={() => handleSort('issue')}
                        >
                            Projects
                            {sortColumn === 'issue' && (
                                <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                        </th>
                        {enabledDimensions.map(dim => (
                            <th 
                                key={dim.id}
                                className="sortable-header"
                                onClick={() => handleSort(dim.id)}
                            >
                                {dim.name}
                                {sortColumn === dim.id && (
                                    <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, index) => (
                        <tr key={index}>
                            <td className="issue-key-cell">{row.issueKey}</td>
                            {enabledDimensions.map(dim => {
                                const score = row.scores?.[dim.id] || 0;
                                const scoreInfo = getScoreColor(score);
                                return (
                                    <td key={dim.id} className="score-cell">
                                        <div 
                                            className="score-dot"
                                            style={{ backgroundColor: scoreInfo.color }}
                                            title={`${score} - ${scoreInfo.label}`}
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <div className="heatmap-legend">
                <div className="legend-item">
                    <div className="legend-dot" style={{ backgroundColor: '#00875a' }} />
                    <span>Good (61-100)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{ backgroundColor: '#ff991f' }} />
                    <span>Medium (41-60)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{ backgroundColor: '#de350b' }} />
                    <span>Low (0-40)</span>
                </div>
            </div>
        </div>
    );
}

export default HeatmapTable;
