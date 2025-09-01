import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StandardKasse } from '../components/kasse/StandardKasse';
import { NFCKasse } from '../components/kasse/NFCKasse';
import { ClickKasse } from '../components/kasse/ClickKasse';

export default function KassePage() {
    const [view, setView] = useState('click');
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const viewParam = params.get('view');
        if (viewParam && ['click', 'standard', 'nfc'].includes(viewParam)) {
            setView(viewParam);
        } else {
            // Standardansicht, wenn kein oder ein ungültiger Parameter vorhanden ist
            setView('click'); 
        }
    }, [location.search]);

    const renderKasse = () => {
        switch(view) {
            case 'standard':
                return <StandardKasse />;
            case 'nfc':
                return <NFCKasse />;
            case 'click':
            default:
                return <ClickKasse />;
        }
    };

    return (
        <div className="space-y-6">
            {renderKasse()}
        </div>
    );
}