<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VehicleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);
        $data['driver_name'] = $this->driver?->full_name ?? '—';
        $data['driver'] = $this->driver ? [
            'id' => $this->driver->id,
            'full_name' => $this->driver->full_name,
            'phone' => $this->driver->phone,
            'email' => $this->driver->email,
        ] : null;
        return $data;
    }
}
