"use client";

import { useEffect } from 'react';

const INACTIVITY_MS = 60 * 60 * 1000; // 1 hour

export default function IdleLogoutWatcher() {
    useEffect(() => {
        let idleTimer = null;

        const resetTimer = () => {
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                // After 1 hour of no client activity, force a hard logout
                window.location.href = '/api/auth/logout';
            }, INACTIVITY_MS);
        };

        // List of events that count as "user activity"
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

        const handleActivity = () => resetTimer();

        // Set up event listeners
        events.forEach(event => window.addEventListener(event, handleActivity));

        // Start the timer on mount
        resetTimer();

        // Cleanup
        return () => {
            if (idleTimer) clearTimeout(idleTimer);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, []);

    return null;
}