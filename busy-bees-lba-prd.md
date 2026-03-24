# Busy Bees LBA Project — PRD (MVP v1.0)

**Product Name:** Busy Bees LBA Workforce Portal  
**Platforms:** iOS + Android + Web Admin Portal  
**Version:** MVP v1.0 (Locked Scope)  
**Owner:** Yosi Nuri  
**Goal:** Track technician sessions with time + GPS and generate standardized PDF documents.

---

## 1) Product Overview
Busy Bees LBA is a workforce tracking system that allows field agents/technicians to:

- Start and end work sessions  
- Track GPS location while session is active  
- Generate session documents from templates (form → PDF)  
- Capture session duration automatically  
- Collect client signature before completion  
- View history of completed sessions  
- Allow managers/admins to see live sessions and technician locations in a Web App

---

## 2) Problem Statement
Field teams currently do not have a simple way to:

- Prove where a technician was during the job  
- Track accurate time per client/session  
- Generate consistent service documentation  
- Monitor technician location in real-time during active work  

This creates billing disputes, incomplete reporting, and limited operational visibility.

---

## 3) Goals (MVP)
### Primary Goals
1. Track time per session  
2. Track GPS route during session  
3. Show live technician location in Web App  
4. Store session details + generated PDF documents + signature  
5. Provide history log for admins and technicians  

### Non-Goals (Not in MVP)
- Payroll calculations  
- Automatic invoicing  
- Scheduling system  
- Offline mode  
- Admin template builder (create/edit document templates in web)  

---

## 4) User Roles
### Technician (Mobile App)
- Logs in
- Starts a session
- Adds notes (optional)
- Adds documents (template → form → PDF)
- Captures client signature
- Ends session
- Views session history

### Admin/Manager (Web App)
- Views active sessions live
- Views session history for all agents
- Views generated PDFs
- Views signatures and notes

---

## 5) Locked MVP Checklist (P0 Must-Have)

### Authentication
- Google SSO login (Continue with Google)
- Optional biometric sign-in (FaceID/Fingerprint)
- Logout option in Settings

### Session Tracking
- Start Session (Clock In)
- Select Client (dropdown)
- Select Service Type (dropdown)
- Live timer while session is active
- End Session (Clock Out)
- Session duration saved automatically

### GPS Tracking
- GPS tracking starts when session starts
- GPS tracking stops when session ends
- Store location points: latitude, longitude, timestamp, accuracy
- Show "GPS Active" indicator

### Documents (Template → Form → PDF)
- Add Document button
- Select document template from list
- Show dynamic form fields based on template
- Validate required fields
- Generate PDF from form data
- Display generated PDF in session
- PDFs viewable in Mobile + Web

### Client Signature
- Signature capture box
- Clear signature button
- Signature required to complete session
- Store signature file + signed timestamp

### Session Summary
- Notes field for technician (optional)
- Notes stored in session details

### Mobile Screens (MVP)
- Login
- Dashboard (Start Session + Live Tracking map)
- Session Details (Active)
- Complete Session (Signature)
- Session Completed screen
- History list
- History details view
- Settings/Profile screen

### Web Portal Screens (MVP)
- Live Tracking dashboard (map)
- Active sessions list
- Session history list
- Session detail view (notes + PDF docs + signature)

---

## 6) Out of Scope (Explicitly NOT in MVP)
- Uploading external documents/photos
- Offline mode
- Scheduling / calendar
- Payroll / billing / invoicing
- Admin template builder
- Multi-step approvals
- Advanced permissions beyond Admin vs Technician

---

## 7) Feature Requirements (Detailed)

### 7.1 Authentication
**Requirements**
- Sign in with Google
- Maintain login session
- Logout option
- Optional biometric sign-in after first login

---

### 7.2 Start Session
**User Flow**
Dashboard → Start New Session → Select Client + Service Type → Start

**Captured Data**
- Technician ID
- Client ID
- Service Type
- Start timestamp
- Start GPS coordinate (first GPS point)

---

### 7.3 Active Session GPS Tracking
**Description**
When a session is active, the app tracks location periodically and stores the route.

**Requirements**
- Start tracking when session starts
- Stop tracking when session ends
- Each location point stores:
  - latitude
  - longitude
  - timestamp
  - accuracy
- GPS indicator visible in UI

---

### 7.4 Time Capture
**Requirements**
- Start time auto saved
- End time auto saved
- Duration auto calculated
- Duration displayed during session

---

### 7.5 Documents (Template-Based PDF Generation)
**Description**
Agents do not upload external files.  
Agents choose a document type from a controlled list, fill a form, and the system generates a PDF.

**User Flow**
Session Details → Add Document → Select Template → Fill Fields → Save → PDF generated

**Requirements**
- Document templates list (predefined)
- Dynamic form per template
- Required field validation
- Store:
  - template type
  - form data (JSON)
  - pdf url
  - created timestamp
- Generated PDF visible on Mobile and Web

**Constraints**
- No photo uploads
- No external file uploads (PDF/JPG/etc.)

---

### 7.6 Client Signature
**Requirements**
- Signature required to complete session
- Clear signature option
- Store signature file + timestamp
- Display signature in session details

---

### 7.7 End Session + Completion
**User Flow**
End Session → Validate signature → Save session → Show success screen

**Requirements**
- Cannot complete without signature
- Session status becomes "Completed"
- Confirmation screen:
  - Return to Dashboard
  - View in History

---

### 7.8 Session History (Mobile)
**Requirements**
- Show list of sessions grouped by date
- Each item shows:
  - Client name
  - Service type
  - Duration
  - Status (Completed)
- View session details

---

### 7.9 Web Admin Portal — Live Tracking
**Requirements**
- Show map with active technicians
- Show active session list with:
  - technician name
  - client name
  - start time
  - elapsed time
- Live updates without refresh (WebSocket preferred)

---

### 7.10 Web Admin Portal — Session History
**Requirements**
- View completed sessions list
- Open session details:
  - notes
  - duration
  - generated PDFs
  - signature
  - route points (optional display in MVP)

---

## 8) Data Model (MVP)

### User
- id
- name
- email
- role (technician/admin)

### Client
- id
- name
- branch/location

### Session
- id
- user_id
- client_id
- service_type
- start_time
- end_time
- duration_seconds
- status (active/completed)
- notes
- signature_url
- signed_by
- signed_at

### SessionLocationPoint
- id
- session_id
- lat
- lng
- accuracy
- timestamp

### GeneratedDocument
- id
- session_id
- template_type
- form_data_json
- pdf_url
- created_at

---

## 9) MVP Acceptance Criteria (Launch Gate)
MVP is complete when:

- Technician can start and complete a session end-to-end
- GPS points are recorded during active session
- Session duration is saved correctly
- Document templates generate PDF successfully
- Signature is required and saved
- Admin can view active technicians live on web
- Admin can view completed sessions with documents + signature

---

## 10) Future Enhancements (Phase 2+)
- Offline mode + auto sync
- Route playback (timeline replay)
- Admin template builder (create/edit forms)
- Export reports (CSV/PDF)
- Advanced roles/permissions
- Alerts (agent stopped moving, long idle, etc.)

---
