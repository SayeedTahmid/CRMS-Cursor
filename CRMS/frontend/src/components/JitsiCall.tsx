// frontend/src/components/JitsiCall.tsx
/** Jitsi Meet embedded video/audio call component */

import React, { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { logJitsiCallStart, logJitsiCallEnd } from '../services/calls';

interface JitsiCallProps {
  roomName: string;
  customerId?: string;
  customerName?: string;
  onClose: () => void;
  onCallEnd?: (callData: {
    duration: number;
    participants: string[];
    customerId?: string;
  }) => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const JitsiCall: React.FC<JitsiCallProps> = ({
  roomName,
  customerId,
  customerName,
  onClose,
  onCallEnd,
}) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [callLogId, setCallLogId] = useState<string | null>(null);

  useEffect(() => {
    if (!jitsiContainerRef.current) return;

    // Load Jitsi Meet script
    const script = document.createElement('script');
    script.src = 'https://8x8.vc/external_api.js';
    script.async = true;
    script.onload = initializeJitsi;
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (apiRef.current) {
        apiRef.current.dispose();
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initializeJitsi = () => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) {
      console.error('Jitsi container or API not available');
      setIsLoading(false);
      return;
    }

    try {
      const domain = 'meet.jit.si'; // Use public Jitsi or self-hosted domain
      const options = {
        roomName: roomName,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          enableClosePage: false,
          disableInviteFunctions: false,
          toolbarButtons: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'profile',
            'chat',
            'recording',
            'livestreaming',
            'etherpad',
            'sharedvideo',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'feedback',
            'stats',
            'shortcuts',
            'tileview',
            'videobackgroundblur',
            'download',
            'help',
            'mute-everyone',
            'security',
          ],
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'hangup',
          ],
          SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile'],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          SHOW_POWERED_BY: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
          APP_NAME: 'CRM Call',
          NATIVE_APP_NAME: 'CRM Call',
          PROVIDER_NAME: 'CRM System',
        },
        userInfo: {
          displayName: customerName || 'CRM User',
        },
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      apiRef.current = api;

      // Track call start
      const startTime = new Date();
      setCallStartTime(startTime);

      // Log call start
      logJitsiCallStart({
        room_name: roomName,
        customer_id: customerId,
        customer_name: customerName,
      })
        .then((response) => {
          if (response.logId) {
            setCallLogId(response.logId);
          }
        })
        .catch((err) => {
          console.error('Failed to log call start:', err);
        });

      // Track participants
      api.on('participantJoined', (event: any) => {
        const participantId = event.id || event.participantId;
        if (participantId && !participants.includes(participantId)) {
          setParticipants((prev) => [...prev, participantId]);
        }
      });

      api.on('participantLeft', (event: any) => {
        const participantId = event.id || event.participantId;
        setParticipants((prev) => prev.filter((id) => id !== participantId));
      });

      // Track call end
      api.on('readyToClose', () => {
        handleCallEnd();
      });

      // Handle video conference ended
      api.on('videoConferenceEnded', (event: any) => {
        handleCallEnd();
      });

      // Handle errors
      api.on('errorOccurred', (error: any) => {
        console.error('Jitsi error:', error);
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize Jitsi:', error);
      setIsLoading(false);
    }
  };

  const handleCallEnd = async () => {
    if (!callStartTime) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - callStartTime.getTime()) / 1000); // Duration in seconds

    try {
      await logJitsiCallEnd({
        log_id: callLogId,
        room_name: roomName,
        customer_id: customerId,
        duration: duration,
        participants: participants,
      });

      if (onCallEnd) {
        onCallEnd({
          duration: duration,
          participants: participants,
          customerId: customerId,
        });
      }
    } catch (error) {
      console.error('Failed to log call end:', error);
    }

    // Close the call interface
    if (apiRef.current) {
      apiRef.current.dispose();
    }
    onClose();
  };

  const handleClose = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    handleCallEnd();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-dark-bg-secondary border-b border-border px-4 py-3 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            {customerName ? `Call with ${customerName}` : 'Video Call'}
          </h3>
          <p className="text-sm text-text-secondary">Room: {roomName}</p>
        </div>
        <button
          onClick={handleClose}
          className="text-text-secondary hover:text-text-primary p-2 rounded hover:bg-dark-bg transition-colors"
          title="End call"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Jitsi Container */}
      <div className="flex-1 relative" ref={jitsiContainerRef}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-bg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading video call...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JitsiCall;

