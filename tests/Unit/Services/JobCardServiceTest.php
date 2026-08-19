<?php

namespace Tests\Unit\Services;

use App\Models\JobCard;
use App\Services\JobCardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobCardServiceTest extends TestCase
{
    use RefreshDatabase;

    protected JobCardService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(JobCardService::class);
    }

    public function test_generates_job_number_with_correct_format()
    {
        $jobNumber = $this->service->generateJobNumber();
        
        $this->assertMatchesRegularExpression('/^JC-' . date('Ym') . '-\d{4}$/', $jobNumber);
    }

    public function test_sla_status_returns_ok_when_within_sla()
    {
        $jobCard = new JobCard();
        $jobCard->created_at = now();
        $jobCard->sla_hours = 24;
        
        $status = $this->service->checkSlaStatus($jobCard);
        
        $this->assertEquals('ok', $status);
    }

    public function test_sla_status_returns_warning_when_near_sla()
    {
        $jobCard = new JobCard();
        $jobCard->created_at = now()->subHours(20);
        $jobCard->sla_hours = 24;
        
        $status = $this->service->checkSlaStatus($jobCard);
        
        $this->assertEquals('warning', $status);
    }

    public function test_sla_status_returns_breached_when_over_sla()
    {
        $jobCard = new JobCard();
        $jobCard->created_at = now()->subHours(25);
        $jobCard->sla_hours = 24;
        
        $status = $this->service->checkSlaStatus($jobCard);
        
        $this->assertEquals('breached', $status);
    }
}
