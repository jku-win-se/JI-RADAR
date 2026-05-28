import React, { useState, useEffect } from 'react';
import { getSuMM } from '../../services/summApi';
import { searchIssues } from '../../services/issueApi';
import { questionsForDimensionId } from '../../constants/defaultDimensionQuestions';
import './AssessmentWizard.css';

/**
 * Multi-step Assessment Wizard for SusAF (Sustainability Awareness Framework) evaluation
 * Guides user through assessment of each enabled SuMM dimension
 */
function AssessmentWizard({ issueKey, existingAssessment, onComplete, onCancel }) {
    const [summData, setSummData] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    // Sustainability justification record (optional)
    const [justification, setJustification] = useState({
        compromises: '',
        alternatives: '',
        rationale: '',
        linkedIssueKeys: []
    });
    const [justificationSearch, setJustificationSearch] = useState('');
    const [justificationSearchResults, setJustificationSearchResults] = useState([]);
    const [justificationSearching, setJustificationSearching] = useState(false);

    // Note: React may recycle SyntheticEvents; always read target.value synchronously in handlers.
    
    // Default dimensions (fallback if SuMM not loaded)
    const defaultDimensions = [
        { id: 'environment', name: 'Environment' },
        { id: 'society', name: 'Society' },
        { id: 'economy', name: 'Economy' },
        { id: 'individual', name: 'Individual' },
        { id: 'technical', name: 'Technical' }
    ];
    
    useEffect(() => {
        // Load SuMM configuration to get enabled dimensions
        const projectKey = issueKey?.split('-')[0] || 'PROJ';
        loadSuMM(projectKey);
        
        // Load existing assessment answers if available (for edit mode)
        if (existingAssessment && existingAssessment.answers) {
            console.log('Loading existing answers for edit mode:', existingAssessment.answers);
            setAnswers(existingAssessment.answers);
        }
        if (existingAssessment && existingAssessment.justification) {
            setJustification({
                compromises: existingAssessment.justification.compromises || '',
                alternatives: existingAssessment.justification.alternatives || '',
                rationale: existingAssessment.justification.rationale || '',
                linkedIssueKeys: Array.isArray(existingAssessment.justification.linkedIssueKeys)
                    ? existingAssessment.justification.linkedIssueKeys : []
            });
        }
    }, [issueKey, existingAssessment]);

    const loadSuMM = async (projectKey) => {
        try {
            const data = await getSuMM(projectKey);
            if (data && !data.error) {
                setSummData(data);
            }
        } catch (err) {
            console.warn('Could not load SuMM, using defaults:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get enabled dimensions from SuMM or use defaults
    // Always show all 5 dimensions, but prioritize enabled ones from SuMM
    const getEnabledDimensions = () => {
        if (summData && summData.dimensions) {
            // Use all dimensions from SuMM (enabled or not), but maintain order
            return summData.dimensions.map(d => ({
                id: d.id,
                name: d.name
            }));
        }
        // Fallback to all 5 dimensions if SuMM not loaded
        return defaultDimensions;
    };

    const enabledDimensions = getEnabledDimensions();
    const dimensionStepCount = enabledDimensions.length;
    const totalSteps = dimensionStepCount + 1; // +1 for Justification step
    const isJustificationStep = currentStep === dimensionStepCount;
    const currentDimension = !isJustificationStep ? enabledDimensions[currentStep] : null;
    const currentQuestions = currentDimension ? questionsForDimensionId(summData, currentDimension.id) : [];

    const handleAnswerChange = (questionIndex, value) => {
        const dimensionId = currentDimension.id;
        if (!answers[dimensionId]) {
            answers[dimensionId] = {};
        }
        answers[dimensionId][questionIndex] = parseInt(value);
        setAnswers({ ...answers });
    };

    const calculateDimensionScore = (dimensionId) => {
        const dimensionAnswers = answers[dimensionId];
        if (!dimensionAnswers || Object.keys(dimensionAnswers).length === 0) {
            return null;
        }
        // Filter out null, undefined, and 0 (indifferent) values
        // Only count actual answers (1-5) in the calculation
        const values = Object.values(dimensionAnswers).filter(v => 
            v !== null && v !== undefined && v !== 0
        );
        if (values.length === 0) return null;
        const sum = values.reduce((acc, val) => acc + val, 0);
        return Math.round(sum / values.length);
    };

    const handleNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSave = async () => {
        // Validate that all dimensions have been answered
        const missingDimensions = [];
        enabledDimensions.forEach(dim => {
            const dimensionAnswers = answers[dim.id];
            const questions = questionsForDimensionId(summData, dim.id);
            // Check if all questions are answered (including indifferent = 0)
            const allAnswered = questions.every((_, index) => {
                const value = dimensionAnswers?.[index];
                return value !== undefined && value !== null;
            });
            if (!allAnswered) {
                missingDimensions.push(dim.name);
            }
        });

        if (missingDimensions.length > 0) {
            console.warn('Cannot save: Missing answers for dimensions:', missingDimensions);
            setSaveError(`Please complete all dimensions before saving. Missing: ${missingDimensions.join(', ')}`);
            return;
        }

        setSaving(true);
        setSaveError(null);

        // Calculate average score for each dimension
        // Only include dimensions that have at least one non-indifferent answer
        const susafScores = {};
        enabledDimensions.forEach(dim => {
            const score = calculateDimensionScore(dim.id);
            // Only add score if there's at least one non-indifferent answer
            // If all answers are indifferent, the dimension won't have a score
            if (score !== null) {
                susafScores[dim.id] = score;
            }
        });

        // Determine which dimension this issue belongs to (for now, use first enabled)
        const summDimensionId = enabledDimensions[0]?.id || 'environment';

        console.log('Saving assessment:', { summDimensionId, susafScores });

        try {
            await onComplete({
                summDimensionId,
                susafScores,
                answers: answers,
                justification: (justification.compromises || justification.alternatives || justification.rationale || (justification.linkedIssueKeys && justification.linkedIssueKeys.length > 0))
                    ? {
                        compromises: justification.compromises || '',
                        alternatives: justification.alternatives || '',
                        rationale: justification.rationale || '',
                        linkedIssueKeys: justification.linkedIssueKeys || []
                    }
                    : null,
                assessedBy: 'current-user'
            });
            // Success - onComplete will handle closing the wizard
        } catch (error) {
            console.error('Error in onComplete callback:', error);
            setSaveError(`Failed to save assessment: ${error.message || error}`);
            setSaving(false);
        }
    };

    const isCurrentStepComplete = () => {
        if (!currentDimension) return false;
        const dimensionAnswers = answers[currentDimension.id];
        if (!dimensionAnswers) return false;
        // Check if all questions for current dimension are answered
        // A question is considered answered if it has a value (including 0 for indifferent)
        const allAnswered = currentQuestions.every((_, index) => {
            const value = dimensionAnswers[index];
            return value !== undefined && value !== null;
        });
        return allAnswered;
    };

    const areAllDimensionsComplete = () => {
        // Check if all enabled dimensions have been answered
        // A dimension is complete if all questions are answered (even if all are indifferent)
        return enabledDimensions.every(dim => {
            const dimensionAnswers = answers[dim.id];
            if (!dimensionAnswers) return false;
            const questions = questionsForDimensionId(summData, dim.id);
            // Check if all questions have been answered (including indifferent = 0)
            return questions.every((_, index) => {
                const value = dimensionAnswers[index];
                return value !== undefined && value !== null;
            });
        });
    };

    const runJustificationSearch = async () => {
        const projectKey = issueKey?.split('-')[0];
        if (!projectKey) return;
        setJustificationSearching(true);
        try {
            const result = await searchIssues(projectKey, issueKey, justificationSearch, 15);
            setJustificationSearchResults(result.issues || []);
        } catch (e) {
            setJustificationSearchResults([]);
        } finally {
            setJustificationSearching(false);
        }
    };

    const addLinkedIssue = (key) => {
        if (!justification.linkedIssueKeys.includes(key)) {
            setJustification(prev => ({ ...prev, linkedIssueKeys: [...prev.linkedIssueKeys, key] }));
        }
        setJustificationSearchResults([]);
        setJustificationSearch('');
    };

    const removeLinkedIssue = (key) => {
        setJustification(prev => ({ ...prev, linkedIssueKeys: prev.linkedIssueKeys.filter(k => k !== key) }));
    };

    const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

    if (loading) {
        return (
            <div className="assessment-wizard">
                <div className="loading-message">Loading assessment wizard...</div>
            </div>
        );
    }

    if (!currentDimension && !isJustificationStep) {
        return (
            <div className="assessment-wizard">
                <div className="error-message">No dimensions available for assessment</div>
                <button onClick={onCancel} className="cancel-button">Cancel</button>
            </div>
        );
    }

    const isEditMode = existingAssessment && existingAssessment.susafScores;

    return (
        <div className="assessment-wizard">
            <h2 className="wizard-title">
                {isEditMode ? 'Edit Sustainability Assessment' : 'Sustainability Assessment'}
            </h2>
            
            {isEditMode && (
                <div className="edit-mode-notice" style={{
                    padding: '12px',
                    backgroundColor: '#e3fcef',
                    border: '1px solid #00875a',
                    borderRadius: '3px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: '#006644'
                }}>
                    <strong>Edit Mode:</strong> Your previous answers have been loaded. You can modify them as needed.
                </div>
            )}
            
            <div className="wizard-progress">
                <span className="progress-label">Progress:</span>
                <div className="progress-bar-container">
                    <div 
                        className="progress-bar-fill"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <span className="progress-text">{currentStep + 1}/{totalSteps} {isJustificationStep ? 'Justification' : 'Dimensions'}</span>
            </div>

            <div className="wizard-content">
                {isJustificationStep ? (
                    <div className="justification-section">
                        <h3 className="dimension-title">Sustainability justification (optional)</h3>
                        <p className="justification-intro">Document trade-offs, alternatives, and rationale. Link related issues (user stories / sustainability stories) for traceability.</p>
                        <div className="justification-field">
                            <label>Trade-offs / compromises</label>
                            <textarea
                                value={justification.compromises}
                                onChange={(e) => {
                                    const value = e?.target?.value ?? '';
                                    setJustification((prev) => ({ ...prev, compromises: value }));
                                }}
                                placeholder="Documented trade-offs…"
                                rows={2}
                                className="justification-textarea"
                            />
                        </div>
                        <div className="justification-field">
                            <label>Alternatives considered</label>
                            <textarea
                                value={justification.alternatives}
                                onChange={(e) => {
                                    const value = e?.target?.value ?? '';
                                    setJustification((prev) => ({ ...prev, alternatives: value }));
                                }}
                                placeholder="Alternatives…"
                                rows={2}
                                className="justification-textarea"
                            />
                        </div>
                        <div className="justification-field">
                            <label>Rationale</label>
                            <textarea
                                value={justification.rationale}
                                onChange={(e) => {
                                    const value = e?.target?.value ?? '';
                                    setJustification((prev) => ({ ...prev, rationale: value }));
                                }}
                                placeholder="Rationale…"
                                rows={2}
                                className="justification-textarea"
                            />
                        </div>
                        <div className="justification-field">
                            <label>Linked issues (traceability)</label>
                            <div className="justification-linked-search">
                                <input
                                    type="text"
                                    placeholder="Search by key or summary…"
                                    value={justificationSearch}
                                    onChange={(e) => {
                                        const value = e?.target?.value ?? '';
                                        setJustificationSearch(value);
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), runJustificationSearch())}
                                    className="justification-search-input"
                                />
                                <button type="button" onClick={runJustificationSearch} disabled={justificationSearching} className="justification-search-btn">
                                    {justificationSearching ? '…' : 'Search'}
                                </button>
                            </div>
                            {justificationSearchResults.length > 0 && (
                                <ul className="justification-results">
                                    {justificationSearchResults.map(issue => (
                                        <li key={issue.key}>
                                            <button type="button" onClick={() => addLinkedIssue(issue.key)} className="justification-add-link-btn">
                                                + {issue.key}: {issue.summary.slice(0, 40)}{issue.summary.length > 40 ? '…' : ''}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {justification.linkedIssueKeys.length > 0 && (
                                <ul className="justification-linked-list">
                                    {justification.linkedIssueKeys.map(key => (
                                        <li key={key}>
                                            <a href={`${window.location.origin}/browse/${key}`} target="_blank" rel="noopener noreferrer">{key}</a>
                                            <button type="button" onClick={() => removeLinkedIssue(key)} className="justification-remove-link">✕</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="dimension-section">
                        <h3 className="dimension-title">Dimension {currentStep + 1}: {currentDimension.name}</h3>
                        
                        {currentQuestions.map((question, questionIndex) => {
                            const currentValue = answers[currentDimension.id]?.[questionIndex];
                            return (
                                <div key={questionIndex} className="question-block">
                                    <p className="question-text">
                                        Question {questionIndex + 1}: {question}
                                    </p>
                                    <div className="rating-group">
                                        {[1, 2, 3, 4, 5].map(value => (
                                            <label 
                                                key={value} 
                                                className={`rating-option ${currentValue === value ? 'checked' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`dimension-${currentDimension.id}-question-${questionIndex}`}
                                                    value={value}
                                                    checked={currentValue === value}
                                                    onChange={(e) => handleAnswerChange(questionIndex, e.target.value)}
                                                />
                                                <span className="rating-value">{value}</span>
                                            </label>
                                        ))}
                                        <label 
                                            className={`rating-option indifferent-option ${currentValue === 0 ? 'checked' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name={`dimension-${currentDimension.id}-question-${questionIndex}`}
                                                value="0"
                                                checked={currentValue === 0}
                                                onChange={(e) => handleAnswerChange(questionIndex, e.target.value)}
                                            />
                                            <span className="rating-value">Indifferent</span>
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                        
                        <div className="rating-legend">
                            <strong>Legend:</strong> 1=Direct Neg, 2=Indirect Neg, 3=No Impact, 4=Indirect Pos, 5=Direct Pos, Indifferent=Not applicable / Cannot assess
                        </div>
                    </div>
                )}
            </div>

            <div className="wizard-actions">
                <button 
                    onClick={onCancel}
                    className="nav-button back-button"
                    type="button"
                >
                    Back to Panel
                </button>
                <button 
                    onClick={handlePrevious} 
                    disabled={currentStep === 0}
                    className="nav-button previous-button"
                    type="button"
                >
                    {isJustificationStep ? 'Previous (Dimensions)' : 'Previous Dimension'}
                </button>
                {currentStep < totalSteps - 1 ? (
                    <button 
                        onClick={handleNext}
                        disabled={(!isJustificationStep && !isCurrentStepComplete()) || saving}
                        className="nav-button next-button"
                    >
                        {currentStep === dimensionStepCount - 1 ? 'Next: Justification' : 'Next Dimension'}
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={handleSave}
                            disabled={saving || !areAllDimensionsComplete()}
                            className="save-button"
                            type="button"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        {saveError && (
                            <div className="save-error-message" style={{ color: '#de350b', marginTop: '10px' }}>
                                {saveError}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default AssessmentWizard;
