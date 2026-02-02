-- migrate:up

-- ============================================
-- AUTH SCHEMA DATA - INSERT STATEMENTS
-- ============================================

-- Insert User Data
-- Note: This user is self-referencing (created_by references itself)
INSERT INTO interview."user" (id, is_active, full_name, email, password_hash, recovery_token, recovery_timestamp, is_email_verified, created_at, created_by, entity_id, default_plant_id) VALUES
('550e8400-e29b-41d4-a716-446655440000', true, 'Test User', 'test@mail.com', 'e7775b3d7b72e2d6f322f2d09b16bacff6b1b5525201c24470adb80ddf5011179f777b3d78440dfba1b049958ca1a46a696bc91ade88d9d19959d0f16d6a26c9.fbc1b6bcf9c0bccb7b10acd214afd7a8', NULL, NULL, false, 1759594686361, '550e8400-e29b-41d4-a716-446655440000', 'd61c0acc-a850-424a-93c6-ef974ecbe9bc', 'b9062054-9da3-43d6-81ea-4fa80f6f41d7');

-- Insert Role Data
INSERT INTO interview.role (id, name, description, created_at, created_by) VALUES
('fb13a854-5601-49c3-8ca1-1bb0271db95b', 'operator', 'Plant floor operator', 1759594863739, '550e8400-e29b-41d4-a716-446655440000'),
('253fade7-68df-4151-86c2-dc35420d1333', 'supervisor', 'Line supervisor', 1759594863739, '550e8400-e29b-41d4-a716-446655440000'),
('ce7a8d73-4e58-4c87-8549-62a72d308ef5', 'qa_analyst', 'Quality analyst', 1759594863739, '550e8400-e29b-41d4-a716-446655440000'),
('c5bb875d-97de-4539-9425-cf4c5b9050d0', 'maintenance', 'Maintenance technician', 1759594863739, '550e8400-e29b-41d4-a716-446655440000'),
('246cf3cd-667b-4ac2-b104-bcb99bd12d38', 'admin', 'System administrator', 1759594863739, '550e8400-e29b-41d4-a716-446655440000');

-- Insert Permission Data
INSERT INTO interview.permission (id, resource, action, description, created_at, created_by) VALUES
('e14a3abd-5c54-40f2-96fb-0a95e3b61279', 'batch', 'view', 'View batch details', 1759594923742, '550e8400-e29b-41d4-a716-446655440000'),
('a9d194b2-e9fb-409e-8d80-d886edccfcbb', 'batch', 'start', 'Start a production batch', 1759594923742, '550e8400-e29b-41d4-a716-446655440000'),
('b1ff2215-abf8-4efa-9ce5-697c9734ebf7', 'batch', 'close', 'Close/complete a batch', 1759594923742, '550e8400-e29b-41d4-a716-446655440000'),
('2f0f204f-b9c8-4aae-82f7-dad1c3044ff6', 'process_step', 'execute', 'Execute a process step', 1759594923742, '550e8400-e29b-41d4-a716-446655440000'),
('6f7f00a6-f2ea-4050-be78-f4075f95cb4c', 'process_step', 'record', 'Record step parameters', 1759594923742, '550e8400-e29b-41d4-a716-446655440000'),
('8f01342e-d2b2-4777-82c8-6fae5708b91b', 'qc_test', 'record', 'Record QC test result', 1759594923742, '550e8400-e29b-41d4-a716-446655440000'),
('249cf7c6-97a6-4386-9501-5f31fbf0c252', 'qc_test', 'approve', 'Approve QC test result', 1759594923742, '550e8400-e29b-41d4-a716-446655440000'),
('aa6cd436-8dfe-4822-8e79-e45055a62bd4', 'equipment', 'maintain', 'Record maintenance', 1759594923742, '550e8400-e29b-41d4-a716-446655440000'),
('cb0ffa62-9d66-4282-9a45-d3f4cf21cd76', 'equipment', 'view', 'View equipment', 1759595007306, '550e8400-e29b-41d4-a716-446655440000');

-- Insert User-Role Relationships
INSERT INTO interview.user_role (user_id, role_id) VALUES
('550e8400-e29b-41d4-a716-446655440000', '246cf3cd-667b-4ac2-b104-bcb99bd12d38'),
('550e8400-e29b-41d4-a716-446655440000', '253fade7-68df-4151-86c2-dc35420d1333');

-- Insert Role-Permission Relationships
INSERT INTO interview.role_permission (role_id, permission_id) VALUES
-- admin role (all permissions)
('246cf3cd-667b-4ac2-b104-bcb99bd12d38', '249cf7c6-97a6-4386-9501-5f31fbf0c252'),
('246cf3cd-667b-4ac2-b104-bcb99bd12d38', '2f0f204f-b9c8-4aae-82f7-dad1c3044ff6'),
('246cf3cd-667b-4ac2-b104-bcb99bd12d38', '6f7f00a6-f2ea-4050-be78-f4075f95cb4c'),
('246cf3cd-667b-4ac2-b104-bcb99bd12d38', '8f01342e-d2b2-4777-82c8-6fae5708b91b'),
('246cf3cd-667b-4ac2-b104-bcb99bd12d38', 'a9d194b2-e9fb-409e-8d80-d886edccfcbb'),
('246cf3cd-667b-4ac2-b104-bcb99bd12d38', 'aa6cd436-8dfe-4822-8e79-e45055a62bd4'),
('246cf3cd-667b-4ac2-b104-bcb99bd12d38', 'b1ff2215-abf8-4efa-9ce5-697c9734ebf7'),
('246cf3cd-667b-4ac2-b104-bcb99bd12d38', 'cb0ffa62-9d66-4282-9a45-d3f4cf21cd76'),
('246cf3cd-667b-4ac2-b104-bcb99bd12d38', 'e14a3abd-5c54-40f2-96fb-0a95e3b61279'),
-- supervisor role
('253fade7-68df-4151-86c2-dc35420d1333', '249cf7c6-97a6-4386-9501-5f31fbf0c252'),
('253fade7-68df-4151-86c2-dc35420d1333', 'b1ff2215-abf8-4efa-9ce5-697c9734ebf7'),
('253fade7-68df-4151-86c2-dc35420d1333', 'e14a3abd-5c54-40f2-96fb-0a95e3b61279'),
-- maintenance role
('c5bb875d-97de-4539-9425-cf4c5b9050d0', 'aa6cd436-8dfe-4822-8e79-e45055a62bd4'),
('c5bb875d-97de-4539-9425-cf4c5b9050d0', 'cb0ffa62-9d66-4282-9a45-d3f4cf21cd76'),
-- qa_analyst role
('ce7a8d73-4e58-4c87-8549-62a72d308ef5', '249cf7c6-97a6-4386-9501-5f31fbf0c252'),
('ce7a8d73-4e58-4c87-8549-62a72d308ef5', '8f01342e-d2b2-4777-82c8-6fae5708b91b'),
('ce7a8d73-4e58-4c87-8549-62a72d308ef5', 'e14a3abd-5c54-40f2-96fb-0a95e3b61279'),
-- operator role
('fb13a854-5601-49c3-8ca1-1bb0271db95b', '2f0f204f-b9c8-4aae-82f7-dad1c3044ff6'),
('fb13a854-5601-49c3-8ca1-1bb0271db95b', '6f7f00a6-f2ea-4050-be78-f4075f95cb4c'),
('fb13a854-5601-49c3-8ca1-1bb0271db95b', 'e14a3abd-5c54-40f2-96fb-0a95e3b61279');

-- No session data (interview.session table is empty)

-- migrate:down

-- TODO: Add your rollback SQL here
