import React, { useState, useEffect } from 'react';
import { getIssueAssessment, getIssueInfo, saveIssueAssessment, getCurrentIssueKey } from '../../services/issueApi';
import NotAssessedView from './NotAssessedView';
import AssessedView from './AssessedView';
import AssessmentWizard from './AssessmentWizard';
import TraceabilityLinks from './TraceabilityLinks';
import './SustainabilityPanel.css';

/**
 * Main component for Sustainability Panel in Issue View
 * Displays sustainability assessment status and allows starting/editing assessments
 */
function SustainabilityPanel() {
    const [issueKey, setIssueKey] = useState(null);
    const [issueInfo, setIssueInfo] = useState(null);
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showWizard, setShowWizard] = useState(false);

    // Extract issue key from various sources
    const extractIssueKey = () => {
        // Try multiple methods to get issue key
        // 1. From URL path: /browse/KAN-1
        let key = window.location.pathname.match(/\/browse\/([A-Z]+-\d+)/)?.[1];
        
        // 2. From query parameter: ?selectedIssue=KAN-1
        if (!key) {
            const params = new URLSearchParams(window.location.search);
            key = params.get('selectedIssue');
        }
        
        // 3. From parent window URL (if in iframe)
        if (!key && window.parent !== window.self) {
            try {
                const parentUrl = window.parent.location.href;
                key = parentUrl.match(/\/browse\/([A-Z]+-\d+)/)?.[1] || 
                      parentUrl.match(/selectedIssue=([A-Z]+-\d+)/)?.[1];
            } catch (e) {
                // Cross-origin, can't access parent
                console.log('Cannot access parent window (cross-origin)');
            }
        }
        
        // 4. Try to extract from page title or any visible text
        if (!key) {
            const titleMatch = document.title.match(/([A-Z]+-\d+)/);
            if (titleMatch) {
                key = titleMatch[1];
            }
        }
        
        return key;
    };

    // Get issue key from URL, context, or query parameters and update when URL changes
    useEffect(() => {
        let lastKey = null;
        
        const checkIssueKey = async () => {
            // First try to get from URL
            let key = extractIssueKey();
            
            // If not found, try to get from Forge context
            if (!key) {
                try {
                    const contextResult = await getCurrentIssueKey();
                    if (contextResult && contextResult.issueKey) {
                        key = contextResult.issueKey;
                        console.log('Got issue key from Forge context:', key);
                    }
                } catch (e) {
                    console.log('Could not get issue key from context:', e);
                }
            }
            
            console.log('Extracted issue key:', key, 'Previous:', lastKey);
            
            // Only update if the key has changed
            if (key && key !== lastKey) {
                lastKey = key;
                setIssueKey(key);
                loadIssueData(key);
            } else if (!key && lastKey !== 'KAN-1') {
                // If no key found and we don't have a default, try to get from context one more time
                try {
                    const contextResult = await getCurrentIssueKey();
                    if (contextResult && contextResult.issueKey) {
                        const contextKey = contextResult.issueKey;
                        lastKey = contextKey;
                        setIssueKey(contextKey);
                        loadIssueData(contextKey);
                        return;
                    }
                } catch (e) {
                    // Ignore
                }
                
                // Last resort: use default
                console.warn('Could not determine issue key, using default KAN-1');
                const defaultKey = 'KAN-1';
                lastKey = defaultKey;
                setIssueKey(defaultKey);
                loadIssueData(defaultKey);
            }
        };
        
        // Check immediately
        checkIssueKey();
        
        // Also check periodically to catch navigation changes
        // (Forge issue panels don't always trigger URL changes in the iframe)
        const interval = setInterval(checkIssueKey, 1000);
        
        // Also listen for hash changes (some Jira navigations use hash)
        window.addEventListener('hashchange', checkIssueKey);
        
        // Also check when document becomes visible (user switched tabs/windows)
        document.addEventListener('visibilitychange', checkIssueKey);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('hashchange', checkIssueKey);
            document.removeEventListener('visibilitychange', checkIssueKey);
        };
        // eslint-disable-next-line
    }, []); // Only run once on mount, but check periodically

    /**
     * Load issue information and assessment
     */
    const loadIssueData = async (key) => {
        setLoading(true);
        setError(null);
        
        try {
            // If no key provided, try to get from context via getIssueInfo
            // getIssueInfo will try to get the key from context if not provided
            const [infoResult, assessmentResult] = await Promise.allSettled([
                getIssueInfo(key || undefined), // Pass undefined if no key, so backend can try context
                key ? getIssueAssessment(key) : Promise.resolve(null) // Only get assessment if we have a key
            ]);
            
            // If we got issue info but no key was provided, extract key from result
            if (!key && infoResult.status === 'fulfilled' && infoResult.value && !infoResult.value.error) {
                const extractedKey = infoResult.value.issueKey;
                if (extractedKey && extractedKey !== issueKey) {
                    console.log('Got issue key from getIssueInfo:', extractedKey);
                    setIssueKey(extractedKey);
                    // Now load assessment with the extracted key
                    try {
                        const assessment = await getIssueAssessment(extractedKey);
                        if (assessment && assessment !== null) {
                            setAssessment(assessment);
                        }
                    } catch (e) {
                        console.log('No assessment found for extracted key');
                    }
                }
            }
            
            // Handle issue info
            if (infoResult.status === 'fulfilled' && !infoResult.value.error) {
                setIssueInfo(infoResult.value);
            } else {
                // Use default issue info if API call fails
                console.warn('Could not load issue info, using defaults:', infoResult.reason || infoResult.value?.error);
                setIssueInfo({
                    issueKey: key,
                    type: 'Sustainability Story',
                    status: 'In Progress',
                    issueLinks: []
                });
            }
            
            // Handle assessment
            // Only set assessment if it's a valid assessment object (has susafScores or weightedKPI)
            // Not if it's an error object or null
            if (assessmentResult.status === 'fulfilled' && 
                assessmentResult.value !== null && 
                !assessmentResult.value.error &&
                (assessmentResult.value.susafScores || assessmentResult.value.weightedKPI !== undefined)) {
                setAssessment(assessmentResult.value);
            } else {
                // No assessment yet is fine, just set to null
                // This is normal for new issues that haven't been assessed yet
                if (assessmentResult.status === 'fulfilled' && assessmentResult.value && assessmentResult.value.error) {
                    console.warn('Assessment API returned error:', assessmentResult.value.error);
                } else {
                    console.log('No assessment found (this is normal for new issues)');
                }
                setAssessment(null);
            }
            
            // Don't show error if we have default values - the UI is fully functional
            // Only show error if we couldn't even get the issue key or basic info
            if (infoResult.status === 'rejected') {
                console.warn('Could not load issue info from API, using defaults');
                // Don't set error - defaults work fine
            }
        } catch (err) {
            console.error('Unexpected error loading issue data:', err);
            // Still set defaults so UI can work
            setIssueInfo({
                issueKey: key,
                type: 'Sustainability Story',
                status: 'In Progress',
                issueLinks: []
            });
            setAssessment(null);
            // Don't show error - defaults work fine for now
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle starting assessment
     */
    const handleStartAssessment = () => {
        setShowWizard(true);
    };

    /**
     * Handle editing assessment
     */
    const handleEditAssessment = () => {
        setShowWizard(true);
    };

    /**
     * Handle wizard completion
     */
    const handleWizardComplete = async (assessmentData) => {
        if (!issueKey) {
            console.error('Cannot save assessment: issueKey is missing');
            setError('Cannot save assessment: Issue key is missing');
            throw new Error('Issue key is missing');
        }

        console.log('Saving assessment for issue:', issueKey, 'Data:', assessmentData);
        
        try {
            const result = await saveIssueAssessment(issueKey, assessmentData);
            console.log('Save result:', result);
            
            if (result.error) {
                console.error('Save error:', result.error);
                setError(result.error);
                throw new Error(result.error);
            } else if (result.success && result.data) {
                setAssessment(result.data);
                setError(null); // Clear any previous errors
                
                // Show success message
                alert('Sustainability assessment saved successfully!');
                
                // Close wizard and return to panel view
                setShowWizard(false);
            } else {
                console.error('Unexpected result format:', result);
                const errorMsg = 'Failed to save assessment: Unexpected response format';
                setError(errorMsg);
                throw new Error(errorMsg);
            }
        } catch (err) {
            console.error('Failed to save assessment:', err);
            const errorMsg = `Failed to save assessment: ${err.message || err}`;
            setError(errorMsg);
            throw err; // Re-throw so wizard can handle it
        }
    };

    /**
     * Handle wizard cancellation
     */
    const handleWizardCancel = () => {
        setShowWizard(false);
    };

    if (loading) {
        return (
            <div className="sustainability-panel">
                <div className="loading-message">Loading sustainability data...</div>
            </div>
        );
    }

    if (showWizard) {
        return (
            <AssessmentWizard
                issueKey={issueKey}
                existingAssessment={assessment}
                onComplete={handleWizardComplete}
                onCancel={handleWizardCancel}
            />
        );
    }

    return (
        <div className="sustainability-panel">
            {/* Only show error for critical issues that prevent saving assessments */}
            {error && error.includes('Failed to save') && (
                <div className="error-message">{error}</div>
            )}
            
            {!assessment ? (
                <NotAssessedView
                    issueInfo={issueInfo}
                    onStartAssessment={handleStartAssessment}
                />
            ) : (
                <AssessedView
                    issueInfo={issueInfo}
                    assessment={assessment}
                    onEditAssessment={handleEditAssessment}
                />
            )}
            {issueKey && issueInfo && (
                <TraceabilityLinks
                    issueKey={issueKey}
                    issueLinks={issueInfo.issueLinks}
                    onLinksChange={() => loadIssueData(issueKey)}
                />
            )}
        </div>
    );
}

export default SustainabilityPanel;
