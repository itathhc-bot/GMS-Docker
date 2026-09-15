<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);
        $vehicle = $this->vehicle;
        $vehicleData = $vehicle ? [
            'id' => $vehicle->id,
            'plate_number' => $vehicle->plate_number,
            'make' => $vehicle->make,
            'model' => $vehicle->model,
            'year' => $vehicle->year,
            'vin' => $vehicle->vin,
            'status' => $vehicle->status,
        ] : null;

        $mechanicName = $this->assignedUser?->profile?->full_name 
            ?? $this->assignedUser?->name;

        $data['vehicle'] = $vehicleData;
        $data['vehicles'] = $vehicleData;
        $data['vehicle_plate'] = $vehicle?->plate_number ?? '—';
        $data['vehicle_make'] = $vehicle?->make ?? '—';
        $data['vehicle_model'] = $vehicle?->model ?? '—';
        $data['mechanic_name'] = $mechanicName ?? '—';
        $data['reported_issue'] = $this->description;
        $data['assigned_mechanic_id'] = $this->assigned_to;
        return $data;
    }
}
