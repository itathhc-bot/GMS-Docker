import { useEffect, useState } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// We assign Pusher to window so Laravel Echo can use it
(window as any).Pusher = Pusher;

let echoInstance: Echo | null = null;

export const getEcho = () => {
    if (!echoInstance) {
        // Typically, config would come from window.Laravel.echo, set by blade
        const config = (window as any).Laravel?.echo || {
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST,
            wsPort: import.meta.env.VITE_REVERB_PORT,
            wssPort: import.meta.env.VITE_REVERB_PORT,
            forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
            enabledTransports: ['ws', 'wss'],
        };
        
        echoInstance = new Echo(config);
    }
    return echoInstance;
};

export const usePrivateChannel = (channelName: string | null, eventName: string, callback: (data: any) => void) => {
    useEffect(() => {
        if (!channelName) return;
        const echo = getEcho();
        const channel = echo.private(channelName);
        
        channel.listen(eventName, callback);

        return () => {
            channel.stopListening(eventName);
            echo.leaveChannel(`private-${channelName}`);
        };
    }, [channelName, eventName, callback]);
};

export const usePublicChannel = (channelName: string | null, eventName: string, callback: (data: any) => void) => {
    useEffect(() => {
        if (!channelName) return;
        const echo = getEcho();
        const channel = echo.channel(channelName);
        
        channel.listen(eventName, callback);

        return () => {
            channel.stopListening(eventName);
            echo.leaveChannel(channelName);
        };
    }, [channelName, eventName, callback]);
};

export const useEcho = usePublicChannel;
