import React from 'react';
import LegalModal, { LegalSection, DraftNotice } from './LegalModal';

export default function TermsOfService({ onClose }) {
  return (
    <LegalModal title="Terms of Service" lastUpdated="29 Jul 2026" onClose={onClose}>
      <DraftNotice />

      <LegalSection title="Testing phase">
        <p>In The Pocket is currently in a testing/friends-and-family phase. Features, pricing, and data handling may change before a public release. Tester Access accounts and simulated subscription tiers exist specifically to support this testing phase.</p>
      </LegalSection>

      <LegalSection title="Simulated subscriptions">
        <p>Any "upgrade" to Pro, Ultra, or Ultra Club shown in the app during this testing phase is simulated and does not involve a real payment. It exists to let testers try tier-gated features. No money changes hands, and no real subscription is created.</p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>You're responsible for the accuracy of information you enter, including player roster and medical information. Keep your login details secure. You can request deletion of your account and data at any time from Settings.</p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>Use the app to manage your own team's coaching activities. Don't use it to store or share information you don't have the right to share, or in a way that could harm another user or the service.</p>
      </LegalSection>

      <LegalSection title="AI-generated content">
        <p>Training plans and coaching cues generated with AI assistance are suggestions to support your coaching, not a substitute for your own judgment, official coaching accreditation, or first-aid/medical training. Always apply your own knowledge of your players and follow your club/league's safety guidelines.</p>
      </LegalSection>

      <LegalSection title="No warranty">
        <p>The app is provided during an active testing phase "as is," without warranty of any kind. It may contain bugs, and features may change or be removed.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>These terms may be updated as the app develops toward a public release. Continued use of the app after an update means you accept the revised terms.</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Questions about these terms can be directed to the app owner.</p>
      </LegalSection>
    </LegalModal>
  );
}
