import os

base_dir = os.getcwd()
repos = ['Vehicle', 'Driver', 'JobCard', 'PartsRequest', 'PurchaseOrder', 'Supplier', 'InventoryItem', 'QcReview', 'ScanSession', 'AuditLog']

for repo in repos:
    # Contract
    contract_path = os.path.join(base_dir, f"app/Repositories/Contracts/{repo}RepositoryInterface.php")
    contract_content = f"""<?php

namespace App\\Repositories\\Contracts;

interface {repo}RepositoryInterface extends BaseRepositoryInterface
{{
}}
"""
    with open(contract_path, "w") as f:
        f.write(contract_content)

    # Eloquent
    eloquent_path = os.path.join(base_dir, f"app/Repositories/Eloquent/{repo}Repository.php")
    eloquent_content = f"""<?php

namespace App\\Repositories\\Eloquent;

use App\\Models\\{repo};
use App\\Repositories\\Contracts\\{repo}RepositoryInterface;

class {repo}Repository extends BaseRepository implements {repo}RepositoryInterface
{{
    public function __construct({repo} $model)
    {{
        parent::__construct($model);
    }}
}}
"""
    with open(eloquent_path, "w") as f:
        f.write(eloquent_content)

print("Repositories generated.")
