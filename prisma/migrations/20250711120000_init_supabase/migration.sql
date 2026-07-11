-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'OWNER', 'OFFICE_MANAGER', 'FIELD_OPERATOR', 'HR_MANAGER', 'WAREHOUSE_MANAGER', 'ACCOUNTANT', 'SUBCONTRACTOR_PORTAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'CONFLICT', 'FAILED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('HARVESTER', 'BALER', 'RAKE', 'COMBINE', 'TRACTOR', 'TRUCK', 'SPRAYER', 'TRAILER', 'FIELD_CART', 'JEEP', 'PRIVATE_CAR', 'OPEN_TRUCK', 'AGENCY_TRAILER', 'DIESEL_TRAILER', 'GREENERY_MOWER', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('WHEAT', 'CLOVER', 'STRAW', 'BARLEY', 'CORN', 'OTHER');

-- CreateEnum
CREATE TYPE "BaleCategory" AS ENUM ('MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "ChoppingMechanism" AS ENUM ('NONE', 'CHOPPED', 'UNCHOPPED');

-- CreateEnum
CREATE TYPE "FuelSourceType" AS ENUM ('FIXED_TANK', 'FIELD_CART', 'EXTERNAL_STATION');

-- CreateEnum
CREATE TYPE "FuelTransactionType" AS ENUM ('REFUEL_VEHICLE', 'TANK_FILL', 'TANK_TRANSFER', 'ADJUSTMENT', 'SUBCONTRACTOR_CHARGE');

-- CreateEnum
CREATE TYPE "FuelRecipientCategory" AS ENUM ('TANK', 'COMPANY_VEHICLE', 'COMPANY_EMPLOYEE', 'EXTERNAL_CUSTOMER');

-- CreateEnum
CREATE TYPE "FuelColumnRole" AS ENUM ('TANK_FILL', 'TANK_INVENTORY', 'FIELD_CART', 'CONSUMER');

-- CreateEnum
CREATE TYPE "MachineryUnitType" AS ENUM ('HARVESTER', 'BALER', 'RAKE', 'COMBINE', 'SUBCONTRACTOR');

-- CreateEnum
CREATE TYPE "WorkQuantityUnit" AS ENUM ('DUNAM', 'HOUR', 'BALE', 'ACRE', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'SICK', 'VACATION', 'TRAVEL');

-- CreateEnum
CREATE TYPE "TimeEntryType" AS ENUM ('REGULAR', 'OVERTIME', 'TRAVEL', 'HOLIDAY', 'NIGHT_SHIFT');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "LedgerCategory" AS ENUM ('SALARY', 'ADVANCE', 'BONUS', 'DEDUCTION', 'REIMBURSEMENT', 'FUEL_OFFSET', 'JOB_PAYMENT', 'JOB_CHARGE', 'ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SubcontractorJobType" AS ENUM ('SPRAYING', 'FERTILIZING', 'TRANSPORT', 'HARVESTING', 'PLOWING', 'OTHER');

-- CreateEnum
CREATE TYPE "SubcontractorJobStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TirePosition" AS ENUM ('FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT', 'REAR_INNER_LEFT', 'REAR_INNER_RIGHT', 'SPARE');

-- CreateEnum
CREATE TYPE "ComplianceType" AS ENUM ('VEHICLE_TEST', 'INSURANCE', 'LIFTING_INSPECTION', 'LICENSE_RENEWAL', 'REGISTRATION');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('OIL_CHANGE', 'REPAIR', 'INSPECTION', 'TIRE_CHANGE', 'GENERAL_MAINTENANCE', 'BODY_WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'USAGE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'RETURN');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "BillingUnit" AS ENUM ('DUNAM', 'ACRE', 'HOUR', 'BALE', 'TON', 'TRIP', 'FLAT_RATE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHECK', 'OFFSET', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_he" TEXT,
    "tax_id" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "vat_rate" DECIMAL(65,30) NOT NULL DEFAULT 18.00,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "logo_url" TEXT,
    "manager_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FIELD_OPERATOR',
    "employee_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "client_id" TEXT,
    "action" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "error_message" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_he" TEXT,
    "code" TEXT,
    "area_acres" DECIMAL(65,30),
    "moshav_id" TEXT,
    "farmer_id" TEXT,
    "gps_coordinates" JSONB,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machinery_units" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit_number" TEXT,
    "unit_type" "MachineryUnitType" NOT NULL,
    "vehicle_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "header_color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machinery_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machinery_work_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT,
    "machinery_unit_id" TEXT,
    "work_date" TIMESTAMP(3) NOT NULL,
    "operator_id" TEXT,
    "driver_name" TEXT,
    "vehicle_id" TEXT,
    "plot_id" TEXT,
    "plot_name" TEXT,
    "settlement" TEXT,
    "customer_name" TEXT,
    "material_type" "MaterialType",
    "quantity_unit" "WorkQuantityUnit" NOT NULL DEFAULT 'DUNAM',
    "acres_worked" DECIMAL(65,30) NOT NULL,
    "planned_quantity" DECIMAL(65,30),
    "reported_quantity" DECIMAL(65,30),
    "approval_status" TEXT NOT NULL DEFAULT 'APPROVED',
    "bale_category" "BaleCategory",
    "bale_count" INTEGER,
    "chopping_mechanism" "ChoppingMechanism" NOT NULL DEFAULT 'NONE',
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "notes" TEXT,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "photo_url" TEXT,
    "whatsapp_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machinery_work_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_sources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source_type" "FuelSourceType" NOT NULL,
    "location" TEXT,
    "plot_id" TEXT,
    "capacity_liters" DECIMAL(65,30),
    "current_level" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_recipients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_he" TEXT,
    "category" "FuelRecipientCategory" NOT NULL,
    "column_role" "FuelColumnRole" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "vehicle_id" TEXT,
    "employee_id" TEXT,
    "subcontractor_id" TEXT,
    "fuel_source_id" TEXT,
    "price_per_liter" DECIMAL(65,30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_transactions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "source_id" TEXT,
    "recipient_id" TEXT,
    "vehicle_id" TEXT,
    "license_plate" TEXT,
    "transaction_type" "FuelTransactionType" NOT NULL,
    "liters" DECIMAL(65,30) NOT NULL,
    "price_per_liter" DECIMAL(65,30),
    "total_cost" DECIMAL(65,30),
    "odometer_km" INTEGER,
    "operator_id" TEXT,
    "subcontractor_id" TEXT,
    "notes" TEXT,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "photo_url" TEXT,
    "meter_photo_url" TEXT,
    "whatsapp_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_number" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "id_number" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "position" TEXT,
    "hire_date" TIMESTAMP(3),
    "salary_type" TEXT NOT NULL DEFAULT 'HOURLY',
    "hourly_rate" DECIMAL(65,30),
    "monthly_salary" DECIMAL(65,30),
    "overtime_rate" DECIMAL(65,30),
    "travel_rate" DECIMAL(65,30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT,
    "employee_id" TEXT NOT NULL,
    "work_date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "task_description" TEXT,
    "plot_id" TEXT,
    "notes" TEXT,
    "correction_note" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'APPROVED',
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "photo_url" TEXT,
    "created_by_id" TEXT NOT NULL,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "assignee_id" TEXT NOT NULL,
    "work_date" TIMESTAMP(3) NOT NULL,
    "machinery_unit_id" TEXT,
    "settlement" TEXT,
    "customer_name" TEXT,
    "plot_name" TEXT,
    "planned_quantity" DECIMAL(65,30) NOT NULL,
    "reported_quantity" DECIMAL(65,30),
    "quantity_unit" "WorkQuantityUnit" NOT NULL DEFAULT 'DUNAM',
    "task_description" TEXT,
    "actual_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "approval_status" TEXT NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "attendance_record_id" TEXT NOT NULL,
    "entry_type" "TimeEntryType" NOT NULL,
    "hours" DECIMAL(65,30) NOT NULL,
    "rate" DECIMAL(65,30),
    "amount" DECIMAL(65,30),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_ledger_entries" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "entry_type" "LedgerEntryType" NOT NULL,
    "category" "LedgerCategory" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "balance_after" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "tax_id" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT,
    "subcontractor_id" TEXT NOT NULL,
    "job_type" "SubcontractorJobType" NOT NULL,
    "status" "SubcontractorJobStatus" NOT NULL DEFAULT 'PLANNED',
    "job_date" TIMESTAMP(3) NOT NULL,
    "plot_id" TEXT,
    "description" TEXT,
    "acres" DECIMAL(65,30),
    "hours" DECIMAL(65,30),
    "agreed_rate" DECIMAL(65,30),
    "total_amount" DECIMAL(65,30),
    "is_charge_to_us" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractor_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_ledger_entries" (
    "id" TEXT NOT NULL,
    "subcontractor_id" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "entry_type" "LedgerEntryType" NOT NULL,
    "category" "LedgerCategory" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "is_offset" BOOLEAN NOT NULL DEFAULT false,
    "offset_against_id" TEXT,
    "balance_after" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcontractor_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_settlements" (
    "id" TEXT NOT NULL,
    "subcontractor_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_charges" DECIMAL(65,30) NOT NULL,
    "total_payments" DECIMAL(65,30) NOT NULL,
    "fuel_offsets" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "job_offsets" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(65,30) NOT NULL,
    "net_direction" TEXT NOT NULL,
    "notes" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcontractor_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "license_plate" TEXT NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "vin" TEXT,
    "odometer_km" INTEGER,
    "fuel_tank_capacity" DECIMAL(65,30),
    "test_expiry_date" TIMESTAMP(3),
    "lifting_inspection_expiry" TIMESTAMP(3),
    "compulsory_insurance" DECIMAL(65,30),
    "third_party_insurance" DECIMAL(65,30),
    "insurance_valid_until" TIMESTAMP(3),
    "towing_valid_until" TIMESTAMP(3),
    "windshield_insurance" DECIMAL(65,30),
    "registered_to" TEXT,
    "agent_phone" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tires" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "position" "TirePosition" NOT NULL,
    "brand" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "depth_mm" DECIMAL(65,30),
    "installed_at" TIMESTAMP(3),
    "replaced_at" TIMESTAMP(3),
    "purchase_cost" DECIMAL(65,30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_compliance" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "type" "ComplianceType" NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'VALID',
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "document_url" TEXT,
    "provider" TEXT,
    "policy_number" TEXT,
    "cost" DECIMAL(65,30),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_alerts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "vehicle_compliance_id" TEXT,
    "inventory_item_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "name_he" TEXT,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "min_stock_level" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(65,30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "movement_type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit_cost" DECIMAL(65,30),
    "reference_id" TEXT,
    "reference_type" TEXT,
    "notes" TEXT,
    "movement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "service_date" TIMESTAMP(3) NOT NULL,
    "odometer_km" INTEGER,
    "description" TEXT,
    "labor_cost" DECIMAL(65,30),
    "parts_cost" DECIMAL(65,30),
    "total_cost" DECIMAL(65,30),
    "performed_by" TEXT,
    "next_service_km" INTEGER,
    "next_service_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_line_items" (
    "id" TEXT NOT NULL,
    "service_record_id" TEXT NOT NULL,
    "inventory_item_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit_cost" DECIMAL(65,30) NOT NULL,
    "total_cost" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "service_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moshavim" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_he" TEXT,
    "region" TEXT,
    "contact_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moshavim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "moshav_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "id_number" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_ledger_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "farmer_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "entry_type" "LedgerEntryType" NOT NULL,
    "category" "LedgerCategory" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "falcha_rates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "service_name_he" TEXT,
    "material_type" "MaterialType",
    "unit" "BillingUnit" NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "default_quantity" DECIMAL(65,30),
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "falcha_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "moshav_id" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "season_year" INTEGER,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(65,30) NOT NULL DEFAULT 18.00,
    "vat_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "falcha_rate_id" TEXT,
    "description" TEXT NOT NULL,
    "unit" "BillingUnit" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "line_total" DECIMAL(65,30) NOT NULL,
    "plot_id" TEXT,
    "material_type" "MaterialType",
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_tax_components" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "base_amount" DECIMAL(65,30) NOT NULL,
    "tax_amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "invoice_tax_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvest_account_summaries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "moshav_id" TEXT NOT NULL,
    "season_year" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_acres" DECIMAL(65,30) NOT NULL,
    "total_bales" INTEGER,
    "gross_amount" DECIMAL(65,30) NOT NULL,
    "deductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(65,30) NOT NULL,
    "vat_amount" DECIMAL(65,30) NOT NULL,
    "total_with_vat" DECIMAL(65,30) NOT NULL,
    "amount_collected" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance_due" DECIMAL(65,30) NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "harvest_account_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "recipient_phone" TEXT NOT NULL,
    "recipient_name" TEXT,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_tax_id_key" ON "organizations"("tax_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "sync_logs_organization_id_status_idx" ON "sync_logs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "sync_logs_entity_type_entity_id_idx" ON "sync_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "sync_logs_client_id_idx" ON "sync_logs"("client_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_entity_type_idx" ON "audit_logs"("organization_id", "entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "plots_moshav_id_idx" ON "plots"("moshav_id");

-- CreateIndex
CREATE UNIQUE INDEX "plots_organization_id_name_key" ON "plots"("organization_id", "name");

-- CreateIndex
CREATE INDEX "machinery_units_organization_id_unit_type_idx" ON "machinery_units"("organization_id", "unit_type");

-- CreateIndex
CREATE UNIQUE INDEX "machinery_units_organization_id_name_key" ON "machinery_units"("organization_id", "name");

-- CreateIndex
CREATE INDEX "machinery_work_logs_work_date_idx" ON "machinery_work_logs"("work_date");

-- CreateIndex
CREATE INDEX "machinery_work_logs_machinery_unit_id_idx" ON "machinery_work_logs"("machinery_unit_id");

-- CreateIndex
CREATE INDEX "machinery_work_logs_plot_id_idx" ON "machinery_work_logs"("plot_id");

-- CreateIndex
CREATE INDEX "machinery_work_logs_operator_id_idx" ON "machinery_work_logs"("operator_id");

-- CreateIndex
CREATE INDEX "machinery_work_logs_sync_status_idx" ON "machinery_work_logs"("sync_status");

-- CreateIndex
CREATE UNIQUE INDEX "machinery_work_logs_organization_id_client_id_key" ON "machinery_work_logs"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "fuel_sources_organization_id_source_type_idx" ON "fuel_sources"("organization_id", "source_type");

-- CreateIndex
CREATE INDEX "fuel_recipients_organization_id_sort_order_idx" ON "fuel_recipients"("organization_id", "sort_order");

-- CreateIndex
CREATE INDEX "fuel_recipients_category_idx" ON "fuel_recipients"("category");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_recipients_organization_id_name_key" ON "fuel_recipients"("organization_id", "name");

-- CreateIndex
CREATE INDEX "fuel_transactions_transaction_date_idx" ON "fuel_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "fuel_transactions_recipient_id_idx" ON "fuel_transactions"("recipient_id");

-- CreateIndex
CREATE INDEX "fuel_transactions_vehicle_id_idx" ON "fuel_transactions"("vehicle_id");

-- CreateIndex
CREATE INDEX "fuel_transactions_license_plate_idx" ON "fuel_transactions"("license_plate");

-- CreateIndex
CREATE INDEX "fuel_transactions_subcontractor_id_idx" ON "fuel_transactions"("subcontractor_id");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_transactions_organization_id_client_id_key" ON "fuel_transactions"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_is_active_idx" ON "employees"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_employee_number_key" ON "employees"("organization_id", "employee_number");

-- CreateIndex
CREATE INDEX "attendance_records_employee_id_work_date_idx" ON "attendance_records"("employee_id", "work_date");

-- CreateIndex
CREATE INDEX "attendance_records_work_date_idx" ON "attendance_records"("work_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_organization_id_client_id_key" ON "attendance_records"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "field_tasks_assignee_id_work_date_idx" ON "field_tasks"("assignee_id", "work_date");

-- CreateIndex
CREATE INDEX "field_tasks_organization_id_work_date_idx" ON "field_tasks"("organization_id", "work_date");

-- CreateIndex
CREATE INDEX "field_tasks_status_idx" ON "field_tasks"("status");

-- CreateIndex
CREATE INDEX "time_entries_attendance_record_id_idx" ON "time_entries"("attendance_record_id");

-- CreateIndex
CREATE INDEX "employee_ledger_entries_employee_id_entry_date_idx" ON "employee_ledger_entries"("employee_id", "entry_date");

-- CreateIndex
CREATE INDEX "subcontractors_organization_id_idx" ON "subcontractors"("organization_id");

-- CreateIndex
CREATE INDEX "subcontractor_jobs_subcontractor_id_job_date_idx" ON "subcontractor_jobs"("subcontractor_id", "job_date");

-- CreateIndex
CREATE INDEX "subcontractor_jobs_status_idx" ON "subcontractor_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subcontractor_jobs_organization_id_client_id_key" ON "subcontractor_jobs"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "subcontractor_ledger_entries_subcontractor_id_entry_date_idx" ON "subcontractor_ledger_entries"("subcontractor_id", "entry_date");

-- CreateIndex
CREATE INDEX "subcontractor_settlements_subcontractor_id_period_start_idx" ON "subcontractor_settlements"("subcontractor_id", "period_start");

-- CreateIndex
CREATE INDEX "vehicles_vehicle_type_idx" ON "vehicles"("vehicle_type");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_organization_id_license_plate_key" ON "vehicles"("organization_id", "license_plate");

-- CreateIndex
CREATE INDEX "tires_vehicle_id_is_active_idx" ON "tires"("vehicle_id", "is_active");

-- CreateIndex
CREATE INDEX "vehicle_compliance_vehicle_id_type_idx" ON "vehicle_compliance"("vehicle_id", "type");

-- CreateIndex
CREATE INDEX "vehicle_compliance_expiry_date_idx" ON "vehicle_compliance"("expiry_date");

-- CreateIndex
CREATE INDEX "system_alerts_organization_id_is_dismissed_idx" ON "system_alerts"("organization_id", "is_dismissed");

-- CreateIndex
CREATE INDEX "system_alerts_triggered_at_idx" ON "system_alerts"("triggered_at");

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_organization_id_sku_key" ON "inventory_items"("organization_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_warehouse_id_inventory_item_id_key" ON "stock_levels"("warehouse_id", "inventory_item_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_date_idx" ON "stock_movements"("movement_date");

-- CreateIndex
CREATE INDEX "stock_movements_inventory_item_id_idx" ON "stock_movements"("inventory_item_id");

-- CreateIndex
CREATE INDEX "service_records_vehicle_id_service_date_idx" ON "service_records"("vehicle_id", "service_date");

-- CreateIndex
CREATE INDEX "service_line_items_service_record_id_idx" ON "service_line_items"("service_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "moshavim_organization_id_name_key" ON "moshavim"("organization_id", "name");

-- CreateIndex
CREATE INDEX "farmers_moshav_id_idx" ON "farmers"("moshav_id");

-- CreateIndex
CREATE INDEX "farmers_organization_id_idx" ON "farmers"("organization_id");

-- CreateIndex
CREATE INDEX "customer_ledger_entries_organization_id_entry_date_idx" ON "customer_ledger_entries"("organization_id", "entry_date");

-- CreateIndex
CREATE INDEX "customer_ledger_entries_customer_name_idx" ON "customer_ledger_entries"("customer_name");

-- CreateIndex
CREATE INDEX "falcha_rates_organization_id_is_active_idx" ON "falcha_rates"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "falcha_rates_effective_from_idx" ON "falcha_rates"("effective_from");

-- CreateIndex
CREATE INDEX "invoices_farmer_id_idx" ON "invoices"("farmer_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_issue_date_idx" ON "invoices"("issue_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organization_id_invoice_number_key" ON "invoices"("organization_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_tax_components_invoice_id_idx" ON "invoice_tax_components"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "harvest_account_summaries_season_year_idx" ON "harvest_account_summaries"("season_year");

-- CreateIndex
CREATE UNIQUE INDEX "harvest_account_summaries_farmer_id_moshav_id_season_year_p_key" ON "harvest_account_summaries"("farmer_id", "moshav_id", "season_year", "period_start");

-- CreateIndex
CREATE INDEX "communication_logs_organization_id_created_at_idx" ON "communication_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "communication_logs_entity_type_entity_id_idx" ON "communication_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plots" ADD CONSTRAINT "plots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plots" ADD CONSTRAINT "plots_moshav_id_fkey" FOREIGN KEY ("moshav_id") REFERENCES "moshavim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plots" ADD CONSTRAINT "plots_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "farmers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machinery_units" ADD CONSTRAINT "machinery_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machinery_units" ADD CONSTRAINT "machinery_units_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machinery_work_logs" ADD CONSTRAINT "machinery_work_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machinery_work_logs" ADD CONSTRAINT "machinery_work_logs_machinery_unit_id_fkey" FOREIGN KEY ("machinery_unit_id") REFERENCES "machinery_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machinery_work_logs" ADD CONSTRAINT "machinery_work_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machinery_work_logs" ADD CONSTRAINT "machinery_work_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machinery_work_logs" ADD CONSTRAINT "machinery_work_logs_plot_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machinery_work_logs" ADD CONSTRAINT "machinery_work_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_sources" ADD CONSTRAINT "fuel_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_recipients" ADD CONSTRAINT "fuel_recipients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_recipients" ADD CONSTRAINT "fuel_recipients_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_recipients" ADD CONSTRAINT "fuel_recipients_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_recipients" ADD CONSTRAINT "fuel_recipients_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "subcontractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_recipients" ADD CONSTRAINT "fuel_recipients_fuel_source_id_fkey" FOREIGN KEY ("fuel_source_id") REFERENCES "fuel_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "fuel_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "fuel_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "subcontractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_tasks" ADD CONSTRAINT "field_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_tasks" ADD CONSTRAINT "field_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_tasks" ADD CONSTRAINT "field_tasks_machinery_unit_id_fkey" FOREIGN KEY ("machinery_unit_id") REFERENCES "machinery_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_tasks" ADD CONSTRAINT "field_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_ledger_entries" ADD CONSTRAINT "employee_ledger_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_jobs" ADD CONSTRAINT "subcontractor_jobs_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_ledger_entries" ADD CONSTRAINT "subcontractor_ledger_entries_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_ledger_entries" ADD CONSTRAINT "subcontractor_ledger_entries_offset_against_id_fkey" FOREIGN KEY ("offset_against_id") REFERENCES "subcontractor_ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_settlements" ADD CONSTRAINT "subcontractor_settlements_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance" ADD CONSTRAINT "vehicle_compliance_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_vehicle_compliance_id_fkey" FOREIGN KEY ("vehicle_compliance_id") REFERENCES "vehicle_compliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_line_items" ADD CONSTRAINT "service_line_items_service_record_id_fkey" FOREIGN KEY ("service_record_id") REFERENCES "service_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_line_items" ADD CONSTRAINT "service_line_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moshavim" ADD CONSTRAINT "moshavim_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_moshav_id_fkey" FOREIGN KEY ("moshav_id") REFERENCES "moshavim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "farmers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "falcha_rates" ADD CONSTRAINT "falcha_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_falcha_rate_id_fkey" FOREIGN KEY ("falcha_rate_id") REFERENCES "falcha_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_tax_components" ADD CONSTRAINT "invoice_tax_components_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_account_summaries" ADD CONSTRAINT "harvest_account_summaries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_account_summaries" ADD CONSTRAINT "harvest_account_summaries_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_account_summaries" ADD CONSTRAINT "harvest_account_summaries_moshav_id_fkey" FOREIGN KEY ("moshav_id") REFERENCES "moshavim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
