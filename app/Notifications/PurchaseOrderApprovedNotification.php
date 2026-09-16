<?php

namespace App\Notifications;

use App\Models\PurchaseOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PurchaseOrderApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public PurchaseOrder $po,
        public string $roleContext
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        if ($this->roleContext === 'manager') {
            return (new MailMessage)
                ->subject('Purchase Order Awaiting Finance Approval: ' . $this->po->po_number)
                ->line('Purchase Order ' . $this->po->po_number . ' has been approved by Manager and is now awaiting Finance Approval.')
                ->line('PO Number: ' . $this->po->po_number)
                ->line('Total Amount: ' . number_format((float) $this->po->total, 2) . ' ' . ($this->po->currency ?? 'USD'))
                ->action('Review & Approve (Finance)', url('/approvals/po/' . $this->po->id . '/finance'));
        }

        return (new MailMessage)
            ->subject('Purchase Order Approved: ' . $this->po->po_number)
            ->line('Purchase Order ' . $this->po->po_number . ' has received final Finance Approval.')
            ->line('PO Number: ' . $this->po->po_number)
            ->line('Total Amount: ' . number_format((float) $this->po->total, 2) . ' ' . ($this->po->currency ?? 'USD'))
            ->action('View Purchase Orders', url('/purchase-orders'));
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'po_approved',
            'purchase_order_id' => $this->po->id,
            'message' => 'Purchase order ' . $this->po->po_number . ' has been approved by ' . $this->roleContext . '.',
        ];
    }
}
