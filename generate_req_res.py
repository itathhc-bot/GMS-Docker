import os

base = os.getcwd()

def write_file(path, content):
    full_path = os.path.join(base, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

# 1. API Resources (Template based)
resources = [
    "User", "Profile", "Vehicle", "Driver", "JobCard", "JobCardInspection", 
    "PartsRequest", "PurchaseOrder", "PurchaseOrderItem", "Supplier", 
    "InventoryItem", "QcReview", "QcChecklistItem", "ScanSession", 
    "ScanAttempt", "AuditLog", "AppSetting"
]

for res in resources:
    content = f"""<?php

namespace App\\Http\\Resources\\Api\\V1;

use Illuminate\\Http\\Request;
use Illuminate\\Http\\Resources\\Json\\JsonResource;

class {res}Resource extends JsonResource
{{
    public function toArray(Request $request): array
    {{
        return parent::toArray($request);
    }}
}}
"""
    write_file(f"app/Http/Resources/Api/V1/{res}Resource.php", content)

# Dashboard Stats Resource
write_file("app/Http/Resources/Api/V1/DashboardStatsResource.php", """<?php

namespace App\\Http\\Resources\\Api\\V1;

use Illuminate\\Http\\Request;
use Illuminate\\Http\\Resources\\Json\\JsonResource;

class DashboardStatsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return $this->resource;
    }
}
""")

# 2. Form Requests (Template based)
requests = {
    "Login": "return ['email' => 'required|email', 'password' => 'required|string|min:8'];",
    "StoreVehicle": "return ['plate_number' => 'required|string|unique:vehicles,plate_number', 'make' => 'required|string', 'model' => 'required|string'];",
    "UpdateVehicle": "return ['plate_number' => 'sometimes|string', 'make' => 'sometimes|string'];",
    "StoreDriver": "return ['name' => 'required|string', 'license_number' => 'required|string'];",
    "UpdateDriver": "return ['name' => 'sometimes|string'];",
    "StoreJobCard": "return ['vehicle_id' => 'required|uuid', 'description' => 'required|string'];",
    "UpdateJobCard": "return ['description' => 'sometimes|string'];",
    "AssignJobCard": "return ['assigned_to' => 'required|uuid'];",
    "SignJobCard": "return ['signature' => 'required|string'];",
    "StorePartsRequest": "return ['job_card_id' => 'required|uuid', 'description' => 'required|string'];",
    "UpdatePartsRequest": "return ['description' => 'sometimes|string'];",
    "IssueParts": "return ['issued_parts' => 'required|array'];",
    "StorePurchaseOrder": "return ['supplier_id' => 'required|uuid'];",
    "UpdatePurchaseOrder": "return ['supplier_id' => 'sometimes|uuid'];",
    "ApprovePurchaseOrder": "return ['notes' => 'nullable|string'];",
    "StoreInventoryItem": "return ['part_number' => 'required|string', 'quantity' => 'required|integer'];",
    "UpdateInventoryItem": "return ['quantity' => 'sometimes|integer'];",
    "StoreQcReview": "return ['job_card_id' => 'required|uuid'];",
    "FinalizeQcReview": "return ['status' => 'required|string', 'signature' => 'required|string'];",
    "StoreUser": "return ['email' => 'required|email|unique:users', 'name' => 'required|string', 'password' => 'required|min:8'];",
    "UpdateUser": "return ['email' => 'sometimes|email', 'name' => 'sometimes|string'];",
    "SetPassword": "return ['password' => 'required|min:8|confirmed'];",
    "UpdateSettings": "return ['settings' => 'required|array'];",
    "StoreBayComment": "return ['comment' => 'required|string', 'bay_number' => 'required|string'];",
    "StoreSupervisorNote": "return ['note' => 'required|string'];"
}

for req, rules in requests.items():
    content = f"""<?php

namespace App\\Http\\Requests\\Api\\V1;

use Illuminate\\Foundation\\Http\\FormRequest;

class {req}Request extends FormRequest
{{
    public function authorize(): bool
    {{
        return true; // Add policy checks here if needed
    }}

    public function rules(): array
    {{
        {rules}
    }}
}}
"""
    write_file(f"app/Http/Requests/Api/V1/{req}Request.php", content)

print("Generated Resources and Requests.")
