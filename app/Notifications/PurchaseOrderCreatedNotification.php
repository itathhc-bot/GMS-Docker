<?php

namespace App\Notifications;

use App\Models\PurchaseOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PurchaseOrderCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public PurchaseOrder $po) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Purchase Order Awaiting Approval: ' . $this->po->po_number)
            ->line('A new purchase order has been created and is awaiting Manager Approval.')
            ->line('PO Number: ' . $this->po->po_number)
            ->line('Requested By: ' . ($this->po->requested_by_name ?? 'Staff'))
            ->line('Total Amount: ' . number_format((float) $this->po->total, 2) . ' ' . ($this->po->currency ?? 'USD'))
            ->action('Review & Approve (Manager)', url('/approvals/po/' . $this->po->id . '/manager'));
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'po_created',
            'purchase_order_id' => $this->po->id,
            'message' => 'New purchase order ' . $this->po->po_number . ' awaiting manager approval.',
        ];
    }
}
