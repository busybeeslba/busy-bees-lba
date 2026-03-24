Build the Busy Bees LBA Mobile App FRONT-END ONLY using React Native + Expo (TypeScript).

IMPORTANT RULES:
- UI + navigation + local state only.
- NO backend, NO database, NO API calls.
- NO real GPS tracking (simulate GPS status + mock coordinates only).
- NO real PDF generation (simulate “Generated PDF” items only).
- Match the uploaded Stitch design code + images as closely as possible.

TECH:
- Expo + React Native (TypeScript)
- React Navigation (Stack + Bottom Tabs)
- Use clean reusable components (Button, Card, Badge, Input, Modal)

NAVIGATION STRUCTURE:
AuthStack:
- LoginScreen

MainTabs:
- DashboardScreen
- HistoryScreen
- SettingsScreen

Extra Stack Screens:
- SessionDetailsScreen (active session)
- DocumentTemplatePickerModal
- DocumentFormScreen
- CompleteSessionScreen
- SessionCompletedScreen
- HistoryDetailsScreen

SCREENS REQUIREMENTS:

1) LoginScreen
- Buttons:
  - “Continue with Google” => enter app (mock login)
  - “Sign in with Biometrics” => enter app (mock login)

2) DashboardScreen
- Show header with user name + avatar + bell icon
- Big button: “START NEW SESSION” => go to SessionDetailsScreen
- Live Tracking card:
  - map placeholder container (no real maps needed)
  - show “GPS ACTIVE” badge during active session
  - show mock coordinates + accuracy

3) SessionDetailsScreen (Active Session)
- Client dropdown (mock list)
- Service Type dropdown (mock list)
- Live running timer (HH:MM:SS)
- Notes / Session Summary input
- Documents section:
  - list generated PDFs
  - “Add a Document” button => open DocumentTemplatePickerModal
- “End Session” button => go to CompleteSessionScreen

4) DocumentTemplatePickerModal
- Templates list (mock):
  - Site Assessment
  - Maintenance Checklist
  - Work Completion Report
- Select template => go to DocumentFormScreen(templateType)

5) DocumentFormScreen
- Show form fields based on templateType (simple dynamic form is OK)
- Validate required fields
- Button “Generate PDF”
  - creates a mock PDF record in session state (ex: “site_assessment.pdf”)
  - return to SessionDetailsScreen

6) CompleteSessionScreen
- Signature capture area:
  - use a simple “Signed” toggle/button OR signature pad library
- “Complete Session” button disabled until signed
- On complete => SessionCompletedScreen
- Save session into completedSessions state and clear active session

7) SessionCompletedScreen
- Success UI “Session Completed!”
- Show summary card: client, service, duration
- Buttons:
  - Return to Dashboard
  - View in History

8) HistoryScreen
- Search bar (client/service)
- List completed sessions (include newly completed session)
- Tap => HistoryDetailsScreen

9) HistoryDetailsScreen
- Show: client, service, duration, notes
- Documents list (PDF items)
- Signature status + signed time

10) SettingsScreen
- Profile card (mock data)
- Dark mode toggle (UI only)
- Logout button => back to LoginScreen + clear local state

STATE MANAGEMENT:
Use Zustand or React Context to store:
- currentUser
- activeSession (draft)
- completedSessions[]
- documents[]
- signature status
Timer should be based on session startTime.

DELIVERABLE:
- A working Expo app that runs with `npx expo start`
- All screens connected + functional UI flow
- No backend code
