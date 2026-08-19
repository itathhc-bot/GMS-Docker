<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Garage Guardian Application Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains all domain-specific configuration values for the
    | Garage Guardian System. These values are used across services, jobs,
    | and controllers.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | SLA (Service Level Agreement) Configuration
    |--------------------------------------------------------------------------
    */
    'sla' => [
        'default_hours'        => (int) env('GARAGE_SLA_DEFAULT_HOURS', 4),
        'warning_threshold'    => 0.8, // 80% of SLA elapsed = warning
        'critical_threshold'   => 1.0, // 100% of SLA elapsed = breached
    ],

    /*
    |--------------------------------------------------------------------------
    | Number Sequence Prefixes
    |--------------------------------------------------------------------------
    */
    'prefixes' => [
        'job_card'       => env('GARAGE_JOB_CARD_PREFIX', 'JC'),
        'purchase_order' => env('GARAGE_PO_PREFIX', 'PO'),
        'parts_request'  => env('GARAGE_PR_PREFIX', 'PR'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Scan Session (Vehicle Plate OCR Pairing)
    |--------------------------------------------------------------------------
    */
    'scan' => [
        'pair_code_length'       => (int) env('GARAGE_SCAN_PAIR_CODE_LENGTH', 6),
        'expiry_minutes'         => (int) env('GARAGE_SCAN_EXPIRY_MINUTES', 30),
        'max_attempts_per_session' => (int) env('GARAGE_SCAN_MAX_ATTEMPTS', 10),
    ],

    /*
    |--------------------------------------------------------------------------
    | OCR Service (Self-Hosted Tesseract Container)
    |--------------------------------------------------------------------------
    */
    'ocr' => [
        'service_url'     => env('OCR_SERVICE_URL', 'http://tesseract:5000/ocr'),
        'timeout_seconds' => (int) env('OCR_TIMEOUT_SECONDS', 30),
        'min_confidence'  => (float) env('OCR_MIN_CONFIDENCE', 0.6),
        'languages'       => env('OCR_LANGUAGES', 'eng+ara'),
    ],

    /*
    |--------------------------------------------------------------------------
    | File Upload Configuration
    |--------------------------------------------------------------------------
    */
    'uploads' => [
        'max_size_mb'        => (int) env('GARAGE_MAX_UPLOAD_MB', 10),
        'allowed_image_mimes' => ['image/jpeg', 'image/png', 'image/webp'],
        'allowed_doc_mimes'   => ['application/pdf'],
        'signature_max_kb'    => (int) env('GARAGE_SIGNATURE_MAX_KB', 512),
    ],

    /*
    |--------------------------------------------------------------------------
    | Storage Disk Buckets (MinIO / S3)
    |--------------------------------------------------------------------------
    */
    'storage' => [
        'qc_photos'       => env('MINIO_BUCKET_QC_PHOTOS', 'qc-photos'),
        'exports'         => env('MINIO_BUCKET_EXPORTS', 'exports'),
        'avatars'         => env('MINIO_BUCKET_AVATARS', 'avatars'),
        'scan_thumbnails' => env('MINIO_BUCKET_SCAN_THUMBNAILS', 'scan-thumbnails'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Approval Workflow Configuration
    |--------------------------------------------------------------------------
    */
    'approvals' => [
        'parts_auto_approve_below_qty'   => 0,  // 0 = always require approval
        'po_manager_approval_required'   => true,
        'po_finance_approval_required'   => true,
        'po_finance_threshold_amount'    => (float) env('GARAGE_PO_FINANCE_THRESHOLD', 1000.00),
    ],

    /*
    |--------------------------------------------------------------------------
    | Pagination Defaults
    |--------------------------------------------------------------------------
    */
    'pagination' => [
        'per_page'     => (int) env('GARAGE_PAGINATION_PER_PAGE', 25),
        'max_per_page' => (int) env('GARAGE_PAGINATION_MAX_PER_PAGE', 100),
    ],

    /*
    |--------------------------------------------------------------------------
    | Dashboard / Reporting
    |--------------------------------------------------------------------------
    */
    'reports' => [
        'trend_months'          => (int) env('GARAGE_REPORT_TREND_MONTHS', 6),
        'export_max_rows'       => (int) env('GARAGE_EXPORT_MAX_ROWS', 50000),
        'export_retention_days' => (int) env('GARAGE_EXPORT_RETENTION_DAYS', 7),
    ],

    /*
    |--------------------------------------------------------------------------
    | Monitoring / Metrics
    |--------------------------------------------------------------------------
    */
    'metrics' => [
        'enabled'      => (bool) env('GARAGE_METRICS_ENABLED', true),
        'bearer_token' => env('GARAGE_METRICS_BEARER_TOKEN'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Security
    |--------------------------------------------------------------------------
    */
    'security' => [
        'password_min_length'   => 12,
        'password_max_length'   => 128,
        'password_require_classes' => 3, // Requires 3 of: lower, upper, digit, symbol
        'token_expiry_hours'    => (int) env('GARAGE_TOKEN_EXPIRY_HOURS', 24),
        'admin_session_timeout' => (int) env('GARAGE_ADMIN_SESSION_TIMEOUT', 60), // minutes
    ],

];
