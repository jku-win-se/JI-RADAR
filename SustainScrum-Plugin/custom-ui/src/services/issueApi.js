import { invoke } from '@forge/bridge';

/**
 * Service for Issue-level sustainability API calls
 */

/**
 * Get current issue key from Forge context
 * @returns {Promise<Object>} Issue key from context
 */
export const getCurrentIssueKey = async () => {
    try {
        const result = await invoke('getCurrentIssueKey', {});
        return result;
    } catch (error) {
        console.error('Error getting current issue key:', error);
        throw error;
    }
};

/**
 * Get issue information
 * @param {string} issueKey - Jira issue key (optional, will try to get from context if not provided)
 * @returns {Promise<Object>} Issue information
 */
export const getIssueInfo = async (issueKey) => {
    try {
        const result = await invoke('getIssueInfo', { issueKey });
        return result;
    } catch (error) {
        console.error('Error getting issue info:', error);
        throw error;
    }
};

/**
 * Get sustainability assessment for an issue
 * @param {string} issueKey - Jira issue key
 * @returns {Promise<Object>} Assessment data or null
 */
export const getIssueAssessment = async (issueKey) => {
    try {
        const result = await invoke('getIssueAssessment', { issueKey });
        return result;
    } catch (error) {
        console.error('Error getting issue assessment:', error);
        throw error;
    }
};

/**
 * Save sustainability assessment for an issue
 * @param {string} issueKey - Jira issue key
 * @param {Object} assessmentData - Assessment data (may include justification: { compromises, alternatives, rationale, linkedIssueKeys })
 * @returns {Promise<Object>} Save result
 */
export const saveIssueAssessment = async (issueKey, assessmentData) => {
    try {
        console.log('Frontend: Calling saveIssueAssessment with:', { issueKey, assessmentData });
        const result = await invoke('saveIssueAssessment', { issueKey, assessmentData });
        console.log('Frontend: Received result from saveIssueAssessment:', result);
        
        // Check if result has an error
        if (result && result.error) {
            console.error('Frontend: Backend returned error:', result.error);
            throw new Error(result.error);
        }
        
        return result;
    } catch (error) {
        console.error('Frontend: Error saving issue assessment:', error);
        // If error is already a string or has message, use it; otherwise wrap it
        if (error.message) {
            throw error;
        } else if (typeof error === 'string') {
            throw new Error(error);
        } else {
            throw new Error(`Failed to save issue assessment: ${JSON.stringify(error)}`);
        }
    }
};

/**
 * Get issue links (traceability)
 */
export const getIssueLinks = async (issueKey) => {
    try {
        const result = await invoke('getIssueLinks', { issueKey });
        return result;
    } catch (error) {
        console.error('Error getting issue links:', error);
        throw error;
    }
};

/**
 * Create issue link (outward -> inward). linkTypeName defaults to "Relates".
 */
export const createIssueLink = async (outwardIssueKey, inwardIssueKey, linkTypeName = 'Relates') => {
    try {
        const result = await invoke('createIssueLink', { outwardIssueKey, inwardIssueKey, linkTypeName });
        if (result && result.error) throw new Error(result.error);
        return result;
    } catch (error) {
        console.error('Error creating issue link:', error);
        throw error;
    }
};

/**
 * Delete issue link by id
 */
export const deleteIssueLink = async (linkId) => {
    try {
        const result = await invoke('deleteIssueLink', { linkId });
        if (result && result.error) throw new Error(result.error);
        return result;
    } catch (error) {
        console.error('Error deleting issue link:', error);
        throw error;
    }
};

/**
 * Search issues in project (for link picker and justification)
 */
export const searchIssues = async (projectKey, currentIssueKey, query, maxResults = 50) => {
    try {
        const result = await invoke('searchIssues', { projectKey, currentIssueKey, query, maxResults });
        if (result && result.error) throw new Error(result.error);
        return result;
    } catch (error) {
        console.error('Error searching issues:', error);
        throw error;
    }
};
