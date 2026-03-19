import { invoke } from '@forge/bridge';

/**
 * Service for Dashboard API calls
 */

/**
 * Get dashboard data (KPIs, trends, heatmap)
 * @param {string} projectKey - Jira project key
 * @param {string} sprintId - Optional sprint ID
 * @param {string} sprintName - Optional sprint name (for JQL fallback)
 * @returns {Promise<Object>} Dashboard data
 */
export const getDashboardData = async (projectKey, sprintId = null, sprintName = null) => {
    try {
        const result = await invoke('getDashboardData', { projectKey, sprintId, sprintName });
        return result;
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        throw error;
    }
};

/**
 * Get sprints for a project
 * @param {string} projectKey - Jira project key
 * @returns {Promise<Object>} Sprints data
 */
export const getSprints = async (projectKey) => {
    try {
        const result = await invoke('getSprints', { projectKey });
        return result;
    } catch (error) {
        console.error('Error getting sprints:', error);
        return { sprints: [], error: error.message || 'Failed to load sprints' };
    }
};
