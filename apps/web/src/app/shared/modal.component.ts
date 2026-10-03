import { ChangeDetectionStrategy, Component, ElementRef, effect, input, model, viewChild } from '@angular/core';

/** Modale accessibile basata su <dialog> nativo (focus trap ed ESC gestiti dal browser). */
@Component({
  selector: 'cf-modal',
  template: `
    <dialog #dlg class="modal" [class.wide]="wide()" (close)="open.set(false)" (click)="onBackdrop($event)" [attr.aria-label]="title()">
      @if (open()) {
        <div class="modal-head">
          <h2>{{ title() }}</h2>
          <button type="button" class="btn btn-ghost icon-btn" (click)="open.set(false)" aria-label="Chiudi">✕</button>
        </div>
        <div class="modal-body"><ng-content /></div>
        <ng-content select="[modal-footer]" />
      }
    </dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalComponent {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly wide = input(false);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const d = this.dlg().nativeElement;
      if (this.open() && !d.open) d.showModal();
      if (!this.open() && d.open) d.close();
    });
  }

  protected onBackdrop(e: MouseEvent): void {
    if (e.target === this.dlg().nativeElement) this.open.set(false);
  }
}
