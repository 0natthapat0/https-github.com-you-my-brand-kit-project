import { Component, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import {
  AllCommunityModule,
  AutoGroupColumnDef,
  ColDef,
  ColGroupDef,
  ColumnState,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  ModuleRegistry,
  SideBarDef,
  themeQuartz,
} from 'ag-grid-community';
import { NxButtonComponent, NxIconButtonComponent } from '@allianz/ng-aquila/button';
import { NxIconComponent } from '@allianz/ng-aquila/icon';

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Row action menu cell renderer ─────────────────────────────
@Component({
  selector: 'app-row-action-cell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="row-action-wrapper" [class.menu-open]="menuVisible">
      <button class="row-action-btn" (click)="toggleMenu($event)">&#8942;</button>
      <div class="row-action-menu" *ngIf="menuVisible" (click)="$event.stopPropagation()">
        <button class="row-menu-item" (click)="onMenuAction('split-limit')">Split limit</button>
        <button class="row-menu-item" (click)="onMenuAction('split-deductible')">Split deductible</button>
      </div>
    </div>
  `,
  styles: [`
    .row-action-wrapper { position: relative; display: flex; align-items: center; justify-content: center; height: 100%; }
    .row-action-btn { background: none; border: none; cursor: pointer; font-size: 18px; color: #555; padding: 0 4px; line-height: 1; border-radius: 4px; }
    .row-action-btn:hover { background: #f0f0f0; }
    .menu-open .row-action-btn { background: #1a3d6d; color: #fff; border-radius: 4px; }
    .row-action-menu { position: fixed; z-index: 9999; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,.12); min-width: 160px; padding: 4px 0; }
    .row-menu-item { display: block; width: 100%; background: none; border: none; text-align: left; padding: 8px 16px; font-size: 13px; cursor: pointer; color: #1a1a1a; }
    .row-menu-item:hover { background: #f5fafe; }
  `],
})
export class RowActionCellRenderer implements ICellRendererAngularComp {
  menuVisible = false;
  private params!: ICellRendererParams;
  private menuX = 0;
  private menuY = 0;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(): boolean { return false; }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.menuVisible = !this.menuVisible;
    if (this.menuVisible) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      this.menuX = rect.right - 160;
      this.menuY = rect.bottom + 4;
      // Set position on menu via ViewChild would be cleaner but this works
      setTimeout(() => {
        const menu = document.querySelector<HTMLElement>('.row-action-menu');
        if (menu) {
          menu.style.left = `${this.menuX}px`;
          menu.style.top = `${this.menuY}px`;
        }
      });
    }
  }

  onMenuAction(action: string) {
    console.log(`Action: ${action}`, this.params.data);
    this.menuVisible = false;
  }

  @HostListener('document:click')
  onOutsideClick() { this.menuVisible = false; }
}

// ── Data interfaces ───────────────────────────────────────────
export interface CoverageRow {
  path: string[];
  locationRoles?: string;
  priority?: number;
  currency?: string;
  limSection?: string;
  limType?: string;
  limValue?: number;
  limCurrency?: string;
  limOccurrence?: string;
  limAggCurrency?: string;
  limAggValue?: number;
  biIp?: number;
  biIpUnit?: string;
  dedSection?: string;
  retentionType?: string;
  deductibleType?: string;
  dedLimitType?: string;
  dedLimitCurrency?: string;
  dedLimitValue?: number | null;
  dedMinCurrency?: string;
  dedMin?: number | null;
  dedMaxCurrency?: string;
  dedMax?: number | null;
  dedOccurrence?: string;
  dedAggCurrency?: string;
  dedAgg?: number | null;
  hasError?: boolean;
}

export interface GridView {
  id: string;
  name: string;
  isDefault: boolean;
  filterModel: Record<string, unknown> | null;
  columnState: ColumnState[];
}

// ── Cell renderer helpers ────────────────────────────────────
const dropdownCell = (value?: string) =>
  value
    ? `<span class="select-cell">${value}<span class="cell-chevron">&#x25BE;</span></span>`
    : '<span class="cell-empty">—</span>';

const numberCell = (value?: number | null, currency?: string) => {
  if (value == null) return '<span class="cell-empty">—</span>';
  const fmt = value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  return currency ? `${currency}&nbsp;${fmt}` : fmt;
};

const errorCell = (currency?: string) =>
  `<span class="error-cell">${currency ?? ''}&nbsp;<span class="error-flag" title="Enter value">&#9650;</span></span>`;

// ── Main component ────────────────────────────────────────────
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, NxButtonComponent, NxIconButtonComponent, NxIconComponent],
  templateUrl: './my-component.html',
  styleUrl: './my-component.scss',
})
export class MyComponent {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;
  private gridApi!: GridApi;

  readonly theme = themeQuartz.withParams({
    accentColor: '#007AB3',
    browserColorScheme: 'light',
    columnBorder: { style: 'solid', width: 1, color: '#E8E8E8' },
    fontFamily: 'inherit',
    fontSize: 12,
    headerBackgroundColor: '#FFFFFF',
    headerFontWeight: 600,
    headerTextColor: '#1A1A1A',
    rowBorder: { style: 'solid', width: 1, color: '#F0F0F0' },
    rowHeight: 36,
    headerHeight: 36,
    cellTextColor: '#1A1A1A',
    selectedRowBackgroundColor: '#E8F4FB',
    rowHoverColor: '#F5FAFE',
    borderColor: '#E8E8E8',
    wrapperBorderRadius: 4,
  });

  totalRows = 5;

  // ── View management ───────────────────────────────────────────
  views: GridView[] = [
    { id: 'default', name: 'All columns', isDefault: true, filterModel: null, columnState: [] },
  ];
  activeViewId = 'default';
  viewDropdownOpen = false;
  manageMode = false;
  saveViewMode = false;
  newViewName = '';

  get activeView(): GridView | undefined {
    return this.views.find(v => v.id === this.activeViewId);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.view-dropdown-wrapper')) {
      this.viewDropdownOpen = false;
      this.saveViewMode = false;
      this.manageMode = false;
    }
  }

  toggleViewDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.viewDropdownOpen = !this.viewDropdownOpen;
    if (!this.viewDropdownOpen) {
      this.saveViewMode = false;
      this.manageMode = false;
    }
  }

  applyView(view: GridView, event: MouseEvent) {
    event.stopPropagation();
    if (this.manageMode) return;
    this.activeViewId = view.id;
    this.gridApi.setFilterModel(view.filterModel);
    if (view.columnState.length > 0) {
      this.gridApi.applyColumnState({ state: view.columnState, applyOrder: true });
    } else {
      this.gridApi.resetColumnState();
    }
    this.viewDropdownOpen = false;
  }

  openSaveView(event: MouseEvent) {
    event.stopPropagation();
    this.saveViewMode = true;
    this.manageMode = false;
    this.newViewName = '';
  }

  confirmSaveView(event: Event) {
    event.stopPropagation();
    const name = this.newViewName.trim();
    if (!name) return;
    const newView: GridView = {
      id: Date.now().toString(),
      name,
      isDefault: false,
      filterModel: this.gridApi.getFilterModel() as Record<string, unknown> | null,
      columnState: this.gridApi.getColumnState(),
    };
    this.views.push(newView);
    this.activeViewId = newView.id;
    this.saveViewMode = false;
    this.viewDropdownOpen = false;
  }

  cancelSaveView(event: Event) {
    event.stopPropagation();
    this.saveViewMode = false;
  }

  openManageViews(event: MouseEvent) {
    event.stopPropagation();
    this.manageMode = true;
    this.saveViewMode = false;
  }

  deleteView(view: GridView, event: MouseEvent) {
    event.stopPropagation();
    this.views = this.views.filter(v => v.id !== view.id);
    if (this.activeViewId === view.id) this.activeViewId = 'default';
  }

  closeManageViews(event: MouseEvent) {
    event.stopPropagation();
    this.manageMode = false;
  }

  addLocationRules() { console.log('Add location rules'); }
  addCoverages() { console.log('Add coverages'); }

  // ── Grid config ───────────────────────────────────────────────
  treeData = true;
  getDataPath = (data: CoverageRow) => data.path;
  groupDefaultExpanded = 0;

  autoGroupColumnDef: AutoGroupColumnDef<CoverageRow> = {
    headerName: 'Coverages/Perils',
    width: 220,
    minWidth: 220,
    pinned: 'left',
    filter: 'agTextColumnFilter',
    floatingFilter: false,
    checkboxSelection: true,
    headerCheckboxSelection: true,
    cellRendererParams: {
      suppressCount: true,
      innerRenderer: (params: { node: { group: boolean }; value: string }) =>
        params.node.group ? `<span>${params.value}</span>` : '',
    },
  };

  colDefs: (ColDef<CoverageRow> | ColGroupDef<CoverageRow>)[] = [
    {
      field: 'locationRoles',
      headerName: 'Location rules',
      minWidth: 140,
      pinned: 'left',
      filter: 'agTextColumnFilter',
    },
    {
      field: 'priority',
      headerName: 'Priority',
      minWidth: 110,
      pinned: 'left',
      filter: 'agNumberColumnFilter',
      valueFormatter: p => p.value != null
        ? p.value.toLocaleString('de-DE', { minimumFractionDigits: 2 })
        : '',
    },
    {
      field: 'currency',
      headerName: 'Currency',
      minWidth: 100,
      filter: 'agTextColumnFilter',
      cellRenderer: (p: { value?: string }) => dropdownCell(p.value),
    },
    // ── Limits group ────────────────────────────────────────────
    {
      headerName: 'Limits - All Entries are 100%',
      children: [
        { field: 'limSection', headerName: 'Section', minWidth: 90, filter: 'agTextColumnFilter' },
        { field: 'limType', headerName: 'Limit type', minWidth: 120, filter: 'agTextColumnFilter', cellRenderer: (p: { value?: string }) => dropdownCell(p.value) },
        {
          field: 'limValue',
          headerName: 'Limit value',
          minWidth: 140,
          filter: 'agNumberColumnFilter',
          cellRenderer: (p: { data?: CoverageRow }) =>
            p.data?.hasError
              ? errorCell(p.data.limCurrency)
              : numberCell(p.data?.limValue, p.data?.limCurrency),
        },
        { field: 'limOccurrence', headerName: 'Occurrence', minWidth: 140, filter: 'agTextColumnFilter', cellRenderer: (p: { value?: string }) => dropdownCell(p.value) },
        {
          field: 'limAggValue',
          headerName: 'Aggregate amount (optional)',
          minWidth: 190,
          filter: 'agNumberColumnFilter',
          cellRenderer: (p: { data?: CoverageRow }) => numberCell(p.data?.limAggValue, p.data?.limAggCurrency),
        },
        { field: 'biIp', headerName: 'BI IP', minWidth: 70, filter: 'agNumberColumnFilter' },
        { field: 'biIpUnit', headerName: 'BI IP unit', minWidth: 120, filter: 'agTextColumnFilter', cellRenderer: (p: { value?: string }) => dropdownCell(p.value) },
      ],
    } as ColGroupDef<CoverageRow>,
    // ── Deductibles group ───────────────────────────────────────
    {
      headerName: 'Deductibles - All Entries are 100%',
      children: [
        { field: 'dedSection', headerName: 'Section', minWidth: 90, filter: 'agTextColumnFilter' },
        { field: 'retentionType', headerName: 'Retention type', minWidth: 140, filter: 'agTextColumnFilter', cellRenderer: (p: { value?: string }) => dropdownCell(p.value) },
        { field: 'deductibleType', headerName: 'Deductible type', minWidth: 170, filter: 'agTextColumnFilter', cellRenderer: (p: { value?: string }) => dropdownCell(p.value) },
        {
          field: 'dedLimitType',
          headerName: 'Limit value',
          minWidth: 170,
          filter: 'agTextColumnFilter',
          cellRenderer: (p: { data?: CoverageRow }) =>
            p.data?.dedLimitType
              ? `${dropdownCell(p.data.dedLimitType)}&nbsp;${p.data.dedLimitCurrency ?? ''}&nbsp;${numberCell(p.data.dedLimitValue)}`
              : '<span class="cell-empty">—</span>',
        },
        {
          field: 'dedMin',
          headerName: 'Min (optional)',
          minWidth: 140,
          filter: 'agNumberColumnFilter',
          cellRenderer: (p: { data?: CoverageRow }) => numberCell(p.data?.dedMin, p.data?.dedMinCurrency),
        },
        {
          field: 'dedMax',
          headerName: 'Max (optional)',
          minWidth: 140,
          filter: 'agNumberColumnFilter',
          cellRenderer: (p: { data?: CoverageRow }) => numberCell(p.data?.dedMax, p.data?.dedMaxCurrency),
        },
        { field: 'dedOccurrence', headerName: 'Occurrence', minWidth: 140, filter: 'agTextColumnFilter', cellRenderer: (p: { value?: string }) => dropdownCell(p.value) },
        {
          field: 'dedAgg',
          headerName: 'Aggregate amount (optional)',
          minWidth: 190,
          filter: 'agNumberColumnFilter',
          cellRenderer: (p: { data?: CoverageRow }) => numberCell(p.data?.dedAgg, p.data?.dedAggCurrency),
        },
      ],
    } as ColGroupDef<CoverageRow>,
    // ── Action column ────────────────────────────────────────────
    {
      headerName: '',
      width: 48,
      sortable: false,
      filter: false,
      resizable: false,
      suppressHeaderMenuButton: true,
      pinned: 'right',
      cellRenderer: RowActionCellRenderer,
      cellStyle: { overflow: 'visible', padding: '0' },
    },
  ];

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    floatingFilter: false,
    suppressHeaderMenuButton: false,
  };

  sideBar: SideBarDef = {
    toolPanels: [
      {
        id: 'columns',
        labelDefault: 'Columns',
        labelKey: 'columns',
        iconKey: 'columns',
        toolPanel: 'agColumnsToolPanel',
        toolPanelParams: {
          suppressRowGroups: true,
          suppressValues: true,
          suppressPivots: true,
          suppressPivotMode: true,
          suppressColumnFilter: false,
          suppressColumnSelectAll: false,
          suppressColumnExpandAll: true,
        },
      },
    ],
    defaultToolPanel: 'columns',
    position: 'right',
  };

  rowSelection = { mode: 'multiRow' as const, checkboxes: false, headerCheckbox: false };
  selectionColumnDef: ColDef = { hide: true, suppressColumnsToolPanel: true };
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [10, 25, 50];

  rowData: CoverageRow[] = [
    // FLExA — 3 location rules
    { path: ['FLExA'] },
    { path: ['FLExA', 'flexa-1'], locationRoles: '001 - All Locations', priority: 99, currency: 'EUR', limSection: 'PD & BI', limType: 'Amount', limCurrency: 'EUR', limValue: 12546, limOccurrence: 'Per Occurrence', limAggCurrency: 'EUR', limAggValue: 12546, biIp: 12, biIpUnit: 'Months', dedSection: 'PD & BI', deductibleType: 'Standard Deductible', dedLimitType: 'Amount', dedLimitCurrency: 'EUR', dedLimitValue: null, hasError: true, dedOccurrence: 'Per Occurrence' },
    { path: ['FLExA', 'flexa-2'], locationRoles: '010 - DEU - Germany', priority: 80, currency: 'EUR', limSection: 'PD & BI', limType: 'Amount', limCurrency: 'EUR', limValue: 12546, limOccurrence: 'Per Occurrence', limAggCurrency: 'EUR', limAggValue: 12546, biIp: 12, biIpUnit: 'Months', dedSection: 'PD & BI', deductibleType: 'Standard Deductible', dedLimitType: 'Amount', dedLimitCurrency: 'EUR', dedLimitValue: 18000, dedOccurrence: 'Per Occurrence' },
    { path: ['FLExA', 'flexa-3'], locationRoles: '002 - FRA - France', priority: 70, currency: 'EUR', limSection: 'PD & BI', limType: 'Amount', limCurrency: 'EUR', limValue: 12546, limOccurrence: 'Per Occurrence', limAggCurrency: 'EUR', limAggValue: 12546, biIp: 12, biIpUnit: 'Months', dedSection: 'PD & BI', deductibleType: 'Standard Deductible', dedLimitType: 'Amount', dedLimitCurrency: 'EUR', dedLimitValue: 18000, dedOccurrence: 'Per Occurrence' },
    // Flood
    { path: ['Flood'] },
    { path: ['Flood', 'flood-1'], locationRoles: '001 - All Locations', priority: 99, currency: 'EUR', limSection: 'PD & BI', limType: 'Amount', limCurrency: 'EUR', limValue: 12546, limOccurrence: 'Per Occurrence', limAggCurrency: 'EUR', limAggValue: 12546, biIp: 12, biIpUnit: 'Months', dedSection: 'PD & BI', deductibleType: 'Standard Deductible', dedLimitType: 'Amount', dedLimitCurrency: 'EUR', dedLimitValue: 18000, dedOccurrence: 'Per Occurrence' },
    // Windstorm
    { path: ['Windstorm'] },
    { path: ['Windstorm', 'ws-1'], locationRoles: '001 - All Locations', priority: 99, currency: 'EUR', limSection: 'PD & BI', limType: 'Amount', limCurrency: 'EUR', limValue: 12546, limOccurrence: 'Per Occurrence', limAggCurrency: 'EUR', limAggValue: 12546, biIp: 12, biIpUnit: 'Months', dedSection: 'PD & BI', deductibleType: 'Standard Deductible', dedLimitType: 'Amount', dedLimitCurrency: 'EUR', dedLimitValue: 18000, dedOccurrence: 'Per Occurrence' },
    // Earth Movement
    { path: ['Earth Movement'] },
    { path: ['Earth Movement', 'em-1'], locationRoles: '001 - All Locations', priority: 99, currency: 'EUR', limSection: 'PD & BI', limType: 'Amount', limCurrency: 'EUR', limValue: 12546, limOccurrence: 'Per Occurrence', limAggCurrency: 'EUR', limAggValue: 12546, biIp: 12, biIpUnit: 'Months', dedSection: 'PD & BI', deductibleType: 'Standard Deductible', dedLimitType: 'Amount', dedLimitCurrency: 'EUR', dedLimitValue: 18000, dedOccurrence: 'Per Occurrence' },
    // Severe Convective Storm
    { path: ['Severe Convective Storm'] },
    { path: ['Severe Convective Storm', 'scs-1'], locationRoles: '001 - All Locations', priority: 99, currency: 'EUR', limSection: 'PD & BI', limType: 'Amount', limCurrency: 'EUR', limValue: 12546, limOccurrence: 'Per Occurrence', limAggCurrency: 'EUR', limAggValue: 12546, biIp: 12, biIpUnit: 'Months', dedSection: 'PD & BI', deductibleType: 'Standard Deductible', dedLimitType: 'Amount', dedLimitCurrency: 'EUR', dedLimitValue: 18000, dedOccurrence: 'Per Occurrence' },
  ];

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }

  clearAllFilters() {
    this.gridApi.setFilterModel(null);
  }

  get activeFilterCount(): number {
    if (!this.gridApi) return 0;
    const model = this.gridApi.getFilterModel();
    return model ? Object.keys(model).length : 0;
  }
}
