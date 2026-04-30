import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import './CompleteAction.css';

/**
 * Issue Action Component: Complete with Sustainability Check
 * Checks if issue has sustainability assessment before allowing transition to Done
 */
function CompleteAction() {
    const [issueKey, setIssueKey] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Get issue key from context
        loadIssueKey();
    }, []);

    const loadIssueKey = async () => {
        try {
            // Try to get issue key from context
            const context = await invoke('getCurrentIssueKey', {});
            if (context && context.issueKey) {
                setIssueKey(context.issueKey);
            } else {
                // Fallback: try to extract from URL
                const urlParams = new URLSearchParams(window.location.search);
                const key = urlParams.get('issueKey') || 
                           window.location.pathname.match(/([A-Z]+-\d+)/)?.[1];
                if (key) {
                    setIssueKey(key);
                }
            }
        } catch (err) {
            console.error('Error loading issue key:', err);
            // Try to extract from URL as fallback
            const urlParams = new URLSearchParams(window.location.search);
            const key = urlParams.get('issueKey') || 
                       window.location.pathname.match(/([A-Z]+-\d+)/)?.[1];
            if (key) {
                setIssueKey(key);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!issueKey) {
            setError('Issue key not available. Please try again.');
            return;
        }

        setChecking(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await invoke('completeWithSustainabilityCheck', { issueKey });
            
            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    window.close ? window.close() : window.parent.postMessage('close', '*');
                }, 2000);
            } else {
                setError(result.error || 'Checks did not pass. See the list above for what is verified.');
            }
        } catch (err) {
            console.error('Error completing issue:', err);
            setError(err.message || 'An error occurred while completing the issue. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    if (loading) {
        return (
            <div className="complete-action-container">
                <div className="loading-message">Loading...</div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="complete-action-container">
                <div className="success-message">
                    <h2>✓ Success!</h2>
                    <p>Issue successfully marked as Done. Sustainability assessment verified.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="complete-action-container">
            <h2>Complete with Sustainability Check</h2>
            <p className="description">
                This verifies a few Green DoD rules, then moves the issue to Done if your workflow allows it.
            </p>
            <ul className="complete-checks-list">
                <li><strong>Assessment:</strong> SusAF scores saved in the Sustainability Panel.</li>
                <li><strong>Traceability:</strong> At least one linked issue under Jira &quot;Linked work items&quot; (any type).</li>
                <li><strong>Low scores (≤2):</strong> If any dimension is ≤2, add a short justification (compromises, alternatives, or rationale) in the panel.</li>
            </ul>
            
            {issueKey && (
                <div className="issue-info">
                    <strong>Issue:</strong> {issueKey}
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="action-buttons">
                <button
                    onClick={handleComplete}
                    disabled={checking || !issueKey}
                    className="complete-button"
                >
                    {checking ? 'Checking...' : 'Complete Issue'}
                </button>
            </div>
        </div>
    );
}

export default CompleteAction;
