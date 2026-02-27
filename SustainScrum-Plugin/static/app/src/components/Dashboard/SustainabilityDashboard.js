import React, { useState, useEffect } from 'react';
import { getDashboardData, getSprints } from '../../services/dashboardApi';
import { getProjects } from '../../services/summApi';
import KPICards from './KPICards';
import HeatmapTable from './HeatmapTable';
import TrendsChart from './TrendsChart';
import OverviewContent from './OverviewContent';
import DetailedKPIView from './DetailedKPIView';
import './SustainabilityDashboard.css';

/**
 * Main Dashboard component for Sustainability KPIs and visualizations
 */
function SustainabilityDashboard() {
    const [projectKey, setProjectKey] = useState('');
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [sprints, setSprints] = useState([]);
    const [loadingSprints, setLoadingSprints] = useState(false);
    const [selectedSprintId, setSelectedSprintId] = useState('');
    const [sprintAuthError, setSprintAuthError] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Load projects on component mount
    useEffect(() => {
        loadProjects();
    }, []);

    // Load sprints when project changes
    useEffect(() => {
        if (projectKey && projectKey !== 'PROJ') {
            loadSprints();
        } else {
            setSprints([]);
            setSelectedSprintId('');
        }
    }, [projectKey]);

    // Load dashboard data when project or sprint changes
    useEffect(() => {
        if (projectKey && projectKey !== 'PROJ') {
            loadDashboardData();
        } else {
            setLoading(false);
        }
    }, [projectKey, selectedSprintId]);

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
     * Load sprints for the selected project
     */
    const loadSprints = async () => {
        setLoadingSprints(true);
        let result = null;
        try {
            console.log('Loading sprints for project:', projectKey);
            result = await getSprints(projectKey);
            console.log('Sprint loading result:', result);
            
            if (result.error) {
                console.error('Error loading sprints:', result.error);
                setSprints([]);
                setSelectedSprintId('');
                setSprintAuthError(result.authError || false);
            } else if (result.warning && !result.authError) {
                console.warn('Warning loading sprints:', result.warning);
                setSprints([]);
                setSelectedSprintId('');
                setSprintAuthError(false);
            } else {
                setSprintAuthError(false);
                const sprintsList = result.sprints || [];
                console.log(`Loaded ${sprintsList.length} sprints:`, sprintsList);
                
                if (sprintsList.length === 0) {
                    console.warn('No sprints found in result, even though no error was returned');
                }
                
                // Ensure all sprint IDs are strings for consistency
                const normalizedSprints = sprintsList.map(s => ({
                    ...s,
                    id: String(s.id) // Normalize ID to string
                }));
                setSprints(normalizedSprints);
                // Auto-select active sprint if available
                const activeSprint = normalizedSprints.find(s => s.state === 'active');
                if (activeSprint) {
                    setSelectedSprintId(activeSprint.id);
                } else {
                    setSelectedSprintId('');
                }
            }
        } catch (err) {
            console.error('Failed to load sprints:', err);
            setSprints([]);
            setSelectedSprintId('');
        } finally {
            setLoadingSprints(false);
        }
    };

    const loadDashboardData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const data = await getDashboardData(projectKey, selectedSprintId || null);
            if (data.error) {
                setError(data.error);
            } else {
                setDashboardData(data);
            }
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loadingProjects) {
        return (
            <div className="dashboard-container">
                <div className="loading-message">Loading projects...</div>
            </div>
        );
    }

    if (!projectKey || projectKey === 'PROJ') {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Sustainability Dashboard</h1>
                </div>
                <div className="project-selector-section">
                    <label htmlFor="project-select" className="project-label">
                        Project:
                    </label>
                    {projects.length > 0 ? (
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
                <div className="info-message">Please select a project to view sustainability dashboard.</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading-message">Loading dashboard data...</div>
            </div>
        );
    }

    if (error && !dashboardData) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Sustainability Dashboard</h1>
                    <div className="project-selector">
                        <label htmlFor="project-select">Project:</label>
                        {projects.length > 0 ? (
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
                </div>
                <div className="error-message">{error}</div>
                {error.includes('SuMM configuration not found') && (
                    <div className="info-message" style={{ marginTop: '16px' }}>
                        <p><strong>To fix this:</strong></p>
                        <ol style={{ marginLeft: '20px', marginTop: '8px' }}>
                            <li>Go to <strong>Settings → Apps → SustainScrum Plugin</strong></li>
                            <li>Select this project ({projectKey}) from the dropdown</li>
                            <li>Configure the Sustainability Management Matrix (SuMM)</li>
                            <li>Save the configuration</li>
                            <li>Return to this dashboard</li>
                        </ol>
                    </div>
                )}
                <button onClick={loadDashboardData} className="retry-button" style={{ marginTop: '16px' }}>Retry</button>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Sustainability Dashboard</h1>
                <div className="project-selector">
                    <label htmlFor="project-select">Project:</label>
                    {projects.length > 0 ? (
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
            </div>

            <div className="dashboard-controls">
                <div className="sprint-selector-wrapper">
                    <label htmlFor="sprint-select" className="sprint-label">Sprint:</label>
                    <select 
                        id="sprint-select"
                        className="sprint-selector"
                        value={selectedSprintId}
                        onChange={(e) => {
                            console.log('Sprint selection changed:', e.target.value);
                            setSelectedSprintId(e.target.value);
                        }}
                        disabled={loadingSprints}
                    >
                        <option value="">All Sprints</option>
                        {sprints.map(sprint => {
                            const sprintId = String(sprint.id); // Ensure string
                            return (
                                <option key={sprintId} value={sprintId}>
                                    {sprint.name} {sprint.state === 'active' ? '(Active)' : sprint.state === 'future' ? '(Future)' : '(Closed)'}
                                </option>
                            );
                        })}
                    </select>
                    {loadingSprints && <span className="loading-indicator">Loading...</span>}
                    {!loadingSprints && sprints.length === 0 && projectKey && (
                        <span className="sprint-hint">
                            {sprintAuthError ? '⚠️ Sprint API not available in Forge. Using "All Sprints" view.' : 'No sprints found. Create a Scrum Board first.'}
                        </span>
                    )}
                    {!loadingSprints && sprints.length > 0 && (
                        <span className="sprint-hint" style={{ color: '#6b778c' }}>
                            {sprints.length} sprint{sprints.length !== 1 ? 's' : ''} available
                        </span>
                    )}
                </div>
                <button className="export-button" disabled>Export</button>
            </div>

            {dashboardData && (
                <>
                    <div className="summ-section">
                        <h2 className="section-title">Sustainability Management Matrix</h2>
                    </div>

                    <KPICards kpis={dashboardData.kpis} enabledDimensions={dashboardData.enabledDimensions} />

                    <div className="dashboard-tabs">
                        <button 
                            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'kpis' ? 'active' : ''}`}
                            onClick={() => setActiveTab('kpis')}
                        >
                            KPIs
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'heatmap' ? 'active' : ''}`}
                            onClick={() => setActiveTab('heatmap')}
                        >
                            Heatmap
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`}
                            onClick={() => setActiveTab('trends')}
                        >
                            Trends
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'heatmap' && (
                            <HeatmapTable 
                                heatmapData={dashboardData.heatmap} 
                                enabledDimensions={dashboardData.enabledDimensions}
                            />
                        )}
                        {activeTab === 'overview' && (
                            <OverviewContent 
                                dashboardData={dashboardData}
                                kpis={dashboardData.kpis} 
                                enabledDimensions={dashboardData.enabledDimensions} 
                            />
                        )}
                        {activeTab === 'kpis' && (
                            <DetailedKPIView 
                                kpis={dashboardData.kpis} 
                                enabledDimensions={dashboardData.enabledDimensions} 
                            />
                        )}
                        {activeTab === 'trends' && (
                            <div className="trends-content">
                                <TrendsChart 
                                    trendsData={dashboardData.trends} 
                                    enabledDimensions={dashboardData.enabledDimensions}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default SustainabilityDashboard;
