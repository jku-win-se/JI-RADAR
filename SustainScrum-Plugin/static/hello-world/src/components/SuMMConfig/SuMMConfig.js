import React, { useState, useEffect } from 'react';
import { getSuMM, saveSuMM, getProjects } from '../../services/summApi';
import DimensionCard from './DimensionCard';
import './SuMMConfig.css';

/**
 * Main component for SuMM (Sustainability Management Matrix) configuration
 * Displays all dimensions with enable/disable and weight controls
 */
function SuMMConfig() {
    const [projectKey, setProjectKey] = useState(''); // Project key
    const [projects, setProjects] = useState([]);
    const [summData, setSummData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Default dimensions structure
    const defaultDimensions = [
        { id: 'environment', name: 'Environment', enabled: true, weight: 3, progress: 0 },
        { id: 'society', name: 'Society', enabled: true, weight: 4, progress: 0 },
        { id: 'economy', name: 'Economy', enabled: true, weight: 2, progress: 0 },
        { id: 'individual', name: 'Individual', enabled: false, weight: 0, progress: 0 },
        { id: 'technical', name: 'Technical', enabled: false, weight: 0, progress: 0 }
    ];

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
            const result = await saveSuMM(projectKey, summData);
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
                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (err) {
            console.error('Failed to save SuMM:', err);
            setError('Failed to save SuMM configuration');
        } finally {
            setSaving(false);
        }
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

            <div className="validation-section">
                <div className={`total-weight ${isTotalValid ? 'valid' : 'invalid'}`}>
                    Total Weight: {totalWeight}/9 {isTotalValid ? '✓' : '✗'}
                </div>
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
