import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { view } from '@forge/bridge';
import SuMMConfig from './components/SuMMConfig/SuMMConfig';
import SustainabilityDashboard from './components/Dashboard/SustainabilityDashboard';
import '@atlaskit/css-reset';

function getRouteFromPathname(pathname) {
    const p = (pathname || '').toLowerCase().replace(/\/$/, '');
    if (p === 'dashboard' || p.endsWith('/dashboard')) return 'dashboard';
    if (p === 'summ' || p.endsWith('/summ')) return 'summ';
    return 'summ';
}

/**
 * Project page router: uses view.createHistory() so the route (SuMM vs Dashboard)
 * comes from the Forge app URL and updates when the user switches subpages.
 */
function ProjectPageApp() {
    const [projectKey, setProjectKey] = useState(null);
    const [route, setRoute] = useState('summ');
    const [loading, setLoading] = useState(true);
    const unlistenRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                const ctx = await view.getContext();
                if (!cancelled && ctx && ctx.project && ctx.project.key) {
                    setProjectKey((prev) => prev || ctx.project.key);
                }

                const history = await view.createHistory();
                if (cancelled) return;

                const updateFromLocation = (location) => {
                    const pathname = location && location.pathname;
                    setRoute(getRouteFromPathname(pathname));
                };

                updateFromLocation(history.location);
                unlistenRef.current = history.listen((location) => {
                    if (!cancelled) updateFromLocation(location);
                });
            } catch (e) {
                setRoute('summ');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        init();
        return () => {
            cancelled = true;
            if (unlistenRef.current) unlistenRef.current();
        };
    }, []);

    if (loading) {
        return <div style={{ padding: 24 }}>Loading...</div>;
    }

    if (route === 'dashboard') {
        return <SustainabilityDashboard initialProjectKey={projectKey} />;
    }
    return <SuMMConfig initialProjectKey={projectKey} />;
}

ReactDOM.render(
    <React.StrictMode>
        <ProjectPageApp />
    </React.StrictMode>,
    document.getElementById('root')
);
