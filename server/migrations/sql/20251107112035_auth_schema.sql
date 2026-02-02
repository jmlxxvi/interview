-- migrate:up

create schema if not exists interview;

-- User Table
CREATE TABLE interview."user" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    full_name character varying NOT NULL,
    email character varying NOT NULL,
    password_hash character varying NOT NULL,
    recovery_token character varying,
    recovery_timestamp bigint,
    is_email_verified boolean DEFAULT false NOT NULL,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL,
    entity_id uuid NOT NULL,
    default_plant_id uuid NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_uk UNIQUE (email),
    CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES interview."user"(id)
);

-- Permission Table
CREATE TABLE interview.permission (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource character varying NOT NULL,
    action character varying NOT NULL,
    description text,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT permissions_pkey PRIMARY KEY (id),
    CONSTRAINT permissions_resource_action_key UNIQUE (resource, action),
    CONSTRAINT permissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES interview."user"(id)
);

-- Role Table
CREATE TABLE interview.role (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    description text,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT roles_name_key UNIQUE (name),
    CONSTRAINT roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES interview."user"(id)
);

-- Role Permission Junction Table
CREATE TABLE interview.role_permission (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
    CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES interview.role(id) ON DELETE CASCADE,
    CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES interview.permission(id) ON DELETE CASCADE
);

-- Session Table
CREATE TABLE interview.session (
    session_token text NOT NULL,
    session_data jsonb NOT NULL,
    updated_at bigint NOT NULL,
    entity_id uuid NOT NULL,
    plant_id uuid NOT NULL,
    CONSTRAINT session_token_len CHECK (length(session_token) = 128),
    CONSTRAINT sessions_pk PRIMARY KEY (session_token)
);



-- User Role Junction Table
CREATE TABLE interview.user_role (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id),
    CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES interview."user"(id) ON DELETE CASCADE,
    CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES interview.role(id) ON DELETE CASCADE
);

-- migrate:down

DROP SCHEMA IF EXISTS auth CASCADE;
