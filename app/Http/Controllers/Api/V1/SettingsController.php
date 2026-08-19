<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Http\Requests\Api\V1\UpdateSettingsRequest;

class SettingsController extends Controller {
    public function index() {
        $this->authorize('view', AppSetting::class);
        return response()->json(AppSetting::all());
    }
    public function update(UpdateSettingsRequest $request) {
        $this->authorize('update', AppSetting::class);
        foreach ($request->validated('settings') as $key => $value) {
            AppSetting::set($key, $value);
        }
        return response()->json(AppSetting::all());
    }
}
