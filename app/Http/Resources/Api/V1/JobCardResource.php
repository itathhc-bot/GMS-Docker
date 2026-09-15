<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);
        $vehicleData = $this->vehicle ? [
            'id' => $this->vehicle->id,
            'plate_number' => $this->vehicle->plate_number,
            'make' => $this->vehicle->make,
            'model' => $this->vehicle->model,
            'year' => $this->vehicle->year,
            'vin' => $this->vehicle->vin,
            'status' => $this->vehicle->status,
        ] : null;

        $data['vehicle'] = $vehicleData;
        $data['vehicles'] = $vehicleData;
        $data['reported_issue'] = $this->description;
        $data['assigned_mechanic_id'] = $this->assigned_to;
        return $data;
    }
}
