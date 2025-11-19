// frontend/src/components/CallDialer.tsx
/** Call dialer component for making VoIP calls */

import React, { useState, useEffect, useRef } from 'react';
import { PhoneIcon, XMarkIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import { initiateCall, formatPhoneNumber, validatePhoneNumber } from '../services/calls';

interface CallDialerProps {
  customerId?: string;
  customerPhone?: string;
  customerName?: string;
  onCallEnd?: (callLogId?: string) => void;
  onClose?: () => void;
}

export const CallDialer: React.FC<CallDialerProps> = ({
  customerId,
  customerPhone,
  customerName,
  onCallEnd,
  onClose,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(customerPhone || '');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (customerPhone) {
      setPhoneNumber(customerPhone);
    }
  }, [customerPhone]);

  const handleCall = async () => {
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setError('');
    setIsCalling(true);
    setCallStatus('calling');

    try {
      const response = await initiateCall({
        to: phoneNumber,
        customer_id: customerId,
      });

      setCallLogId(response.logId);
      setCallStatus('connected');
      
      // Note: In a real implementation with Twilio Voice SDK, you would:
      // 1. Initialize the device with the token
      // 2. Connect the call using device.connect()
      // 3. Handle call events (disconnect, mute, hold, etc.)
      // For now, this is a simplified version that initiates the call via backend
      
    } catch (err: any) {
      console.error('Call initiation error:', err);
      setError(err.response?.data?.error || 'Failed to initiate call');
      setCallStatus('ended');
      setIsCalling(false);
    }
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setIsCalling(false);
    if (onCallEnd) {
      onCallEnd(callLogId || undefined);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCalling) {
      handleCall();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-bg-card rounded-lg p-6 w-full max-w-md border border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-text-primary">
            {customerName ? `Call ${customerName}` : 'Make a Call'}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="+1234567890"
              className="w-full px-4 py-2 rounded bg-dark-bg border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
              disabled={isCalling}
            />
            {phoneNumber && (
              <p className="text-xs text-text-secondary mt-1">
                {formatPhoneNumber(phoneNumber)}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {callStatus === 'calling' && (
            <div className="text-center py-4">
              <div className="animate-pulse text-primary-purple">Calling...</div>
            </div>
          )}

          {callStatus === 'connected' && (
            <div className="text-center py-4">
              <div className="text-green-400 font-semibold">Call Connected</div>
              <p className="text-sm text-text-secondary mt-2">
                Call is in progress. Use your phone to continue the conversation.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {callStatus === 'idle' && (
              <button
                onClick={handleCall}
                disabled={!phoneNumber || isCalling}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PhoneIcon className="w-5 h-5" />
                Call
              </button>
            )}

            {(callStatus === 'calling' || callStatus === 'connected') && (
              <button
                onClick={handleEndCall}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
                End Call
              </button>
            )}
          </div>

          {callStatus === 'ended' && (
            <div className="text-center py-2">
              <p className="text-sm text-text-secondary">Call ended</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallDialer;

