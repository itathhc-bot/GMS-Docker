<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PartsRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $jobCard = $this->jobCard;
        $vehicle = $jobCard?->vehicle;
        $requestedBy = $this->requestedBy;

        return array_merge(parent::toArray($request), [
            'job_card' => $jobCard ? [
                'id' => $jobCard->id,
                'job_number' => $jobCard->job_number,
                'bay_number' => $jobCard->bay_number,
                'vehicle' => $vehicle ? [
                    'id' => $vehicle->id,
                    'plate_number' => $vehicle->plate_number,
                    'make' => $vehicle->make,
                    'model' => $vehicle->model,
                ] : null,
            ] : null,
            'job_number' => $jobCard?->job_number,
            'vehicle' => $vehicle?->plate_number,
            'vehicle_plate' => $vehicle?->plate_number,
            'vehicle_make' => $vehicle?->make,
            'requested_by_user' => $requestedBy ? [
                'id' => $requestedBy->id,
                'name' => $requestedBy->name,
                'full_name' => $requestedBy->profile?->full_name ?? $requestedBy->name,
            ] : null,
            'mechanic' => $requestedBy?->profile?->full_name ?? $requestedBy?->name,
        ]);
    }
}

