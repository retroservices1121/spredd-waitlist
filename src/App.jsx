import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export default function WaitlistSignup() {
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  // Check if returning from Twitter OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const username = params.get('username');
    const displayName = params.get('displayName');
    const errorParam = params.get('error');
    
    if (success === 'true' && username) {
      setUserData({
        username: username,
        displayName: displayName || username
      });
      setConnected(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorParam) {
      setError('Authentication failed. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleTwitterConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/initiate');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to connect. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setUserData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Logo - REPLACE WITH YOUR LOGO URL */}
        <div className="mb-6 animate-fade-in flex justify-center">
          <img 
            src="https://via.placeholder.com/150x80/000000/FFFFFF?text=YOUR+LOGO" 
            alt="Logo" 
            className="h-20 w-auto"
          />
        </div>

        <div className="mb-8 animate-fade-in">
          <div className="inline-block px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
            <span className="text-sm font-medium tracking-wider">COMING SOON</span>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          Join the <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">Revolution</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-300 mb-12 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          Connect your Twitter account to reserve your spot.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="animate-fade-in-up max-w-xl mx-auto" style={{animationDelay: '0.3s'}}>
          {!connected ? (
            <div className="space-y-4">
              <button
                onClick={handleTwitterConnect}
                disabled={isLoading}
                className="w-full px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Connect with Twitter
                  </>
                )}
              </button>
              
              <p className="text-sm text-gray-500">
                We'll only access your basic profile information
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 animate-fade-in">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={32} />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mb-2">You're on the Waitlist!</h3>
                <p className="text-gray-300 mb-4">
                  Welcome, <span className="text-white font-semibold">@{userData?.username}</span>
                </p>
                
                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-sm text-gray-200 mb-3">
                    Please make sure to follow us for announcements and updates!
                  </p>
                  <a 
                    href="https://x.com/spreddai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Follow Us
                  </a>
                </div>
              </div>
              
              <button
                onClick={handleDisconnect}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Disconnect account
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}