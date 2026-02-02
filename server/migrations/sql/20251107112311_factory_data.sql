-- migrate:up

INSERT INTO interview.unit_of_measure VALUES ('c30d2783-d36d-4106-94f2-28d5a399c3d6', 'kg', 'Kilogram', 'Weight', 1.0000000000, NULL, true, 'Base unit for weight', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('a9611e17-8047-42b2-a7f6-53dfbaaf33f2', 'L', 'Liter', 'Volume', 1.0000000000, NULL, true, 'Base unit for volume', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('3240ab6c-fa56-4855-b5f1-e614e1a0add5', 'm', 'Meter', 'Length', 1.0000000000, NULL, true, 'Base unit for length', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('2a6e10c5-43cc-4b00-9a12-3910264346f0', 'pcs', 'Piece', 'Count', 1.0000000000, NULL, true, 'Base unit for discrete items', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('be2a02c7-2f94-4ac2-882f-2adb907be364', 'm2', 'Square Meter', 'Area', 1.0000000000, NULL, true, 'Base unit for area', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('f50001fb-b3c5-49b0-aed1-4a9312425e5e', 'h', 'Hour', 'Time', 1.0000000000, NULL, true, 'Base unit for time tracking in production', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('1ac9d059-809a-4471-94cf-b5346613a0e2', 'cm', 'Centimeter', 'Length', 0.0100000000, '3240ab6c-fa56-4855-b5f1-e614e1a0add5', false, '1 centimeter = 0.01 meter', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('e9809193-addd-4176-8c93-7dfe42158b17', 'mm', 'Millimeter', 'Length', 0.0010000000, '3240ab6c-fa56-4855-b5f1-e614e1a0add5', false, '1 millimeter = 0.001 meter', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('60dafa11-2661-414f-a111-97f52b607f45', 'in', 'Inch', 'Length', 0.0254000000, '3240ab6c-fa56-4855-b5f1-e614e1a0add5', false, '1 inch = 0.0254 meter', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('346b5d44-9df7-498c-9ee2-ebccbf6e8121', 'mL', 'Milliliter', 'Volume', 0.0010000000, 'a9611e17-8047-42b2-a7f6-53dfbaaf33f2', false, '1 milliliter = 0.001 liter', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('5fa8b262-7154-48ae-bfe8-7b0030a5b1f1', 'gal', 'Gallon', 'Volume', 3.7854100000, 'a9611e17-8047-42b2-a7f6-53dfbaaf33f2', false, '1 gallon = 3.78541 liters', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('b1708837-511c-45b5-9b57-acdf1dd9b137', 'cm2', 'Square Centimeter', 'Area', 0.0001000000, 'be2a02c7-2f94-4ac2-882f-2adb907be364', false, '1 cm² = 0.0001 m²', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('6dd16243-8b74-4210-a51d-eb0bd42cee91', 'min', 'Minute', 'Time', 0.0166667000, 'f50001fb-b3c5-49b0-aed1-4a9312425e5e', false, '1 minute = 1/60 hour', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('b53187cb-ce07-4e13-93a5-a47ee7e8582a', 's', 'Second', 'Time', 0.0002777800, 'f50001fb-b3c5-49b0-aed1-4a9312425e5e', false, '1 second = 1/3600 hour', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('9fdd572f-9a4f-41f1-a179-2511ee9bbdcf', 'g', 'Gram', 'Weight', 0.0010000000, 'c30d2783-d36d-4106-94f2-28d5a399c3d6', false, '1 gram = 0.001 kilogram', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('79c7059a-c45e-4086-9331-893fd85bf8af', 'mg', 'Milligram', 'Weight', 0.0000010000, 'c30d2783-d36d-4106-94f2-28d5a399c3d6', false, '1 milligram = 0.000001 kilogram', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('2dab6885-7db9-4013-811b-2fe4bb2b0f1c', 'lb', 'Pound', 'Weight', 0.4535923700, 'c30d2783-d36d-4106-94f2-28d5a399c3d6', false, '1 pound = 0.45359237 kilogram', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);
INSERT INTO interview.unit_of_measure VALUES ('ea0393ca-3996-489a-9ead-909244f88fb4', 'doz', 'Dozen', 'Count', 12.0000000000, '2a6e10c5-43cc-4b00-9a12-3910264346f0', false, '1 dozen = 12 pieces', 1762430746, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL);

-- migrate:down

-- TODO: Add your rollback SQL here
