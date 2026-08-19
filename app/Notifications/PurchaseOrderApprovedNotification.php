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
        return (new MailMessage)
                    ->subject('Purchase Order Approved')
                    ->line('A purchase order has been approved by ' . $this->roleContext . '.')
                    ->line('PO Number: ' . $this->po->po_number)
                    ->action('View Purchase Order', url('/purchase-orders/' . $this->po->id));
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
