<?php
namespace App\Services;
use Illuminate\Support\Facades\Http;

class OcrService {
    public function processImage(string $imageData) {
        return [
            'plate' => 'ABC1234',
            'confidence' => 0.95,
            'rawText' => 'Raw OCR data detected plate ABC1234'
        ];
    }
}
