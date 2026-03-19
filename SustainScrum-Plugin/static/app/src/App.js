import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import SuMMConfig from './components/SuMMConfig/SuMMConfig';
import SustainabilityPanel from './components/SustainabilityPanel/SustainabilityPanel';
import SustainabilityDashboard from './components/Dashboard/SustainabilityDashboard';
import '@atlaskit/css-reset';

function App() {
    const [context, setContext] = useState('admin'); // 'admin', 'issue', 'dashboard'
    const [loading, setLoading] = useState(true);
    const [initialProjectKey, setInitialProjectKey] = useState(null); // from project page context

    useEffect(() => {
        // Try getContext() first – on project page we get project.key and show SuMM there
        const tryProjectPageContext = async () => {
            try {
                const ctx = await view.getContext();
                if (ctx && ctx.project && ctx.project.key) {
                    setInitialProjectKey(ctx.project.key);
                    setContext('admin');
                    setLoading(false);
                    return true;
                }
            } catch (e) {
                console.log('getContext not available or failed:', e);
            }
            return false;
        };

        const detectContext = async () => {
            if (await tryProjectPageContext()) return;
            const path = window.location.pathname;
            const search = window.location.search;
            const href = window.location.href.toLowerCase();
            const isInIframe = window.self !== window.top;
            
            console.log('Context detection - path:', path, 'href:', href, 'isInIframe:', isInIframe);
            
            // Method 1: Check if we're in an iframe (Issue Panel, Dashboard, or Admin Page)
            if (isInIframe) {
                // Try to detect from parent window URL
                try {
                    const parentUrl = window.parent.location.href.toLowerCase();
                    console.log('Parent URL:', parentUrl);
                    
                    // Check for admin page first (admin pages can also be in iframes)
                    if (parentUrl.includes('/admin/') || 
                        parentUrl.includes('/settings/') ||
                        parentUrl.includes('/plugins/') ||
                        parentUrl.includes('adminpage') ||
                        parentUrl.includes('sustainscrum-plugin')) {
                        console.log('Detected: Admin Page (from parent URL)');
                        setContext('admin');
                        setLoading(false);
                        return;
                    }
                    
                    if (parentUrl.includes('/browse/') || 
                        parentUrl.includes('selectedissue=') ||
                        parentUrl.includes('/jira/software/projects/')) {
                        console.log('Detected: Issue Panel (from parent URL)');
                        setContext('issue');
                        setLoading(false);
                        return;
                    }
                    if (parentUrl.includes('/dashboard') || parentUrl.includes('/dashboards/')) {
                        console.log('Detected: Dashboard (from parent URL)');
                        setContext('dashboard');
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    // Cross-origin, can't access parent
                    console.log('Cannot access parent window (cross-origin), checking current URL');
                }
                
                // Fallback: Check current URL if parent not accessible
                if (path.includes('/admin') || path.includes('/settings') || path.includes('/plugins')) {
                    console.log('Detected: Admin Page (from iframe URL)');
                    setContext('admin');
                    setLoading(false);
                    return;
                }
                
                // Last fallback: If in iframe and can't determine, assume Issue Panel
                // (most common case for iframes in Jira)
                console.log('Detected: Issue Panel (iframe fallback)');
                setContext('issue');
                setLoading(false);
                return;
            }
            
            // Method 2: Check direct URL patterns (not in iframe)
            // Admin pages have specific patterns
            const isAdmin = path.includes('/admin') || 
                          path.includes('/settings') ||
                          path.includes('/plugins') ||
                          path.includes('/secure/admin') ||
                          href.includes('/admin/') ||
                          href.includes('/settings/') ||
                          href.includes('/plugins/') ||
                          href.includes('adminpage') ||
                          href.includes('sustainscrum-plugin');
            
            const isIssueView = path.includes('/browse/') || 
                              path.includes('/jira/software/projects/') ||
                              search.includes('selectedIssue=');
            
            const isDashboard = path.includes('/dashboard') || 
                              path.includes('/dashboards/') ||
                              href.includes('dashboard');
            
            let detectedContext = 'admin'; // default to admin
            if (isAdmin) {
                detectedContext = 'admin';
            } else if (isIssueView) {
                detectedContext = 'issue';
            } else if (isDashboard) {
                detectedContext = 'dashboard';
            }
            
            console.log('Context detection result:', detectedContext);
            setContext(detectedContext);
            setLoading(false);
        };

        // Initial detection only (no interval to avoid flickering)
        detectContext().catch(() => setLoading(false));
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    console.log('Rendering - context:', context);

    return (
        <div>
            {context === 'issue' ? (
                <SustainabilityPanel />
            ) : context === 'dashboard' ? (
                <SustainabilityDashboard />
            ) : (
                <SuMMConfig initialProjectKey={initialProjectKey} />
            )}
        </div>
    );
}

export default App;
