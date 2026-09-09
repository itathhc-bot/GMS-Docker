<?php
class ProfileController {
    public function update(Request $request) {
        $user = $request->user();
    }
}
