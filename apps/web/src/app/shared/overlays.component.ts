import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';
import { ConfirmService } from './confirm.service';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'cf-overlays',
  imports: [ModalComponent],
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast-' + t.kind">
          <span class="grow">{{ t.text }}</span>
          <button type="button" class="btn btn-ghost btn-sm icon-btn" (click)="toast.dismiss(t.id)" aria-label="Chiudi notifica">✕</button>
        </div>
      }
    </div>
    @let req = confirm.current();
    <cf-modal [open]="isOpen()" (openChange)="!$event && confirm.answer(false)" [title]="req?.title ?? ''">
      <p>{{ req?.message }}</p>
      <div modal-footer class="modal-foot">
        <button type="button" class="btn btn-ghost" (click)="confirm.answer(false)">Annulla</button>
        <button type="button" class="btn" [class.btn-primary]="!req?.danger" [class.btn-danger]="req?.danger" (click)="confirm.answer(true)">{{ req?.confirmLabel }}</button>
      </div>
    </cf-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverlaysComponent {
  protected readonly toast = inject(ToastService);
  protected readonly confirm = inject(ConfirmService);
  protected readonly isOpen = computed(() => this.confirm.current() !== null);
}
