-- migrate:up

-- Entity table (base table for multi-tenancy)
CREATE TABLE interview.entity (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT entity_pkey PRIMARY KEY,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT entity_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT entity_updated_by_fkey REFERENCES interview.user(id)
);

-- Plant table
CREATE TABLE interview.plant (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT plant_pkey PRIMARY KEY,
    entity_id uuid NOT NULL CONSTRAINT plant_entity_id_fkey REFERENCES interview.entity(id),
    code character varying(20) NOT NULL CONSTRAINT plant_code_key UNIQUE,
    name character varying(100) NOT NULL,
    description text,
    timezone character varying(50) DEFAULT 'America/Argentina/Buenos_Aires'::character varying,
    is_active boolean DEFAULT true,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT plant_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT plant_updated_by_fkey REFERENCES interview.user(id)
);

-- Warehouse table
CREATE TABLE interview.warehouse (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT warehouse_pkey PRIMARY KEY,
    entity_id uuid NOT NULL CONSTRAINT warehouse_entity_id_fkey REFERENCES interview.entity(id),
    plant_id uuid NOT NULL CONSTRAINT warehouse_plant_id_fkey REFERENCES interview.plant(id),
    code character varying(20) NOT NULL CONSTRAINT warehouse_code_key UNIQUE,
    name character varying(100) NOT NULL,
    description text,
    address text,
    total_capacity numeric(12,3),
    capacity_unit character varying(10),
    is_active boolean DEFAULT true,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT warehouse_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT warehouse_updated_by_fkey REFERENCES interview.user(id)
);

-- Unit of Measure table
CREATE TABLE interview.unit_of_measure (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT unit_of_measure_pkey PRIMARY KEY,
    code character varying(10) NOT NULL CONSTRAINT unit_of_measure_code_key UNIQUE,
    name character varying(50) NOT NULL,
    category character varying(30) NOT NULL,
    conversion_factor numeric(20,10) DEFAULT 1,
    base_unit_id uuid CONSTRAINT unit_of_measure_base_unit_id_fkey REFERENCES interview.unit_of_measure(id) ON DELETE SET NULL,
    is_base boolean DEFAULT false,
    description text,
    created_at bigint NOT NULL,
    created_by uuid CONSTRAINT unit_of_measure_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT unit_of_measure_updated_by_fkey REFERENCES interview.user(id)
);

-- Product table
CREATE TABLE interview.product (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT product_pkey PRIMARY KEY,
    code character varying NOT NULL CONSTRAINT product_code_key UNIQUE,
    name character varying NOT NULL,
    description text,
    unit_of_measure_id uuid NOT NULL CONSTRAINT product_unit_of_measure_id_fkey REFERENCES interview.unit_of_measure(id),
    is_active boolean DEFAULT true NOT NULL,
    shelf_life_days integer,
    is_own boolean DEFAULT false,
    created_at bigint NOT NULL,
    created_by uuid CONSTRAINT product_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT product_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT product_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT product_entity_id_fkey REFERENCES interview.entity(id)
);

-- Vendor table
CREATE TABLE interview.vendor (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT vendor_pkey PRIMARY KEY,
    code character varying(30) NOT NULL CONSTRAINT vendor_code_key UNIQUE,
    name character varying(100) NOT NULL,
    tax_id character varying(30),
    contact_name character varying(100),
    email character varying(100),
    phone character varying(50),
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    postal_code character varying(20),
    is_active boolean DEFAULT true,
    created_at bigint NOT NULL,
    created_by uuid CONSTRAINT vendor_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT vendor_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT vendor_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT vendor_entity_id_fkey REFERENCES interview.entity(id)
);

-- Product Vendor (junction table)
CREATE TABLE interview.product_vendor (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT product_vendor_pkey PRIMARY KEY,
    product_id uuid CONSTRAINT product_vendor_product_id_fkey REFERENCES interview.product(id) ON DELETE CASCADE,
    vendor_id uuid CONSTRAINT product_vendor_vendor_id_fkey REFERENCES interview.vendor(id) ON DELETE CASCADE,
    vendor_product_code character varying(50),
    lead_time_days integer,
    is_preferred boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at bigint NOT NULL,
    created_by uuid CONSTRAINT product_vendor_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT product_vendor_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT product_vendor_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT product_vendor_entity_id_fkey REFERENCES interview.entity(id),
    CONSTRAINT product_vendor_product_id_vendor_id_key UNIQUE (product_id, vendor_id)
);

-- Work Center table
CREATE TABLE interview.work_center (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT work_center_pkey PRIMARY KEY,
    code character varying NOT NULL CONSTRAINT work_center_code_key UNIQUE,
    name character varying NOT NULL,
    description text,
    location character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at bigint NOT NULL,
    created_by uuid CONSTRAINT work_center_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT work_center_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT work_center_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT work_center_entity_id_fkey REFERENCES interview.entity(id)
);

-- Equipment table
CREATE TABLE interview.equipment (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT equipment_pkey PRIMARY KEY,
    code character varying NOT NULL CONSTRAINT equipment_code_key UNIQUE,
    name character varying NOT NULL,
    work_center_id uuid CONSTRAINT equipment_work_center_id_fkey REFERENCES interview.work_center(id),
    status character varying DEFAULT 'AVAILABLE'::character varying CONSTRAINT equipment_status_check CHECK (status::text = ANY (ARRAY['AVAILABLE'::character varying, 'UNAVAILABLE'::character varying]::text[])),
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT equipment_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT equipment_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT equipment_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT equipment_entity_id_fkey REFERENCES interview.entity(id)
);

-- Operation table
CREATE TABLE interview.operation (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT operation_pkey PRIMARY KEY,
    code character varying NOT NULL CONSTRAINT operation_code_key UNIQUE,
    name character varying NOT NULL,
    standard_duration integer,
    description text,
    created_at bigint NOT NULL,
    created_by uuid CONSTRAINT operation_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT operation_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT operation_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT operation_entity_id_fkey REFERENCES interview.entity(id)
);

-- Routing table
CREATE TABLE interview.routing (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT routing_pkey PRIMARY KEY,
    product_id uuid NOT NULL CONSTRAINT routing_product_id_fkey REFERENCES interview.product(id) ON DELETE CASCADE,
    version character varying NOT NULL,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT routing_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT routing_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT routing_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT routing_entity_id_fkey REFERENCES interview.entity(id)
);

-- Routing Operation table
CREATE TABLE interview.routing_operation (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT routing_operation_pkey PRIMARY KEY,
    routing_id uuid NOT NULL CONSTRAINT routing_operation_routing_id_fkey REFERENCES interview.routing(id) ON DELETE CASCADE,
    operation_id uuid NOT NULL CONSTRAINT routing_operation_operation_id_fkey REFERENCES interview.operation(id),
    equipment_id uuid CONSTRAINT routing_operation_equipment_id_fkey REFERENCES interview.equipment(id),
    sequence integer NOT NULL,
    requires_quality_control boolean DEFAULT true,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT routing_operation_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT routing_operation_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT routing_operation_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT routing_operation_entity_id_fkey REFERENCES interview.entity(id)
);

-- Bill of Materials table
CREATE TABLE interview.bill_of_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT bill_of_materials_pkey PRIMARY KEY,
    product_id uuid NOT NULL CONSTRAINT bill_of_materials_product_id_fkey REFERENCES interview.product(id) ON DELETE CASCADE,
    version character varying NOT NULL,
    created_at bigint NOT NULL,
    created_by uuid CONSTRAINT bill_of_materials_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT bill_of_materials_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT bill_of_materials_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT bill_of_materials_entity_id_fkey REFERENCES interview.entity(id)
);

-- Bill of Materials Item table
CREATE TABLE interview.bill_of_materials_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT bill_of_materials_item_pkey PRIMARY KEY,
    bill_of_materials_id uuid NOT NULL CONSTRAINT bill_of_materials_item_bill_of_materials_id_fkey REFERENCES interview.bill_of_materials(id) ON DELETE CASCADE,
    component_id uuid NOT NULL CONSTRAINT bill_of_materials_item_component_id_fkey REFERENCES interview.product(id),
    quantity numeric(12,3) NOT NULL,
    unit_of_measure_id uuid NOT NULL CONSTRAINT bill_of_materials_item_unit_of_measure_id_fkey REFERENCES interview.unit_of_measure(id),
    vendor_id uuid NOT NULL CONSTRAINT bill_of_materials_item_vendor_id_fkey REFERENCES interview.vendor(id),
    created_at bigint NOT NULL,
    created_by uuid CONSTRAINT bill_of_materials_item_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT bill_of_materials_item_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT bill_of_materials_item_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT bill_of_materials_item_entity_id_fkey REFERENCES interview.entity(id)
);

-- Work Order table
CREATE TABLE interview.work_order (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT work_order_pkey PRIMARY KEY,
    work_center_id uuid CONSTRAINT work_order_work_center_id_fkey REFERENCES interview.work_center(id),
    product_id uuid NOT NULL CONSTRAINT work_order_product_id_fkey REFERENCES interview.product(id),
    quantity numeric(12,3) NOT NULL,
    assigned_employee_id uuid CONSTRAINT work_order_assigned_employee_id_fkey REFERENCES interview.user(id),
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT work_order_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT work_order_updated_by_fkey REFERENCES interview.user(id),
    code character varying(30) NOT NULL,
    planned_start bigint,
    planned_end bigint,
    actual_start bigint,
    actual_end bigint,
    status character varying(20) DEFAULT 'CREATED'::character varying NOT NULL CONSTRAINT workorder_status_check CHECK (status::text = ANY (ARRAY['CREATED'::character varying, 'SCHEDULED'::character varying, 'RUNNING'::character varying, 'PAUSED'::character varying, 'CANCELLED'::character varying, 'COMPLETED'::character varying]::text[])),
    plant_id uuid NOT NULL CONSTRAINT work_order_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT work_order_entity_id_fkey REFERENCES interview.entity(id)
);

-- Inventory Location table
CREATE TABLE interview.inventory_location (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT inventory_location_pkey PRIMARY KEY,
    code character varying(50) NOT NULL CONSTRAINT inventory_location_code_key UNIQUE,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT inventory_location_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT inventory_location_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT inventory_location_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT inventory_location_entity_id_fkey REFERENCES interview.entity(id)
);

-- Batch table
CREATE TABLE interview.batch (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT batch_pkey PRIMARY KEY,
    code character varying NOT NULL CONSTRAINT batch_code_key UNIQUE,
    work_order_id uuid CONSTRAINT batch_work_order_id_fkey REFERENCES interview.work_order(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    assigned_employee_id uuid CONSTRAINT batch_assigned_employee_id_fkey REFERENCES interview.user(id),
    status character varying DEFAULT 'PENDING'::character varying NOT NULL CONSTRAINT batch_status_check CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'SCHEDULED'::character varying, 'RUNNING'::character varying, 'CANCELLED'::character varying, 'COMPLETED'::character varying]::text[])),
    quantity numeric(12,3) NOT NULL,
    planned_start bigint,
    planned_end bigint,
    actual_start bigint,
    actual_end bigint,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT batch_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT batch_updated_by_fkey REFERENCES interview.user(id),
    routing_id uuid CONSTRAINT batch_routing_id_fkey REFERENCES interview.routing(id) ON DELETE SET NULL,
    bill_of_materials_id uuid NOT NULL CONSTRAINT batch_bill_of_materials_id_fkey REFERENCES interview.bill_of_materials(id) ON DELETE SET NULL,
    plant_id uuid NOT NULL CONSTRAINT batch_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT batch_entity_id_fkey REFERENCES interview.entity(id),
    default_location_id uuid null references interview.inventory_location(id)
);

-- Batch Operation table
CREATE TABLE interview.batch_operation (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT batch_operation_pkey PRIMARY KEY,
    batch_id uuid CONSTRAINT batch_operation_batch_id_fkey REFERENCES interview.batch(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    operation_id uuid CONSTRAINT batch_operation_operation_id_fkey REFERENCES interview.operation(id),
    equipment_id uuid CONSTRAINT batch_operation_equipment_id_fkey REFERENCES interview.equipment(id),
    operator_id uuid CONSTRAINT batch_operation_operator_id_fkey REFERENCES interview.user(id),
    sequence integer NOT NULL,
    actual_start bigint,
    actual_end bigint,
    status character varying(20) DEFAULT 'PENDING'::character varying CONSTRAINT batch_operation_status_check CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'RUNNING'::character varying, 'CANCELLED'::character varying, 'COMPLETED'::character varying]::text[])),
    notes text,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT batch_operation_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT batch_operation_updated_by_fkey REFERENCES interview.user(id),
    requires_quality_control boolean DEFAULT true,
    assigned_employee_id uuid CONSTRAINT batch_operation_assigned_employee_id_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT batch_operation_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT batch_operation_entity_id_fkey REFERENCES interview.entity(id)
);

-- Batch Material table
CREATE TABLE interview.batch_material (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT batch_material_pkey PRIMARY KEY,
    batch_id uuid NOT NULL CONSTRAINT batch_material_batch_id_fkey REFERENCES interview.batch(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    bill_of_materials_item_id uuid NOT NULL CONSTRAINT batch_material_bill_of_materials_item_id_fkey REFERENCES interview.bill_of_materials_item(id),
    component_id uuid NOT NULL CONSTRAINT batch_material_component_id_fkey REFERENCES interview.product(id),
    quantity numeric(12,3) NOT NULL,
    unit_of_measure_id uuid NOT NULL CONSTRAINT batch_material_unit_of_measure_id_fkey REFERENCES interview.unit_of_measure(id),
    vendor_id uuid NOT NULL CONSTRAINT batch_material_vendor_id_fkey REFERENCES interview.vendor(id),
    status character varying(20) DEFAULT 'PENDING'::character varying CONSTRAINT batch_material_status_check CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'RESERVED'::character varying, 'ISSUED'::character varying, 'CONSUMED'::character varying]::text[])),
    notes text,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT batch_material_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT batch_material_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT batch_material_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT batch_material_entity_id_fkey REFERENCES interview.entity(id)
);

-- Lot table
CREATE TABLE interview.lot (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT lot_pkey PRIMARY KEY,
    batch_id uuid CONSTRAINT lot_batch_id_fkey REFERENCES interview.batch(id) ON DELETE CASCADE,
    product_id uuid not null references interview.product(id) ON DELETE CASCADE,
    code character varying NOT NULL CONSTRAINT lot_code_key UNIQUE,
    quantity numeric(12,3),
    manufactured_at bigint,
    expiration_at bigint NOT NULL,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT lot_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT lot_updated_by_fkey REFERENCES interview.user(id),
    vendor_id uuid CONSTRAINT lot_vendor_id_fkey REFERENCES interview.vendor(id),
    is_own_product boolean DEFAULT false NOT NULL,
    plant_id uuid NOT NULL CONSTRAINT lot_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT lot_entity_id_fkey REFERENCES interview.entity(id),
    CONSTRAINT lot_vendor_or_own_check CHECK (vendor_id IS NOT NULL OR is_own_product = true)
);



-- Inventory Item table
CREATE TABLE interview.inventory_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT inventory_item_pkey PRIMARY KEY,
    product_id uuid NOT NULL CONSTRAINT inventory_item_product_id_fkey REFERENCES interview.product(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    lot_id uuid CONSTRAINT inventory_item_lot_id_fkey REFERENCES interview.lot(id),
    vendor_id uuid CONSTRAINT inventory_item_vendor_id_fkey REFERENCES interview.vendor(id),
    price numeric(20,4),
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL CONSTRAINT inventory_item_currency_check CHECK (currency::text = ANY (ARRAY['USD'::character varying, 'ARS'::character varying]::text[])),
    quantity numeric(12,3) NOT NULL,
    expiration_at bigint,
    location_id uuid NOT NULL CONSTRAINT inventory_item_location_id_fkey REFERENCES interview.inventory_location(id),
    type character varying NOT NULL CONSTRAINT inventory_item_type_check CHECK (type::text = ANY (ARRAY['RAW'::character varying, 'WIP'::character varying, 'FINISHED'::character varying]::text[])),
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT inventory_item_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT inventory_item_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT inventory_item_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT inventory_item_entity_id_fkey REFERENCES interview.entity(id)
);

-- Material Request table
CREATE TABLE interview.material_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT material_request_pkey PRIMARY KEY,
    work_order_id uuid NOT NULL CONSTRAINT material_request_work_order_id_fkey REFERENCES interview.work_order(id),
    requested_by uuid NOT NULL CONSTRAINT material_request_requested_by_fkey REFERENCES interview.user(id),
    requested_at bigint NOT NULL,
    due_date bigint,
    assigned_to uuid CONSTRAINT material_request_assigned_to_fkey REFERENCES interview.user(id),
    priority character varying(20) DEFAULT 'NORMAL'::character varying CONSTRAINT material_request_priority_check CHECK (priority::text = ANY (ARRAY['LOW'::character varying, 'NORMAL'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying]::text[])),
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL CONSTRAINT material_request_status_check CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'PARTIAL'::character varying, 'FULFILLED'::character varying, 'CANCELLED'::character varying, 'REJECTED'::character varying]::text[])),
    notes text,
    plant_id uuid NOT NULL CONSTRAINT material_request_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT material_request_entity_id_fkey REFERENCES interview.entity(id),
    destination_location_id uuid NULL REFERENCES interview.inventory_location(id)
);

-- Material Request Item table
CREATE TABLE interview.material_request_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT material_request_item_pkey PRIMARY KEY,
    material_request_id uuid NOT NULL CONSTRAINT material_request_item_material_request_id_fkey REFERENCES interview.material_request(id) ON DELETE CASCADE,
    inventory_item_id uuid CONSTRAINT material_request_item_inventory_item_id_fkey REFERENCES interview.inventory_item(id),
    material_id uuid NOT NULL CONSTRAINT material_request_item_material_id_fkey REFERENCES interview.product(id),
    lot_id uuid CONSTRAINT material_request_item_lot_id_fkey REFERENCES interview.lot(id),
    quantity numeric NOT NULL,
    unit_of_measure uuid NOT NULL CONSTRAINT material_request_item_unit_of_measure_fkey REFERENCES interview.unit_of_measure(id),
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL CONSTRAINT material_request_item_status_check CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'PARTIAL'::character varying, 'FULFILLED'::character varying, 'CANCELLED'::character varying, 'REJECTED'::character varying]::text[])),
    plant_id uuid NOT NULL CONSTRAINT material_request_item_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT material_request_item_entity_id_fkey REFERENCES interview.entity(id)
);

-- Inventory Movement table
CREATE TABLE interview.inventory_movement (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT inventory_movement_pkey PRIMARY KEY,
    inventory_item_id uuid CONSTRAINT inventory_movement_inventory_item_id_fkey REFERENCES interview.inventory_item(id),
    movement_type character varying CONSTRAINT inventory_movement_movement_type_check CHECK (movement_type::text = ANY (ARRAY['RECEIPT'::character varying, 'TRANSFER'::character varying, 'ISSUE'::character varying, 'RETURN'::character varying, 'ADJUSTMENT'::character varying]::text[])),
    quantity numeric(12,3) NOT NULL,
    work_order_id uuid CONSTRAINT inventory_movement_work_order_id_fkey REFERENCES interview.work_order(id),
    source_location_id uuid CONSTRAINT inventory_movement_source_location_id_fkey REFERENCES interview.inventory_location(id),
    destination_location_id uuid CONSTRAINT inventory_movement_destination_location_id_fkey REFERENCES interview.inventory_location(id),
    reason text,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT inventory_movement_created_by_fkey REFERENCES interview.user(id),
    material_request_item_id uuid CONSTRAINT inventory_movement_material_request_item_id_fkey REFERENCES interview.material_request_item(id),
    plant_id uuid NOT NULL CONSTRAINT inventory_movement_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT inventory_movement_entity_id_fkey REFERENCES interview.entity(id)
);

-- Inventory Reservation table
CREATE TABLE interview.inventory_reservation (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT inventory_reservation_pkey PRIMARY KEY,
    inventory_item_id uuid NOT NULL CONSTRAINT inventory_reservation_inventory_item_id_fkey REFERENCES interview.inventory_item(id),
    batch_id uuid NOT NULL CONSTRAINT inventory_reservation_batch_id_fkey REFERENCES interview.batch(id) ON DELETE CASCADE,
    quantity numeric(20,6) NOT NULL CONSTRAINT inventory_reservation_quantity_check CHECK (quantity > 0::numeric),
    unit_of_measure_id uuid CONSTRAINT inventory_reservation_unit_id_fkey REFERENCES interview.unit_of_measure(id),
    reserved_at bigint NOT NULL,
    reserved_by uuid CONSTRAINT inventory_reservation_reserved_by_fkey REFERENCES interview.user(id),
    released_at bigint,
    released_by uuid CONSTRAINT inventory_reservation_released_by_fkey REFERENCES interview.user(id),
    status character varying(20) DEFAULT 'RESERVED'::character varying CONSTRAINT inventory_reservation_status_check CHECK (status::text = ANY (ARRAY['RESERVED'::character varying, 'RELEASED'::character varying, 'CONSUMED'::character varying, 'CANCELLED'::character varying]::text[])),
    notes text,
    plant_id uuid NOT NULL CONSTRAINT inventory_reservation_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT inventory_reservation_entity_id_fkey REFERENCES interview.entity(id)
);

-- Material Consumption table
CREATE TABLE interview.material_consumption (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT material_consumption_pkey PRIMARY KEY,
    batch_id uuid CONSTRAINT material_consumption_batch_id_fkey REFERENCES interview.batch(id) ON DELETE CASCADE,
    material_id uuid NOT NULL CONSTRAINT material_consumption_material_id_fkey REFERENCES interview.product(id),
    quantity numeric(20,6) NOT NULL,
    unit_id uuid CONSTRAINT material_consumption_unit_id_fkey REFERENCES interview.unit_of_measure(id),
    inventory_item_id uuid CONSTRAINT material_consumption_inventory_item_id_fkey REFERENCES interview.inventory_item(id),
    notes text,
    created_at bigint NOT NULL,
    plant_id uuid NOT NULL CONSTRAINT material_consumption_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT material_consumption_entity_id_fkey REFERENCES interview.entity(id)
);

-- Quality Inspection table
CREATE TABLE interview.quality_control (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT quality_control_pkey PRIMARY KEY,
    batch_id uuid CONSTRAINT quality_control_batch_id_fkey REFERENCES interview.batch(id),
    operation_id uuid CONSTRAINT quality_control_operation_id_fkey REFERENCES interview.operation(id),
    inspected_by uuid CONSTRAINT quality_control_inspected_by_fkey REFERENCES interview.user(id),
    result character varying DEFAULT 'PENDING'::character varying CONSTRAINT quality_control_result_check CHECK (result::text = ANY (ARRAY['PENDING'::character varying, 'PASS'::character varying, 'FAIL'::character varying, 'REWORK'::character varying]::text[])),
    notes text,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT quality_control_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT quality_control_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT quality_control_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT quality_control_entity_id_fkey REFERENCES interview.entity(id)
);

-- Material planning table
CREATE TABLE interview.planned_supply (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	entity_id uuid NOT NULL,
	plant_id uuid NOT NULL,
	product_id uuid NOT NULL,
	quantity numeric(20, 6) NOT NULL,
	unit_id uuid NULL,
	source_type varchar(20) NOT NULL,
	source_code varchar NULL,
	expected_at int8 NOT NULL,
	created_at int8 NOT NULL,
	created_by uuid NOT NULL,
	updated_at int8 NULL,
	updated_by uuid NULL,
	vendor_id uuid NOT NULL,
	CONSTRAINT planned_supply_pkey PRIMARY KEY (id),
	CONSTRAINT planned_supply_source_type_check CHECK (((source_type)::text = ANY (ARRAY[('PURCHASE_ORDER'::character varying)::text, ('TRANSFER'::character varying)::text, ('PRODUCTION'::character varying)::text]))),
	CONSTRAINT planned_supply_created_by_fkey FOREIGN KEY (created_by) REFERENCES interview.user(id),
	CONSTRAINT planned_supply_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES interview.entity(id),
	CONSTRAINT planned_supply_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES interview.plant(id),
	CONSTRAINT planned_supply_product_id_fkey FOREIGN KEY (product_id) REFERENCES interview.product(id),
	CONSTRAINT planned_supply_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES interview.unit_of_measure(id),
	CONSTRAINT planned_supply_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES interview.user(id),
	CONSTRAINT planned_supply_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES interview.vendor(id) ON DELETE CASCADE
);

-- Material reservation table
CREATE TABLE interview.planned_reservation (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	entity_id uuid NOT NULL,
	plant_id uuid NOT NULL,
	planned_supply_id uuid NOT NULL,
	reserved_at int8 NOT NULL,
	reserved_by uuid NOT NULL,
	status varchar(20) DEFAULT 'PLANNED'::character varying NULL,
	quantity numeric(20, 6) NOT NULL,
	batch_id uuid NOT NULL,
	CONSTRAINT chk_planned_qty_positive CHECK ((quantity > (0)::numeric)),
	CONSTRAINT planned_reservation_pkey PRIMARY KEY (id),
	CONSTRAINT planned_reservation_status_check CHECK (((status)::text = ANY (ARRAY[('PLANNED'::character varying)::text, ('CONFIRMED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
	CONSTRAINT mrp_reservation_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES interview.batch(id) ON DELETE CASCADE,
	CONSTRAINT mrp_reservation_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES interview.entity(id),
	CONSTRAINT mrp_reservation_planned_supply_id_fkey FOREIGN KEY (planned_supply_id) REFERENCES interview.planned_supply(id),
	CONSTRAINT mrp_reservation_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES interview.plant(id),
	CONSTRAINT mrp_reservation_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES interview.user(id)
);

-- Downtime Event table
CREATE TABLE interview.downtime_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT downtime_event_pkey PRIMARY KEY,
    equipment_id uuid CONSTRAINT downtime_event_equipment_id_fkey REFERENCES interview.equipment(id),
    batch_id uuid CONSTRAINT downtime_event_batch_id_fkey REFERENCES interview.batch(id),
    reason text,
    started_at bigint NOT NULL,
    ended_at bigint,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT downtime_event_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT downtime_event_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT downtime_event_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT downtime_event_entity_id_fkey REFERENCES interview.entity(id)
);

-- Maintenance Record table
CREATE TABLE interview.maintenance_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT maintenance_record_pkey PRIMARY KEY,
    equipment_id uuid CONSTRAINT maintenance_record_equipment_id_fkey REFERENCES interview.equipment(id),
    performed_by uuid CONSTRAINT maintenance_record_performed_by_fkey REFERENCES interview.user(id),
    maintenance_type character varying CONSTRAINT maintenance_record_maintenance_type_check CHECK (maintenance_type::text = ANY (ARRAY['PREVENTIVE'::character varying, 'CORRECTIVE'::character varying]::text[])),
    description text,
    performed_at bigint NOT NULL,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT maintenance_record_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT maintenance_record_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT maintenance_record_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT maintenance_record_entity_id_fkey REFERENCES interview.entity(id)
);

-- Parameter table
CREATE TABLE interview.parameter (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT parameter_pkey PRIMARY KEY,
    code character varying NOT NULL CONSTRAINT parameter_code_key UNIQUE,
    name character varying NOT NULL,
    unit character varying,
    value_type character varying CONSTRAINT parameter_value_type_check CHECK (value_type::text = ANY (ARRAY['NUMBER'::character varying, 'TEXT'::character varying, 'BOOLEAN'::character varying]::text[])),
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT parameter_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT parameter_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT parameter_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT parameter_entity_id_fkey REFERENCES interview.entity(id)
);

-- Shift table
CREATE TABLE interview.shift (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT shift_pkey PRIMARY KEY,
    name character varying NOT NULL,
    start_time_hour integer NOT NULL,
    end_time_hour integer NOT NULL,
    start_time_minute integer NOT NULL,
    end_time_minute integer NOT NULL,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT shift_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT shift_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT shift_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT shift_entity_id_fkey REFERENCES interview.entity(id)
);

-- Alert table
CREATE TABLE interview.alert (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT alert_pkey PRIMARY KEY,
    type character varying NOT NULL,
    severity character varying,
    message text,
    acknowledged boolean DEFAULT false,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL CONSTRAINT alert_created_by_fkey REFERENCES interview.user(id),
    updated_at bigint,
    updated_by uuid CONSTRAINT alert_updated_by_fkey REFERENCES interview.user(id),
    plant_id uuid NOT NULL CONSTRAINT alert_plant_id_fkey REFERENCES interview.plant(id),
    entity_id uuid NOT NULL CONSTRAINT alert_entity_id_fkey REFERENCES interview.entity(id)
);

CREATE SEQUENCE interview.general_codes_seq;

-- migrate:down

DROP SCHEMA IF EXISTS factory CASCADE;
