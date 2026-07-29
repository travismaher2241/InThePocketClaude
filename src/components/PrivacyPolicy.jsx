import React from 'react';
import LegalModal, { LegalSection, DraftNotice } from './LegalModal';

export default function PrivacyPolicy({ onClose }) {
  return (
    <LegalModal title="Privacy Policy" lastUpdated="29 Jul 2026" onClose={onClose}>
      <DraftNotice />

      <LegalSection title="What this app is">
        <p>In The Pocket ("the app") helps volunteer and club AFL coaches plan training sessions, manage a team roster, run tactics boards, track match day rotations, and review video. This policy explains what information the app collects and how it's used.</p>
      </LegalSection>

      <LegalSection title="Information we collect">
        <p><strong>Account information.</strong> If you sign up with email and password, we collect your email address via Firebase Authentication. If you use Tester Access, a nickname you choose is used to create a sandbox account instead of an email address.</p>
        <p><strong>Coach profile.</strong> Your name, team name, age group, and coaching experience level, entered during setup.</p>
        <p><strong>Squad/roster data.</strong> Player names, jersey numbers, positions, and any medical notes you enter for players on your team. This information is entered by the coach for team management purposes; the app does not collect this information directly from players, including junior players.</p>
        <p><strong>Training and match data.</strong> Generated training plans, session history, and match day statistics (attendance, scores, playing time) that you create while using the app.</p>
        <p><strong>Video clips.</strong> Video clips you import or record are stored locally on your device (in browser storage), not uploaded to our servers.</p>
        <p><strong>AI-assisted plan generation.</strong> When training-plan text refinement is used, a summary of the selected drills and session parameters (not player names or personal data) is sent to Google's Gemini API to generate coaching cue wording.</p>
      </LegalSection>

      <LegalSection title="How information is stored">
        <p>Account, profile, roster, and session data are stored using Firebase Authentication and Firestore (Google Cloud services). Some data is also cached on your device (browser local storage and IndexedDB) so the app works offline.</p>
      </LegalSection>

      <LegalSection title="How information is used">
        <p>We use the information you provide to run the app's features: building training plans, displaying your roster, tracking match day rotations, and saving your session history. We do not sell your information or use it for advertising.</p>
      </LegalSection>

      <LegalSection title="Subscription tiers (testing phase)">
        <p>During the current testing phase, subscription tiers (Free/Pro/Ultra/Ultra Club) are simulated for internal testing purposes only. No real payment is processed. This will be updated before any public release that includes real payments.</p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>You can update your coach profile and squad information at any time from within the app. You can request deletion of your account and associated data from Settings &gt; Delete My Account, or by contacting the app owner directly.</p>
      </LegalSection>

      <LegalSection title="Children's information">
        <p>The app is designed for coaches to manage teams that may include junior players. Player information (name, jersey number, medical notes) is entered by the coach, not collected directly from children. If you are a parent/guardian with concerns about information a coach has entered about your child, please contact the coach or club directly.</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Questions about this policy can be directed to the app owner.</p>
      </LegalSection>
    </LegalModal>
  );
}
