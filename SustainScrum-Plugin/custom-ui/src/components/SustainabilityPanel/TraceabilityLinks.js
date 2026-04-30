import React, { useState } from 'react';
import { getIssueLinks, createIssueLink, deleteIssueLink, searchIssues } from '../../services/issueApi';
import './TraceabilityLinks.css';

/**
 * Traceability: Jira issue links (SUS ↔ User Stories).
 * Shows linked issues and allows add/remove links.
 */
function TraceabilityLinks({ issueKey, issueLinks: initialLinks, onLinksChange }) {
    const [links, setLinks] = useState(initialLinks || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);

    const displayLinks = links.length > 0 ? links : (initialLinks || []);

    const refreshLinks = async () => {
        if (!issueKey) return;
        setLoading(true);
        setError(null);
        try {
            const result = await getIssueLinks(issueKey);
            if (result.error) throw new Error(result.error);
            setLinks(result.links || []);
            onLinksChange && onLinksChange();
        } catch (e) {
            setError(e.message || 'Failed to load links');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!issueKey) return;
        const projectKey = issueKey.split('-')[0];
        setSearching(true);
        setSearchError(null);
        try {
            const result = await searchIssues(projectKey, issueKey, searchQuery, 20);
            setSearchResults(result.issues || []);
            if (!(result.issues && result.issues.length) && searchQuery.trim()) {
                setSearchError(`No matches for "${searchQuery.trim()}". Check the key (e.g. SS-7) or search by summary text.`);
            }
        } catch (e) {
            setSearchResults([]);
            setSearchError(e.message || 'Search failed. Please reload the page and try again.');
        } finally {
            setSearching(false);
        }
    };

    /** Load all issues in the project (no search filter) so user can pick any. */
    const handleShowAll = async () => {
        if (!issueKey) return;
        const projectKey = issueKey.split('-')[0];
        setSearching(true);
        setSearchError(null);
        try {
            const result = await searchIssues(projectKey, issueKey, '', 100);
            setSearchResults(result.issues || []);
            if (!(result.issues && result.issues.length)) {
                setSearchError('No other issues found in this project (except the current issue).');
            }
        } catch (e) {
            setSearchResults([]);
            setSearchError(e.message || 'Load failed. Please reload the page and try again.');
        } finally {
            setSearching(false);
        }
    };

    const handleAddLink = async (otherKey) => {
        if (!issueKey || !otherKey) return;
        setError(null);
        try {
            await createIssueLink(issueKey, otherKey, 'Relates');
            await refreshLinks();
            setShowAdd(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch (e) {
            setError(e.message || 'Failed to add link');
        }
    };

    const handleRemoveLink = async (linkId) => {
        setError(null);
        try {
            await deleteIssueLink(linkId);
            await refreshLinks();
        } catch (e) {
            setError(e.message || 'Failed to remove link');
        }
    };

    return (
        <div className="traceability-links">
            <h3 className="traceability-title">Traceability (Issue Links)</h3>
            <p className="traceability-description">
                Link this issue to User Stories or Sustainability Stories (SUS) for traceability.
            </p>
            {error && <div className="traceability-error">{error}</div>}
            {loading && <div className="traceability-loading">Loading links…</div>}
            <ul className="traceability-list">
                {displayLinks.map(link => (
                    <li key={link.id} className="traceability-item">
                        <span className="traceability-link-type">{link.linkTypeName}</span>
                        <a
                            href={`${window.location.origin}/browse/${link.otherKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="traceability-link-key"
                        >
                            {link.otherKey}
                        </a>
                        {link.otherSummary && (
                            <span className="traceability-link-summary" title={link.otherSummary}>
                                {link.otherSummary.length > 40 ? link.otherSummary.slice(0, 40) + '…' : link.otherSummary}
                            </span>
                        )}
                        <button
                            type="button"
                            className="traceability-remove"
                            onClick={() => handleRemoveLink(link.id)}
                            title="Remove link"
                        >
                            ✕
                        </button>
                    </li>
                ))}
            </ul>
            {displayLinks.length === 0 && !loading && (
                <p className="traceability-empty">No issue links yet.</p>
            )}
            <div className="traceability-actions">
                {!showAdd ? (
                    <button type="button" className="traceability-add-btn" onClick={() => { setShowAdd(true); setSearchError(null); setSearchResults([]); }}>
                        + Add link
                    </button>
                ) : (
                    <div className="traceability-add-form">
                        <input
                            type="text"
                            placeholder="Search by key or summary…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="traceability-search-input"
                        />
                        <div className="traceability-search-buttons">
                            <button type="button" className="traceability-search-btn" onClick={handleSearch} disabled={searching}>
                                {searching ? '…' : 'Search'}
                            </button>
                            <button type="button" className="traceability-showall-btn" onClick={handleShowAll} disabled={searching}>
                                {searching ? '…' : 'Show all'}
                            </button>
                        </div>
                        <button type="button" className="traceability-cancel-btn" onClick={() => { setShowAdd(false); setSearchResults([]); setSearchError(null); }}>
                            Cancel
                        </button>
                        {searchError && <div className="traceability-error traceability-search-error">{searchError}</div>}
                        {searchResults.length > 0 && (
                            <ul className="traceability-search-results">
                                {searchResults.map(issue => (
                                    <li key={issue.key}>
                                        <button
                                            type="button"
                                            className="traceability-pick-btn"
                                            onClick={() => handleAddLink(issue.key)}
                                        >
                                            {issue.key}: {issue.summary.length > 50 ? issue.summary.slice(0, 50) + '…' : issue.summary}
                                        </button>
                                        <span className="traceability-pick-type">{issue.type}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TraceabilityLinks;
