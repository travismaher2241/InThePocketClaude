import React, { useState } from 'react';

export default function SubscriptionPage({
  currentUser,
  subscriptionTier,
  onUpgrade,
  showToast,
  setActiveTab
}) {
  const [checkoutTier, setCheckoutTier] = useState(null); // 'Pro' | 'Ultra' | 'B2B'
  const [userName, setUserName] = useState('');
  
  const [successUpgrade, setSuccessUpgrade] = useState(null); // { tier, name }

  const handleOpenCheckout = (tier) => {
    const currentTierClean = (subscriptionTier || 'Free').toLowerCase();
    const targetTierClean = tier.toLowerCase();
    if (currentTierClean === targetTierClean) {
      showToast(`You are already subscribed to the ${subscriptionTier} tier.`);
      return;
    }
    setCheckoutTier(tier);
  };

  const handleProcessCheckout = (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      alert("Please enter your name.");
      return;
    }

    // Call global upgrade callback (updates Firestore)
    onUpgrade(checkoutTier);

    // Save success details to render custom welcome screen
    setSuccessUpgrade({
      tier: checkoutTier,
      name: userName.trim()
    });

    // Reset checkout states
    setCheckoutTier(null);
  };

  const currentTierClean = (subscriptionTier || 'Free').toLowerCase();

  const showProRecommended = currentTierClean === 'free';
  const showB2BRecommended = currentTierClean === 'ultra';

  const isProHighlighted = currentTierClean === 'free' || currentTierClean === 'pro';
  const isB2BHighlighted = currentTierClean === 'ultra';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', paddingBottom: '40px' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <div style={{ 
          display: 'inline-block',
          backgroundColor: 'rgba(217, 138, 50, 0.12)', 
          border: '1px solid rgba(217, 138, 50, 0.4)', 
          borderRadius: '20px', 
          padding: '4px 16px',
          color: '#d98a32',
          fontSize: '0.75rem',
          fontWeight: '800',
          letterSpacing: '0.06em',
          marginBottom: '10px'
        }}>
          ⚠️ TESTING / SIMULATION — NO REAL PAYMENT
        </div>
        <h2 className="scoreboard-font" style={{ color: 'var(--color-video)', margin: 0, fontSize: '1.8rem', letterSpacing: '0.05em' }}>ACCOUNT & SUBSCRIPTION COMMAND</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '600px', margin: '6px auto' }}>
          Simulated subscription tiers and feature gating for friends-and-family testing. Select a tier to test gated capabilities.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        width: '100%',
        marginTop: '10px'
      }}>
        
        {/* FREE TIER CARD */}
        <div style={{
          backgroundColor: '#14120f',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s ease-in-out'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.1em' }}>THE STARTER KIT</span>
            <h3 className="scoreboard-font" style={{ fontSize: '1.6rem', color: '#ffffff', margin: '4px 0 12px 0' }}>FREE</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '16px' }}>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>$0</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>/ forever</span>
            </div>

            {/* Included Features */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#6b8e4e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                INCLUDED FEATURES:
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.83rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Master Team Hub</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Roster Import</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Basic Match Lineups</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> 2 Free AI Generations (Lifetime)</li>
              </ul>
            </div>

            {/* Missing Features */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c1443b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                🔒 MISSING IN FREE PLAN:
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(193, 68, 59, 0.08)', border: '1px solid rgba(193, 68, 59, 0.2)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.78rem', color: '#c1443b' }}>
                  <span>❌ AI Training Suite</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(193, 68, 59, 0.3)', color: '#ffffff' }}>PRO</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(193, 68, 59, 0.08)', border: '1px solid rgba(193, 68, 59, 0.2)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.78rem', color: '#c1443b' }}>
                  <span>❌ Custom Playbook Upload</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(193, 68, 59, 0.3)', color: '#ffffff' }}>PRO</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(193, 68, 59, 0.08)', border: '1px solid rgba(193, 68, 59, 0.2)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.78rem', color: '#c1443b' }}>
                  <span>❌ Tactics Board Canvas</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(107, 142, 78, 0.3)', color: '#ffffff' }}>ULTRA</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(193, 68, 59, 0.08)', border: '1px solid rgba(193, 68, 59, 0.2)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.78rem', color: '#c1443b' }}>
                  <span>❌ Live FootyFlow Clock</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(107, 142, 78, 0.3)', color: '#ffffff' }}>ULTRA</span>
                </li>
              </ul>
            </div>
          </div>

          <button 
            disabled={currentTierClean === 'free'}
            onClick={() => onUpgrade('Free')}
            className="btn"
            style={{ width: '100%', padding: '12px', borderColor: 'rgba(255,255,255,0.1)', cursor: currentTierClean === 'free' ? 'default' : 'pointer' }}
          >
            {currentTierClean === 'free' ? 'Active Plan' : 'Downgrade to Free'}
          </button>
        </div>

        {/* PRO TIER CARD */}
        <div style={isProHighlighted ? {
          backgroundColor: '#1c1913',
          border: '2px solid #c1443b',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 8px 30px rgba(193, 68, 59, 0.15)',
          transform: 'scale(1.02)',
          transition: 'all 0.3s ease'
        } : {
          backgroundColor: '#14120f',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          transform: 'none',
          transition: 'all 0.3s ease'
        }}>
          {showProRecommended && (
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#c1443b',
              color: '#ffffff',
              padding: '2px 12px',
              borderRadius: '12px',
              fontSize: '0.65rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              zIndex: 5
            }}>
              RECOMMENDED
            </div>
          )}
          <div>
            <span style={{ fontSize: '0.7rem', color: '#c1443b', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.1em' }}>THE COACHING ENGINE</span>
            <h3 className="scoreboard-font" style={{ fontSize: '1.6rem', color: '#ffffff', margin: '4px 0 12px 0' }}>PRO</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '16px' }}>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>$9.99</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>/ month</span>
            </div>

            {/* Included Features */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#6b8e4e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                INCLUDED FEATURES:
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.83rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Full AI Training Suite</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Unlimited AI Sessions</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Late-Arrival Calculations</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Upload Custom Club Playbook</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Master Team Hub & Roster</li>
              </ul>
            </div>

            {/* Missing Features */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c1443b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                🔒 MISSING IN PRO PLAN:
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(193, 68, 59, 0.08)', border: '1px solid rgba(193, 68, 59, 0.2)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.78rem', color: '#c1443b' }}>
                  <span>❌ Tactics Board Canvas</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(107, 142, 78, 0.3)', color: '#ffffff' }}>ULTRA</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(193, 68, 59, 0.08)', border: '1px solid rgba(193, 68, 59, 0.2)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.78rem', color: '#c1443b' }}>
                  <span>❌ Live FootyFlow Clock</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(107, 142, 78, 0.3)', color: '#ffffff' }}>ULTRA</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(193, 68, 59, 0.08)', border: '1px solid rgba(193, 68, 59, 0.2)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.78rem', color: '#c1443b' }}>
                  <span>❌ Playbook Multi-Export</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(107, 142, 78, 0.3)', color: '#ffffff' }}>ULTRA</span>
                </li>
              </ul>
            </div>
          </div>

          <button 
            onClick={() => handleOpenCheckout('Pro')}
            className={isProHighlighted ? "btn btn-primary" : "btn"}
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontWeight: '700',
              ...(isProHighlighted ? { backgroundColor: '#c1443b', borderColor: '#c1443b' } : { borderColor: 'rgba(255, 255, 255, 0.1)' })
            }}
          >
            {currentTierClean === 'pro' ? 'Active Plan' : 'Upgrade Pro Now'}
          </button>
        </div>

        {/* ULTRA TIER CARD */}
        <div style={{
          backgroundColor: '#14120f',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-training)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.1em' }}>MATCH DAY & TACTICS</span>
            <h3 className="scoreboard-font" style={{ fontSize: '1.6rem', color: '#ffffff', margin: '4px 0 12px 0' }}>ULTRA</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '16px' }}>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>$19.99</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>/ month</span>
            </div>

            {/* Included Features */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#6b8e4e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                INCLUDED FEATURES:
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.83rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Full Tactics Board Canvas</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Multi-frame Playbook Export</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Live FootyFlow Rotation Clock</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> High-res Lineup Downloads</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Unlimited AI & Playbook Generator</li>
              </ul>
            </div>

            {/* Missing Features */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c1443b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                🔒 MISSING IN ULTRA PLAN:
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(217, 138, 50, 0.08)', border: '1px solid rgba(217, 138, 50, 0.2)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.78rem', color: '#d98a32' }}>
                  <span>❌ Committee Multi-Coach Pass</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(217, 138, 50, 0.3)', color: '#100f0b' }}>CLUB</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(217, 138, 50, 0.08)', border: '1px solid rgba(217, 138, 50, 0.2)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.78rem', color: '#d98a32' }}>
                  <span>❌ Centralized Club Roster Sync</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(217, 138, 50, 0.3)', color: '#100f0b' }}>CLUB</span>
                </li>
              </ul>
            </div>
          </div>

          <button 
            onClick={() => handleOpenCheckout('Ultra')}
            className="btn btn-match"
            style={{ width: '100%', padding: '12px', fontWeight: '700' }}
          >
            {currentTierClean === 'ultra' ? 'Active Plan' : 'Upgrade Ultra Now'}
          </button>
        </div>

        {/* ULTRA CLUB TIER CARD */}
        <div style={isB2BHighlighted ? {
          backgroundColor: '#1c1812',
          border: '2px solid #d98a32',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 8px 30px rgba(217, 138, 50, 0.15)',
          transform: 'scale(1.02)',
          transition: 'all 0.3s ease'
        } : {
          backgroundColor: '#14120f',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          transform: 'none',
          transition: 'all 0.3s ease'
        }}>
          {showB2BRecommended && (
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#d98a32',
              color: '#100f0b',
              padding: '2px 12px',
              borderRadius: '12px',
              fontSize: '0.65rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              zIndex: 5
            }}>
              RECOMMENDED
            </div>
          )}
          <div>
            <span style={{ fontSize: '0.7rem', color: '#d98a32', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.1em' }}>WHOLE-OF-CLUB LICENSE</span>
            <h3 className="scoreboard-font" style={{ fontSize: '1.6rem', color: '#ffffff', margin: '4px 0 12px 0' }}>ULTRA CLUB</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '16px' }}>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>$49.99</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>/ month</span>
            </div>

            {/* Included Features */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#6b8e4e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                INCLUDED FEATURES:
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.83rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Bulk License for Committees</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Covers Junior Divisions U8-U18</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Ultra Pass for All Coaches</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Centralized Roster Imports</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#6b8e4e' }}>✔️</span> Tactics Board, Playbooks & Clock</li>
              </ul>
            </div>

            {/* Missing Features */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#d98a32', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                ⭐ ALL-ACCESS PACKAGE:
              </span>
              <div style={{ backgroundColor: 'rgba(217, 138, 50, 0.08)', border: '1px solid rgba(217, 138, 50, 0.2)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.78rem', color: '#d98a32', fontWeight: '600' }}>
                🎉 Nothing missing! Includes 100% of Ultra & Pro features for all team coaches.
              </div>
            </div>
          </div>

          <button 
            onClick={() => handleOpenCheckout('ULTRA CLUB')}
            className={isB2BHighlighted ? "btn btn-match" : "btn"}
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontWeight: '700',
              color: '#d98a32',
              borderColor: 'rgba(217, 138, 50, 0.4)',
              ...(isB2BHighlighted ? { backgroundColor: '#d98a32', color: '#100f0b', borderColor: '#d98a32' } : {})
            }}
          >
            {currentTierClean === 'b2b' || currentTierClean === 'ultra club' || currentTierClean === 'ultra- club' || currentTierClean === 'ultra-club' ? 'Active Plan' : 'Purchase Ultra Club'}
          </button>
        </div>

      </div>

      {/* Comparison Table Section */}
      <div style={{
        backgroundColor: '#14120f',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginTop: '20px'
      }}>
        <h3 className="scoreboard-font" style={{ color: '#ffffff', margin: 0, fontSize: '1.2rem', letterSpacing: '0.05em', textAlign: 'center' }}>
          DETAILED TIER COMPARISON & FEATURE GAPS
        </h3>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem',
            color: '#ffffff',
            textAlign: 'left'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '16px 12px', fontWeight: '700', color: 'var(--text-secondary)' }}>FEATURE / CAPABILITY</th>
                <th style={{ padding: '16px 12px', fontWeight: '700', textAlign: 'center' }}>FREE</th>
                <th style={{ padding: '16px 12px', fontWeight: '700', textAlign: 'center', color: '#c1443b' }}>PRO ($9.99)</th>
                <th style={{ padding: '16px 12px', fontWeight: '700', textAlign: 'center', color: 'var(--color-training)' }}>ULTRA ($19.99)</th>
                <th style={{ padding: '16px 12px', fontWeight: '700', textAlign: 'center', color: '#d98a32' }}>ULTRA- CLUB ($49.99)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '14px 12px', fontWeight: '600' }}>Master Team Hub & Roster Import</td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '14px 12px', fontWeight: '600' }}>AI Training Generations & Sessions</td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>🔒 Max 2 Generations</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Unlimited</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Unlimited</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Unlimited</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '14px 12px', fontWeight: '600' }}>Late-Arrival Calculations</td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>❌ Locked (Needs Pro)</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '14px 12px', fontWeight: '600' }}>Custom Playbook Upload</td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>❌ Locked (Needs Pro)</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '14px 12px', fontWeight: '600' }}>Interactive Tactics Board Canvas</td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>❌ Locked (Needs Ultra)</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>❌ Locked (Needs Ultra)</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '14px 12px', fontWeight: '600' }}>Live FootyFlow Rotation Clock</td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>❌ Locked (Needs Ultra)</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>❌ Locked (Needs Ultra)</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '14px 12px', fontWeight: '600' }}>Junior Committee Multi-Coach Pass</td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>❌ Locked (Needs ULTRA- CLUB)</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>❌ Locked (Needs ULTRA- CLUB)</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>❌ Locked (Needs ULTRA- CLUB)</span></td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}><span style={{ backgroundColor: 'rgba(217, 138, 50, 0.15)', color: '#d98a32', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>✔️ Included (U8-U18)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated Stripe/Checkout Modal */}
      {checkoutTier && (
        <div className="overlay-backdrop" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="scoreboard-font" style={{ fontSize: '1.2rem', color: '#ffffff', margin: 0 }}>
                SIMULATION CHECKOUT — {checkoutTier} TIER
              </h3>
              <button className="icon-btn" onClick={() => setCheckoutTier(null)} aria-label="Close">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleProcessCheckout} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              
              <div style={{ 
                backgroundColor: 'rgba(217, 138, 50, 0.12)', 
                border: '1px solid rgba(217, 138, 50, 0.4)', 
                borderRadius: '8px', 
                padding: '12px',
                color: '#d98a32',
                fontSize: '0.82rem',
                textAlign: 'center',
                fontWeight: '700',
                letterSpacing: '0.04em'
              }}>
                ⚠️ TESTING / SIMULATION — NO REAL PAYMENT REQUIRED
              </div>

              <p style={{ fontSize: '0.88rem', color: '#d6cdbc', lineHeight: '1.5', margin: 0 }}>
                This build uses simulated payment flows for friends-and-family testing. Activating this simulated tier will grant full access to tier-restricted features without charging any real payment card.
              </p>

              <div className="form-group">
                <label>Tester Name / Coach Name</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Coach Travis" 
                  required 
                  autoFocus
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  marginTop: '8px',
                  backgroundColor: checkoutTier === 'B2B' || checkoutTier === 'ULTRA CLUB' ? '#d98a32' : '#c1443b',
                  borderColor: checkoutTier === 'B2B' || checkoutTier === 'ULTRA CLUB' ? '#d98a32' : '#c1443b',
                  color: checkoutTier === 'B2B' || checkoutTier === 'ULTRA CLUB' ? '#14120f' : '#ffffff'
                }}
              >
                Activate Simulated {checkoutTier} Tier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Celebration Welcome Modal */}
      {successUpgrade && (
        <div className="overlay-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(107, 142, 78, 0.1)',
                border: '2.5px solid #6b8e4e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b8e4e',
                fontSize: '1.8rem',
                marginBottom: '10px'
              }}>
                🎉
              </div>

              <h3 className="scoreboard-font" style={{ fontSize: '1.5rem', color: '#6b8e4e', margin: 0 }}>
                UPGRADE SUCCESSFUL
              </h3>
              
              <p style={{
                fontSize: '1rem',
                color: '#ffffff',
                lineHeight: '1.5',
                margin: '10px 0',
                fontWeight: '600'
              }}>
                welcome to {successUpgrade.tier} "{successUpgrade.name}". You now have access to all of the amazing pro features in In The Pocket!
              </p>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Your subscription is now active on Firestore. You can start creating unlimited training plans, building playbook tactics, and executing rotations immediately.
              </p>

              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setSuccessUpgrade(null);
                  setActiveTab(1); // Redirect to Training Lab
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  marginTop: '10px',
                  backgroundColor: '#c1443b',
                  borderColor: '#c1443b'
                }}
              >
                Go to Training Lab
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
