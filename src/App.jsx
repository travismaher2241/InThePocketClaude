import React, { useState, useEffect, lazy, Suspense } from 'react';
import SquadHub from './components/SquadHub';
import SettingsModal from './components/SettingsModal';
import SetupWizard from './components/SetupWizard';

import { lazyWithRetry } from './utils/lazyWithRetry';

const TrainingLab = lazyWithRetry(() => import('./components/TrainingLab'));
const TacticsBoard = lazyWithRetry(() => import('./components/TacticsBoard'));
const MatchDay = lazyWithRetry(() => import('./components/MatchDay'));
const VideoAnalyser = lazyWithRetry(() => import('./components/VideoAnalyser'));
const SubscriptionPage = lazyWithRetry(() => import('./components/SubscriptionPage'));
import { useAuth } from './context/AuthProvider';
import { addPlayer, getPlayers, getSquadSettings, updateSquadSettings, getUserProfile, updateUserProfile, updatePlayerInFirestore } from './firebaseHelpers';
import { safeJsonParse, getScopedKey, migrateUnscopedKey } from './utils/storageUtils';
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
  const [hideGlobalNav, setHideGlobalNav] = useState(false);
  const [tacticsHasUnsavedChanges, setTacticsHasUnsavedChanges] = useState(false);

  const handleNavTabSwitch = (targetTab) => {
    if (activeTab === 2 && targetTab !== 2 && tacticsHasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes on the Tactics Board. Leave without saving?');
      if (!confirmed) return;
    }
    setActiveTab(targetTab);
  };

  // Reset scroll position to top when activeTab changes (forces window/container scroll reset)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (activeTab !== 1) {
      setHideGlobalNav(false);
    }
  }, [activeTab]);

  const getAppScopedKey = (baseKey) => {
    const userIdentifier = currentUser?.uid || currentUser?.email || 'guest';
    return getScopedKey(baseKey, userIdentifier);
  };

  const [userProfile, setUserProfile] = useState(() => {
    const key = currentUser?.uid || currentUser?.email ? `inthepocket_user_profile_${(currentUser?.uid || currentUser?.email).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'inthepocket_user_profile_guest';
    const saved = localStorage.getItem(key) || localStorage.getItem('inthepocket_user_profile');
    return safeJsonParse(saved, null);
  });

  const [squad, setSquad] = useState(() => {
    const key = currentUser?.uid || currentUser?.email ? `inthepocket_squad_${(currentUser?.uid || currentUser?.email).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'inthepocket_squad_guest';
    const saved = localStorage.getItem(key) || localStorage.getItem('inthepocket_squad');
    return safeJsonParse(saved, DEFAULT_ROSTER, Array.isArray);
  });

  const [videoClips, setVideoClips] = useState(() => {
    const key = currentUser?.uid || currentUser?.email ? `inthepocket_videoclips_${(currentUser?.uid || currentUser?.email).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'inthepocket_videoclips_guest';
    const saved = localStorage.getItem(key) || localStorage.getItem('inthepocket_videoclips');
    return safeJsonParse(saved, [], Array.isArray);
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

  // Connection & Offline Sync states (combines navigator.onLine & manual test toggle)
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncQueue, setSyncQueue] = useState(() => {
    const saved = localStorage.getItem('inthepocket_sync_queue');
    return safeJsonParse(saved, [], Array.isArray);
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Toast System state
  const [toast, setToast] = useState(null);

  // Paywall Modal state
  const [paywallFeature, setPaywallFeature] = useState(null);

  const [squadSettings, setSquadSettings] = useState(() => {
    const key = currentUser?.uid || currentUser?.email ? `inthepocket_squad_settings_${(currentUser?.uid || currentUser?.email).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'inthepocket_squad_settings_guest';
    const saved = localStorage.getItem(key) || localStorage.getItem('inthepocket_squad_settings');
    const parsed = safeJsonParse(saved, { squadName: 'My Squad', ageGroup: 'U14' }, (val) => typeof val === 'object');
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

  // Synchronously load profile from user-scoped localStorage whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      // Migrate legacy keys if needed
      migrateUnscopedKey('inthepocket_squad', currentUser.uid);
      migrateUnscopedKey('inthepocket_squad_settings', currentUser.uid);
      migrateUnscopedKey('inthepocket_videoclips', currentUser.uid);

      const localProfileStr = localStorage.getItem(getAppScopedKey('inthepocket_user_profile'));
      if (localProfileStr) {
        const parsed = safeJsonParse(localProfileStr, null);
        if (parsed) {
          setUserProfile(prev => ({ ...(prev || {}), ...parsed }));
        }
      }
    }
  }, [currentUser]);

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
          const localSettingsStr = localStorage.getItem(getAppScopedKey('inthepocket_squad_settings'));
          const localSettings = safeJsonParse(localSettingsStr, null);
          
          const mergedSettings = {
            squadName: 'My Team',
            ...dbSettings,
            ...localSettings
          };
          setSquadSettings(mergedSettings);

          const profile = await getUserProfile(currentUser.uid);
          // Check scoped localStorage profile fallback
          const localProfileStr = localStorage.getItem(getAppScopedKey('inthepocket_user_profile'));
          const localProfile = safeJsonParse(localProfileStr, null);
          
          const mergedProfile = {
            ...profile,
            ...localProfile,
            hasCompletedSetup: (localProfile?.hasCompletedSetup === true) || (profile?.hasCompletedSetup === true)
          };
          setUserProfile(mergedProfile);

          if (mergedProfile?.subscriptionTier) {
            const tierLower = mergedProfile.subscriptionTier.toLowerCase();
            let matchedTier = 'Free';
            if (tierLower === 'pro') matchedTier = 'Pro';
            else if (tierLower === 'ultra') matchedTier = 'Ultra';
            else if (tierLower === 'b2b' || tierLower.includes('club')) matchedTier = 'ULTRA CLUB';
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
    if (isOnline && syncQueue.some(item => item.status !== 'synced')) {
      triggerSyncFlush();
    }
  }, [isOnline]);

  const showToast = (message, duration = 3000) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const triggerSyncFlush = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    // Process pending sync queue items idempotently
    const updatedQueue = [...syncQueue];
    for (const tx of updatedQueue) {
      if (tx.status === 'synced') continue;
      try {
        if (tx.type === 'PLAYER_EDIT' && tx.payload?.id && currentUser?.uid) {
          await updatePlayerInFirestore(tx.payload.id, tx.payload.updatedFields || {}, currentUser.uid);
        }
        tx.status = 'synced';
      } catch (err) {
        console.error(`Sync transaction ${tx.type} failed:`, err);
        tx.status = 'failed';
        tx.lastError = err.message || 'Firestore write error';
      }
    }
    
    setSyncQueue(updatedQueue.filter(item => item.status !== 'synced'));
    setIsSyncing(false);
  };

  const logSyncTransaction = (type, payload) => {
    const newTx = {
      type,
      payload,
      timestamp: Date.now(),
      status: isOnline ? 'synced' : 'pending'
    };

    setSyncQueue(prev => [...prev, newTx]);
    if (isOnline) {
      setTimeout(() => {
        setSyncQueue(prev => prev.filter(item => item.timestamp !== newTx.timestamp));
      }, 800);
    }
  };

  const handleUpdateSubscriptionTier = async (newTier) => {
    setSubscriptionTier(newTier);
    const dbTier = newTier.toLowerCase();

    // Keep the cached userProfile (and its localStorage copy) in sync with subscriptionTier.
    // Without this, the next load's Firestore/local-profile merge would read the stale
    // cached tier and silently overwrite the tier we just set here.
    setUserProfile(prev => {
      const updated = { ...(prev || {}), subscriptionTier: dbTier, isActive: true };
      if (currentUser) {
        localStorage.setItem(getAppScopedKey('inthepocket_user_profile'), JSON.stringify(updated));
      }
      return updated;
    });

    if (currentUser?.uid) {
      try {
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
    let cloudSynced = false;
    try {
      if (currentUser?.uid) {
        docId = await addPlayer(newPlayer, currentUser.uid);
        cloudSynced = true;
      }
    } catch (err) {
      console.warn("Firestore addPlayer failed, running local fallback:", err);
    }

    const playerWithId = {
      ...newPlayer,
      id: docId
    };
    setSquad(prevSquad => [...prevSquad, playerWithId]);
    logSyncTransaction('PLAYER_ADD', { name: newPlayer.name, jersey: newPlayer.jersey, status: cloudSynced ? 'synced' : 'pending' });
    showToast(cloudSynced ? `Added ${newPlayer.name} to the roster.` : `Added ${newPlayer.name} (saved locally).`);
  };

  const handleEditPlayer = async (id, updatedFields) => {
    setSquad(prevSquad => prevSquad.map(p => p.id === id ? { ...p, ...updatedFields } : p));
    let cloudSynced = false;
    try {
      if (currentUser?.uid) {
        await updatePlayerInFirestore(id, updatedFields, currentUser.uid);
        cloudSynced = true;
      }
    } catch (err) {
      console.warn("Firestore updatePlayerInFirestore failed, running local fallback:", err);
    }
    logSyncTransaction('PLAYER_EDIT', { id, name: updatedFields.name, updatedFields, status: cloudSynced ? 'synced' : 'pending' });
    showToast(cloudSynced ? `Updated player profile.` : `Updated player profile (saved locally).`);
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
        showToast(`Parsed and imported ${parsedCount} players into Team Hub.`);
      } else {
        showToast("Error: No valid player rows detected in CSV text.");
      }
    } catch (err) {
      showToast("CSV Parsing Exception. Check formatting rules.");
    }
  };

  const handleSaveSettings = async (newSettings) => {
    const cleanTeamName = (newSettings.squadName || newSettings.teamName || squadSettings?.squadName || userProfile?.teamName || 'My Team').trim();

    // 1. Update squadSettings state
    const nextSquadSettings = {
      ...squadSettings,
      squadName: cleanTeamName,
      ageGroup: newSettings.ageGroup || squadSettings.ageGroup,
      equipment: newSettings.equipment || squadSettings.equipment
    };
    setSquadSettings(nextSquadSettings);

    // 2. Update userProfile state with coach name, coach level, team name, and age group
    const updatedProfile = {
      ...(userProfile || {}),
      name: newSettings.coachName !== undefined ? newSettings.coachName : (userProfile?.name || ''),
      teamName: cleanTeamName,
      squadName: cleanTeamName,
      ageGroup: newSettings.ageGroup || userProfile?.ageGroup || '',
      primaryAgeGroup: newSettings.ageGroup || userProfile?.primaryAgeGroup || '',
      coachLevel: newSettings.coachLevel || userProfile?.coachLevel || '3',
      hasCompletedSetup: true
    };
    setUserProfile(updatedProfile);

    // 3. Persist to user-scoped LocalStorage
    if (currentUser) {
      localStorage.setItem(getAppScopedKey('inthepocket_user_profile'), JSON.stringify(updatedProfile));
      localStorage.setItem(getAppScopedKey('inthepocket_squad_settings'), JSON.stringify(nextSquadSettings));
    }

    // 4. Cloud sync to Firestore
    if (currentUser?.uid) {
      try {
        await updateUserProfile(currentUser.uid, updatedProfile);
        await updateSquadSettings(nextSquadSettings, currentUser.uid);
        showToast(`Team Name updated to "${cleanTeamName}".`);
      } catch (err) {
        console.warn("Cloud sync failed during settings save:", err);
        showToast(`Team Name saved locally as "${cleanTeamName}".`);
      }
    } else {
      showToast(`Team Name saved locally as "${cleanTeamName}".`);
    }
  };

  const handleReRunSetup = () => {
    try {
      localStorage.removeItem('inthepocket_setup_completed');
    } catch (e) {}
    setUserProfile(prev => ({
      ...(prev || {}),
      hasCompletedSetup: false
    }));
    setIsSettingsOpen(false);
  };

  const triggerPaywall = (featureName) => {
    setPaywallFeature(featureName);
  };

  const handleCompleteSetup = async (setupData) => {
    // 1. Prepare user profile and squad settings objects
    const updatedProfile = {
      ...(userProfile || {}),
      ...setupData,
      primaryAgeGroup: setupData.ageGroup,
      hasCompletedSetup: true
    };

    const newSettings = {
      ...(squadSettings || {}),
      squadName: setupData.teamName || squadSettings?.squadName || 'My Squad',
      ageGroup: setupData.ageGroup || squadSettings?.ageGroup || 'U14'
    };

    // 2. Client-side Local Storage persistence (Mandatory)
    try {
      localStorage.setItem('inthepocket_setup_completed', 'true');
      localStorage.setItem('inthepocket_user_profile', JSON.stringify(updatedProfile));
      localStorage.setItem('inthepocket_squad_settings', JSON.stringify(newSettings));
      if (currentUser) {
        localStorage.setItem(getAppScopedKey('inthepocket_user_profile'), JSON.stringify(updatedProfile));
        localStorage.setItem(getAppScopedKey('inthepocket_squad_settings'), JSON.stringify(newSettings));
      }
    } catch (localStorageErr) {
      console.error("Critical: LocalStorage save failed during setup:", localStorageErr);
      showToast("Error saving setup locally. Please check browser storage permissions.");
      return;
    }

    // 3. Update React States to trigger navigation cleanly
    setSquadSettings(newSettings);
    setUserProfile(updatedProfile);

    // 4. Non-blocking Cloud Persistence (Firestore / Sandbox Sync)
    if (currentUser?.uid) {
      try {
        await updateUserProfile(currentUser.uid, updatedProfile);
        await updateSquadSettings(newSettings, currentUser.uid);
      } catch (cloudErr) {
        console.warn("Cloud sync failed during setup, offline fallback active:", cloudErr);
      }
    }

    // 5. Display success toast notification
    showToast(`Setup complete! App calibrated for ${setupData.teamName}`);
  };

  const hasCompletedSetup = (userProfile?.hasCompletedSetup === true) || 
    (typeof localStorage !== 'undefined' && (
      localStorage.getItem('inthepocket_setup_completed') === 'true' ||
      localStorage.getItem('inthepocket_user_profile')?.includes('"hasCompletedSetup":true')
    ));

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
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-secondary)' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
            <p>Loading module...</p>
          </div>
        </div>
      }>
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
              userProfile={userProfile}
              setActiveTab={setActiveTab}
              onToggleBottomNav={setHideGlobalNav}
            />
          )}
          {activeTab === 2 && (
            <TacticsBoard
              squad={squad}
              subscriptionTier={subscriptionTier}
              triggerPaywall={triggerPaywall}
              onHasUnsavedChangesChange={setTacticsHasUnsavedChanges}
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
              onToggleBottomNav={setHideGlobalNav}
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
      </Suspense>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentUser={currentUser}
        userProfile={userProfile}
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
        onReRunSetup={handleReRunSetup}
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
                    handleUpdateSubscriptionTier('ULTRA CLUB');
                    setPaywallFeature(null);
                    showToast("Simulated Upgrade: Welcome to ULTRA CLUB! You now have access to all of the amazing pro features in In The Pocket!");
                  }}
                  style={{ width: '100%', padding: '12px', borderColor: 'rgba(255, 183, 3, 0.4)', color: '#ffb703' }}
                >
                  Activate ULTRA CLUB Tier (Whole-of-Club License)
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
      {!hideGlobalNav && (
        <nav className="nav-bar">
          <button className={`nav-tab ${activeTab === 0 ? 'active-tab-0' : ''}`} onClick={() => handleNavTabSwitch(0)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span className="nav-tab-label">Players</span>
          </button>

          <button className={`nav-tab ${activeTab === 1 ? 'active-tab-1' : ''}`} onClick={() => handleNavTabSwitch(1)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <span className="nav-tab-label">Training Lab</span>
          </button>

          <button className={`nav-tab ${activeTab === 2 ? 'active-tab-2' : ''}`} onClick={() => handleNavTabSwitch(2)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
            <span className="nav-tab-label">Tactics Board</span>
          </button>

          <button className={`nav-tab ${activeTab === 4 ? 'active-tab-4' : ''}`} onClick={() => handleNavTabSwitch(4)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v18M17 3v18M3 8h4M3 13h4M3 18h4M17 8h4M17 13h4M17 18h4" />
            </svg>
            <span className="nav-tab-label">Video Analyser</span>
          </button>

          <button className={`nav-tab ${activeTab === 3 ? 'active-tab-3' : ''}`} onClick={() => handleNavTabSwitch(3)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a7 7 0 007-7h-2.128A3.001 3.001 0 0015 5h-6a3 3 0 00-1.872 1H5a7 7 0 007 7zm0 0v5m-4 0h8M5 8h2m10 0h2"/>
            </svg>
            <span className="nav-tab-label">Match Day</span>
          </button>

          <button className={`nav-tab ${activeTab === 5 ? 'active-tab-5' : ''}`} onClick={() => handleNavTabSwitch(5)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="nav-tab-label">Account</span>
          </button>
        </nav>
      )}
    </div>
  );
}
