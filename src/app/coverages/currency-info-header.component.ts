import { Component } from '@angular/core';
import type { IHeaderParams } from 'ag-grid-community';
import type { IInnerHeaderAngularComp } from 'ag-grid-angular';
import { NxIconComponent } from '@allianz/ng-aquila/icon';
import { NxPlainButtonComponent } from '@allianz/ng-aquila/button';
import { NxPopoverComponent, NxPopoverTriggerDirective } from '@allianz/ng-aquila/popover';

export interface CurrencyInfoHeaderParams extends IHeaderParams {
  message?: string;
}

// Inner header component for ag-grid (see colDef.headerComponentParams.innerHeaderComponent).
// Renders the column label (which truncates) plus a fixed-size, always-visible NDBX info icon
// that opens a click-triggered popover with a close (X) button — replaces the old plain
// unicode "ⓘ" + native headerTooltip hover approach.
@Component({
  selector: 'app-currency-info-header',
  standalone: true,
  imports: [NxIconComponent, NxPlainButtonComponent, NxPopoverComponent, NxPopoverTriggerDirective],
  template: `
    <span class="ch-label">{{ displayName }}</span>
    <button
      type="button"
      nxPlainButton
      size="small"
      class="ch-info-btn"
      [nxPopoverTriggerFor]="pop"
      nxPopoverDirection="bottom"
      aria-label="More information"
      (mousedown)="$event.stopPropagation()"
      (click)="$event.stopPropagation()"
    >
      <nx-icon name="info-circle-o" size="s" aria-hidden="true"></nx-icon>
    </button>
    <nx-popover #pop nxPopoverWidth="260">{{ message }}</nx-popover>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
      min-width: 0;
    }
    .ch-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .ch-info-btn {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `],
})
export class CurrencyInfoHeaderComponent implements IInnerHeaderAngularComp {
  displayName = '';
  message = '';

  agInit(params: CurrencyInfoHeaderParams): void {
    this.displayName = params.displayName;
    this.message = params.message ?? '';
  }

  refresh(params: CurrencyInfoHeaderParams): boolean {
    this.displayName = params.displayName;
    this.message = params.message ?? '';
    return true;
  }
}
