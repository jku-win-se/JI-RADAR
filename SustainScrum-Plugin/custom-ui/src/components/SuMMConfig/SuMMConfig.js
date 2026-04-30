import React, { useState, useEffect } from 'react';
import { getSuMM, saveSuMM, getProjects } from '../../services/summApi';
import DimensionCard from './DimensionCard';
import { DEFAULT_DIMENSION_QUESTIONS } from '../../constants/defaultDimensionQuestions';
import './SuMMConfig.css';

function cloneDefaultQuestionMap() {
    const o = {};
    Object.keys(DEFAULT_DIMENSION_QUESTIONS).forEach((k) => {
        o[k] = [...DEFAULT_DIMENSION_QUESTIONS[k]];
    });
    return o;
}

/**
 * Main component for SuMM (Sustainability Management Matrix) configuration
 * Displays all dimensions with enable/disable and weight controls
 */
function SuMMConfig({ initialProjectKey = null }) {
    const [projectKey, setProjectKey] = useState(initialProjectKey || ''); // Project key (from project page context or selector)
    const [projects, setProjects] = useState([]);
    const [summData, setSummData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [changeReason, setChangeReason] = useState('');

    // Default dimensions structure
    const defaultDimensions = [
        { id: 'environment', name: 'Environment', enabled: true, weight: 3, progress: 0 },
        { id: 'society', name: 'Society', enabled: true, weight: 4, progress: 0 },
        { id: 'economy', name: 'Economy', enabled: true, weight: 2, progress: 0 },
        { id: 'individual', name: 'Individual', enabled: false, weight: 0, progress: 0 },
        { id: 'technical', name: 'Technical', enabled: false, weight: 0, progress: 0 }
    ];

    // When opened from project page, pre-select that project
    useEffect(() => {
        if (initialProjectKey && initialProjectKey !== projectKey) {
            setProjectKey(initialProjectKey);
        }
    }, [initialProjectKey]);

    // Load projects on component mount
    useEffect(() => {
        loadProjects();
    }, []);

    // Load SuMM configuration on component mount or project change
    useEffect(() => {
        if (projectKey) {
            loadSuMM();
        } else {
            // Don't load if no project selected yet
            setLoading(false);
            setSummData(null);
        }
    }, [projectKey]);

    /**
     * Load list of Jira projects
     */
    const loadProjects = async () => {
        setLoadingProjects(true);
        try {
            const result = await getProjects();
            // Check if result has error property (new error format)
            if (result && result.error) {
                console.error('Failed to load projects:', result.message);
                setError(`Could not load projects: ${result.message}. Please enter project key manually.`);
                setProjects([]);
            } else if (Array.isArray(result)) {
                // Old format - direct array
                setProjects(result);
                // Set first project as default if available
                if (result.length > 0 && !projectKey) {
                    setProjectKey(result[0].key);
                }
            } else if (result && Array.isArray(result.projects)) {
                // New format with projects array
                setProjects(result.projects);
                if (result.projects.length > 0 && !projectKey) {
                    setProjectKey(result.projects[0].key);
                }
            } else {
                console.warn('Unexpected result format from getProjects:', result);
                setProjects([]);
            }
        } catch (err) {
            console.error('Failed to load projects:', err);
            setError(`Could not load projects: ${err.message || 'Unknown error'}. Please enter project key manually.`);
            setProjects([]);
        } finally {
            setLoadingProjects(false);
        }
    };

    /**
     * Load SuMM configuration from backend
     */
    const loadSuMM = async () => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const data = await getSuMM(projectKey);
            // Check if response has error
            if (data.error) {
                setError(data.error);
                // Still set default data so UI can work
                setSummData({
                    projectKey,
                    dimensions: defaultDimensions,
                    dimensionQuestions: cloneDefaultQuestionMap(),
                    totalWeight: 9,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            } else {
                setSummData(data);
                // Show warning if storage is not authorized, but don't treat it as an error
                if (data.storageWarning) {
                    // Show as warning, not error - UI should still work
                    setWarning(data.storageWarning);
                    setError(null); // Clear errors
                } else {
                    setError(null); // Clear any previous errors
                    setWarning(null); // Clear warnings
                }
            }
        } catch (err) {
            console.error('Failed to load SuMM:', err);
            // Even if there's an error, try to show default data
            setSummData({
                projectKey,
                dimensions: defaultDimensions,
                dimensionQuestions: cloneDefaultQuestionMap(),
                totalWeight: 9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            // Only show error if it's not a storage warning (which is handled above)
            if (!err.message || !err.message.includes('storage')) {
                setError('Failed to load SuMM configuration. Using default values.');
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle dimension enable/disable toggle
     */
    const handleToggleEnabled = (dimensionId, enabled) => {
        if (!summData) return;

        const updatedDimensions = summData.dimensions.map(dim => {
            if (dim.id === dimensionId) {
                return {
                    ...dim,
                    enabled,
                    weight: enabled ? dim.weight : 0
                };
            }
            return dim;
        });

        // Recalculate weights to maintain total of 9
        const enabledDims = updatedDimensions.filter(d => d.enabled);
        if (enabledDims.length > 0) {
            adjustWeightsToTotal(updatedDimensions, enabledDims);
        }

        setSummData({
            ...summData,
            dimensions: updatedDimensions
        });
    };

    /**
     * Handle weight change for a dimension
     */
    const handleWeightChange = (dimensionId, newWeight) => {
        if (!summData) return;

        const updatedDimensions = summData.dimensions.map(dim => {
            if (dim.id === dimensionId) {
                return { ...dim, weight: newWeight };
            }
            return dim;
        });

        // Adjust other enabled dimensions to maintain total of 9
        const enabledDims = updatedDimensions.filter(d => d.enabled);
        adjustWeightsToTotal(updatedDimensions, enabledDims);

        setSummData({
            ...summData,
            dimensions: updatedDimensions
        });
    };

    /**
     * Adjust weights of enabled dimensions to sum to 9
     * Distributes the difference proportionally among other enabled dimensions
     */
    const adjustWeightsToTotal = (dimensions, enabledDims) => {
        const currentTotal = enabledDims.reduce((sum, dim) => sum + dim.weight, 0);
        const targetTotal = 9;
        const difference = targetTotal - currentTotal;

        if (difference !== 0 && enabledDims.length > 1) {
            // Distribute difference proportionally
            const totalWeight = enabledDims.reduce((sum, dim) => sum + dim.weight, 0);
            enabledDims.forEach(dim => {
                if (totalWeight > 0) {
                    const proportion = dim.weight / totalWeight;
                    const adjustment = difference * proportion;
                    const newWeight = Math.max(0, Math.min(9, dim.weight + adjustment));
                    const dimIndex = dimensions.findIndex(d => d.id === dim.id);
                    if (dimIndex !== -1) {
                        dimensions[dimIndex].weight = Math.round(newWeight);
                    }
                }
            });
        }
    };

    /**
     * Calculate total weight of enabled dimensions
     */
    const calculateTotalWeight = () => {
        if (!summData) return 0;
        return summData.dimensions
            .filter(d => d.enabled)
            .reduce((sum, dim) => sum + dim.weight, 0);
    };

    /**
     * Handle save button click
     */
    const handleSave = async () => {
        if (!summData) return;

        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const result = await saveSuMM(projectKey, { ...summData, changeReason: changeReason.trim() || undefined });
            if (result.error) {
                setError(result.error);
                // If it's a storage error, show it as a warning but don't block the UI
                if (result.storageError) {
                    setSuccessMessage('Configuration validated, but could not be saved. Please reinstall the app to enable storage.');
                }
            } else {
                setSuccessMessage('SuMM configuration saved successfully!');
                setSummData(result.data);
                setError(null);
                setWarning(null);
                setChangeReason('');
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (err) {
            console.error('Failed to save SuMM:', err);
            setError('Failed to save SuMM configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleDimensionQuestionsTextChange = (dimensionId, text) => {
        if (!summData) return;
        const lines = text.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
        setSummData({
            ...summData,
            dimensionQuestions: {
                ...(summData.dimensionQuestions || {}),
                [dimensionId]: lines
            }
        });
    };

    const questionTextForDimension = (dim) => {
        const q = summData.dimensionQuestions?.[dim.id];
        if (Array.isArray(q) && q.length > 0) return q.join('\n');
        return (DEFAULT_DIMENSION_QUESTIONS[dim.id] || []).join('\n');
    };

    /**
     * Handle cancel button click - reload original data
     */
    const handleCancel = () => {
        loadSuMM();
        setSuccessMessage(null);
        setError(null);
    };

    if (loading) {
        return (
            <div className="summ-config-container">
                <div className="loading-message">Loading SuMM configuration...</div>
            </div>
        );
    }

    if (!projectKey) {
        return (
            <div className="summ-config-container">
                <h1 className="summ-title">SuMM Configuration</h1>
                <div className="project-selector-section">
                    <label htmlFor="project-select" className="project-label">
                        Project:
                    </label>
                    {loadingProjects ? (
                        <span className="loading-text">Loading projects...</span>
                    ) : projects.length > 0 ? (
                        <select
                            id="project-select"
                            value={projectKey}
                            onChange={(e) => setProjectKey(e.target.value)}
                            className="project-select"
                        >
                            <option value="">-- Select Project --</option>
                            {projects.map(project => (
                                <option key={project.key} value={project.key}>
                                    {project.key} - {project.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            id="project-select"
                            type="text"
                            value={projectKey}
                            onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                            className="project-input"
                            placeholder="Enter project key"
                        />
                    )}
                </div>
                <div className="info-message">Please select a project to configure SuMM settings.</div>
            </div>
        );
    }

    if (!summData) {
        return (
            <div className="summ-config-container">
                <h1 className="summ-title">SuMM Configuration</h1>
                <div className="project-selector-section">
                    <label htmlFor="project-select" className="project-label">
                        Project:
                    </label>
                    {loadingProjects ? (
                        <span className="loading-text">Loading projects...</span>
                    ) : projects.length > 0 ? (
                        <select
                            id="project-select"
                            value={projectKey}
                            onChange={(e) => setProjectKey(e.target.value)}
                            className="project-select"
                        >
                            <option value="">-- Select Project --</option>
                            {projects.map(project => (
                                <option key={project.key} value={project.key}>
                                    {project.key} - {project.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            id="project-select"
                            type="text"
                            value={projectKey}
                            onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                            className="project-input"
                            placeholder="Enter project key"
                        />
                    )}
                </div>
                {error && (
                    <div className="error-message">{error}</div>
                )}
                <button onClick={loadSuMM} className="retry-button">Retry</button>
            </div>
        );
    }

    const totalWeight = calculateTotalWeight();
    const isTotalValid = totalWeight === 9;

    return (
        <div className="summ-config-container">
            <h1 className="summ-title">SuMM Configuration</h1>
            
            <div className="project-selector-section">
                <label htmlFor="project-select" className="project-label">
                    Project:
                </label>
                {loadingProjects ? (
                    <span className="loading-text">Loading projects...</span>
                ) : projects.length > 0 ? (
                    <select
                        id="project-select"
                        value={projectKey}
                        onChange={(e) => setProjectKey(e.target.value)}
                        className="project-select"
                    >
                        <option value="">-- Select Project --</option>
                        {projects.map(project => (
                            <option key={project.key} value={project.key}>
                                {project.key} - {project.name}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        id="project-select"
                        type="text"
                        value={projectKey}
                        onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                        className="project-input"
                        placeholder="Enter project key"
                    />
                )}
            </div>

            <div className="summ-matrix-section">
                <h2 className="matrix-title">Sustainability Management Matrix</h2>
                
                {summData.dimensions.map(dimension => (
                    <DimensionCard
                        key={dimension.id}
                        dimension={dimension}
                        onToggleEnabled={handleToggleEnabled}
                        onWeightChange={handleWeightChange}
                    />
                ))}
            </div>

            <div className="assessment-questions-section">
                <h2 className="matrix-title">Assessment questions (SusAF)</h2>
                <p className="questions-help">Texts shown in the Sustainability Panel wizard. One question per line; you can use fewer or more lines per dimension.</p>
                {summData.dimensions.map((dim) => (
                    <div key={dim.id} className="dimension-questions-row">
                        <label className="dimension-questions-label" htmlFor={`q-${dim.id}`}>{dim.name}</label>
                        <textarea
                            id={`q-${dim.id}`}
                            className="dimension-questions-textarea"
                            rows={5}
                            value={questionTextForDimension(dim)}
                            onChange={(e) => handleDimensionQuestionsTextChange(dim.id, e.target.value)}
                        />
                    </div>
                ))}
            </div>

            <div className="validation-section">
                <div className={`total-weight ${isTotalValid ? 'valid' : 'invalid'}`}>
                    Total Weight: {totalWeight}/9 {isTotalValid ? '✓' : '✗'}
                </div>
            </div>

            <div className="governance-section">
                {(summData.changeHistory && summData.changeHistory.length > 0) && (
                    <div className="summ-change-history">
                        <h3 className="history-title">Configuration change log</h3>
                        <p className="history-sub">Recent saves (newest first). Add a &quot;Reason for change&quot; when you save to document decisions.</p>
                        <ul className="history-list">
                            {[...summData.changeHistory].reverse().slice(0, 25).map((entry, idx) => (
                                <li key={idx} className="history-item">
                                    <span className="history-date">{new Date(entry.at).toLocaleString()}</span>
                                    <span className="history-reason">{entry.changeReason || '(no reason given)'}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <label htmlFor="change-reason" className="governance-label">Reason for change (optional)</label>
                <input
                    id="change-reason"
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="change-reason-input"
                    placeholder="e.g. Stakeholder agreement on new priorities"
                />
                {(summData.updatedAt || summData.updatedBy) && (
                    <div className="last-updated">
                        Last updated: {summData.updatedAt ? new Date(summData.updatedAt).toLocaleString() : '—'}
                        {summData.updatedBy && summData.updatedBy !== 'unknown' && ` by ${summData.updatedBy}`}
                        {summData.changeReason && ` — ${summData.changeReason}`}
                    </div>
                )}
            </div>

            {warning && (
                <div className="warning-message">{warning}</div>
            )}
            {error && (
                <div className="error-message">{error}</div>
            )}

            {successMessage && (
                <div className="success-message">{successMessage}</div>
            )}

            <div className="action-buttons">
                <button
                    onClick={handleSave}
                    disabled={saving || !isTotalValid}
                    className="save-button"
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
                <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="cancel-button"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default SuMMConfig;
