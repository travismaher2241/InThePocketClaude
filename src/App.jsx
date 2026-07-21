import React, { useState, useEffect } from 'react';
import SquadHub from './components/SquadHub';
import TrainingLab from './components/TrainingLab';
import TacticsBoard from './components/TacticsBoard';
import MatchDay from './components/MatchDay';
import VideoAnalyser from './components/VideoAnalyser';
import SettingsModal from './components/SettingsModal';
import SubscriptionPage from './components/SubscriptionPage';
import SetupWizard from './components/SetupWizard';
import { useAuth } from './context/AuthProvider';
import { addPlayer, getPlayers, getSquadSettings, updateSquadSettings, getUserProfile, updateUserProfile } from './firebaseHelpers';
import inThePocketLogo from './assets/In The Pocket.png';

// Empty default roster to allow clean user data entry
const DEFAULT_ROSTER = [];

export default function App() {
  const { currentUser, logout } = useAuth();

  // Temporary: Unregister any active service workers to clear the broken sw.js cache
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) console.log("Successfully unregistered broken Service Worker");
          });
        }
      });
    }
  }, []);

  const [activeTab, setActiveTab] = useState(0); // 0: Squad, 1: Training, 2: Tactics, 3: Match Day, 4: Video

  // Reset scroll position to top when activeTab changes (forces window/container scroll reset)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);
  const getAppScopedKey = (baseKey) => {
    const userIdentifier = currentUser?.uid || currentUser?.email || 'guest';
    return `${baseKey}_${userIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  };

  const [userProfile, setUserProfile] = useState(null);

  const [squad, setSquad] = useState(() => {
    const key = currentUser?.uid || currentUser?.email ? `inthepocket_squad_${(currentUser?.uid || currentUser?.email).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'inthepocket_squad_guest';
    const saved = localStorage.getItem(key) || localStorage.getItem('inthepocket_squad');
    return saved ? JSON.parse(saved) : DEFAULT_ROSTER;
  });

  const [videoClips, setVideoClips] = useState(() => {
    const key = currentUser?.uid || currentUser?.email ? `inthepocket_videoclips_${(currentUser?.uid || currentUser?.email).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'inthepocket_videoclips_guest';
    const saved = localStorage.getItem(key) || localStorage.getItem('inthepocket_videoclips');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedReviewClip, setSelectedReviewClip] = useState(null);
  const handleReviewClip = (clip) => {
    setSelectedReviewClip(clip);
    setActiveTab(4); // Switch to Video Analyser
  };

  // Settings & Integrations states
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const [subscriptionTier, setSubscriptionTier] = useState(() => localStorage.getItem('inthepocket_tier') || 'Ultra'); // Default to Ultra for full capability demo
  const [maxStintMinutes, setMaxStintMinutes] = useState(() => Number(localStorage.getItem('inthepocket_stint_limit')) || 5);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Connection & Offline Sync states
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState(() => {
    const saved = localStorage.getItem('inthepocket_sync_queue');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Toast System state
  const [toast, setToast] = useState(null);

  // Paywall Modal state
  const [paywallFeature, setPaywallFeature] = useState(null);

  const [squadSettings, setSquadSettings] = useState(() => {
    const key = currentUser?.uid || currentUser?.email ? `inthepocket_squad_settings_${(currentUser?.uid || currentUser?.email).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'inthepocket_squad_settings_guest';
    const saved = localStorage.getItem(key) || localStorage.getItem('inthepocket_squad_settings');
    const parsed = saved ? JSON.parse(saved) : { squadName: 'My Squad', ageGroup: 'U14' };
    if (!parsed.equipment) {
      parsed.equipment = {
        cones: 20,
        footballs: 10,
        tackleMats: 4,
        agilityPoles: 6,
        bibs: 15
      };
    }
    return parsed;
  });

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(getAppScopedKey('inthepocket_squad_settings'), JSON.stringify(squadSettings));
  }, [squadSettings, currentUser]);

  // Load squad, userProfile, and squad settings from Firestore when user logs in
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser?.uid) {
        try {
          const dbPlayers = await getPlayers(currentUser.uid);
          if (dbPlayers.length > 0) {
            setSquad(dbPlayers);
          } else {
            setSquad([]);
          }

          const dbSettings = await getSquadSettings(currentUser.uid);
          setSquadSettings(dbSettings);

          const profile = await getUserProfile(currentUser.uid);
          // Check scoped localStorage profile fallback
          const localProfileStr = localStorage.getItem(getAppScopedKey('inthepocket_user_profile'));
          const localProfile = localProfileStr ? JSON.parse(localProfileStr) : null;
          
          const mergedProfile = {
            ...profile,
            ...localProfile
          };
          setUserProfile(mergedProfile);

          if (mergedProfile?.subscriptionTier) {
            const tierLower = mergedProfile.subscriptionTier.toLowerCase();
            let matchedTier = 'Free';
            if (tierLower === 'pro') matchedTier = 'Pro';
            else if (tierLower === 'ultra' || tierLower === 'team') matchedTier = 'Ultra';
            else if (tierLower === 'b2b' || tierLower === 'club') matchedTier = 'B2B';
            setSubscriptionTier(matchedTier);
          }
        } catch (err) {
          console.error("Failed to load user data from Firestore:", err);
        }
      } else {
        // Reset state on logout
        setActiveTab(0);
        setSquad([]);
        setSquadSettings({ squadName: 'My Squad', ageGroup: 'U14' });
        setSubscriptionTier('Free');
        setUserProfile(null);
        setVideoClips([]);
        setSelectedReviewClip(null);
      }
    };
    loadUserData();
  }, [currentUser]);

  // Sync state changes to LocalStorage
  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(getAppScopedKey('inthepocket_squad'), JSON.stringify(squad));
  }, [squad, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(getAppScopedKey('inthepocket_tier'), subscriptionTier);
  }, [subscriptionTier, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(getAppScopedKey('inthepocket_stint_limit'), maxStintMinutes.toString());
  }, [maxStintMinutes, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(getAppScopedKey('inthepocket_sync_queue'), JSON.stringify(syncQueue));
  }, [syncQueue, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(getAppScopedKey('inthepocket_videoclips'), JSON.stringify(videoClips));
  }, [videoClips, currentUser]);

  // Handle Online status change synchronization flushes
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      triggerSyncFlush();
    }
  }, [isOnline]);

  const showToast = (message, duration = 3000) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const triggerSyncFlush = () => {
    setIsSyncing(true);
    
    // Simulate database write delay silently in the background
    setTimeout(() => {
      setSyncQueue([]);
      setIsSyncing(false);
    }, 2000);
  };

  const logSyncTransaction = (type, payload) => {
    const newTx = {
      type,
      payload,
      timestamp: Date.now()
    };

    if (isOnline) {
      // In online mode, we log and instantly sync silently
      setSyncQueue(prev => [...prev, newTx]);
      setTimeout(() => {
        // Automatically flush
        setSyncQueue(prev => prev.filter(item => item.timestamp !== newTx.timestamp));
      }, 800);
    } else {
      // In offline mode, transaction remains in queue silently
      setSyncQueue(prev => [...prev, newTx]);
    }
  };

  const handleUpdateSubscriptionTier = async (newTier) => {
    setSubscriptionTier(newTier);
    if (currentUser?.uid) {
      try {
        const dbTier = newTier.toLowerCase();
        await updateUserProfile(currentUser.uid, {
          subscriptionTier: dbTier,
          isActive: true
        });
      } catch (err) {
        console.error("Failed to update user profile in Firestore:", err);
      }
    }
  };

  // Squad Handlers
  const handleAddPlayer = async (newPlayer) => {
    let docId = 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    try {
      if (currentUser?.uid) {
        docId = await addPlayer(newPlayer, currentUser.uid);
      }
    } catch (err) {
      console.warn("Firestore addPlayer failed, running local fallback:", err);
    }

    const playerWithId = {
      ...newPlayer,
      id: docId
    };
    setSquad(prevSquad => [...prevSquad, playerWithId]);
    logSyncTransaction('PLAYER_ADD', { name: newPlayer.name, jersey: newPlayer.jersey });
    showToast(`Added ${newPlayer.name} to the roster.`);
  };

  const handleEditPlayer = (id, updatedFields) => {
    setSquad(squad.map(p => p.id === id ? { ...p, ...updatedFields } : p));
    logSyncTransaction('PLAYER_EDIT', { id, name: updatedFields.name });
    showToast(`Updated player profile.`);
  };

  const handleRemovePlayer = (idOrIds) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    setSquad(prevSquad => prevSquad.filter(p => !ids.includes(p.id)));
    logSyncTransaction('PLAYER_REMOVE_BATCH', { ids });
    showToast(ids.length === 1 ? `Removed player from roster.` : `Removed ${ids.length} players from roster.`);
  };

  const handleImportCSV = (csvText) => {
    try {
      const lines = csvText.split('\n');
      const newPlayers = [];
      let parsedCount = 0;

      lines.forEach((line) => {
        if (!line.trim()) return;
        // Split by comma
        const parts = line.split(',');
        if (parts.length < 2) return; // Need at least name and jersey

        const name = parts[0].trim();
        const jersey = parseInt(parts[1].trim());
        const position = parts[2] ? parts[2].trim() : 'Midfield';
        const medical = parts[3] ? parts[3].trim() : 'None';

        if (name && !isNaN(jersey)) {
          newPlayers.push({
            id: 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            name,
            jersey,
            position,
            medical,
            attendance: [],
            stats: { totalTime: 0, stints: 0 }
          });
          parsedCount++;
        }
      });

      if (newPlayers.length > 0) {
        setSquad([...squad, ...newPlayers]);
        logSyncTransaction('ROSTER_CSV_IMPORT', { count: parsedCount });
        showToast(`Parsed and imported ${parsedCount} players into Squad Hub.`);
      } else {
        showToast("Error: No valid player rows detected in CSV text.");
      }
    } catch (err) {
      showToast("CSV Parsing Exception. Check formatting rules.");
    }
  };

  const handleSaveSettings = async (newSettings) => {
    setSquadSettings(newSettings);
    if (currentUser?.uid) {
      try {
        await updateSquadSettings(newSettings, currentUser.uid);
        showToast("Squad settings saved successfully.");
      } catch (err) {
        console.error("Failed to save squad settings to Firestore:", err);
        showToast("Error: Failed to save squad settings to cloud.");
      }
    } else {
      showToast("Squad settings saved locally.");
    }
  };

  const triggerPaywall = (featureName) => {
    setPaywallFeature(featureName);
  };

  const handleCompleteSetup = async (setupData) => {
    try {
      const updatedProfile = {
        ...userProfile,
        ...setupData,
        hasCompletedSetup: true
      };

      setUserProfile(updatedProfile);

      // Save to user-scoped localStorage
      if (currentUser) {
        localStorage.setItem(getAppScopedKey('inthepocket_user_profile'), JSON.stringify(updatedProfile));
      }

      // Automatically update squad settings with calibrated team name and age group
      const newSettings = {
        ...squadSettings,
        squadName: setupData.teamName || squadSettings.squadName,
        ageGroup: setupData.ageGroup || squadSettings.ageGroup
      };
      setSquadSettings(newSettings);

      // Save to Firestore if online
      if (currentUser?.uid) {
        await updateUserProfile(currentUser.uid, updatedProfile);
        await updateSquadSettings(newSettings, currentUser.uid);
      }

      showToast(`Setup complete! App calibrated for ${setupData.teamName}`);
    } catch (err) {
      console.error("Failed to complete setup:", err);
      showToast("Error completing setup. Settings saved locally.");
    }
  };

  const hasCompletedSetup = userProfile?.hasCompletedSetup === true;

  // ROUTING & AUTH FLOW GUARD: If authenticated user has not completed setup, intercept with SetupWizard
  if (currentUser && !hasCompletedSetup) {
    return (
      <SetupWizard 
        user={currentUser} 
        subscriptionTier={subscriptionTier} 
        onCompleteSetup={handleCompleteSetup} 
      />
    );
  }

  return (
    <div className="app-container">
      
      {/* Top Header status lines */}
      <header className="app-header">
        <div 
          className="brand-section" 
          onClick={() => setIsSettingsOpen(true)} 
          style={{ cursor: 'pointer', userSelect: 'none' }}
          title="Tap logo to open settings"
        >
          <div className="brand-logo-wrapper">
            <img 
              src={inThePocketLogo} 
              alt="In The Pocket" 
              className="brand-logo-img" 
            />
            <div 
              className="brand-logo-shimmer" 
              style={{ '--logo-url': `url(${inThePocketLogo})` }}
            />
          </div>
        </div>

        {/* Top-right area */}
        <div>
          <button 
            onClick={logout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#8d939e',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              transition: 'color 0.2s, border-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#e63946';
              e.currentTarget.style.borderColor = 'rgba(230, 57, 70, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8d939e';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Floating toast alerts */}
      {toast && (
        <div className="toast-notification">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ color: 'var(--color-squad)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>{toast}</span>
        </div>
      )}

      {/* Main rendering pane with hardware-accelerated transitions */}
      <main className="tab-content-container tab-fade-in" key={activeTab}>
        {activeTab === 0 && (
          <SquadHub 
            squad={squad} 
            onAddPlayer={handleAddPlayer} 
            onEditPlayer={handleEditPlayer} 
            onImportCSV={handleImportCSV} 
            onRemovePlayer={handleRemovePlayer} 
            videoClips={videoClips}
            onSelectClipForReview={handleReviewClip}
          />
        )}
        {activeTab === 1 && (
          <TrainingLab 
            squad={squad} 
            subscriptionTier={subscriptionTier} 
            apiKey={apiKey} 
            triggerPaywall={triggerPaywall} 
            logSyncTransaction={logSyncTransaction} 
            onSaveVideoClip={(clip) => setVideoClips(prev => [clip, ...prev])}
            squadSettings={squadSettings}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 2 && (
          <TacticsBoard 
            squad={squad}
            subscriptionTier={subscriptionTier} 
            triggerPaywall={triggerPaywall} 
          />
        )}
        {activeTab === 3 && (
          <MatchDay 
            squad={squad} 
            subscriptionTier={subscriptionTier} 
            maxStintMinutes={maxStintMinutes} 
            triggerPaywall={triggerPaywall} 
            logSyncTransaction={logSyncTransaction} 
            onSaveVideoClip={(clip) => setVideoClips(prev => [clip, ...prev])}
            onEditPlayer={handleEditPlayer}
          />
        )}
        {activeTab === 4 && (
          <VideoAnalyser 
            squad={squad}
            videoClips={videoClips}
            setVideoClips={setVideoClips}
            selectedReviewClip={selectedReviewClip}
            setSelectedReviewClip={setSelectedReviewClip}
            showToast={showToast}
          />
        )}
        {activeTab === 5 && (
          <SubscriptionPage 
            currentUser={currentUser}
            subscriptionTier={subscriptionTier}
            onUpgrade={handleUpdateSubscriptionTier}
            showToast={showToast}
            setActiveTab={setActiveTab}
          />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        subscriptionTier={subscriptionTier} 
        setSubscriptionTier={handleUpdateSubscriptionTier} 
        maxStintMinutes={maxStintMinutes} 
        setMaxStintMinutes={setMaxStintMinutes} 
        syncQueue={syncQueue}
        clearSyncQueue={() => {
          setSyncQueue([]);
          showToast("Sync transactions queue cleared.");
        }}
        squadSettings={squadSettings}
        onSaveSettings={handleSaveSettings}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
      />

      {/* Interactive Paywall Gating Screen overlay */}
      {paywallFeature && (
        <div className="overlay-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: '32px 24px' }}>
              <div className="paywall-badge">REVENUECAT SUBSCRIPTION GATEWAY</div>
              
              <h3 className="scoreboard-font" style={{ fontSize: '1.75rem', marginBottom: '8px', color: 'var(--color-match)' }}>
                Unlock {paywallFeature}
              </h3>
              
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                This is a mock validation of the RevenueCat subscription payload. The features you requested require upgrading to a higher licensing tier.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    handleUpdateSubscriptionTier('Pro');
                    setPaywallFeature(null);
                    showToast("Simulated Upgrade: Welcome to Pro! You now have access to all of the amazing pro features in In The Pocket!");
                  }}
                  style={{ width: '100%', padding: '12px' }}
                >
                  Activate Pro Tier ($9.99/mo)
                </button>
                <button 
                  className="btn btn-match" 
                  onClick={() => {
                    handleUpdateSubscriptionTier('Ultra');
                    setPaywallFeature(null);
                    showToast("Simulated Upgrade: Welcome to Ultra! You now have access to all of the amazing pro features in In The Pocket!");
                  }}
                  style={{ width: '100%', padding: '12px' }}
                >
                  Activate Ultra Tier ($19.99/mo)
                </button>
                <button 
                  className="btn" 
                  onClick={() => {
                    handleUpdateSubscriptionTier('B2B');
                    setPaywallFeature(null);
                    showToast("Simulated Upgrade: Welcome to B2B! You now have access to all of the amazing pro features in In The Pocket!");
                  }}
                  style={{ width: '100%', padding: '12px', borderColor: 'rgba(255, 183, 3, 0.4)', color: '#ffb703' }}
                >
                  Activate B2B Club Tier (Junior Club Package)
                </button>
              </div>

              <button 
                className="btn" 
                onClick={() => setPaywallFeature(null)} 
                style={{ width: '100%', border: 'none', color: 'var(--text-secondary)' }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation tabs bar */}
      <nav className="nav-bar">
        <button className={`nav-tab ${activeTab === 0 ? 'active-tab-0' : ''}`} onClick={() => setActiveTab(0)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <span className="nav-tab-label">Squad Hub</span>
        </button>

        <button className={`nav-tab ${activeTab === 1 ? 'active-tab-1' : ''}`} onClick={() => setActiveTab(1)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          <span className="nav-tab-label">Training Lab</span>
        </button>

        <button className={`nav-tab ${activeTab === 2 ? 'active-tab-2' : ''}`} onClick={() => setActiveTab(2)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <span className="nav-tab-label">Tactics Board</span>
        </button>

        <button className={`nav-tab ${activeTab === 4 ? 'active-tab-4' : ''}`} onClick={() => setActiveTab(4)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v18M17 3v18M3 8h4M3 13h4M3 18h4M17 8h4M17 13h4M17 18h4" />
          </svg>
          <span className="nav-tab-label">Video Analyser</span>
        </button>

        <button className={`nav-tab ${activeTab === 3 ? 'active-tab-3' : ''}`} onClick={() => setActiveTab(3)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a7 7 0 007-7h-2.128A3.001 3.001 0 0015 5h-6a3 3 0 00-1.872 1H5a7 7 0 007 7zm0 0v5m-4 0h8M5 8h2m10 0h2"/>
          </svg>
          <span className="nav-tab-label">Match Day</span>
        </button>

        <button className={`nav-tab ${activeTab === 5 ? 'active-tab-5' : ''}`} onClick={() => setActiveTab(5)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="nav-tab-label">Account</span>
        </button>
      </nav>
    </div>
  );
}
