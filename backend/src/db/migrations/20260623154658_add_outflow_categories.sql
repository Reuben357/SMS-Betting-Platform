ALTER TABLE outflow DROP CONSTRAINT outflow_category_check;
ALTER TABLE outflow ADD CONSTRAINT outflow_category_check
    CHECK (category::text = ANY (ARRAY[
    'Domain'::character varying,
    'VPS'::character varying,
    'SMS Gateway'::character varying,
    'Marketing'::character varying,
    'Salaries'::character varying,
    'Infrastructure'::character varying,
    'Malipo'::character varying,
    'Other'::character varying
    ]::text[]));