import Resolver from '@forge/resolver';
import { asUser, asApp, route, storage } from '@forge/api';

const resolver = new Resolver();

/**
 * Simple test function - can be removed later
 */
resolver.define('getText', (req) => {
    console.log(req);
    return 'Hello, world!';
});

/**
 * Calculate progress values for dimensions based on actual issue assessments
 * @param {string} projectKey - Project key
 * @param {Array} dimensions - Array of dimension objects
 * @param {Object} store - Forge storage instance
 * @returns {Promise<Array>} Dimensions with updated progress values
 */
/**
 * Calculate progress values for dimensions based on actual issue assessments
 * @param {string} projectKey - Project key
 * @param {Array} dimensions - Array of dimension objects
 * @param {Object} store - Forge storage instance (optional, will get if not provided)
 * @returns {Promise<Array>} Dimensions with updated progress values
 */
async function calculateDimensionProgress(projectKey, dimensions, store) {
    // If store not provided, get it
    if (!store) {
        try {
            // Storage is already available via 'storage' from @forge/api
        } catch (e) {
            console.warn('Could not get storage for progress calculation:', e.message);
            return dimensions.map(dim => ({ ...dim, progress: 0 }));
        }
    }
    try {
        // Get assessment index for this project
        const indexKey = `assessments:${projectKey}`;
        let assessmentIndex = [];
        try {
            const existingIndex = await storage.get(indexKey);
            if (existingIndex && Array.isArray(existingIndex)) {
                assessmentIndex = existingIndex;
            }
        } catch (e) {
            // No index yet, return dimensions with 0 progress
            return dimensions.map(dim => ({ ...dim, progress: 0 }));
        }
        
        if (assessmentIndex.length === 0) {
            // No assessments yet, return dimensions with 0 progress
            return dimensions.map(dim => ({ ...dim, progress: 0 }));
        }
        
        // Load all assessments
        const allAssessments = [];
        for (const item of assessmentIndex) {
            try {
                const assessmentKey = `assessment:${item.issueKey}`;
                const assessment = await storage.get(assessmentKey);
                if (assessment && assessment.susafScores) {
                    allAssessments.push(assessment);
                }
            } catch (e) {
                // Skip if assessment not found
                console.warn(`Assessment not found for ${item.issueKey}:`, e);
            }
        }
        
        if (allAssessments.length === 0) {
            // No valid assessments, return dimensions with 0 progress
            return dimensions.map(dim => ({ ...dim, progress: 0 }));
        }
        
        // Calculate progress for each dimension
        return dimensions.map(dim => {
            // Get all scores for this dimension from all assessments
            const scores = allAssessments
                .map(a => a.susafScores[dim.id])
                .filter(s => s !== undefined && s !== null && s > 0);
            
            if (scores.length === 0) {
                // No scores for this dimension
                return { ...dim, progress: 0 };
            }
            
            // Calculate average score (1-5 scale)
            const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            
            // Convert 1-5 scale to 0-100% progress
            // 1 = 0%, 2 = 25%, 3 = 50%, 4 = 75%, 5 = 100%
            const progress = Math.round(((averageScore - 1) / 4) * 100);
            
            return { ...dim, progress: Math.max(0, Math.min(100, progress)) };
        });
    } catch (error) {
        console.error('Error calculating dimension progress:', error);
        // On error, return dimensions with 0 progress
        return dimensions.map(dim => ({ ...dim, progress: 0 }));
    }
}

/**
 * TOPSIS (Technique for Order Preference by Similarity to Ideal Solution).
 * Per dimension: alternatives = issues, criterion = dimension score. Then weighted aggregate.
 * @param {Array} assessments - List of { issueKey, susafScores } (scores 1-5 per dimension)
 * @param {Array} enabledDimensions - List of { id, weight } with weight > 0
 * @returns {{ perIssueKPI: Object.<string,number>, perDimensionPerIssue: Object.<string,Object.<string,number>>, dimensionKPIs: Object.<string,number> }}
 */
function computeTOPSIS(assessments, enabledDimensions) {
    const totalWeight = enabledDimensions.reduce((sum, d) => sum + d.weight, 0);
    if (totalWeight <= 0 || !assessments || assessments.length === 0) {
        return { perIssueKPI: {}, perDimensionPerIssue: {}, dimensionKPIs: {} };
    }
    const n = assessments.length;
    const perDimensionPerIssue = {}; // dimId -> { issueKey: C_i (0-1) }
    const dimIds = enabledDimensions.map(d => d.id);

    enabledDimensions.forEach(dim => {
        const scores = assessments.map(a => {
            const s = a.susafScores && a.susafScores[dim.id];
            return (s !== undefined && s !== null && s > 0) ? Number(s) : 0;
        });
        const sumSq = scores.reduce((acc, s) => acc + s * s, 0);
        const norm = Math.sqrt(sumSq) || 1;
        const r = scores.map(s => s / norm);
        const w = dim.weight / totalWeight;
        const v = r.map(ri => w * ri);
        const Aplus = Math.max(...v);
        const Aminus = Math.min(...v);
        const C = v.map((vi, i) => {
            const Dplus = Math.abs(vi - Aplus);
            const Dminus = Math.abs(vi - Aminus);
            const denom = Dplus + Dminus;
            return denom > 0 ? Dminus / denom : 0.5;
        });
        perDimensionPerIssue[dim.id] = {};
        assessments.forEach((a, i) => {
            perDimensionPerIssue[dim.id][a.issueKey] = C[i];
        });
    });

    const perIssueKPI = {};
    assessments.forEach(a => {
        let weightedSum = 0;
        enabledDimensions.forEach(dim => {
            const c = perDimensionPerIssue[dim.id] && perDimensionPerIssue[dim.id][a.issueKey];
            if (c != null) weightedSum += (dim.weight / totalWeight) * c;
        });
        perIssueKPI[a.issueKey] = Math.round(weightedSum * 100);
    });

    const dimensionKPIs = {};
    enabledDimensions.forEach(dim => {
        const vals = Object.values(perDimensionPerIssue[dim.id] || {});
        const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        dimensionKPIs[dim.id] = Math.round(avg * 100);
    });

    return { perIssueKPI, perDimensionPerIssue, dimensionKPIs };
}

/**
 * Get SuMM configuration for a specific project
 * @param {Object} req - Request object containing projectKey
 * @returns {Object} SuMM configuration or null if not found
 */
resolver.define('getSuMM', async (req) => {
    const { projectKey } = req.payload;
    
    if (!projectKey) {
        return { error: 'Project key is required' };
    }

    try {
        // Storage key format: summ:{projectKey}
        const storageKey = `summ:${projectKey}`;
        // Use asApp() for storage operations
        // Use Forge storage API (storage from @forge/api)
        let summData;
        try {
            summData = await storage.get(storageKey);
        } catch (storageError) {
            console.warn('Storage get SuMM:', storageError?.message || storageError);
            const defaultDimensions = [
                { id: 'environment', name: 'Environment', enabled: true, weight: 3, progress: 0 },
                { id: 'society', name: 'Society', enabled: true, weight: 4, progress: 0 },
                { id: 'economy', name: 'Economy', enabled: true, weight: 2, progress: 0 },
                { id: 'individual', name: 'Individual', enabled: false, weight: 0, progress: 0 },
                { id: 'technical', name: 'Technical', enabled: false, weight: 0, progress: 0 }
            ];
            return {
                projectKey,
                dimensions: defaultDimensions,
                totalWeight: 9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                storageWarning: 'Saved configuration could not be loaded; default values are shown. Adjust the values below and click "Save Configuration" to store them. If saving fails, check app permissions or reinstall the app.'
            };
        }
        
        if (!summData) {
            // No config saved yet – return defaults; progress is optional
            const defaultDimensions = [
                { id: 'environment', name: 'Environment', enabled: true, weight: 3, progress: 0 },
                { id: 'society', name: 'Society', enabled: true, weight: 4, progress: 0 },
                { id: 'economy', name: 'Economy', enabled: true, weight: 2, progress: 0 },
                { id: 'individual', name: 'Individual', enabled: false, weight: 0, progress: 0 },
                { id: 'technical', name: 'Technical', enabled: false, weight: 0, progress: 0 }
            ];
            let dimensionsWithProgress = defaultDimensions;
            try {
                dimensionsWithProgress = await calculateDimensionProgress(projectKey, defaultDimensions, storage);
            } catch (e) {
                console.warn('Could not calculate progress for default SuMM:', e);
            }
            return {
                projectKey,
                dimensions: dimensionsWithProgress,
                totalWeight: 9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }
        
        return summData;
    } catch (error) {
        console.warn('Error getting SuMM:', error?.message || error);
        const defaultDimensions = [
            { id: 'environment', name: 'Environment', enabled: true, weight: 3, progress: 0 },
            { id: 'society', name: 'Society', enabled: true, weight: 4, progress: 0 },
            { id: 'economy', name: 'Economy', enabled: true, weight: 2, progress: 0 },
            { id: 'individual', name: 'Individual', enabled: false, weight: 0, progress: 0 },
            { id: 'technical', name: 'Technical', enabled: false, weight: 0, progress: 0 }
        ];
        let dimensionsWithProgress = defaultDimensions;
        try {
            dimensionsWithProgress = await calculateDimensionProgress(projectKey, defaultDimensions, storage);
        } catch (e) {
            console.warn('Could not calculate progress:', e);
        }
        return {
            projectKey,
            dimensions: dimensionsWithProgress,
            totalWeight: 9,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            storageWarning: 'Configuration could not be loaded; default values are shown. Adjust and save to store your settings. If saving fails, check app permissions.'
        };
    }
});

/**
 * Save SuMM configuration for a project
 * @param {Object} req - Request object containing projectKey and summData
 * @returns {Object} Success status or error
 */
resolver.define('saveSuMM', async (req) => {
    const { projectKey, summData, changeReason } = req.payload;
    
    if (!projectKey || !summData) {
        return { error: 'Project key and SuMM data are required' };
    }

    // Validate SuMM data
    const validation = validateSuMM(summData);
    if (!validation.valid) {
        return { error: validation.message };
    }

    try {
        const storageKey = `summ:${projectKey}`;
        const existing = await storage.get(storageKey);
        const now = new Date().toISOString();
        const updatedBy = (req.context && req.context.accountId) ? req.context.accountId : 'unknown';
        const reason = changeReason != null ? String(changeReason).trim() : (summData.changeReason != null ? String(summData.changeReason).trim() : null);

        // Calculate total weight of enabled dimensions
        const enabledDimensions = summData.dimensions.filter(d => d.enabled);
        const totalWeight = enabledDimensions.reduce((sum, dim) => sum + dim.weight, 0);
        
        // Prepare data for storage (Governance: updatedBy, changeReason)
        const dataToStore = {
            ...summData,
            projectKey,
            totalWeight,
            createdAt: (existing && existing.createdAt) ? existing.createdAt : now,
            updatedAt: now,
            updatedBy: updatedBy,
            changeReason: reason || null
        };
        
        await storage.set(storageKey, dataToStore);
        
        return { success: true, data: dataToStore };
    } catch (error) {
        console.error('Error saving SuMM:', error);
        // If storage is not authorized, return error with helpful message
        if (error.message && error.message.includes('not authorized')) {
            return { 
                error: 'Storage not authorized. Please reinstall the app to enable storage functionality.',
                storageError: true
            };
        }
        return { error: 'Failed to save SuMM configuration' };
    }
});

/**
 * Validate SuMM configuration
 * Rules:
 * - Total weight of enabled dimensions must equal 9
 * - Each dimension weight must be between 0 and 9
 * - At least one dimension must be enabled
 * @param {Object} summData - SuMM data to validate
 * @returns {Object} Validation result with valid flag and message
 */
function validateSuMM(summData) {
    if (!summData || !summData.dimensions || !Array.isArray(summData.dimensions)) {
        return { valid: false, message: 'Invalid SuMM structure: dimensions array is required' };
    }

    const enabledDimensions = summData.dimensions.filter(d => d.enabled);
    
    if (enabledDimensions.length === 0) {
        return { valid: false, message: 'At least one dimension must be enabled' };
    }

    // Check individual dimension weights
    for (const dim of summData.dimensions) {
        if (dim.weight < 0 || dim.weight > 9) {
            return { valid: false, message: `Dimension ${dim.name}: weight must be between 0 and 9` };
        }
        
        // Disabled dimensions should have weight 0
        if (!dim.enabled && dim.weight !== 0) {
            return { valid: false, message: `Disabled dimension ${dim.name} must have weight 0` };
        }
    }

    // Calculate total weight of enabled dimensions
    const totalWeight = enabledDimensions.reduce((sum, dim) => sum + dim.weight, 0);
    
    if (totalWeight !== 9) {
        return { 
            valid: false, 
            message: `Total weight of enabled dimensions must be 9, but is ${totalWeight}` 
        };
    }

    return { valid: true, message: 'SuMM configuration is valid' };
}

/**
 * Get sustainability assessment for a specific issue.
 * weightedKPI is recomputed from susafScores using current SuMM weights so that
 * changing weights in SuMM is reflected immediately in the panel and everywhere.
 * @param {Object} req - Request object containing issueKey
 * @returns {Object} Assessment data or null if not found
 */
resolver.define('getIssueAssessment', async (req) => {
    const { issueKey } = req.payload;
    
    if (!issueKey) {
        return { error: 'Issue key is required' };
    }

    try {
        const storageKey = `assessment:${issueKey}`;
        const assessmentData = await storage.get(storageKey);
        if (!assessmentData || !assessmentData.susafScores) {
            return assessmentData || null;
        }
        const projectKey = (issueKey.indexOf('-') >= 0 ? issueKey.split('-')[0] : null) || '';
        let weightedKPI = assessmentData.weightedKPI;
        try {
            const summKey = `summ:${projectKey}`;
            const summData = await storage.get(summKey);
            if (summData && summData.dimensions && assessmentData.susafScores) {
                const enabledDimensions = summData.dimensions.filter(d => d.enabled && d.weight > 0);
                const totalWeight = enabledDimensions.reduce((sum, dim) => sum + dim.weight, 0);
                if (totalWeight > 0) {
                    let sum = 0;
                    for (const dim of enabledDimensions) {
                        const score = assessmentData.susafScores[dim.id];
                        if (score !== undefined && score !== null) {
                            sum += (score / 5) * 100 * (dim.weight / totalWeight);
                        }
                    }
                    weightedKPI = Math.round(sum);
                }
            }
        } catch (e) {
            console.warn('Could not recompute KPI with current SuMM weights:', e.message);
        }
        return { ...assessmentData, weightedKPI: weightedKPI != null ? weightedKPI : assessmentData.weightedKPI };
    } catch (error) {
        console.error('Error getting issue assessment:', error);
        // If storage is not authorized, return null (not assessed yet)
        if (error.message && error.message.includes('not authorized')) {
            return null;
        }
        return { error: 'Failed to retrieve issue assessment' };
    }
});

/**
 * Save sustainability assessment for an issue
 * @param {Object} req - Request object containing issueKey and assessmentData
 * @returns {Object} Success status or error
 */
resolver.define('saveIssueAssessment', async (req) => {
    console.log('saveIssueAssessment called with:', JSON.stringify(req.payload).substring(0, 200));
    
    const { issueKey, assessmentData } = req.payload;
    
    if (!issueKey) {
        console.error('saveIssueAssessment: issueKey is missing');
        return { error: 'Issue key is required' };
    }
    
    if (!assessmentData) {
        console.error('saveIssueAssessment: assessmentData is missing');
        return { error: 'Assessment data is required' };
    }
    
    if (!assessmentData.susafScores || Object.keys(assessmentData.susafScores).length === 0) {
        console.error('saveIssueAssessment: susafScores is missing or empty');
        return { error: 'Assessment data must contain susafScores' };
    }

    try {
        // Use asApp() for storage operations
        // Use Forge storage API (storage from @forge/api)
        console.log('Storage initialized, attempting to save assessment for:', issueKey);
        
        // Get project key from issue (simplified - in real implementation, fetch from Jira API)
        const projectKey = issueKey.split('-')[0];
        
        // Get SuMM configuration to calculate KPI
        const summKey = `summ:${projectKey}`;
        const summData = await storage.get(summKey);
        let weightedKPI = 0;
        let topsisResult = null;

        if (summData && assessmentData.susafScores) {
            const enabledDimensions = summData.dimensions.filter(d => d.enabled && d.weight > 0);
            const totalWeight = enabledDimensions.reduce((sum, dim) => sum + dim.weight, 0);

            if (totalWeight > 0) {
                const indexKey = `assessments:${projectKey}`;
                let allAssessmentsForTOPSIS = [];
                try {
                    const index = await storage.get(indexKey);
                    const list = (index && Array.isArray(index)) ? index : [];
                    const currentData = {
                        issueKey,
                        susafScores: assessmentData.susafScores
                    };
                    for (const item of list) {
                        if (item.issueKey === issueKey) continue;
                        try {
                            const a = await storage.get(`assessment:${item.issueKey}`);
                            if (a && a.susafScores) allAssessmentsForTOPSIS.push(a);
                        } catch (_) { /* skip */ }
                    }
                    allAssessmentsForTOPSIS.push(currentData);
                } catch (_) {
                    allAssessmentsForTOPSIS = [{ issueKey, susafScores: assessmentData.susafScores }];
                }

                if (allAssessmentsForTOPSIS.length >= 2) {
                    topsisResult = computeTOPSIS(allAssessmentsForTOPSIS, enabledDimensions);
                    weightedKPI = topsisResult.perIssueKPI[issueKey] != null ? topsisResult.perIssueKPI[issueKey] : 0;
                } else {
                    let weightedSum = 0;
                    let hasScores = false;
                    enabledDimensions.forEach(dim => {
                        const score = assessmentData.susafScores[dim.id];
                        if (score !== undefined && score !== null && score > 0) {
                            hasScores = true;
                            weightedSum += (score / 5) * 100 * (dim.weight / totalWeight);
                        }
                    });
                    weightedKPI = hasScores ? Math.round(weightedSum) : 0;
                }
            }
        } else {
            if (!summData) console.warn(`SuMM configuration not found for project ${projectKey}`);
            if (!assessmentData.susafScores) console.warn('Assessment data has no susafScores');
        }
        
        // Prepare data for storage (incl. Nachhaltigkeitsbegründungsaufzeichnung with linkedIssueKeys)
        const dataToStore = {
            issueKey,
            projectKey,
            summDimensionId: assessmentData.summDimensionId,
            susafScores: assessmentData.susafScores,
            answers: assessmentData.answers || null,
            justification: assessmentData.justification || null, // { compromises, alternatives, rationale, linkedIssueKeys }
            weightedKPI,
            assessedAt: new Date().toISOString(),
            assessedBy: assessmentData.assessedBy || 'unknown'
        };
        
        // Storage key format: assessment:{issueKey}
        const storageKey = `assessment:${issueKey}`;
        console.log('Attempting to save to storage key:', storageKey);
        try {
            await storage.set(storageKey, dataToStore);
            console.log('Successfully saved assessment to storage');
        } catch (storageError) {
            console.error('Storage error when saving assessment:', storageError);
            console.error('Storage error details:', {
                message: storageError.message,
                name: storageError.name,
                stack: storageError.stack,
                code: storageError.code
            });
            // Return detailed error message
            return { 
                error: `Storage error: ${storageError.message || storageError.toString() || 'Unknown storage error'}. Please check Forge logs for details.`,
                storageError: true,
                details: storageError.message
            };
        }
        
        // Update project assessment index
        const indexKey = `assessments:${projectKey}`;
        let assessmentIndex = [];
        try {
            const existingIndex = await storage.get(indexKey);
            if (existingIndex && Array.isArray(existingIndex)) {
                assessmentIndex = existingIndex;
            }
        } catch (e) {
            // Index doesn't exist yet, start fresh
        }
        
        // Add or update issue in index
        const existingIndex = assessmentIndex.findIndex(item => item.issueKey === issueKey);
        if (existingIndex >= 0) {
            assessmentIndex[existingIndex] = { issueKey, assessedAt: dataToStore.assessedAt };
        } else {
            assessmentIndex.push({ issueKey, assessedAt: dataToStore.assessedAt });
        }
        
        try {
            await storage.set(indexKey, assessmentIndex);
        } catch (e) {
            // If index storage fails, continue anyway (non-critical)
            console.warn('Could not update assessment index:', e);
        }
        
        // Store historical KPI data for trends
        if (summData && weightedKPI > 0) {
            try {
                const historyKey = `kpi-history:${projectKey}`;
                let historyData = [];
                try {
                    const existingHistory = await storage.get(historyKey);
                    if (existingHistory && Array.isArray(existingHistory)) {
                        historyData = existingHistory;
                    }
                } catch (e) {
                    // History doesn't exist yet, start fresh
                }
                const enabledDims = summData.dimensions.filter(d => d.enabled);
                const totalW = enabledDims.reduce((sum, dim) => sum + dim.weight, 0);
                const dimensionKPIs = {};
                if (topsisResult && topsisResult.perDimensionPerIssue) {
                    enabledDims.forEach(dim => {
                        const c = topsisResult.perDimensionPerIssue[dim.id] && topsisResult.perDimensionPerIssue[dim.id][issueKey];
                        dimensionKPIs[dim.id] = c != null ? Math.round(c * 100) : 0;
                    });
                } else if (totalW > 0 && assessmentData.susafScores) {
                    enabledDims.forEach(dim => {
                        const score = assessmentData.susafScores[dim.id];
                        if (score !== undefined && score !== null && score > 0) {
                            dimensionKPIs[dim.id] = Math.round((score / 5) * 100);
                        } else {
                            dimensionKPIs[dim.id] = 0;
                        }
                    });
                }
                
                // Add new history entry
                const historyEntry = {
                    timestamp: new Date().toISOString(),
                    issueKey,
                    weightedKPI,
                    dimensionKPIs
                };
                
                historyData.push(historyEntry);
                
                // Keep only last 100 entries per project (to avoid storage bloat)
                if (historyData.length > 100) {
                    historyData = historyData.slice(-100);
                }
                
                await storage.set(historyKey, historyData);
            } catch (e) {
                // If history storage fails, continue anyway (non-critical)
                console.warn('Could not update KPI history:', e);
            }
        }
        
        console.log('Assessment saved successfully for:', issueKey);
        return { success: true, data: dataToStore };
    } catch (error) {
        console.error('Error saving issue assessment:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        if (error.message && error.message.includes('not authorized')) {
            return { 
                error: 'Storage not authorized. Please reinstall the app to enable storage functionality.',
                storageError: true
            };
        }
        
        // Return more detailed error message
        const errorMessage = error.message || 'Unknown error occurred';
        return { 
            error: `Failed to save issue assessment: ${errorMessage}`,
            details: error.stack
        };
    }
});

/**
 * Get list of Jira projects
 * @param {Object} req - Request object
 * @returns {Array} List of projects
 */
resolver.define('getProjects', async (req) => {
    try {
        console.log('Getting projects from Jira API...');
        
        // Use route() to create a Jira API route
        // This is the correct way to make API requests in Forge
        const jiraRoute = route`/rest/api/3/project/search`;
        
        // Make the request using asUser() with the route
        const response = await asUser().requestJira(jiraRoute, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            params: {
                maxResults: 100
            }
        });
        
        console.log('Jira API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Jira API returned error:', response.status, response.statusText, errorText);
            // Return error info instead of empty array
            return { 
                error: true, 
                message: `Failed to load projects: ${response.status} ${response.statusText}. ${errorText}`,
                projects: []
            };
        }
        
        const data = await response.json();
        console.log('Jira API response data:', JSON.stringify(data).substring(0, 200));
        
        // The /project/search endpoint returns { values: [...] }
        const projects = data.values || data;
        
        if (!Array.isArray(projects)) {
            console.error('Unexpected response format from Jira API:', data);
            return { 
                error: true, 
                message: 'Unexpected response format from Jira API',
                projects: []
            };
        }
        
        // Return simplified project list
        const projectList = projects.map(project => ({
            key: project.key,
            name: project.name,
            id: project.id
        }));
        
        // Sort projects alphabetically by key (SS comes before MDP)
        projectList.sort((a, b) => {
            return a.key.localeCompare(b.key);
        });
        
        console.log(`Successfully loaded ${projectList.length} projects:`, projectList.map(p => p.key).join(', '));
        return projectList;
    } catch (error) {
        console.error('Error getting projects:', error);
        console.error('Error stack:', error.stack);
        // Return error info instead of empty array so frontend knows what went wrong
        return { 
            error: true, 
            message: error.message || 'Failed to load projects from Jira API',
            projects: [],
            errorDetails: error.toString()
        };
    }
});

/**
 * Get sprints for a project
 * @param {Object} req - Request object containing projectKey
 * @returns {Array} List of sprints
 */
resolver.define('getSprints', async (req) => {
    const { projectKey } = req.payload;
    
    if (!projectKey || projectKey === 'PROJ') {
        return { error: 'Project key is required', sprints: [] };
    }

    try {
        console.log('Getting sprints for project:', projectKey);
        
        // Alternative approach: Get sprints via Agile API board endpoint
        // This is the documented way to get sprints for a board
        try {
            // First, try to get boards using Agile API
            const boardRoute = route`/rest/agile/1.0/board`;
            const boardResponse = await asUser().requestJira(boardRoute, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                params: {
                    projectKeyOrId: projectKey,
                    type: 'scrum',
                    maxResults: 50
                }
            });

            if (!boardResponse.ok) {
                const errorText = await boardResponse.text();
                console.error('Agile API board request failed:', boardResponse.status, errorText);
                
                // Check if it's an authentication error
                if (boardResponse.status === 401 || boardResponse.status === 403 || 
                    errorText.includes('Authentication') || errorText.includes('Unauthorized') ||
                    errorText.includes('not authorized') || errorText.includes('Forbidden')) {
                    console.warn('Agile API authentication failed, trying alternative method via issues...');
                    // Fallback: Try to extract sprints from issues
                    return await getSprintsFromIssues(projectKey);
                }
                
                throw new Error(`Board API returned ${boardResponse.status}: ${errorText}`);
            }

            const boardData = await boardResponse.json();
            const boards = boardData.values || [];
            
            console.log(`Found ${boards.length} boards via Agile API for project ${projectKey}`);
            
            if (boards.length === 0) {
                console.warn('No boards found, trying alternative method via issues...');
                return await getSprintsFromIssues(projectKey);
            }

            // Use the first Scrum board
            const boardId = boards[0].id;
            console.log(`Using board: ${boardId} (name: ${boards[0].name})`);

            // Get sprints using Agile API (this should work if board was found)
            const sprintRoute = route`/rest/agile/1.0/board/${boardId}/sprint`;
            const sprintResponse = await asUser().requestJira(sprintRoute, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                params: {
                    maxResults: 50,
                    state: 'active,future,closed'
                }
            });

            if (!sprintResponse.ok) {
                const errorText = await sprintResponse.text();
                console.error('Could not get sprints via Agile API:', sprintResponse.status, errorText);
                
                // Check if it's an authentication error
                if (sprintResponse.status === 401 || sprintResponse.status === 403 || 
                    errorText.includes('Authentication') || errorText.includes('Unauthorized') ||
                    errorText.includes('not authorized')) {
                    console.log('Agile API auth failed, trying fallback method via issues...');
                    // Fallback: Try to extract sprints from issues
                    return await getSprintsFromIssues(projectKey);
                }
                
                console.log('Agile API failed with non-auth error, trying fallback method...');
                // Try fallback anyway
                return await getSprintsFromIssues(projectKey);
            }

            const sprintData = await sprintResponse.json();
            const sprints = sprintData.values || [];
            
            console.log(`Found ${sprints.length} sprints in board ${boardId}`);
            
            if (sprints.length === 0) {
                return { sprints: [], warning: 'No sprints found in this board. Create a sprint in the board backlog.' };
            }

            // Format sprints for frontend
            const sprintList = sprints.map(sprint => ({
            id: sprint.id,
            name: sprint.name,
            state: sprint.state, // 'active', 'future', 'closed'
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            goal: sprint.goal
        })).sort((a, b) => {
            // Sort: active first, then future, then closed
            // Within each state, sort by start date (newest first)
            const stateOrder = { 'active': 0, 'future': 1, 'closed': 2 };
            const stateDiff = (stateOrder[a.state] || 99) - (stateOrder[b.state] || 99);
            if (stateDiff !== 0) return stateDiff;
            
            // Sort by start date (newest first)
            const aDate = a.startDate ? new Date(a.startDate) : new Date(0);
            const bDate = b.startDate ? new Date(b.startDate) : new Date(0);
            return bDate - aDate;
        });

            console.log(`Successfully loaded ${sprintList.length} sprints for project ${projectKey}`);
            return { sprints: sprintList };
            
        } catch (agileApiError) {
            console.warn('Agile API failed:', agileApiError);
            // If the inner try-catch already returned an error, it will be handled
            // Otherwise, fall through to outer catch
            throw agileApiError;
        }
    } catch (error) {
        console.error('Error getting sprints:', error);
        // Last resort: Try to get sprints from issues
        console.log('Trying fallback: get sprints from issues...');
        return await getSprintsFromIssues(projectKey);
    }
});

/**
 * Alternative method: Extract sprint information from issues
 * This works by searching for issues with sprint information and extracting unique sprints
 */
async function getSprintsFromIssues(projectKey) {
    try {
        console.log('Getting sprints from issues for project:', projectKey);
        
        // Search for issues with sprint info (POST /search/jql – more reliable than GET)
        const searchRoute = route`/rest/api/3/search/jql`;
        const searchResponse = await asUser().requestJira(searchRoute, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jql: `project = "${projectKey}" AND sprint IS NOT EMPTY`,
                fields: ['customfield_10020'],
                maxResults: 100
            })
        });

        if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error('Could not search issues for sprints:', searchResponse.status, errorText);
            return { 
                sprints: [], 
                warning: 'Could not access sprint information. Sprint filtering is not available.',
                error: 'Sprint API not accessible'
            };
        }

        const searchData = await searchResponse.json();
        const issues = searchData.values !== undefined ? searchData.values : (searchData.issues || []);
        
        console.log(`Found ${issues.length} issues with sprint information`);
        
        // Extract unique sprints from issues
        const sprintMap = new Map();
        
        for (const issue of issues) {
            // Try different possible field names for sprint
            const sprintField = issue.fields?.customfield_10020 || 
                               issue.fields?.sprint || 
                               issue.fields?.['Sprint'];
            
            if (sprintField) {
                // Handle both array and single object
                const sprints = Array.isArray(sprintField) ? sprintField : [sprintField];
                
                for (const sprint of sprints) {
                    if (sprint && sprint.id && !sprintMap.has(sprint.id)) {
                        sprintMap.set(sprint.id, {
                            id: String(sprint.id),
                            name: sprint.name || sprint.displayName || `Sprint ${sprint.id}`,
                            state: sprint.state || 'unknown',
                            startDate: sprint.startDate,
                            endDate: sprint.endDate,
                            goal: sprint.goal
                        });
                    }
                }
            }
        }
        
        console.log(`Extracted ${sprintMap.size} unique sprints from ${issues.length} issues`);

        const sprintList = Array.from(sprintMap.values()).sort((a, b) => {
            const stateOrder = { 'active': 0, 'future': 1, 'closed': 2, 'unknown': 3 };
            const stateDiff = (stateOrder[a.state] || 99) - (stateOrder[b.state] || 99);
            if (stateDiff !== 0) return stateDiff;
            
            const aDate = a.startDate ? new Date(a.startDate) : new Date(0);
            const bDate = b.startDate ? new Date(b.startDate) : new Date(0);
            return bDate - aDate;
        });

        console.log(`Found ${sprintList.length} unique sprints from issues`);
        
        if (sprintList.length === 0) {
            return { 
                sprints: [], 
                warning: 'No sprints found. Create a sprint and add issues to it first.',
                error: 'No sprints available'
            };
        }

        return { sprints: sprintList };
    } catch (error) {
        console.error('Error getting sprints from issues:', error);
        return { 
            sprints: [], 
            error: 'All methods to load sprints failed',
            warning: 'Sprint filtering is not available. You can still view all assessments by selecting "All Sprints".',
            errorDetails: error.toString()
        };
    }
}

/**
 * Get current issue key from Forge context
 * @param {Object} req - Request object
 * @returns {Object} Issue key from context
 */
resolver.define('getCurrentIssueKey', async (req) => {
    try {
        // In Forge, the issue key is available in the context when called from an issue panel
        const context = req.context;
        const issueKey = context?.extension?.issue?.key || context?.issue?.key;
        
        if (issueKey) {
            return { issueKey };
        }
        
        // Fallback: try to get from payload
        if (req.payload?.issueKey) {
            return { issueKey: req.payload.issueKey };
        }
        
        return { error: 'Issue key not found in context' };
    } catch (error) {
        console.error('Error getting current issue key:', error);
        return { error: 'Failed to get issue key from context' };
    }
});

/**
 * Get issue information (for displaying in panel) from Jira API
 * Includes issuetype, status, summary, and issuelinks for traceability
 * @param {Object} req - Request object containing issueKey (optional, will try to get from context)
 * @returns {Object} Issue information
 */
resolver.define('getIssueInfo', async (req) => {
    let { issueKey } = req.payload || {};
    
    if (!issueKey) {
        try {
            const context = req.context;
            issueKey = context?.extension?.issue?.key || context?.issue?.key;
        } catch (e) {
            console.warn('Could not get issue key from context:', e);
        }
    }
    
    if (!issueKey) {
        return { error: 'Issue key is required' };
    }

    try {
        const issueRoute = route`/rest/api/3/issue/${issueKey}`;
        const response = await asUser().requestJira(issueRoute, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            params: { fields: 'issuetype,status,summary,issuelinks' }
        });
        if (!response.ok) {
            const errText = await response.text();
            console.warn('getIssueInfo Jira API error:', response.status, errText);
            return {
                issueKey,
                type: 'Story',
                status: 'In Progress',
                summary: '',
                issueLinks: []
            };
        }
        const data = await response.json();
        const fields = data.fields || {};
        const issueType = fields.issuetype ? fields.issuetype.name : 'Story';
        const status = fields.status ? fields.status.name : 'In Progress';
        const summary = fields.summary || '';
        const rawLinks = fields.issuelinks || [];
        const issueLinks = rawLinks.map(link => {
            const other = link.outwardIssue && link.outwardIssue.key !== issueKey
                ? link.outwardIssue
                : link.inwardIssue;
            const direction = link.outwardIssue && link.outwardIssue.key !== issueKey ? 'outward' : 'inward';
            const linkTypeName = link.type ? link.type.name : 'Relates';
            return {
                id: link.id,
                linkTypeName,
                direction,
                otherKey: other ? other.key : (link.inwardIssue?.key || link.outwardIssue?.key),
                otherSummary: other ? (other.fields && other.fields.summary ? other.fields.summary : other.key) : ''
            };
        });
        return {
            issueKey,
            type: issueType,
            status,
            summary,
            issueLinks
        };
    } catch (e) {
        console.warn('getIssueInfo failed:', e);
        return {
            issueKey,
            type: 'Story',
            status: 'In Progress',
            summary: '',
            issueLinks: []
        };
    }
});

/**
 * Get issue links for traceability
 */
resolver.define('getIssueLinks', async (req) => {
    const { issueKey } = req.payload || {};
    if (!issueKey) return { error: 'issueKey is required' };
    try {
        const issueRoute = route`/rest/api/3/issue/${issueKey}`;
        const response = await asUser().requestJira(issueRoute, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            params: { fields: 'issuelinks' }
        });
        if (!response.ok) return { error: 'Failed to load issue links' };
        const data = await response.json();
        const rawLinks = (data.fields || {}).issuelinks || [];
        const links = rawLinks.map(link => {
            const other = link.outwardIssue && link.outwardIssue.key !== issueKey ? link.outwardIssue : link.inwardIssue;
            const direction = link.outwardIssue && link.outwardIssue.key !== issueKey ? 'outward' : 'inward';
            return {
                id: link.id,
                linkTypeName: (link.type && link.type.name) || 'Relates',
                direction,
                otherKey: other ? other.key : (link.inwardIssue?.key || link.outwardIssue?.key),
                otherSummary: (other && other.fields && other.fields.summary) ? other.fields.summary : ''
            };
        });
        return { links };
    } catch (e) {
        console.warn('getIssueLinks failed:', e);
        return { error: e.message || 'Failed to get issue links' };
    }
});

/**
 * Create an issue link (traceability: SUS ↔ User Story)
 * Payload: { outwardIssueKey, inwardIssueKey, linkTypeName? } — linkTypeName defaults to "Relates"
 */
resolver.define('createIssueLink', async (req) => {
    const { outwardIssueKey, inwardIssueKey, linkTypeName } = req.payload || {};
    if (!outwardIssueKey || !inwardIssueKey) return { error: 'outwardIssueKey and inwardIssueKey are required' };
    try {
        const linkRoute = route`/rest/api/3/issueLink`;
        const response = await asUser().requestJira(linkRoute, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                type: { name: linkTypeName || 'Relates' },
                inwardIssue: { key: inwardIssueKey },
                outwardIssue: { key: outwardIssueKey }
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            return { error: `Failed to create link: ${response.status}` };
        }
        return { success: true };
    } catch (e) {
        console.warn('createIssueLink failed:', e);
        return { error: e.message || 'Failed to create issue link' };
    }
});

/**
 * Delete an issue link by link id
 */
resolver.define('deleteIssueLink', async (req) => {
    const { linkId } = req.payload || {};
    if (!linkId) return { error: 'linkId is required' };
    try {
        const linkRoute = route`/rest/api/3/issueLink/${linkId}`;
        const response = await asUser().requestJira(linkRoute, { method: 'DELETE' });
        if (!response.ok) return { error: `Failed to delete link: ${response.status}` };
        return { success: true };
    } catch (e) {
        console.warn('deleteIssueLink failed:', e);
        return { error: e.message || 'Failed to delete issue link' };
    }
});

/**
 * Search issues in project (for link picker and justification linked issues)
 * Payload: { projectKey, currentIssueKey?, query?, maxResults? }
 */
resolver.define('searchIssues', async (req) => {
    const { projectKey, currentIssueKey, query, maxResults = 50 } = req.payload || {};
    if (!projectKey) return { error: 'projectKey is required' };
    try {
        const q = (query && query.trim()) ? query.trim() : '';
        const isExactKeySearch = q && q.match(/^[A-Za-z][A-Za-z0-9]*-\d+$/);
        let jql = `project = "${projectKey}"`;
        if (currentIssueKey) jql += ` AND key != "${currentIssueKey}"`;
        if (q) {
            if (isExactKeySearch) {
                jql += ` AND key = "${q}"`;
            } else {
                jql += ` AND summary ~ "${q.replace(/"/g, '\\"')}"`;
            }
        }
        jql += ' ORDER BY key ASC';
        // Use POST /rest/api/3/search/jql (GET/params can cause 400; POST with JSON body is more reliable)
        const searchRoute = route`/rest/api/3/search/jql`;
        const response = await asUser().requestJira(searchRoute, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jql,
                maxResults: Math.min(maxResults, 100),
                fields: ['summary', 'issuetype']
            })
        });
        if (!response.ok) {
            const errBody = await response.text();
            console.warn('searchIssues Jira API error:', response.status, jql, errBody);
            let errMsg = `Suche fehlgeschlagen (${response.status}).`;
            try {
                const errJson = JSON.parse(errBody);
                if (errJson.errorMessages && errJson.errorMessages.length) errMsg += ' ' + errJson.errorMessages.join(' ');
                else if (errJson.errors && Object.keys(errJson.errors).length) errMsg += ' ' + JSON.stringify(errJson.errors);
            } catch (_) {}
            return { error: errMsg };
        }
        const data = await response.json();
        const issues = (data.values !== undefined ? data.values : (data.issues || [])).map(issue => ({
            key: issue.key,
            summary: (issue.fields && issue.fields.summary) || '',
            type: (issue.fields && issue.fields.issuetype && issue.fields.issuetype.name) || 'Unknown'
        }));
        return { issues };
    } catch (e) {
        console.warn('searchIssues failed:', e);
        return { error: e.message || 'Search failed' };
    }
});

/**
 * Get dashboard data (KPIs, trends, heatmap data)
 * @param {Object} req - Request object containing projectKey and optional filters
 * @returns {Object} Dashboard data with KPIs and heatmap
 */
resolver.define('getDashboardData', async (req) => {
    const payload = req.payload || {};
    const projectKey = payload.projectKey;
    const sprintIdPayload = payload.sprintId ?? payload.sprint_id ?? null;
    const sprintNamePayload = payload.sprintName ?? payload.sprint_name ?? null;

    if (!projectKey || projectKey === 'PROJ') {
        return { error: 'Please select a valid project' };
    }

    try {
        // Use asApp() for storage operations
        // Use Forge storage API (storage from @forge/api)
        
        // Get SuMM configuration
        const summKey = `summ:${projectKey}`;
        let summData;
        try {
            summData = await storage.get(summKey);
        } catch (e) {
            // If storage fails, return error
            console.error('Error getting SuMM for dashboard:', e);
            if (e.message && e.message.includes('not authorized')) {
                return { 
                    error: 'Storage not authorized. Please reinstall the app to enable storage functionality.',
                    storageError: true
                };
            }
            return { error: 'Failed to load SuMM configuration for this project' };
        }
        
        if (!summData) {
            return { error: 'SuMM configuration not found for this project. Please configure SuMM first in Admin Settings.' };
        }

        // Get all assessments for the project
        const enabledDimensions = summData.dimensions.filter(d => d.enabled);
        
        // Get assessment index for this project
        const indexKey = `assessments:${projectKey}`;
        let assessmentIndex = [];
        try {
            const existingIndex = await storage.get(indexKey);
            if (existingIndex && Array.isArray(existingIndex)) {
                assessmentIndex = existingIndex;
            }
        } catch (e) {
            // Index doesn't exist, no assessments yet
        }
        
        // If sprintId is provided, filter issues by sprint
        let filteredIssueKeys = null;
        if (sprintIdPayload != null && String(sprintIdPayload).trim() !== '') {
            const sid = String(sprintIdPayload).trim();
            const sprintNum = parseInt(sid, 10);
            try {
                // 1) Try Jira Agile API
                const sprintRoute = route`/rest/agile/1.0/sprint/${sid}/issue`;
                const sprintIssuesResponse = await asUser().requestJira(sprintRoute, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    params: { maxResults: 1000 }
                });

                if (sprintIssuesResponse.ok) {
                    const sprintIssuesData = await sprintIssuesResponse.json();
                    const sprintIssues = sprintIssuesData.issues || [];
                    filteredIssueKeys = new Set(sprintIssues.map(issue => issue.key));
                    console.log(`Sprint filter (Agile API): ${filteredIssueKeys.size} issues in sprint ${sid}`);
                } else {
                    const errText = await sprintIssuesResponse.text();
                    console.warn(`Sprint Agile API failed (${sprintIssuesResponse.status}):`, errText.slice(0, 200));
                }
                if (!filteredIssueKeys || filteredIssueKeys.size === 0) {
                    // 2) Fallback: JQL via POST /rest/api/3/search/jql (same as issue validation)
                    const jqlById = Number.isNaN(sprintNum)
                        ? `project = "${projectKey}" AND sprint = ${sid}`
                        : `project = "${projectKey}" AND sprint = ${sprintNum}`;
                    const searchRoute = route`/rest/api/3/search/jql`;
                    const searchRes = await asUser().requestJira(searchRoute, {
                        method: 'POST',
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jql: jqlById, fields: ['key'], maxResults: 1000 })
                    });
                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        const issues = searchData.values !== undefined ? searchData.values : (searchData.issues || []);
                        filteredIssueKeys = new Set(issues.map(issue => issue.key));
                        console.log(`Sprint filter (JQL by id): ${filteredIssueKeys.size} issues in sprint ${sid}`);
                    } else {
                        console.warn('JQL by sprint id failed:', searchRes.status);
                    }
                }
                if ((!filteredIssueKeys || filteredIssueKeys.size === 0) && sprintNamePayload && String(sprintNamePayload).trim()) {
                    // 3) Fallback: JQL by sprint name
                    const name = String(sprintNamePayload).trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                    const jqlByName = `project = "${projectKey}" AND sprint = "${name}"`;
                    const searchRoute2 = route`/rest/api/3/search/jql`;
                    const searchRes2 = await asUser().requestJira(searchRoute2, {
                        method: 'POST',
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jql: jqlByName, fields: ['key'], maxResults: 1000 })
                    });
                    if (searchRes2.ok) {
                        const searchData2 = await searchRes2.json();
                        const issues2 = searchData2.values !== undefined ? searchData2.values : (searchData2.issues || []);
                        filteredIssueKeys = new Set(issues2.map(issue => issue.key));
                        console.log(`Sprint filter (JQL by name): ${filteredIssueKeys.size} issues`);
                    } else {
                        console.warn('JQL by sprint name failed:', searchRes2.status);
                    }
                }
                if (!filteredIssueKeys || filteredIssueKeys.size === 0) {
                    console.warn('Could not get sprint issues (Agile + JQL failed). Applying strict filter: show only issues in sprint (none found).');
                    filteredIssueKeys = new Set();
                }
            } catch (e) {
                console.warn('Error getting sprint issues:', e);
            }
        }
        
        // Validate that issues still exist in Jira before loading assessments
        // This filters out deleted issues
        const validIssueKeys = new Set();
        const issueKeysToCheck = assessmentIndex.map(item => item.issueKey);
        
        if (issueKeysToCheck.length > 0) {
            try {
                // Check if issues exist (POST /search/jql)
                const jql = `project = "${projectKey}" AND key IN (${issueKeysToCheck.map(k => `"${k}"`).join(',')})`;
                const searchRoute = route`/rest/api/3/search/jql`;
                const searchResponse = await asUser().requestJira(searchRoute, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jql, fields: ['key'], maxResults: 1000 })
                });

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    const existingIssues = searchData.values !== undefined ? searchData.values : (searchData.issues || []);
                    existingIssues.forEach(issue => {
                        validIssueKeys.add(issue.key);
                    });
                    console.log(`Validated ${validIssueKeys.size} of ${issueKeysToCheck.length} issues exist`);
                } else {
                    console.warn('Could not validate issues, showing all assessments');
                    // If validation fails, show all (fallback behavior)
                    issueKeysToCheck.forEach(key => validIssueKeys.add(key));
                }
            } catch (e) {
                console.warn('Error validating issues:', e);
                // If validation fails, show all (fallback behavior)
                issueKeysToCheck.forEach(key => validIssueKeys.add(key));
            }
        }
        
        // Load all assessments (filtered by sprint if sprintId provided, and only for valid issues)
        const allAssessments = [];
        const deletedIssueKeys = [];
        
        for (const item of assessmentIndex) {
            // Skip if issue doesn't exist anymore
            if (!validIssueKeys.has(item.issueKey)) {
                deletedIssueKeys.push(item.issueKey);
                continue;
            }
            
            // Skip if sprint filter is active and issue is not in sprint
            if (filteredIssueKeys && !filteredIssueKeys.has(item.issueKey)) {
                continue;
            }
            
            try {
                const assessmentKey = `assessment:${item.issueKey}`;
                const assessment = await storage.get(assessmentKey);
                if (assessment && assessment.susafScores) {
                    allAssessments.push(assessment);
                }
            } catch (e) {
                // Skip if assessment not found
                console.warn(`Assessment not found for ${item.issueKey}:`, e);
            }
        }
        
        // Clean up deleted issues from assessment index
        // This ensures deleted issues don't appear in the dashboard
        if (deletedIssueKeys.length > 0) {
            console.log(`Cleaning up ${deletedIssueKeys.length} deleted issues from assessment index`);
            try {
                const updatedIndex = assessmentIndex.filter(item => !deletedIssueKeys.includes(item.issueKey));
                await storage.set(indexKey, updatedIndex);
                console.log(`Removed ${deletedIssueKeys.length} deleted issues from index`);
            } catch (e) {
                console.warn('Error cleaning up deleted issues:', e);
                // Don't fail the request if cleanup fails - validation still works
            }
        }
        
        // KPI calculation: TOPSIS when 2+ assessments, else weighted average
        const totalWeight = enabledDimensions.reduce((sum, dim) => sum + dim.weight, 0);
        let kpiData = {};
        let overallKPI = 0;
        let heatmapData = [];

        if (allAssessments.length >= 2 && totalWeight > 0) {
            const { perIssueKPI, perDimensionPerIssue, dimensionKPIs } = computeTOPSIS(allAssessments, enabledDimensions);
            enabledDimensions.forEach(dim => {
                const current = dimensionKPIs[dim.id] != null ? dimensionKPIs[dim.id] : 0;
                kpiData[dim.id] = {
                    current,
                    previous: current,
                    trend: 0,
                    trendDirection: 'up'
                };
            });
            const weights = enabledDimensions.map(d => d.weight / totalWeight);
            overallKPI = Math.round(
                enabledDimensions.reduce((sum, dim) => sum + (dimensionKPIs[dim.id] || 0) * (dim.weight / totalWeight), 0)
            );
            heatmapData = allAssessments.map(assessment => {
                const scores = {};
                enabledDimensions.forEach(dim => {
                    const c = perDimensionPerIssue[dim.id] && perDimensionPerIssue[dim.id][assessment.issueKey];
                    scores[dim.id] = c != null ? Math.round(c * 100) : 0;
                });
                return { issueKey: assessment.issueKey, scores };
            });
        } else {
            enabledDimensions.forEach(dim => {
                const scores = allAssessments
                    .map(a => a.susafScores && a.susafScores[dim.id])
                    .filter(s => s !== undefined && s !== null);
                const current = scores.length > 0
                    ? Math.round(scores.reduce((sum, s) => sum + (s / 5) * 100, 0) / scores.length)
                    : 0;
                kpiData[dim.id] = { current, previous: current, trend: 0, trendDirection: 'up' };
            });
            if (totalWeight > 0) {
                let weightedSum = 0;
                enabledDimensions.forEach(dim => {
                    const kpi = kpiData[dim.id];
                    if (kpi && kpi.current > 0) weightedSum += kpi.current * (dim.weight / totalWeight);
                });
                overallKPI = Math.round(weightedSum);
            }
            heatmapData = allAssessments.map(assessment => {
                const scores = {};
                enabledDimensions.forEach(dim => {
                    const score = assessment.susafScores && assessment.susafScores[dim.id];
                    scores[dim.id] = (score !== undefined && score !== null) ? Math.round((score / 5) * 100) : 0;
                });
                return { issueKey: assessment.issueKey, scores };
            });
        }

        // Get historical KPI data for trends (using same store instance)
        let trendsData = {};
        try {
            const historyKey = `kpi-history:${projectKey}`;
            const historyData = await storage.get(historyKey);
            
            if (historyData && Array.isArray(historyData) && historyData.length > 0) {
                // Group by dimension and calculate trends
                enabledDimensions.forEach(dim => {
                    const dimensionHistory = historyData
                        .map(entry => ({
                            timestamp: entry.timestamp,
                            value: entry.dimensionKPIs?.[dim.id] || 0
                        }))
                        .filter(entry => entry.value > 0)
                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    
                    if (dimensionHistory.length > 0) {
                        trendsData[dim.id] = dimensionHistory;
                    }
                });
            }
        } catch (e) {
            // If history retrieval fails, continue without trends
            console.warn('Could not retrieve KPI history:', e);
        }
        
        return {
            projectKey,
            kpis: kpiData,
            overallKPI: overallKPI, // Weighted overall KPI
            heatmap: heatmapData,
            trends: trendsData,
            enabledDimensions: enabledDimensions.map(d => ({ id: d.id, name: d.name }))
        };
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        if (error.message && error.message.includes('not authorized')) {
            // Return mock data if storage not available
            return {
                projectKey,
                kpis: {
                    environment: { current: 72, previous: 68, trend: 4, trendDirection: 'up' },
                    society: { current: 65, previous: 65, trend: 0, trendDirection: 'up' },
                    economy: { current: 80, previous: 82, trend: -2, trendDirection: 'down' }
                },
                heatmap: [],
                enabledDimensions: [
                    { id: 'environment', name: 'Environment' },
                    { id: 'society', name: 'Society' },
                    { id: 'economy', name: 'Economy' }
                ]
            };
        }
        return { error: 'Failed to retrieve dashboard data' };
    }
});

/**
 * Check if an issue has at least one link to a Sustainability Story (or similar type).
 * Linked issue type name must contain "sustainability", "sus", or "nachhaltigkeitsgeschichte" (case-insensitive).
 * @param {string} issueKey - Jira issue key
 * @returns {Promise<{ hasLink: boolean, error?: string }>}
 */
async function issueHasLinkToSustainabilityStory(issueKey) {
    try {
        const issueRoute = route`/rest/api/3/issue/${issueKey}`;
        const res = await asUser().requestJira(issueRoute, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            params: { fields: 'issuelinks' }
        });
        if (!res.ok) return { hasLink: false, error: 'Could not load issue links' };
        const data = await res.json();
        const rawLinks = (data.fields || {}).issuelinks || [];
        const otherKeys = [];
        rawLinks.forEach(link => {
            const other = link.outwardIssue || link.inwardIssue;
            if (other && other.key) otherKeys.push(other.key);
        });
        if (otherKeys.length === 0) return { hasLink: false };
        const jql = `key in (${otherKeys.join(',')})`;
        const searchRoute = route`/rest/api/3/search`;
        const searchRes = await asUser().requestJira(searchRoute, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ jql, fields: ['issuetype'], maxResults: 50 })
        });
        if (!searchRes.ok) return { hasLink: false };
        const searchData = await searchRes.json();
        const susTypeNames = ['sustainability', 'sus', 'nachhaltigkeitsgeschichte'];
        const hasLink = (searchData.issues || []).some(issue => {
            const name = (issue.fields && issue.fields.issuetype && issue.fields.issuetype.name) ? issue.fields.issuetype.name.toLowerCase() : '';
            return susTypeNames.some(term => name.includes(term));
        });
        return { hasLink };
    } catch (e) {
        console.warn('issueHasLinkToSustainabilityStory failed:', e);
        return { hasLink: false, error: e.message };
    }
}

/**
 * Issue Action: Complete with Sustainability Check
 * Checks: (1) assessment present, (2) link to Sustainability Story, (3) justification when scores ≤2 (trade-offs).
 */
resolver.define('completeWithSustainabilityCheck', async (req) => {
    const { issueKey } = req.payload;
    
    if (!issueKey) {
        return { 
            error: 'Issue key is required',
            success: false
        };
    }

    try {
        const storageKey = `assessment:${issueKey}`;
        
        let assessment;
        try {
            assessment = await storage.get(storageKey);
        } catch (storageError) {
            console.warn(`Storage not authorized for Green DoD check on ${issueKey}`);
            return { 
                error: 'Storage not available - could not verify sustainability assessment. Please complete the assessment in the Sustainability Panel.',
                success: false,
                storageError: true
            };
        }
        
        const hasAssessment = assessment && 
                             (assessment.susafScores || assessment.weightedKPI !== undefined) &&
                             Object.keys(assessment.susafScores || {}).length > 0;
        
        if (!hasAssessment) {
            return {
                error: 'Sustainability assessment is required before marking this issue as Done. Please complete the assessment in the Sustainability Panel.',
                success: false,
                missingAssessment: true
            };
        }

        // Green DoD: Link to Sustainability Story (or similar type)
        const { hasLink: hasSusLink } = await issueHasLinkToSustainabilityStory(issueKey);
        if (!hasSusLink) {
            return {
                error: 'A link to a Sustainability Story (or similar issue type) is required before completing. Add the link in the Traceability section of the Sustainability Panel.',
                success: false,
                missingSusLink: true
            };
        }

        // Green DoD: Justification required when any dimension score ≤ 2 (trade-off / low impact)
        const scores = assessment.susafScores || {};
        const hasLowScore = Object.values(scores).some(v => typeof v === 'number' && v <= 2);
        if (hasLowScore) {
            const j = assessment.justification || {};
            const hasJustification = [j.compromises, j.alternatives, j.rationale].some(
                f => f != null && String(f).trim() !== ''
            );
            if (!hasJustification) {
                return {
                    error: 'Low sustainability scores (≤2) require a justification. Please add a justification (compromises, alternatives, or rationale) in the Sustainability Panel.',
                    success: false,
                    missingJustification: true
                };
            }
        }
        
        // All checks passed - transition to Done
        try {
            // Get the issue to find available transitions
            const issueRoute = route`/rest/api/3/issue/${issueKey}/transitions`;
            const issueResponse = await asUser().requestJira(issueRoute, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!issueResponse.ok) {
                const errorText = await issueResponse.text();
                return {
                    error: `Could not get issue transitions: ${issueResponse.status} ${errorText}`,
                    success: false
                };
            }
            
            const transitions = await issueResponse.json();
            
            // Find transition to "Done" status
            const doneTransition = transitions.transitions?.find(t => 
                t.to?.name?.toLowerCase().includes('done') ||
                t.to?.name?.toLowerCase() === 'closed' ||
                t.to?.name?.toLowerCase() === 'resolved'
            );
            
            if (!doneTransition) {
                return {
                    error: 'Could not find transition to Done status. Please transition manually.',
                    success: false
                };
            }
            
            // Execute transition to Done
            const transitionRoute = route`/rest/api/3/issue/${issueKey}/transitions`;
            const transitionResponse = await asUser().requestJira(transitionRoute, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transition: {
                        id: doneTransition.id
                    }
                })
            });
            
            if (!transitionResponse.ok) {
                const errorText = await transitionResponse.text();
                return {
                    error: `Failed to transition issue: ${transitionResponse.status} ${errorText}`,
                    success: false
                };
            }
            
            console.log(`Successfully transitioned ${issueKey} to Done with Green DoD check`);
            return {
                success: true,
                message: 'Issue successfully marked as Done. Sustainability assessment verified.'
            };
            
        } catch (transitionError) {
            console.error('Error transitioning issue:', transitionError);
            return {
                error: `Failed to transition issue: ${transitionError.message || transitionError}`,
                success: false
            };
        }
        
    } catch (error) {
        console.error('Error in completeWithSustainabilityCheck:', error);
        return {
            error: `Error checking sustainability assessment: ${error.message || error}`,
            success: false
        };
    }
});

export const handler = resolver.getDefinitions();

