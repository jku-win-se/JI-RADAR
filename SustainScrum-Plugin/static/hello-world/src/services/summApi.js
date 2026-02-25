import { invoke, requestJira } from '@forge/bridge';

/**
 * Service for SuMM (Sustainability Management Matrix) API calls
 */

/**
 * Get list of Jira projects
 * @returns {Promise<Array>} List of projects
 */
export const getProjects = async () => {
    try {
        // Use requestJira directly from frontend (recommended approach in Forge)
        const response = await requestJira('/rest/api/3/project/search?maxResults=100');
        const data = await response.json();
        
        // The /project/search endpoint returns { values: [...] }
        const projects = data.values || data;
        
        if (!Array.isArray(projects)) {
            console.error('Unexpected response format from Jira API:', data);
            return [];
        }
        
        // Return simplified project list
        return projects.map(project => ({
            key: project.key,
            name: project.name,
            id: project.id
        }));
    } catch (error) {
        console.error('Error getting projects:', error);
        // Return empty array on error so UI can still work with manual input
        return [];
    }
};

/**
 * Get SuMM configuration for a project
 * @param {string} projectKey - Jira project key
 * @returns {Promise<Object>} SuMM configuration
 */
export const getSuMM = async (projectKey) => {
    try {
        const result = await invoke('getSuMM', { projectKey });
        return result;
    } catch (error) {
        console.error('Error getting SuMM:', error);
        throw error;
    }
};

/**
 * Save SuMM configuration for a project
 * @param {string} projectKey - Jira project key
 * @param {Object} summData - SuMM configuration data
 * @returns {Promise<Object>} Save result
 */
export const saveSuMM = async (projectKey, summData) => {
    try {
        const result = await invoke('saveSuMM', { projectKey, summData });
        return result;
    } catch (error) {
        console.error('Error saving SuMM:', error);
        throw error;
    }
};
