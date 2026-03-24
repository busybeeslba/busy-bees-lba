-- Supabase Schema and Data Migration

DROP TABLE IF EXISTS public."users";
CREATE TABLE public."users" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT,
  "avatarUrl" TEXT,
  "phoneNumber" TEXT,
  "employeeId" TEXT,
  "role" TEXT,
  "status" TEXT
);

INSERT INTO public."users" ("id", "name", "email", "avatarUrl", "phoneNumber", "employeeId", "role", "status") VALUES ('u1', 'Alex Bee', 'alex@busybees.com', 'https://ui-avatars.com/api/?name=Alex+Bee&background=00E3BF&color=000', '+1 (555) 123-4567', 'BB-1001', 'field_worker', 'active');
INSERT INTO public."users" ("id", "name", "email", "avatarUrl", "phoneNumber", "employeeId", "role", "status") VALUES ('u2', 'Maria Santos', 'maria@busybees.com', 'https://ui-avatars.com/api/?name=Maria+Santos&background=CC026F&color=fff', '+1 (555) 234-5678', 'BB-1002', 'field_worker', 'active');
INSERT INTO public."users" ("id", "name", "email", "avatarUrl", "phoneNumber", "employeeId", "role", "status") VALUES ('u3', 'James Okafor', 'james@busybees.com', 'https://ui-avatars.com/api/?name=James+Okafor&background=00E3BF&color=000', '+1 (555) 345-6789', 'BB-1003', 'field_worker', 'offline');
INSERT INTO public."users" ("id", "name", "email", "avatarUrl", "phoneNumber", "employeeId", "role", "status") VALUES ('u4', 'Linda Chen', 'linda@busybees.com', 'https://ui-avatars.com/api/?name=Linda+Chen&background=CC026F&color=fff', '+1 (555) 456-7890', 'BB-1004', 'supervisor', 'active');

DROP TABLE IF EXISTS public."clients";
CREATE TABLE public."clients" (
  "name" TEXT,
  "kidsName" TEXT,
  "guardian" TEXT,
  "guardianLastName" TEXT,
  "dob" TEXT,
  "teacher" TEXT,
  "status" TEXT,
  "iepMeeting" TEXT,
  "services" JSONB,
  "assignedPrograms" TEXT,
  "programPercentage" TEXT,
  "addresses" JSONB,
  "phones" JSONB,
  "emails" JSONB,
  "id" NUMERIC PRIMARY KEY,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "programCategories" JSONB
);

INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id", "address", "phone", "email", "firstName", "lastName", "programCategories") VALUES ('Emma Rodriguez', 'Emma Rodriguez', 'Sofia', 'Rodriguez', '2017-03-12', 'Ms. Thompson', 'Active', '2026-04-10', '[{"serviceId":"SRV-7292","hours":"40h"},{"serviceId":"SRV-7688","hours":"20h"}]'::jsonb, 'We need to work with Emma on learning the colors, shapes, and numbers.', '0%', '[{"id":"1","value":"142 Maple Ave, Miami, FL 33101","type":"Home","isPrimary":true},{"id":"1771887703234","value":"Waco, KS 67060, United States of America","type":"Other","isPrimary":false}]'::jsonb, '[{"id":"1","value":"(305) 555-0192","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"sofia.rodriguez@email.com","type":"Personal","isPrimary":true}]'::jsonb, 1, '142 Maple Ave, Miami, FL 33101', '(305) 555-0192', 'sofia.rodriguez@email.com', 'Emma', 'Rodriguez', '[{"id":"TCHYM2","name":"Colors","targets":[{"id":"2LEWTF","name":"Red"},{"id":"9ZF32F","name":"green"},{"id":"Z3RVU4","name":"yellow"}]},{"id":"30E0WD","name":"Shapes","targets":[{"id":"JTXY7F","name":"Square"},{"id":"TYVCEZ","name":"Triangle"},{"id":"5K630L","name":"Circle"}]},{"id":"PN1VFD","name":"Daily Routine","targets":[{"id":"FRJGNM","name":"Walking into class"},{"id":"TVYX8C","name":"Washing hand"},{"id":"I2DGQH","name":"Eat breakfast"}]},{"id":"71Z20C","name":"Transition - Location","targets":[{"id":"ADOL69","name":"Cafeteria"},{"id":"FI9AUO","name":"GYM"},{"id":"5ZWELR","name":"211"},{"id":"L215WN","name":"Launch"},{"id":"ZYAAZ8","name":"Bus"}]}]'::jsonb);
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id", "firstName", "lastName", "programCategories") VALUES ('Liam Chen', 'Liam Chen', 'David', 'Chen', '2016-08-05', 'Mr. Patel', 'Active', '2026-03-18', '[{"serviceId":"SRV-1002","hours":"60h"},{"serviceId":"SRV-7019","hours":"30h"}]'::jsonb, 'Home ABA, Comp School ABA', '80%', '[{"id":"1","value":"78 Ocean Dr, Coral Gables, FL 33134","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"(786) 555-0341","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"david.chen@email.com","type":"Personal","isPrimary":true}]'::jsonb, 2, 'Liam', 'Chen', '[]'::jsonb);
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id") VALUES ('Ava Johnson', 'Ava Johnson', 'Michelle', 'Johnson', '2018-01-22', 'Ms. Rivera', 'Active', '2026-05-07', '[{"serviceId":"SRV-2311","hours":"25h"},{"serviceId":"SRV-2481","hours":"10h"}]'::jsonb, 'Social Skills, AAC Device', '55%', '[{"id":"1","value":"310 Palm Blvd, Hialeah, FL 33010","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"(305) 555-0487","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"michelle.johnson@email.com","type":"Personal","isPrimary":true}]'::jsonb, 3);
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id") VALUES ('Noah Williams', 'Noah Williams', 'James', 'Williams', '2015-11-30', 'Ms. Thompson', 'Active', '2026-06-15', '[{"serviceId":"SRV-4243","hours":"30h"},{"serviceId":"SRV-1001","hours":"50h"}]'::jsonb, 'PT, School ABA', '72%', '[{"id":"1","value":"55 SW 8th St, Miami, FL 33130","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"(305) 555-0213","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"james.williams@email.com","type":"Personal","isPrimary":true}]'::jsonb, 4);
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id") VALUES ('Isabella Martinez', 'Isabella Martinez', 'Carmen', 'Martinez', '2017-07-14', 'Mr. Patel', 'Active', '2026-03-25', '[{"serviceId":"SRV-7099","hours":"15h"},{"serviceId":"SRV-1003","hours":"20h"}]'::jsonb, 'Comp FCAT, BCBA Supervision', '45%', '[{"id":"1","value":"892 NW 7th Ave, Miami, FL 33136","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"(786) 555-0628","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"carmen.martinez@email.com","type":"Personal","isPrimary":true}]'::jsonb, 5);
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id") VALUES ('Ethan Brown', 'Ethan Brown', 'Robert', 'Brown', '2016-04-03', 'Ms. Rivera', 'Inactive', '2025-11-12', '[{"serviceId":"SRV-1002","hours":"40h"}]'::jsonb, 'Home ABA', '90%', '[{"id":"1","value":"1200 Brickell Ave, Miami, FL 33131","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"(305) 555-0755","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"robert.brown@email.com","type":"Personal","isPrimary":true}]'::jsonb, 6);
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id") VALUES ('Mia Thompson', 'Mia Thompson', 'Angela', 'Thompson', '2018-09-19', 'Ms. Thompson', 'Active', '2026-07-22', '[{"serviceId":"SRV-2311","hours":"35h"},{"serviceId":"SRV-1004","hours":"12h"}]'::jsonb, 'Social Skills, PCAT Training', '60%', '[{"id":"1","value":"430 Sunset Dr, South Miami, FL 33143","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"(305) 555-0891","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"angela.thompson@email.com","type":"Personal","isPrimary":true}]'::jsonb, 7);
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id") VALUES ('Lucas Garcia', 'Lucas Garcia', 'Elena', 'Garcia', '2015-05-28', 'Mr. Patel', 'Active', '2026-04-30', '[{"serviceId":"SRV-1001","hours":"60h"},{"serviceId":"SRV-5830","hours":"40h"}]'::jsonb, 'School ABA, Home ABA', '88%', '[{"id":"1","value":"2201 Collins Ave, Miami Beach, FL 33139","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"(786) 555-0174","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"elena.garcia@email.com","type":"Personal","isPrimary":true}]'::jsonb, 8);
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id") VALUES ('Sophia Davis', 'Sophia Davis', 'Brian', 'Davis', '2019-02-07', 'Ms. Rivera', 'Active', '2026-08-05', '[{"serviceId":"SRV-7292","hours":"50h"},{"serviceId":"SRV-4243","hours":"25h"}]'::jsonb, 'Speech, PT', '40%', '[{"id":"1","value":"615 NE 2nd Ave, Miami, FL 33132","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"(305) 555-0562","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"brian.davis@email.com","type":"Personal","isPrimary":true}]'::jsonb, 9);
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id") VALUES ('Oliver Lee', 'Oliver Lee', 'Jenny', 'Lee', '2016-12-15', 'Ms. Thompson', 'Active', '2026-02-28', '[{"serviceId":"SRV-2481","hours":"15h"},{"serviceId":"SRV-1003","hours":"18h"},{"serviceId":"SRV-7688","hours":"22h"}]'::jsonb, 'AAC Device, BCBA Supervision, OT', '75%', '[{"id":"1","value":"889 SW 27th Ave, Miami, FL 33135","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"(786) 555-0439","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"jenny.lee@email.com","type":"Personal","isPrimary":true}]'::jsonb, 10);
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id", "address", "phone", "email") VALUES ('Noam Nuri', 'Noam Nuri', 'Yosi', 'Nuri', '2015-06-23', 'Ms. K', 'Active', '2026-02-20', '[{"id":"1","serviceId":"SRV-2481","hours":"10h"},{"id":"1771887922663","serviceId":"SRV-4243","hours":"20h"},{"id":"1771887926348","serviceId":"SRV-7019","hours":"30"}]'::jsonb, 'Test Program', '0%', '[{"id":"1","value":"","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"917-664-2056","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"yosinuri@gmail.com","type":"Personal","isPrimary":true}]'::jsonb, 11, '', '917-664-2056', 'yosinuri@gmail.com');
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id", "address", "phone", "email") VALUES ('Nadav Nuri', 'Nadav Nuri', 'Keren', 'Kidron', '2019-04-29', 'Miss A', 'Active', '2026-01-01', '[{"id":"1","serviceId":"SRV-4243","hours":"5h"},{"id":"1771910359013","serviceId":"SRV-1002","hours":"26h"}]'::jsonb, 'This is a text for a simple program that was assigned to a client.
', '0%', '[{"id":"1","value":"6706 Old Stage Road, North Bethesda, MD 20852, United States of America","type":"Home","isPrimary":true}]'::jsonb, '[{"id":"1","value":"202-557-5569","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"kkidron@yahoo.com","type":"Personal","isPrimary":true}]'::jsonb, 12, '6706 Old Stage Road, North Bethesda, MD 20852, United States of America', '202-557-5569', 'kkidron@yahoo.com');
INSERT INTO public."clients" ("name", "kidsName", "guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "programPercentage", "addresses", "phones", "emails", "id", "address", "phone", "email") VALUES ('Emma Rodriguez', 'Emma Rodriguez', 'Sofia', 'Rodriguez', '2017-03-12', 'Ms. Thompson', 'Active', '2026-04-10', '[{"serviceId":"SRV-7292","hours":"40h"},{"serviceId":"SRV-7688","hours":"20h"}]'::jsonb, 'We need to work with Emma on learning the colors, shapes, and numbers.', '0%', '[{"id":"1","value":"142 Maple Ave, Miami, FL 33101","type":"Home","isPrimary":true},{"id":"1771887703234","value":"Waco, KS 67060, United States of America","type":"Other","isPrimary":false}]'::jsonb, '[{"id":"1","value":"(305) 555-0192","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"sofia.rodriguez@email.com","type":"Personal","isPrimary":true}]'::jsonb, 13, '142 Maple Ave, Miami, FL 33101', '(305) 555-0192', 'sofia.rodriguez@email.com');
INSERT INTO public."clients" ("guardian", "guardianLastName", "dob", "teacher", "status", "iepMeeting", "services", "assignedPrograms", "addresses", "phones", "emails", "id", "firstName", "lastName", "programCategories") VALUES ('Sofia', 'Rodriguez', '2017-03-12', 'Ms. Thompson', 'Active', '2026-04-10', '[{"serviceId":"SRV-7292","hours":"40h"},{"serviceId":"SRV-7688","hours":"20h"}]'::jsonb, 'We need to work with Emma on learning the colors, shapes, and numbers.', '[{"id":"1","value":"142 Maple Ave, Miami, FL 33101","type":"Home","isPrimary":true},{"id":"1771887703234","value":"Waco, KS 67060, United States of America","type":"Other","isPrimary":false}]'::jsonb, '[{"id":"1","value":"(305) 555-0192","type":"Mobile","isPrimary":true}]'::jsonb, '[{"id":"1","value":"sofia.rodriguez@email.com","type":"Personal","isPrimary":true}]'::jsonb, 14, 'Emma', 'Rodriguez', '[{"id":"TCHYM2","name":"Colors","targets":[{"id":"2LEWTF","name":"Red"},{"id":"9ZF32F","name":"green"},{"id":"Z3RVU4","name":"yellow"}]},{"id":"30E0WD","name":"Shapes","targets":[{"id":"JTXY7F","name":"Square"},{"id":"TYVCEZ","name":"Triangle"},{"id":"5K630L","name":"Circle"}]},{"id":"97TH1G","name":"Daily routine","targets":[{"id":"U0Z2E8","name":"Cafeteria"},{"id":"D3QTJG","name":"211"}]}]'::jsonb);

DROP TABLE IF EXISTS public."providers";
CREATE TABLE public."providers" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "color" TEXT,
  "textColor" TEXT
);

INSERT INTO public."providers" ("id", "name", "color", "textColor") VALUES ('p1', 'Busy Bees', '#FFF8E6', '#D97706');
INSERT INTO public."providers" ("id", "name", "color", "textColor") VALUES ('p2', 'So here', '#f6fa00', '#000000');
INSERT INTO public."providers" ("id", "name", "color", "textColor") VALUES ('p3', 'School', '#FFF8E6', '#D97706');

DROP TABLE IF EXISTS public."available_services";
CREATE TABLE public."available_services" (
  "id" TEXT PRIMARY KEY,
  "serviceId" TEXT,
  "name" TEXT,
  "provider" TEXT
);

INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-2481', 'SRV-2481', 'AAC Device', 'Busy Bees');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-2311', 'SRV-2311', 'Social Skills', 'Busy Bees');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-4243', 'SRV-4243', 'PT', 'Busy Bees');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-7688', 'SRV-7688', 'OT', 'Busy Bees');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-7292', 'SRV-7292', 'Speech', 'Busy Bees');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-7099', 'SRV-7099', 'Compensatory FCAT', 'Busy Bees');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-7019', 'SRV-7019', 'Compensatory School ABA', 'School');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-5830', 'SRV-5830', 'Compensatory Home ABA', 'Busy Bees');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-1001', 'SRV-1001', 'School Based ABA', 'School');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-1002', 'SRV-1002', 'Home Based ABA', 'Busy Bees');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-1003', 'SRV-1003', 'BCBA Supervision', 'Busy Bees');
INSERT INTO public."available_services" ("id", "serviceId", "name", "provider") VALUES ('SRV-1004', 'SRV-1004', 'PCAT Training', 'Busy Bees');

DROP TABLE IF EXISTS public."roles";
CREATE TABLE public."roles" (
  "id" NUMERIC PRIMARY KEY,
  "name" TEXT,
  "description" TEXT,
  "permissions" JSONB
);

INSERT INTO public."roles" ("id", "name", "description", "permissions") VALUES (1, 'Super Admin', 'Full access to all system features and configuration.', '{"mobileApp":"Full Control","webApp":"Full Control","services":"Full Control","clients":"Full Control","sessions":"Full Control","forms":"Full Control","reports":"Full Control","users":"Full Control"}'::jsonb);
INSERT INTO public."roles" ("id", "name", "description", "permissions") VALUES (2, 'Admin', 'Standard administrator with partial control over users.', '{"mobileApp":"Full Control","webApp":"Full Control","services":"Full Control","clients":"Full Control","sessions":"Full Control","forms":"Full Control","reports":"Full Control","users":"Full Control"}'::jsonb);
INSERT INTO public."roles" ("id", "name", "description", "permissions") VALUES (3, 'Technician', 'Field worker with read-only access to most modules.', '{"mobileApp":"Full Control","webApp":"Full Control","services":"Full Control","clients":"Full Control","sessions":"Full Control","forms":"Full Control","reports":"Full Control","users":"Full Control"}'::jsonb);
INSERT INTO public."roles" ("id", "name", "description", "permissions") VALUES (4, 'BCBA', 'The supervisor who created the program for the client.', '{"mobileApp":"Full Control","webApp":"Full Control","services":"Full Control","clients":"Full Control","sessions":"Full Control","forms":"Full Control","reports":"Full Control","users":"Full Control"}'::jsonb);
INSERT INTO public."roles" ("id", "name", "description", "permissions") VALUES (5, 'RBT', 'Entry level with certificate to experienced', '{"mobileApp":"Full Control","webApp":"Full Control","services":"Full Control","clients":"Full Control","sessions":"Full Control","forms":"Full Control","reports":"Full Control","users":"Full Control"}'::jsonb);
INSERT INTO public."roles" ("id", "name", "description", "permissions") VALUES (6, 'BT', 'Entry-level, no certificate employee.', '{"mobileApp":"Full Control","webApp":"Full Control","services":"Full Control","clients":"Full Control","sessions":"Full Control","forms":"Full Control","reports":"Full Control","users":"Full Control"}'::jsonb);

DROP TABLE IF EXISTS public."activity_feed";
CREATE TABLE public."activity_feed" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "user" TEXT,
  "action" TEXT,
  "target" TEXT,
  "time" TEXT,
  "type" TEXT
);

INSERT INTO public."activity_feed" ("id", "userId", "user", "action", "target", "time", "type") VALUES ('af1', 'u2', 'Maria Santos', 'completed session', 'Green Valley School', '2026-02-23T14:30:00.000Z', 'session_complete');
INSERT INTO public."activity_feed" ("id", "userId", "user", "action", "target", "time", "type") VALUES ('af2', 'u1', 'Alex Bee', 'uploaded a document', 'Work Order', '2026-02-23T10:15:00.000Z', 'document_upload');
INSERT INTO public."activity_feed" ("id", "userId", "user", "action", "target", "time", "type") VALUES ('af3', 'u1', 'Alex Bee', 'started a session', 'Acme Corp — North Branch', '2026-02-23T09:00:00.000Z', 'session_start');
INSERT INTO public."activity_feed" ("id", "userId", "user", "action", "target", "time", "type") VALUES ('af4', 'u3', 'James Okafor', 'clocked in', 'Metro Transit Authority', '2026-02-23T08:30:00.000Z', 'clock_in');

DROP TABLE IF EXISTS public."daily_routines";
CREATE TABLE public."daily_routines" (
  "clientId" TEXT,
  "clientName" TEXT,
  "program" TEXT,
  "rows" JSONB,
  "sessions" JSONB,
  "createdAt" TEXT,
  "id" NUMERIC PRIMARY KEY
);

INSERT INTO public."daily_routines" ("clientId", "clientName", "program", "rows", "sessions", "createdAt", "id") VALUES ('CLI-1', 'Emma Rodriguez', 'Daily Routine', '[{"step":"Walking into class"},{"step":"Washing hand"},{"step":"Eat breakfast"}]'::jsonb, '[{"day":1,"date":"2026-03-24","employeeName":"Alex Bee","employeeId":"BB-1001","results":{"0":"pass","1":"pass","2":"pass"}}]'::jsonb, '2026-03-24T16:19:17.973Z', 1);

DROP TABLE IF EXISTS public."transaction_sheets";
CREATE TABLE public."transaction_sheets" (
  "clientId" TEXT,
  "clientName" TEXT,
  "employeeId" TEXT,
  "employeeName" TEXT,
  "program" TEXT,
  "date" TEXT,
  "cellPhoneLocation" TEXT,
  "locations" JSONB,
  "id" NUMERIC PRIMARY KEY
);

INSERT INTO public."transaction_sheets" ("clientId", "clientName", "employeeId", "employeeName", "program", "date", "cellPhoneLocation", "locations", "id") VALUES ('1', 'Emma Rodriguez', '1', 'Sarah Connor', 'Colors', '2026-03-24', '', '[{"id":1,"name":"Classroom","transition":"+","delay":"No","delayTime":"","prompt":"Verbal","promptCount":"2","assistantNeeded":"Yes","food":"Snack","cwTaskAssigned":"Puzzle","cwTaskCompleted":"Yes","pgTaskAssigned":"Colors","pgTaskCompleted":"Yes","scheduleChange":"None","crisis":"No","transitionNote":"Smooth transition","promptNote":"Needed two verbal prompts","cwNote":"Finished puzzle fast","pgNote":"Got all colors right","scheduleNote":"","crisisNote":"","summaryExtra":"Great day overall."}]'::jsonb, 1);

