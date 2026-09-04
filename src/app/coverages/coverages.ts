import { Component, HostListener, ChangeDetectorRef, ElementRef, OnInit } from '@angular/core';
import { CommentsService, PageComment } from './comments.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { NxIconComponent } from '@allianz/ng-aquila/icon';
import { NxButtonComponent, NxIconButtonComponent } from '@allianz/ng-aquila/button';
import { NxBreadcrumbComponent, NxBreadcrumbItemComponent } from '@allianz/ng-aquila/breadcrumb';
import { NxAvatarComponent, NxAvatarButtonDirective } from '@allianz/ng-aquila/avatar';
import { NxCheckboxComponent } from '@allianz/ng-aquila/checkbox';
import { NxMessageComponent } from '@allianz/ng-aquila/message';
import { NxPopoverComponent, NxPopoverTriggerDirective } from '@allianz/ng-aquila/popover';
import { CurrencyInfoHeaderComponent } from './currency-info-header.component';
import {
  AllCommunityModule,
  ColDef,
  ColGroupDef,
  ColumnState,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface OverallLimitRow {
  id: string;
  section: string;
  currency: string;
  sumInsured: number | null;
  limType: string;
  limValue: number | null;
  limOccurrence: string;
  limAggValue: number | null;
  biIp: number | null;
  biIpUnit: string;
  biInterest: string;
}

interface OverallDeductibleRow {
  id: string;
  section: string;
  currency: string;
  retentionType: string;
  deductibleType: string;
  dedValue: number | null;
  dedMin: number | null;
  dedMax: number | null;
  dedOccurrence: string;
  dedAggValue: number | null;
}

interface CoverageRow {
  id: string;
  parentId: string | null;
  coveragesPerils: string;
  locationRules: string;
  priority: number | null;
  currency: string;
  limSection: string;
  limType: string;
  limValue: number | null;
  limOccurrence: string;
  limAggValue: number | null;
  biIp: number | null;
  biIpUnit: string;
  errorFields?: string[];
  isExpanded?: boolean;
  dedSection: string;
  retentionType: string;
  deductibleType: string;
  dedLimitType: string;
  dedLimitValue: number | null;
  dedMin: number | null;
  dedMax: number | null;
  dedOccurrence: string;
  dedAggValue: number | null;
}

interface PanelCol { field: string; label: string; visible: boolean; }
interface PanelGroup { label: string; expanded: boolean; cols: PanelCol[]; }

const cloneCoverageRows = (rows: CoverageRow[]): CoverageRow[] =>
  rows.map(r => ({ ...r, errorFields: [...(r.errorFields ?? [])] }));

// Fills any missing required values on data rows so the Coverage Sublimits/Deductibles
// tab never shows empty "Enter value" cells.
const fillEmptyPerilValues = (rows: CoverageRow[]): CoverageRow[] =>
  rows.map(r => r.parentId == null ? r : {
    ...r,
    limValue: r.limValue ?? 12546,
    dedLimitValue: r.dedLimitValue ?? 18000,
  });

interface GridView {
  id: string;
  name: string;
  isDefault: boolean;
  filterModel: Record<string, unknown> | null;
  columnState: ColumnState[];
}

const empty: Partial<CoverageRow> = {
  currency: '', limSection: '', limType: '', limValue: null, limOccurrence: '',
  limAggValue: null, biIp: null, biIpUnit: '',
  dedSection: '', retentionType: '', deductibleType: '', dedLimitType: '',
  dedLimitValue: null, dedMin: null, dedMax: null, dedOccurrence: '', dedAggValue: null,
  errorFields: [],
};

const child = (id: string, parentId: string, locationRules: string, priority: number, extra: Partial<CoverageRow> = {}): CoverageRow => ({
  id, parentId, coveragesPerils: '', locationRules, priority,
  currency: 'EUR',
  limSection: 'PD & BI', limType: 'Amount', limValue: 12546, limOccurrence: 'Per Loss', limAggValue: 12546, biIp: 12, biIpUnit: 'Months',
  dedSection: 'PD & BI', retentionType: 'Standard Deductible', deductibleType: 'Standard Deductible',
  dedLimitType: 'Amount', dedLimitValue: 18000, dedMin: null, dedMax: null, dedOccurrence: 'Per Loss', dedAggValue: null,
  errorFields: [],
  ...extra,
});

const group = (id: string, name: string): CoverageRow => ({
  ...(empty as CoverageRow),
  id, parentId: null, coveragesPerils: name, locationRules: '', priority: null,
  isExpanded: true,
});

const PERIL_DATA: CoverageRow[] = [
  group('flexa', 'FLExA'),
  child('flexa-1', 'flexa', '001 - All Locations', 99, { limValue: null, dedLimitValue: null }),
  child('flexa-2', 'flexa', '010 - DEU - Germany', 80),
  child('flexa-3', 'flexa', '002 - FRA - France', 70),
  group('flood', 'Flood'),
  child('flood-1', 'flood', '001 - All Locations', 99),
  group('wind', 'Windstorm'),
  child('wind-1', 'wind', '001 - All Locations', 99),
  group('earth', 'Earth Movement'),
  child('earth-1', 'earth', '001 - All Locations', 99),
  group('scs', 'Severe Convective Storm'),
  child('scs-1', 'scs', '001 - All Locations', 99),
];

const OVERALL_LIMITS_DATA: OverallLimitRow[] = [
  {
    id: 'lim-pd', section: 'PD', currency: 'EUR',
    sumInsured: 100113000, limType: 'Sum Insured', limValue: 100113000,
    limOccurrence: 'Per Loss', limAggValue: null,
    biIp: null, biIpUnit: '', biInterest: '',
  },
  {
    id: 'lim-bi', section: 'BI', currency: 'EUR',
    sumInsured: 50005000, limType: 'Sum Insured', limValue: 50005000,
    limOccurrence: 'Per Loss', limAggValue: null,
    biIp: 12, biIpUnit: 'Months', biInterest: 'Gross Profit',
  },
];

const OVERALL_DEDUCTIBLES_DATA: OverallDeductibleRow[] = [
  {
    id: 'ded-pd', section: 'PD', currency: 'EUR',
    retentionType: 'Standard Deductible', deductibleType: 'Amount',
    dedValue: 10000000, dedMin: null, dedMax: null,
    dedOccurrence: 'Per Loss', dedAggValue: null,
  },
  {
    id: 'ded-bi', section: 'BI', currency: 'EUR',
    retentionType: 'Standard Deductible', deductibleType: 'Amount',
    dedValue: 10000000, dedMin: null, dedMax: null,
    dedOccurrence: 'Per Loss', dedAggValue: null,
  },
];

// Sections that expose BI IP / BI IP Unit / BI Interest columns in the Overall Limits table.
const BI_FIELDS_SECTIONS = ['BI', 'Delay in Startup (DSU)'];

const MARINE_CARGO_LIMITS_DATA: OverallLimitRow[] = [
  {
    id: 'lim-transit', section: 'Transit', currency: 'EUR',
    sumInsured: 4_004_000_000, limType: 'Amount', limValue: null,
    limOccurrence: 'Per Loss', limAggValue: null,
    biIp: null, biIpUnit: '', biInterest: '',
  },
  {
    id: 'lim-war', section: 'War', currency: 'EUR',
    sumInsured: 10_050_000_000, limType: 'Amount', limValue: null,
    limOccurrence: 'Per Loss', limAggValue: null,
    biIp: null, biIpUnit: '', biInterest: '',
  },
];

const MARINE_CARGO_DEDUCTIBLES_DATA: OverallDeductibleRow[] = [
  {
    id: 'ded-transit', section: 'Transit', currency: 'EUR',
    retentionType: 'Standard Deductible', deductibleType: 'Amount',
    dedValue: null, dedMin: null, dedMax: null,
    dedOccurrence: 'Per Loss', dedAggValue: null,
  },
  {
    id: 'ded-war', section: 'War', currency: 'EUR',
    retentionType: 'Standard Deductible', deductibleType: 'Amount',
    dedValue: null, dedMin: null, dedMax: null,
    dedOccurrence: 'Per Loss', dedAggValue: null,
  },
];

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:4px"><path d="M5 9L12 16L19 9" stroke="#414141" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHEVRON_RIGHT = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:4px"><path d="M9 5L16 12L9 19" stroke="#414141" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHEVRON_DROP = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M5 9L12 16L19 9" stroke="#414141" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const WARN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;vertical-align:middle"><path d="M12 3 2 21h20L12 3z" fill="#d0021b"/><rect x="11" y="9.5" width="2" height="6" rx="1" fill="white"/><circle cx="12" cy="17.5" r="1.1" fill="white"/></svg>`;

const numCell = (value: number | null, currency = '') => {
  if (value == null) return '<span style="color:#999;font-weight:400;font-style:normal">—</span>';
  const fmt = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency
    ? `<span style="display:flex;justify-content:space-between;align-items:center;width:100%;box-sizing:border-box"><span>${currency}</span><span>${fmt}</span></span>`
    : fmt;
};

const dropCell = (value: string, noChevron = false) =>
  value
    ? noChevron
      ? `<span>${value}</span>`
      : `<span style="display:flex;align-items:center;width:100%;justify-content:space-between;padding-right:16px;box-sizing:border-box"><span>${value}</span>${CHEVRON_DROP}</span>`
    : '<span style="color:#999;font-weight:400;font-style:normal">—</span>';

const errCell = () =>
  `<span style="display:flex;align-items:center;gap:16px;width:100%;box-sizing:border-box"><span style="color:#999;font-weight:400;font-style:normal">Enter value</span>${WARN_ICON}</span>`;

const placeholderCell = () =>
  `<span style="color:#999;font-weight:400;font-style:normal">Enter value</span>`;

const currencyPlaceholderCell = (currency: string) =>
  `<span style="display:flex;justify-content:space-between;align-items:center;width:100%;box-sizing:border-box"><span>${currency}</span><span style="color:#999;font-weight:400;font-style:normal">Enter value</span></span>`;

const percentCell = (value: number | null) => {
  if (value == null) return '<span style="color:#999;font-weight:400;font-style:normal">—</span>';
  const fmt = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `<span style="display:flex;justify-content:flex-end;width:100%;box-sizing:border-box">${fmt}&nbsp;%</span>`;
};

const percentPlaceholderCell = () =>
  `<span style="display:flex;align-items:center;justify-content:flex-end;gap:8px;width:100%;box-sizing:border-box"><span style="color:#999;font-weight:400;font-style:normal">%</span>${WARN_ICON}</span>`;

const plainNumberCell = (value: number | null) => {
  if (value == null) return '<span style="color:#999;font-weight:400;font-style:normal">—</span>';
  return `<span style="display:flex;justify-content:flex-end;width:100%;box-sizing:border-box">${value.toLocaleString('en-US')}</span>`;
};

const isLeaf = (params: any): boolean => !!params.data && params.data.parentId !== null;

const forLeaf = (fn: (p: any) => string) => (p: any) =>
  p.data?.parentId === null ? '' : fn(p);

const baseRowId = (id: string): string => id.replace(/::bi$/, '');

// Only span two rows if they are the PD/BI split pair of the same location (never across unrelated rows).
const spanSameLocationPair = (params: any): boolean => {
  const a = params.nodeA?.data;
  const b = params.nodeB?.data;
  if (!a || !b || a.parentId === null || b.parentId === null) return false;
  if (a.parentId !== b.parentId) return false;
  if (baseRowId(a.id) !== baseRowId(b.id)) return false;
  return params.valueA === params.valueB;
};

const LIMIT_SECTION_FIELDS: (keyof CoverageRow)[] = ['limType', 'limValue', 'limOccurrence', 'limAggValue', 'biIp', 'biIpUnit'];
const DED_SECTION_FIELDS: (keyof CoverageRow)[] = ['retentionType', 'deductibleType', 'dedLimitType', 'dedLimitValue', 'dedMin', 'dedMax', 'dedOccurrence', 'dedAggValue'];

const parseShorthand = (val: any): number | null => {
  if (val == null || val === '') return null;
  const s = String(val).trim().toLowerCase().replace(/,/g, '').replace(/\s/g, '');
  const k = s.match(/^(-?\d+\.?\d*)k$/);  if (k) return parseFloat(k[1]) * 1_000;
  const m = s.match(/^(-?\d+\.?\d*)m$/);  if (m) return parseFloat(m[1]) * 1_000_000;
  const b = s.match(/^(-?\d+\.?\d*)b$/);  if (b) return parseFloat(b[1]) * 1_000_000_000;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

const SECTION_VALUES = ['PD', 'BI', 'PD & BI'];
const BI_INTEREST_VALUES = ['Gross Profit', 'Revenue', 'Rental Income', 'Other'];
const OCCURRENCE_VALUES = ['Per Loss', 'Per Occurrence'];
const LIMIT_TYPE_VALUES = ['Amount'];
// Exchange rates relative to EUR (units of currency per 1 EUR)
const EXCHANGE_RATES_TO_EUR: Record<string, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
  CHF: 0.95,
  AED: 3.97,
  AUD: 1.62,
  CAD: 1.47,
  CNY: 7.75,
  DKK: 7.46,
  ERN: 16.2,
  FKP: 0.86,
  HKD: 8.43,
  INR: 89.7,
  JPY: 163,
  KRW: 1420,
  MXN: 18.4,
  NOK: 11.6,
  NZD: 1.76,
  SEK: 11.3,
  SGD: 1.45,
  THB: 39.4,
  ZAR: 20.4,
};
const convertCurrency = (value: number, from: string, to: string): number => {
  const fromRate = EXCHANGE_RATES_TO_EUR[from] ?? 1;
  const toRate = EXCHANGE_RATES_TO_EUR[to] ?? 1;
  return Math.round((value / fromRate) * toRate * 100) / 100;
};
const BI_IP_UNIT_VALUES = ['Days', 'Weeks', 'Months'];
const RETENTION_TYPE_VALUES = ['Standard Deductible', 'Excess', 'Franchise'];
const DEDUCTIBLE_TYPE_VALUES = ['Standard Deductible', 'Franchise', 'Excess'];
// Neither the Overall Limits/Deductibles table nor the Transit tab's "Deductible Type"
// column offer "% of VARTOL" or "Number of days".
const OVERALL_TABLE_DEDUCTIBLE_TYPE_PD = ['Amount', '% of Sum Insured', '% of Loss'];
const OVERALL_TABLE_DEDUCTIBLE_TYPE_BI = ['Amount'];
const OVERALL_TABLE_DEDUCTIBLE_TYPE_ALL = ['Amount', '% of Sum Insured', '% of Loss'];
const isPercentDeductibleType = (type: string | undefined) =>
  type === '% of Sum Insured' || type === '% of Loss' || type === '% of VARTOL';

const CURRENCY_LIST: { code: string; name: string }[] = [
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'ERN', name: 'Eritrean Nafka' },
  { code: 'EUR', name: 'Euro' },
  { code: 'FKP', name: 'Falkland Pound' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'USD', name: 'United States Dollar' },
  { code: 'ZAR', name: 'South African Rand' },
];

// ── Transit Sublimits/Deductibles (Marine Cargo) ──────────────────
interface TransitRow {
  id: string;
  parentId: string | null;
  segment: string;
  segmentBreakdown: string;
  condition: string;
  currency: string;
  totalSendings: number | null;
  limType: string;
  limValue: number | null;
  limOccurrence: string;
  limAggValue: number | null;
  retentionType: string;
  dedLimitType: string;
  dedLimitValue: number | null;
  dedMin: number | null;
  dedMax: number | null;
  dedOccurrence: string;
  dedAggValue: number | null;
  isExpanded?: boolean;
}

const CONDITION_VALUES = [
  'ICC A or equivalent',
  'ICC B or equivalent',
  'ICC C or equivalent',
  'Bulk Oil Clauses - including guaranteed OutRun',
  'Bulk Oil Clauses',
  'All Risks',
  'With Everage',
  'FPA',
  'All Risks - including guaranteed OutRun',
  'All Risks - excluding guaranteed OutRun',
];

const transitGroup = (id: string, segment: string, condition: string, totalSendings: number | null): TransitRow => ({
  id, parentId: null, segment, segmentBreakdown: '', condition,
  currency: 'EUR', totalSendings,
  limType: '', limValue: null, limOccurrence: '', limAggValue: null,
  retentionType: '', dedLimitType: '', dedLimitValue: null,
  dedMin: null, dedMax: null, dedOccurrence: '', dedAggValue: null,
  isExpanded: true,
});

const transitChild = (id: string, parentId: string, segmentBreakdown: string, totalSendings: number | null, extra: Partial<TransitRow> = {}): TransitRow => ({
  id, parentId, segment: '', segmentBreakdown, condition: '',
  currency: 'EUR', totalSendings,
  limType: 'Amount', limValue: null, limOccurrence: 'Per Loss', limAggValue: null,
  retentionType: 'Standard Deductible', dedLimitType: 'Amount', dedLimitValue: null,
  dedMin: null, dedMax: null, dedOccurrence: 'Per Loss', dedAggValue: null,
  ...extra,
});

const TRANSIT_DATA: TransitRow[] = [
  transitGroup('num1', 'Segment 1', 'ICC A or equivalent', 10_000_000),
  transitChild('num1-continental', 'num1', 'continental', 5_000_000),
  transitChild('num1-domestic', 'num1', 'domestic', 1_000_000),
  transitChild('num1-intercontinental', 'num1', 'intercontinental', 4_000_000),
  transitGroup('num2', 'Segment 2', 'ICC A or equivalent', 200_000_000),
  transitChild('num2-domestic', 'num2', 'domestic', null),
  transitChild('num2-continental', 'num2', 'continental', null),
  transitChild('num2-intercontinental', 'num2', 'intercontinental', 200_000_000),
];

@Component({
  selector: 'app-coverages',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, NxIconComponent, NxButtonComponent, NxIconButtonComponent, NxBreadcrumbComponent, NxBreadcrumbItemComponent, NxAvatarComponent, NxAvatarButtonDirective, NxCheckboxComponent, NxMessageComponent, NxPopoverComponent, NxPopoverTriggerDirective],
  templateUrl: './coverages.html',
  styleUrl: './coverages.scss',
})
export class CoveragesComponent implements OnInit {
  constructor(
    private cdr: ChangeDetectorRef,
    private el: ElementRef<HTMLElement>,
    private commentsService: CommentsService,
  ) {}

  ngOnInit(): void {
    this.commentsService.list().subscribe(comments => {
      this.comments = comments;
      this.nextPinNumber = Math.max(0, ...comments.map(c => c.pinNumber ?? 0)) + 1;
      this.cdr.detectChanges();
    });
    this.commentsService.onCommentEvent().subscribe(event => {
      if (event.type === 'added') {
        if (this.comments.some(c => c.id === event.comment.id)) return;
        this.comments.push(event.comment);
        this.nextPinNumber = Math.max(this.nextPinNumber, (event.comment.pinNumber ?? 0) + 1);
      } else if (event.type === 'updated') {
        const idx = this.comments.findIndex(c => c.id === event.comment.id);
        if (idx !== -1) this.comments[idx] = event.comment;
      } else if (event.type === 'deleted') {
        this.comments = this.comments.filter(c => c.id !== event.id);
        if (this.highlightedCommentId === event.id) this.highlightedCommentId = null;
      }
      this.cdr.detectChanges();
    });
  }

  private gridApi!: GridApi;
  private limitsGridApi!: GridApi;
  private deductiblesGridApi!: GridApi;
  limitsGridWidth = 'auto';
  deductiblesGridWidth = 'auto';
  // Select-editor dropdowns (and other ag-Grid popups) render into this element instead of
  // the grid's own DOM — otherwise ancestors with `overflow: hidden` (e.g. .grid-wrapper)
  // clip them, which was silently hiding extra options in narrow columns like "Limit type".
  popupParent: HTMLElement = document.body;

  // Two fully independent copies of the whole page's editable state. Switching versions
  // saves the live fields below into the outgoing version's slot, then restores the
  // incoming version's slot into those same live fields.
  private allData: CoverageRow[] = cloneCoverageRows(fillEmptyPerilValues(PERIL_DATA));
  // Default LOB is Marine Cargo, so the Overall Limits/Deductibles tables start out
  // showing the Marine Cargo sections rather than the PD/BI (NR&C) sections.
  limitsRowData: OverallLimitRow[] = MARINE_CARGO_LIMITS_DATA.map(r => ({ ...r }));
  deductiblesRowData: OverallDeductibleRow[] = MARINE_CARGO_DEDUCTIBLES_DATA.map(r => ({ ...r }));
  private originalLimitsData: OverallLimitRow[] = MARINE_CARGO_LIMITS_DATA.map(r => ({ ...r }));
  private originalDeductiblesData: OverallDeductibleRow[] = MARINE_CARGO_DEDUCTIBLES_DATA.map(r => ({ ...r }));
  limitsMerged = false;
  deductiblesMerged = false;
  groupLimitsSplit: Record<string, boolean> = {};
  groupDeductiblesSplit: Record<string, boolean> = {};
  // ── Overall Limits/Deductibles table version toggle ────────────
  tableVersion: 'v1' | 'v2' | 'v3' = 'v3';

  setTableVersion(v: 'v1' | 'v2' | 'v3'): void {
    if (this.tableVersion === v) return;
    this.tableVersion = v;
    this.limitsColDefs = this.buildLimitsColDefs();
    this.deductiblesColDefs = this.buildDeductiblesColDefs();
  }

  // Version 2's currency banner action: applies the submission currency to the Overall
  // Limits/Deductibles tables only (mirrors what picking a currency on the PD row did in Version 1).
  applyOverallCurrencyChange(): void {
    this.convertLimitsAndDeductiblesToCurrency(this.selectedCurrency);
    this.showCurrencyMessage = false;
    this.refreshAllGrids();
  }

  // Save/draft/lock state for the Overall Limits/Deductibles tab, tracked independently per
  // table version — clicking Save or Save draft while Version 1 is active only locks/saves
  // Version 1; Version 2 keeps its own separate state (and vice versa).
  private overallSaveState: Record<'v1' | 'v2' | 'v3', {
    isDraft: boolean;
    lockedMode: 'draft' | 'final';
    isSaved: boolean;
    currencyLocked: boolean;
    showCurrencyMessage: boolean;
  }> = {
    v1: { isDraft: false, lockedMode: 'draft', isSaved: false, currencyLocked: false, showCurrencyMessage: false },
    v2: { isDraft: false, lockedMode: 'draft', isSaved: false, currencyLocked: false, showCurrencyMessage: false },
    v3: { isDraft: false, lockedMode: 'draft', isSaved: false, currencyLocked: false, showCurrencyMessage: false },
  };

  private get overall() {
    return this.overallSaveState[this.tableVersion];
  }

  get isDraft(): boolean { return this.overall.isDraft; }
  set isDraft(v: boolean) { this.overall.isDraft = v; }

  // Distinguishes why the page is locked: 'draft' (Save draft banner) vs 'final' (Save button, no banner).
  get lockedMode(): 'draft' | 'final' { return this.overall.lockedMode; }
  set lockedMode(v: 'draft' | 'final') { this.overall.lockedMode = v; }

  // Becomes true only once the user clicks Save (not Save draft).
  get isSaved(): boolean { return this.overall.isSaved; }
  set isSaved(v: boolean) { this.overall.isSaved = v; }

  // Once the user clicks Save or Save draft, currency conversion stays locked even after
  // clicking Edit to go back in — only the label + banner update, values never re-convert.
  get currencyLocked(): boolean { return this.overall.currencyLocked; }
  set currencyLocked(v: boolean) { this.overall.currencyLocked = v; }

  // Coverage Sublimits/Deductibles tab has its own save lock — independent of the Overall
  // Limits/Deductibles version toggle above.
  sublimitsLocked = false;

  // ── Merge/split state ────────────────────────────────────────
  showMergeLimitsModal = false;
  showMergeDeductiblesModal = false;
  limitsActionMenuOpen = false;
  deductiblesActionMenuOpen = false;
  actionMenuPos = { top: 0, left: 0 };
  mergeToastVisible = false;
  mergeToastMessage = '';
  mergeToastSubMessage = '';

  // ── Coverage Sublimits merge/split state ──────────────────────
  sublimitsActionMenuOpen = false;
  sublimitsActionGroupId: string | null = null;
  showSublimitsMergeModal = false;
  pendingSublimitsMerge: { groupId: string; section: 'limits' | 'deductibles' } | null = null;
  private skipNextDocumentClose = false;
  readonly alternativeId = 'ATN01010354.1.0.001';

  // ── Right-click "Apply to all" context menu ────────────────────
  applyAllMenuOpen = false;
  applyAllMenuPos = { top: 0, left: 0 };
  private applyAllContext: { grid: 'limits' | 'deductibles' | 'coverages'; field: string; value: unknown } | null = null;
  readonly currencyOptions = CURRENCY_LIST;
  selectedCurrency = 'EUR';
  previousCurrency = 'EUR';
  get showCurrencyMessage(): boolean { return this.overall.showCurrencyMessage; }
  set showCurrencyMessage(v: boolean) { this.overall.showCurrencyMessage = v; }
  currencyFlyoutOpen = false;
  currencyFlyoutPos = { top: 0, left: 0 };
  currencySearch = '';
  private currencyFlyoutRowId = '';
  currencyFlyoutGrid: 'limits' | 'coverages' | 'submission' | 'overall' | null = null;

  // ── LOBs dropdown ─────────────────────────────────────────────
  readonly lobOptions = ['Marine Cargo', 'NR&C'];
  selectedLob = 'Marine Cargo';
  lobFlyoutOpen = false;
  lobFlyoutPos = { top: 0, left: 0 };

  openLobFlyout(event: MouseEvent): void {
    const wrap = (event.target as HTMLElement)?.closest('.meta-currency-select-wrap') as HTMLElement;
    const rect = wrap?.getBoundingClientRect();
    if (rect) this.lobFlyoutPos = { top: rect.bottom + 2, left: rect.left };
    this.skipNextDocumentClose = true;
    this.currencyFlyoutOpen = false;
    this.lobFlyoutOpen = true;
  }

  selectLob(lob: string): void {
    const changed = lob !== this.selectedLob;
    this.selectedLob = lob;
    this.lobFlyoutOpen = false;
    // The 'coverage' tab only exists under Marine Cargo — fall back if it's no longer visible.
    if (lob !== 'Marine Cargo' && this.activeTab === 'coverage') {
      this.activeTab = 'sublimits';
    }
    if (changed) {
      // Overall Limits/Deductibles show different sections depending on the LOB —
      // Marine Cargo gets Transit/Storage/DSU/War, all other LOBs get PD/BI.
      const limitsData = lob === 'Marine Cargo' ? MARINE_CARGO_LIMITS_DATA : OVERALL_LIMITS_DATA;
      const deductiblesData = lob === 'Marine Cargo' ? MARINE_CARGO_DEDUCTIBLES_DATA : OVERALL_DEDUCTIBLES_DATA;
      this.limitsRowData = limitsData.map(r => ({ ...r }));
      this.deductiblesRowData = deductiblesData.map(r => ({ ...r }));
      this.originalLimitsData = limitsData.map(r => ({ ...r }));
      this.originalDeductiblesData = deductiblesData.map(r => ({ ...r }));
      this.limitsMerged = false;
      this.deductiblesMerged = false;
      this.recalcLimitsWidth();
      this.recalcDeductiblesWidth();
    }
  }

  get sublimitsTabLabel(): string {
    return this.selectedLob === 'Marine Cargo' ? 'Transit Sublimits/Deductibles' : 'Coverage Sublimits/Deductibles';
  }

  get productTemplateLabel(): string {
    return this.selectedLob === 'Marine Cargo' ? 'Marine-Cargo-ProductTemplate' : 'Operational Mining';
  }

  get coveredSectionsLabel(): string {
    if (this.selectedLob !== 'Marine Cargo') return 'Operational Mining';
    const sections = MARINE_CARGO_LIMITS_DATA.map(r => r.section);
    const shown = sections.slice(0, 3).join(', ');
    return sections.length > 3 ? `${shown},... (${sections.length})` : shown;
  }

  get defaultCurrencyOption(): { code: string; name: string } | undefined {
    return CURRENCY_LIST.find(c => c.code === this.selectedCurrency);
  }

  get currentCellCurrency(): string {
    if (this.currencyFlyoutGrid === 'submission') return this.selectedCurrency;
    if (this.currencyFlyoutGrid === 'overall') return this.overallCurrency;
    if (!this.currencyFlyoutRowId || !this.currencyFlyoutGrid) return '';
    const rows = this.currencyFlyoutGrid === 'limits' ? this.limitsRowData : this.allData;
    return rows.find(r => r.id === this.currencyFlyoutRowId)?.currency ?? '';
  }

  // Full currency list in its natural order (no pulling the current selection to the top).
  // The current cell currency is still marked with a checkmark inline via currentCellCurrency.
  get filteredCurrencyList(): { code: string; name: string }[] {
    const q = this.currencySearch.toLowerCase();
    const pinnedCode = this.currencyFlyoutGrid !== 'submission' ? this.defaultCurrencyOption?.code : undefined;
    return CURRENCY_LIST.filter(c =>
      c.code !== pinnedCode && (!q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    );
  }

  get flyoutEmpty(): boolean {
    return !this.defaultMatchesCurrencySearch() && this.filteredCurrencyList.length === 0;
  }

  defaultMatchesCurrencySearch(): boolean {
    const d = this.defaultCurrencyOption;
    if (!d) return false;
    const q = this.currencySearch.toLowerCase();
    return !q || d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
  }

  activeTab = 'overall';
  errorPanelOpen = false;
  errorPanelTab: 'errors' | 'attachments' | 'comments' = 'errors';
  saveAttempted = false;

  comments: PageComment[] = [];
  nextPinNumber = 1;
  commentModeActive = false;
  pendingComment: { x: number; y: number } | null = null;
  newPinCommentText = '';
  highlightedCommentId: string | null = null;
  editingCommentId: string | null = null;
  editingText = '';
  openPinCommentId: string | null = null;

  get selectedPinComment(): PageComment | null {
    return this.comments.find(c => c.id === this.openPinCommentId) ?? null;
  }

  get selectedPinPopoverStyle(): { [key: string]: string } {
    const c = this.selectedPinComment;
    if (!c || c.x == null || c.y == null) return {};
    const pageMain = this.el.nativeElement.querySelector('.page-main') as HTMLElement | null;
    const popoverWidth = 260;
    let left = c.x + 28;
    if (pageMain && left + popoverWidth > pageMain.scrollWidth) {
      left = Math.max(0, c.x - popoverWidth - 12);
    }
    return { left: left + 'px', top: c.y + 'px' };
  }

  closePinPopover(event?: MouseEvent): void {
    event?.stopPropagation();
    this.openPinCommentId = null;
    this.editingCommentId = null;
  }

  get activeComments(): PageComment[] {
    return this.comments.filter(c => !c.resolved);
  }

  get resolvedComments(): PageComment[] {
    return this.comments.filter(c => c.resolved);
  }

  openCommentsPanel(): void {
    this.errorPanelOpen = true;
    this.errorPanelTab = 'comments';
  }

  toggleCommentsPanel(): void {
    if (this.errorPanelOpen && this.errorPanelTab === 'comments') {
      this.errorPanelOpen = false;
    } else {
      this.openCommentsPanel();
    }
  }

  toggleCommentMode(event: MouseEvent): void {
    event.stopPropagation();
    this.commentModeActive = !this.commentModeActive;
    this.pendingComment = null;
  }

  onCommentModeOverlayClick(event: MouseEvent): void {
    this.commentModeActive = false;
    const pageMain = this.el.nativeElement.querySelector('.page-main') as HTMLElement | null;
    if (!pageMain) return;
    const rect = pageMain.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      return;
    }
    const x = event.clientX - rect.left + pageMain.scrollLeft;
    const y = event.clientY - rect.top + pageMain.scrollTop;
    this.newPinCommentText = '';
    this.pendingComment = { x, y };
  }

  get pendingPopoverStyle(): { [key: string]: string } {
    if (!this.pendingComment) return {};
    const pageMain = this.el.nativeElement.querySelector('.page-main') as HTMLElement | null;
    const popoverWidth = 260;
    let left = this.pendingComment.x + 28;
    if (pageMain && left + popoverWidth > pageMain.scrollWidth) {
      left = Math.max(0, this.pendingComment.x - popoverWidth - 12);
    }
    return { left: left + 'px', top: this.pendingComment.y + 'px' };
  }

  cancelPendingComment(): void {
    this.pendingComment = null;
    this.newPinCommentText = '';
  }

  // Every visitor to this shared mockup should show up under their own name rather than
  // the hardcoded "You"/"JD" placeholder — ask once per browser and remember the answer.
  private getCommenterIdentity(): { author: string; avatarInitials: string } {
    let name = localStorage.getItem('commenterName');
    if (!name) {
      name = (window.prompt('Your name, for comments:') || '').trim() || 'Anonymous';
      localStorage.setItem('commenterName', name);
    }
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || '?';
    return { author: name, avatarInitials: initials };
  }

  submitPendingComment(): void {
    const text = this.newPinCommentText.trim();
    if (!text || !this.pendingComment) return;
    const pinNumber = this.nextPinNumber++;
    const { author, avatarInitials } = this.getCommenterIdentity();
    this.commentsService.create({
      author,
      avatarInitials,
      timestamp: 'Just now',
      text,
      x: this.pendingComment.x,
      y: this.pendingComment.y,
      pinNumber,
      tab: this.activeTab,
    }).subscribe(created => {
      if (this.comments.some(c => c.id === created.id)) return;
      this.comments.push(created);
      this.cdr.detectChanges();
    });
    this.pendingComment = null;
    this.newPinCommentText = '';
    this.openCommentsPanel();
  }

  onPinClick(comment: PageComment, event: MouseEvent): void {
    event.stopPropagation();
    this.highlightedCommentId = comment.id;
    this.openPinCommentId = this.openPinCommentId === comment.id ? null : comment.id;
    if (this.openPinCommentId !== comment.id) this.editingCommentId = null;
    this.openCommentsPanel();
  }

  goToComment(comment: PageComment): void {
    this.highlightedCommentId = comment.id;
    if (comment.x == null || comment.y == null) return;
    if (comment.tab && comment.tab !== this.activeTab) {
      this.activeTab = comment.tab;
    }
    setTimeout(() => {
      document.querySelector(`.comment-pin[data-comment-id="${comment.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    });
  }

  startEdit(comment: PageComment, event: MouseEvent): void {
    event.stopPropagation();
    this.editingCommentId = comment.id;
    this.editingText = comment.text;
  }

  cancelEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.editingCommentId = null;
    this.editingText = '';
  }

  saveEdit(comment: PageComment, event: MouseEvent): void {
    event.stopPropagation();
    const text = this.editingText.trim();
    if (!text) return;
    this.commentsService.update(comment.id, { text }).subscribe(updated => {
      const idx = this.comments.findIndex(c => c.id === updated.id);
      if (idx !== -1) this.comments[idx] = updated;
      this.cdr.detectChanges();
    });
    this.editingCommentId = null;
    this.editingText = '';
  }

  // Toggles resolved state — used for both closing an open comment and reopening a resolved one.
  closeComment(comment: PageComment, event: MouseEvent): void {
    event.stopPropagation();
    this.commentsService.update(comment.id, { resolved: !comment.resolved }).subscribe(updated => {
      const idx = this.comments.findIndex(c => c.id === updated.id);
      if (idx !== -1) this.comments[idx] = updated;
      this.cdr.detectChanges();
    });
  }

  deleteComment(comment: PageComment, event: MouseEvent): void {
    event.stopPropagation();
    this.commentsService.delete(comment.id).subscribe(() => {
      this.comments = this.comments.filter(c => c.id !== comment.id);
      if (this.highlightedCommentId === comment.id) this.highlightedCommentId = null;
      if (this.editingCommentId === comment.id) this.editingCommentId = null;
      this.cdr.detectChanges();
    });
  }

  private readonly FIELD_LABELS: Record<string, string> = {
    priority: 'Priority',
    limValue: 'Limit value',
    limAggValue: 'Aggregate amount (Limits)',
    biIp: 'BI IP',
    dedLimitValue: 'Limit amount',
    dedMin: 'Min',
    dedMax: 'Max',
    dedAggValue: 'Aggregate amount (Deductibles)',
  };

  get pageErrors(): { label: string; message: string; rowId: string; field: string }[] {
    const result: { label: string; message: string; rowId: string; field: string }[] = [];
    this.allData
      .filter(row => row.parentId !== null && row.errorFields && row.errorFields.length > 0)
      .forEach(row => {
        const peril = this.allData.find(g => g.id === row.parentId)?.coveragesPerils ?? '';
        (row.errorFields ?? []).forEach(f => {
          result.push({
            label: this.FIELD_LABELS[f] ?? f,
            message: `${peril} — ${row.locationRules}`,
            rowId: row.id,
            field: f,
          });
        });
      });
    return result;
  }

  goToIssue(rowId: string, field: string): void {
    // Expand the parent group if collapsed
    const row = this.allData.find(r => r.id === rowId);
    if (row?.parentId) {
      const parent = this.allData.find(r => r.id === row.parentId);
      if (parent && !parent.isExpanded) {
        this.toggleGroup(parent.id);
      }
    }

    // Wait for grid to fully re-render, then scroll and flash
    setTimeout(() => {
      const node = this.gridApi.getRowNode(rowId);
      if (!node) return;
      this.gridApi.ensureNodeVisible(node, 'middle');
      setTimeout(() => {
        this.gridApi.ensureColumnVisible(field);
        this.gridApi.flashCells({ rowNodes: [node], columns: [field], flashDuration: 2000 });
      }, 150);
    }, 150);
  }

  readonly theme = themeQuartz.withParams({
    accentColor: '#007AB3',
    browserColorScheme: 'light',
    fontFamily: '"Allianz Neo", sans-serif',
    fontSize: 16,
    headerBackgroundColor: '#FFFFFF',
    headerFontWeight: 600,
    rowHeight: 56,
    headerHeight: 40,
    wrapperBorder: false,
    columnBorder: false,
    rowBorder: { style: 'solid', width: 1, color: '#E8E8E8' },
  });

  // ── View dropdown ─────────────────────────────────────────────
  views: GridView[] = [
    { id: 'default', name: 'All columns', isDefault: true, filterModel: null, columnState: [] },
  ];
  activeViewId = 'default';
  isColumnModified = false;
  private userHiddenCols = new Set<string>();

  get viewDisplayName(): string {
    return this.isColumnModified ? 'Custom view' : (this.activeView?.name ?? '—');
  }
  viewDropdownOpen = false;
  showSaveViewModal = false;
  showManageViewsModal = false;
  newViewName = '';
  viewNameTouched = false;
  openMenuViewId: string | null = null;
  renamingViewId: string | null = null;
  renameValue = '';
  renameTouched = false;

  get activeView(): GridView | undefined {
    return this.views.find(v => v.id === this.activeViewId);
  }

  get sortedViews(): GridView[] {
    return [...this.views].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.commentModeActive = false;
    this.pendingComment = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.view-dropdown-wrapper')) {
      this.viewDropdownOpen = false;
    }
    if (!target.closest('.view-menu-wrapper')) {
      this.openMenuViewId = null;
    }
    if (!target.closest('.comment-pin-popover') && !target.closest('.comment-pin')) {
      this.openPinCommentId = null;
      this.editingCommentId = null;
    }
    if (this.skipNextDocumentClose) {
      this.skipNextDocumentClose = false;
    } else if (!target.closest('.action-dropdown') && !target.closest('.currency-flyout')) {
      this.limitsActionMenuOpen = false;
      this.deductiblesActionMenuOpen = false;
      this.sublimitsActionMenuOpen = false;
      this.currencyFlyoutOpen = false;
      this.lobFlyoutOpen = false;
      this.applyAllMenuOpen = false;
    }
  }

  toggleViewDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.viewDropdownOpen = !this.viewDropdownOpen;
  }

  applyView(view: GridView, event: MouseEvent) {
    event.stopPropagation();
    this.activeViewId = view.id;
    this.isColumnModified = false;
    this.userHiddenCols.clear();
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
    this.viewDropdownOpen = false;
    this.newViewName = '';
    this.viewNameTouched = false;
    this.showSaveViewModal = true;
  }

  confirmSaveView(event: Event) {
    event.stopPropagation();
    this.viewNameTouched = true;
    const name = this.newViewName.trim();
    if (!name) return;
    const newView: GridView = {
      id: Date.now().toString(), name, isDefault: false,
      filterModel: this.gridApi.getFilterModel() as Record<string, unknown> | null,
      columnState: this.gridApi.getColumnState(),
    };
    this.views.push(newView);
    this.activeViewId = newView.id;
    this.isColumnModified = false;
    this.showSaveViewModal = false;
  }

  cancelSaveView(event: Event) { event.stopPropagation(); this.showSaveViewModal = false; this.viewNameTouched = false; }
  openManageViews(event: MouseEvent) { event.stopPropagation(); this.viewDropdownOpen = false; this.renamingViewId = null; this.showManageViewsModal = true; }
  closeManageViews(event: MouseEvent) { event.stopPropagation(); this.showManageViewsModal = false; this.renamingViewId = null; }

  toggleViewMenu(viewId: string, event: MouseEvent) {
    event.stopPropagation();
    this.openMenuViewId = this.openMenuViewId === viewId ? null : viewId;
  }

  setAsDefault(view: GridView, event: MouseEvent) {
    event.stopPropagation();
    this.views = this.views.map(v => ({ ...v, isDefault: v.id === view.id }));
    this.openMenuViewId = null;
  }

  deleteView(view: GridView, event: MouseEvent) {
    event.stopPropagation();
    const wasDefault = view.isDefault;
    this.views = this.views.filter(v => v.id !== view.id);
    if (wasDefault) {
      this.views = this.views.map(v => ({ ...v, isDefault: v.id === 'default' }));
    }
    if (this.activeViewId === view.id) this.activeViewId = 'default';
    this.openMenuViewId = null;
  }

  startRename(view: GridView, event: MouseEvent) {
    event.stopPropagation();
    this.renamingViewId = view.id;
    this.renameValue = view.name;
    this.renameTouched = false;
    this.openMenuViewId = null;
  }

  confirmRename(view: GridView, event: Event) {
    event.stopPropagation();
    this.renameTouched = true;
    if (!this.renameValue.trim()) return;
    this.views = this.views.map(v => v.id === view.id ? { ...v, name: this.renameValue.trim() } : v);
    this.renamingViewId = null;
  }

  cancelRename(event: Event) {
    event.stopPropagation();
    this.renamingViewId = null;
    this.renameTouched = false;
  }

  // ── Expand / collapse ────────────────────────────────────────
  private buildRowData(): CoverageRow[] {
    return this.allData.filter(row =>
      row.parentId === null ||
      this.allData.find(g => g.id === row.parentId)?.isExpanded
    );
  }

  rowData = this.buildRowData();
  getRowId = (params: any) => params.data.id;

  toggleGroup(groupId: string): void {
    this.allData = this.allData.map(row =>
      row.id === groupId ? { ...row, isExpanded: !row.isExpanded } : row
    );
    this.rowData = this.buildRowData();
  }

  onRowClicked(event: any): void {
    const target = event.event?.target as HTMLElement;
    if (target?.tagName === 'INPUT') return;
    if (event.data?.parentId === null) {
      this.toggleGroup(event.data.id);
    }
  }

  // ── Transit Sublimits/Deductibles (Marine Cargo) ────────────────
  private transitAllData: TransitRow[] = TRANSIT_DATA;
  private transitGridApi!: GridApi;

  private buildTransitRowData(): TransitRow[] {
    return this.transitAllData.filter(row => {
      if (row.parentId === null) return true;
      if (row.totalSendings == null) return false;
      return this.transitAllData.find(g => g.id === row.parentId)?.isExpanded;
    });
  }

  transitRowData = this.buildTransitRowData();
  getTransitRowId = (params: any) => params.data.id;

  onTransitGridReady(params: GridReadyEvent) {
    this.transitGridApi = params.api;
    // Size every column to fit its header + cell content so nothing gets truncated.
    setTimeout(() => params.api.autoSizeAllColumns());
  }

  // Switching Limit type / Deductible type on a Transit row shouldn't carry over the
  // previous type's value — leave the value field empty so the user re-enters it.
  onTransitCellValueChanged(event: any): void {
    const field = event.colDef?.field;
    if (field === 'limType') {
      event.data.limValue = null;
    } else if (field === 'dedLimitType') {
      event.data.dedLimitValue = null;
      event.data.dedMin = null;
      event.data.dedMax = null;
    } else {
      return;
    }
    setTimeout(() => {
      const node = this.transitGridApi.getRowNode(event.data.id);
      if (node) this.transitGridApi.refreshCells({ rowNodes: [node], force: true });
    });
  }

  clearAllTransitFilters(): void {
    this.transitGridApi?.setFilterModel(null);
  }

  addTransitComponent(): void { console.log('Add Component'); }
  addTransitLocation(): void { console.log('Add Location'); }

  toggleTransitGroup(groupId: string): void {
    this.transitAllData = this.transitAllData.map(row =>
      row.id === groupId ? { ...row, isExpanded: !row.isExpanded } : row
    );
    this.transitRowData = this.buildTransitRowData();
  }

  onTransitCellClicked(event: any): void {
    if (event.colDef?.field !== 'segment' || event.data?.parentId !== null) return;
    const target = event.event?.target as HTMLElement;
    if (target?.closest('svg')) {
      this.toggleTransitGroup(event.data.id);
    }
  }

  private readonly NUMERIC_FIELDS = ['priority', 'limValue', 'limAggValue', 'biIp', 'dedLimitValue', 'dedMin', 'dedMax', 'dedAggValue'];
  private readonly REQUIRED_FIELDS = ['priority', 'limValue', 'biIp', 'dedLimitValue'];

  onCellValueChanged(event: any): void {
    if (!event.data || !event.colDef?.field) return;
    const field = event.colDef.field as string;
    if (!this.NUMERIC_FIELDS.includes(field)) return;

    const val = event.newValue;
    const isEmpty = val == null || val === '' || (typeof val === 'number' && isNaN(val));

    // Clear the error when user enters a valid value
    if (!isEmpty) {
      this.allData = this.allData.map(row => {
        if (row.id !== event.data.id) return row;
        const errFields = (row.errorFields ?? []).filter(f => f !== field);
        return { ...row, errorFields: errFields };
      });
      this.rowData = this.buildRowData();
      // Refresh cell so error icon disappears immediately
      setTimeout(() => {
        const node = this.gridApi.getRowNode(event.data.id);
        if (node) this.gridApi.refreshCells({ rowNodes: [node], force: true });
      });
    }
  }

  // ── Custom column panel ───────────────────────────────────────
  panelOpen = true;
  colSearch = '';

  panelGroups: PanelGroup[] = [
    {
      label: 'General',
      expanded: true,
      cols: [
        { field: 'coveragesPerils', label: 'Coverages/Perils', visible: true },
        { field: 'locationRules', label: 'Location rules', visible: true },
        { field: 'priority', label: 'Priority', visible: true },
        { field: 'currency', label: 'Currency', visible: true },
      ],
    },
    {
      label: 'Limits - All Entries are 100%',
      expanded: true,
      cols: [
        { field: 'limSection', label: 'Section', visible: true },
        { field: 'limType', label: 'Limit type', visible: true },
        { field: 'limValue', label: 'Limit value', visible: true },
        { field: 'limOccurrence', label: 'Occurrence', visible: true },
        { field: 'limAggValue', label: 'Aggregate amount', visible: true },
        { field: 'biIp', label: 'BI IP', visible: true },
        { field: 'biIpUnit', label: 'BI IP unit', visible: true },
      ],
    },
    {
      label: 'Deductibles - All Entries are 100%',
      expanded: true,
      cols: [
        { field: 'dedSection', label: 'Section', visible: true },
        { field: 'retentionType', label: 'Retention type', visible: true },
        { field: 'deductibleType', label: 'Deductible type', visible: true },
        { field: 'dedLimitType', label: 'Limit type', visible: true },
        { field: 'dedLimitValue', label: 'Limit amount', visible: true },
        { field: 'dedMin', label: 'Min (optional)', visible: true },
        { field: 'dedMax', label: 'Max (optional)', visible: true },
        { field: 'dedOccurrence', label: 'Occurrence', visible: true },
        { field: 'dedAggValue', label: 'Aggregate amount', visible: true },
      ],
    },
  ];

  get allPanelCols(): PanelCol[] {
    return this.panelGroups.flatMap(g => g.cols);
  }

  get filteredPanelGroups(): PanelGroup[] {
    if (!this.colSearch.trim()) return this.panelGroups;
    const q = this.colSearch.toLowerCase();
    return this.panelGroups
      .map(g => ({ ...g, cols: g.cols.filter(c => c.label.toLowerCase().includes(q)) }))
      .filter(g => g.cols.length > 0);
  }

  get allChecked(): boolean { return this.allPanelCols.every(c => c.visible); }
  get someChecked(): boolean {
    const n = this.allPanelCols.filter(c => c.visible).length;
    return n > 0 && n < this.allPanelCols.length;
  }
  isGroupAllChecked(g: PanelGroup): boolean { return g.cols.every(c => c.visible); }
  isGroupSomeChecked(g: PanelGroup): boolean {
    const n = g.cols.filter(c => c.visible).length;
    return n > 0 && n < g.cols.length;
  }

  private applyVisibility(fields: string[], visible: boolean): void {
    this.allPanelCols.forEach(c => { if (fields.includes(c.field)) c.visible = visible; });
    this.gridApi?.setColumnsVisible(fields, visible);
  }

  toggleAll(checked: boolean): void {
    this.allPanelCols.forEach(c => { c.visible = checked; });
    this.gridApi?.setColumnsVisible(this.allPanelCols.map(c => c.field), checked);
    if (!checked) this.allPanelCols.forEach(c => this.userHiddenCols.add(c.field));
    else this.userHiddenCols.clear();
    this.isColumnModified = true;
  }

  toggleGroupCols(g: PanelGroup, checked: boolean): void {
    this.applyVisibility(g.cols.map(c => c.field), checked);
    g.cols.forEach(c => checked ? this.userHiddenCols.delete(c.field) : this.userHiddenCols.add(c.field));
    this.isColumnModified = true;
  }

  toggleCol(col: PanelCol, checked: boolean): void {
    this.applyVisibility([col.field], checked);
    if (!checked) this.userHiddenCols.add(col.field);
    else this.userHiddenCols.delete(col.field);
    this.isColumnModified = true;
  }

  // ── Grid config ───────────────────────────────────────────────
  colDefs: (ColDef<CoverageRow> | ColGroupDef<CoverageRow>)[] = [
    {
      field: 'coveragesPerils',
      headerName: 'Coverages/Perils',
      pinned: 'left',
      width: 220,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      filter: 'agTextColumnFilter',
      editable: false,
      cellRenderer: (params: any) => {
        if (!params.data || params.data.parentId !== null) return '';
        const icon = params.data.isExpanded ? CHEVRON_DOWN : CHEVRON_RIGHT;
        return `${icon}${params.data.coveragesPerils}`;
      },
      cellStyle: (p: any) => ({
        fontWeight: '400',
        cursor: p.data?.parentId === null ? 'pointer' : 'default',
        color: p.data?.parentId === null ? '#1a1a1a' : (this.sublimitsLocked ? '#414141' : '#767676'),
        fontStyle: (this.sublimitsLocked || p.data?.parentId === null) ? 'normal' : 'italic',
      }),
    },
    {
      field: 'locationRules',
      headerName: 'Location rules',
      pinned: 'left',
      width: 190,
      filter: 'agTextColumnFilter',
      editable: false,
      spanRows: spanSameLocationPair,
      cellStyle: (p: any) =>
        p.data?.parentId !== null ? { color: this.sublimitsLocked ? '#414141' : '#767676', fontStyle: this.sublimitsLocked ? 'normal' : 'italic' } : null,
    },
    {
      field: 'priority',
      headerName: 'Priority',
      type: 'rightAligned',
      pinned: 'left',
      width: 110,
      filter: 'agNumberColumnFilter',
      editable: (p: any) => !this.sublimitsLocked && isLeaf(p) && !p.data?.locationRules?.includes('All Locations'),
      cellEditor: 'agTextCellEditor',
      valueParser: (p: any) => parseShorthand(p.newValue),
      spanRows: spanSameLocationPair,
      cellStyle: (p: any) =>
        p.data?.parentId !== null && p.data?.locationRules?.includes('All Locations')
          ? { color: this.sublimitsLocked ? '#414141' : '#767676', fontStyle: this.sublimitsLocked ? 'normal' : 'italic' }
          : null,
      cellRenderer: forLeaf((p: any) => {
        if (this.sublimitsLocked && (p.value == null || p.data?.errorFields?.includes('priority'))) return numCell(null);
        if (p.data?.errorFields?.includes('priority')) return errCell();
        if (p.value == null) return placeholderCell();
        return p.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }),
    },
    {
      field: 'currency',
      headerName: 'Currency',
      type: 'rightAligned',
      width: 100,
      filter: 'agTextColumnFilter',
      editable: false,
      spanRows: spanSameLocationPair,
      cellStyle: (p: any) => (isLeaf(p) && !this.sublimitsLocked ? { cursor: 'pointer' } : null),
      cellRenderer: forLeaf((p) => dropCell(p.value, this.sublimitsLocked)),
    },
    // ── Limits ────────────────────────────────────────────────────
    {
      headerName: 'Limits - All Entries are 100%',
      openByDefault: true,
      children: [
        {
          field: 'limSection',
          headerName: 'Section',
          width: 110,
          filter: 'agTextColumnFilter',
          editable: false,
          spanRows: spanSameLocationPair,
          cellRenderer: forLeaf((p) => dropCell(p.value, true)),
        },
        {
          field: 'limType',
          headerName: 'Limit type',
          width: 120,
          filter: 'agTextColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: LIMIT_TYPE_VALUES },
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupLimitsSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p) => dropCell(p.value, this.sublimitsLocked)),
        },
        {
          field: 'limValue',
          headerName: 'Limit value',
          type: 'rightAligned',
          width: 160,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupLimitsSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p: { data: CoverageRow }) => {
            if (this.sublimitsLocked && (p.data?.limValue == null || p.data?.errorFields?.includes('limValue'))) return numCell(null);
            if (p.data?.errorFields?.includes('limValue')) return errCell();
            if (p.data?.limValue == null) return currencyPlaceholderCell(p.data?.currency || 'EUR');
            return numCell(p.data.limValue, p.data.currency || 'EUR');
          }),
        },
        {
          field: 'limOccurrence',
          headerName: 'Occurrence',
          width: 150,
          filter: 'agTextColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: OCCURRENCE_VALUES },
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupLimitsSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p) => dropCell(p.value, this.sublimitsLocked)),
        },
        {
          field: 'limAggValue',
          headerName: 'Aggregate amount (optional)',
          type: 'rightAligned',
          width: 230,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupLimitsSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p: { data: CoverageRow }) => {
            if (this.sublimitsLocked) return p.data?.limAggValue != null ? numCell(p.data.limAggValue, p.data.currency || 'EUR') : numCell(null);
            if (p.data?.errorFields?.includes('limAggValue')) return errCell();
            return p.data?.limAggValue != null ? numCell(p.data.limAggValue, p.data.currency || 'EUR') : '<span style="color:#999;font-weight:400;font-style:normal">Annual amount</span>';
          }),
        },
        {
          field: 'biIp',
          headerName: 'BI IP',
          type: 'rightAligned',
          width: 80,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupLimitsSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p: any) => {
            if (this.sublimitsLocked && (p.value == null || p.data?.errorFields?.includes('biIp'))) return numCell(null);
            if (p.data?.errorFields?.includes('biIp')) return errCell();
            if (p.value == null) return placeholderCell();
            return String(p.value);
          }),
        },
        {
          field: 'biIpUnit',
          headerName: 'BI IP unit',
          width: 120,
          filter: 'agTextColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: BI_IP_UNIT_VALUES },
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupLimitsSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p) => dropCell(p.value, this.sublimitsLocked)),
        },
      ],
    } as ColGroupDef<CoverageRow>,
    // ── Deductibles ───────────────────────────────────────────────
    {
      headerName: 'Deductibles - All Entries are 100%',
      openByDefault: true,
      children: [
        {
          field: 'dedSection',
          headerName: 'Section',
          width: 110,
          filter: 'agTextColumnFilter',
          editable: false,
          spanRows: spanSameLocationPair,
          cellRenderer: forLeaf((p) => dropCell(p.value, true)),
        },
        {
          field: 'retentionType',
          headerName: 'Retention type',
          width: 140,
          filter: 'agTextColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: RETENTION_TYPE_VALUES },
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupDeductiblesSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p) => dropCell(p.value, this.sublimitsLocked)),
        },
        {
          field: 'deductibleType',
          headerName: 'Deductible type',
          width: 170,
          filter: 'agTextColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: DEDUCTIBLE_TYPE_VALUES },
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupDeductiblesSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p) => dropCell(p.value, this.sublimitsLocked)),
        },
        {
          field: 'dedLimitType',
          headerName: 'Limit type',
          width: 130,
          filter: 'agTextColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: LIMIT_TYPE_VALUES },
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupDeductiblesSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p) => dropCell(p.value, this.sublimitsLocked)),
        },
        {
          field: 'dedLimitValue',
          headerName: 'Limit amount',
          type: 'rightAligned',
          width: 150,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupDeductiblesSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p: { data: CoverageRow }) => {
            if (this.sublimitsLocked && (p.data?.dedLimitValue == null || p.data?.errorFields?.includes('dedLimitValue'))) return numCell(null);
            if (p.data?.errorFields?.includes('dedLimitValue')) return errCell();
            if (p.data?.dedLimitValue == null) return currencyPlaceholderCell(p.data?.currency || 'EUR');
            return numCell(p.data.dedLimitValue, p.data.currency || 'EUR');
          }),
        },
        {
          field: 'dedMin',
          headerName: 'Min (optional)',
          type: 'rightAligned',
          width: 170,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupDeductiblesSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p: { data: CoverageRow }) => {
            if (p.data?.errorFields?.includes('dedMin')) return errCell();
            return numCell(p.data?.dedMin, p.data?.currency || 'EUR');
          }),
        },
        {
          field: 'dedMax',
          headerName: 'Max (optional)',
          type: 'rightAligned',
          width: 170,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupDeductiblesSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p: { data: CoverageRow }) => {
            if (p.data?.errorFields?.includes('dedMax')) return errCell();
            return numCell(p.data?.dedMax, p.data?.currency || 'EUR');
          }),
        },
        {
          field: 'dedOccurrence',
          headerName: 'Occurrence',
          width: 150,
          filter: 'agTextColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: OCCURRENCE_VALUES },
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupDeductiblesSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p) => dropCell(p.value, this.sublimitsLocked)),
        },
        {
          field: 'dedAggValue',
          headerName: 'Aggregate amount (optional)',
          type: 'rightAligned',
          width: 230,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => !this.sublimitsLocked && isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          spanRows: (params: any) => spanSameLocationPair(params) && !this.groupDeductiblesSplit[params.nodeA?.data?.parentId],
          cellRenderer: forLeaf((p: { data: CoverageRow }) => {
            if (this.sublimitsLocked) return p.data?.dedAggValue != null ? numCell(p.data.dedAggValue, p.data.currency || 'EUR') : numCell(null);
            if (p.data?.errorFields?.includes('dedAggValue')) return errCell();
            return p.data?.dedAggValue != null ? numCell(p.data.dedAggValue, p.data.currency || 'EUR') : '<span style="color:#999;font-weight:400;font-style:normal">Annual amount</span>';
          }),
        },
      ],
    } as ColGroupDef<CoverageRow>,
    {
      headerName: '',
      colId: '__sublimitsAction',
      pinned: 'right',
      width: 64,
      minWidth: 64,
      maxWidth: 64,
      sortable: false,
      resizable: false,
      editable: false,
      cellRenderer: (p: any) => {
        if (this.sublimitsLocked || !isLeaf(p)) return '';
        return `<div style="width:100%;height:100%;display:flex;justify-content:flex-end;align-items:center;padding-right:8px;box-sizing:border-box"><button style="background:none;border:none;cursor:pointer;color:#414141;font-size:20px;padding:0;line-height:1">&#8942;</button></div>`;
      },
    } as ColDef<CoverageRow>,
  ];

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    cellStyle: (p: any) =>
      p.data?.parentId !== null
        ? { color: '#414141', fontStyle: 'normal', fontFamily: '"Allianz Neo", sans-serif' }
        : { color: '#1a1a1a', fontStyle: 'normal', fontFamily: '"Allianz Neo", sans-serif' },
  };
  getRowClass = (params: any) => params.data?.parentId === null ? 'group-row' : '';
  rowSelection: 'multiple' = 'multiple';

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    // Size every column to fit its header + cell content so nothing gets truncated.
    setTimeout(() => params.api.autoSizeAllColumns());
  }

  // ── Transit grid config ────────────────────────────────────────
  transitColDefs: (ColDef<TransitRow> | ColGroupDef<TransitRow>)[] = [
    {
      field: 'segment',
      headerName: 'Segment',
      pinned: 'left',
      width: 150,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      filter: 'agTextColumnFilter',
      editable: false,
      cellRenderer: (params: any) => {
        if (!params.data || params.data.parentId !== null) return '';
        const icon = params.data.isExpanded ? CHEVRON_DOWN : CHEVRON_RIGHT;
        return `<span style="cursor:pointer">${icon}</span>${params.data.segment}`;
      },
      cellStyle: (p: any) => ({
        fontWeight: '400',
        cursor: 'default',
        color: p.data?.parentId === null ? '#1a1a1a' : '#767676',
        fontStyle: p.data?.parentId === null ? 'normal' : 'italic',
      }),
    },
    {
      field: 'segmentBreakdown',
      headerName: 'Segment Breakdown',
      pinned: 'left',
      width: 170,
      filter: 'agTextColumnFilter',
      editable: false,
      cellStyle: (p: any) => (isLeaf(p) ? { color: '#767676', fontStyle: 'italic' } : null),
    },
    {
      field: 'condition',
      headerName: 'Insurance Condition',
      pinned: 'left',
      width: 220,
      filter: 'agTextColumnFilter',
      editable: (p: any) => p.data?.parentId === null,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: CONDITION_VALUES },
      cellStyle: (p: any) => (p.data?.parentId === null ? { cursor: 'pointer' } : null),
      cellRenderer: (p: any) => (p.data?.parentId === null ? dropCell(p.value) : ''),
    },
    {
      field: 'totalSendings',
      headerName: 'Total Sendings',
      type: 'rightAligned',
      pinned: 'left',
      width: 170,
      filter: 'agNumberColumnFilter',
      editable: false,
      cellRenderer: (p: any) => {
        if (p.value == null) return numCell(null);
        const fmt = p.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const currency = p.data?.currency || 'EUR';
        return `<span style="display:flex;justify-content:space-between;align-items:center;width:100%;box-sizing:border-box"><span>${currency}</span><span style="color:#767676;font-style:italic">${fmt}</span></span>`;
      },
    },
    // ── Limits ────────────────────────────────────────────────────
    {
      headerName: 'Limits - All Entries are 100%',
      openByDefault: true,
      children: [
        {
          field: 'limType',
          headerName: 'Limit type',
          width: 120,
          filter: 'agTextColumnFilter',
          editable: (p: any) => isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: LIMIT_TYPE_VALUES },
          cellRenderer: forLeaf((p) => dropCell(p.value)),
        },
        {
          field: 'limValue',
          headerName: 'Limit value',
          type: 'rightAligned',
          width: 160,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          cellRenderer: forLeaf((p: { data: TransitRow }) =>
            p.data?.limValue != null ? numCell(p.data.limValue, p.data.currency || 'EUR') : currencyPlaceholderCell(p.data?.currency || 'EUR')),
        },
        {
          field: 'limOccurrence',
          headerName: 'Occurrence',
          width: 150,
          filter: 'agTextColumnFilter',
          editable: (p: any) => isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: OCCURRENCE_VALUES },
          cellRenderer: forLeaf((p) => dropCell(p.value)),
        },
        {
          field: 'limAggValue',
          headerName: 'Aggregate amount (optional)',
          type: 'rightAligned',
          width: 190,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          cellRenderer: forLeaf((p: { data: TransitRow }) =>
            p.data?.limAggValue != null ? numCell(p.data.limAggValue, p.data.currency || 'EUR') : '<span style="color:#999;font-weight:400;font-style:normal">Annual amount</span>'),
        },
      ],
    } as ColGroupDef<TransitRow>,
    // ── Deductibles ───────────────────────────────────────────────
    {
      headerName: 'Deductibles - All Entries are 100%',
      openByDefault: true,
      children: [
        {
          field: 'retentionType',
          headerName: 'Retention type',
          width: 140,
          filter: 'agTextColumnFilter',
          editable: (p: any) => isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: RETENTION_TYPE_VALUES },
          cellRenderer: forLeaf((p) => dropCell(p.value)),
        },
        {
          field: 'dedLimitType',
          headerName: 'Deductible type',
          width: 150,
          filter: 'agTextColumnFilter',
          editable: (p: any) => isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: OVERALL_TABLE_DEDUCTIBLE_TYPE_ALL },
          cellRenderer: forLeaf((p) => dropCell(p.value)),
        },
        {
          field: 'dedLimitValue',
          headerName: 'Deductible value',
          type: 'rightAligned',
          width: 160,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          cellRenderer: forLeaf((p: { data: TransitRow }) =>
            p.data?.dedLimitValue != null ? numCell(p.data.dedLimitValue, p.data.currency || 'EUR') : currencyPlaceholderCell(p.data?.currency || 'EUR')),
        },
        {
          field: 'dedMin',
          headerName: 'Min (optional)',
          type: 'rightAligned',
          width: 170,
          filter: 'agNumberColumnFilter',
          // "Amount" deductibles have no Min/Max range — only other deductible types (percent-based,
          // number of days) can define one.
          editable: (p: any) => isLeaf(p) && p.data?.dedLimitType !== 'Amount',
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          cellRenderer: forLeaf((p: { data: TransitRow }) => {
            if (p.data?.dedLimitType === 'Amount') return numCell(null);
            if (p.data?.dedMin != null) return numCell(p.data.dedMin, p.data.currency || 'EUR');
            return currencyPlaceholderCell(p.data?.currency || 'EUR');
          }),
        },
        {
          field: 'dedMax',
          headerName: 'Max (optional)',
          type: 'rightAligned',
          width: 170,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => isLeaf(p) && p.data?.dedLimitType !== 'Amount',
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          cellRenderer: forLeaf((p: { data: TransitRow }) => {
            if (p.data?.dedLimitType === 'Amount') return numCell(null);
            if (p.data?.dedMax != null) return numCell(p.data.dedMax, p.data.currency || 'EUR');
            return currencyPlaceholderCell(p.data?.currency || 'EUR');
          }),
        },
        {
          field: 'dedOccurrence',
          headerName: 'Occurrence',
          width: 150,
          filter: 'agTextColumnFilter',
          editable: (p: any) => isLeaf(p),
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: OCCURRENCE_VALUES },
          cellRenderer: forLeaf((p) => dropCell(p.value)),
        },
        {
          field: 'dedAggValue',
          headerName: 'Aggregate amount (optional)',
          type: 'rightAligned',
          width: 230,
          filter: 'agNumberColumnFilter',
          editable: (p: any) => isLeaf(p),
          cellEditor: 'agTextCellEditor',
          valueParser: (p: any) => parseShorthand(p.newValue),
          cellRenderer: forLeaf((p: { data: TransitRow }) =>
            p.data?.dedAggValue != null ? numCell(p.data.dedAggValue, p.data.currency || 'EUR') : '<span style="color:#999;font-weight:400;font-style:normal">Annual amount</span>'),
        },
      ],
    } as ColGroupDef<TransitRow>,
  ];

  defaultTransitColDef: ColDef = {
    sortable: true,
    resizable: true,
    cellStyle: (p: any) =>
      p.data?.parentId !== null
        ? { color: '#414141', fontStyle: 'normal', fontFamily: '"Allianz Neo", sans-serif' }
        : { color: '#1a1a1a', fontStyle: 'normal', fontFamily: '"Allianz Neo", sans-serif' },
  };
  getTransitRowClass = (params: any) => params.data?.parentId === null ? 'group-row' : '';

  activeFilterCount = 0;

  onFilterChanged(): void {
    const model = this.gridApi?.getFilterModel();
    this.activeFilterCount = model ? Object.keys(model).length : 0;
    this.cdr.detectChanges();
  }

  clearAllFilters(): void {
    this.gridApi?.setFilterModel(null);
    this.activeFilterCount = 0;
  }
  addLocationRules() { console.log('Add location rules'); }
  addCoverages() { console.log('Add coverages'); }

  // ── Overall tab: action menu ─────────────────────────────────
  onLimitsCellClicked(event: any): void {
    if (event.column?.colId === '__action') {
      if (event.data?.section !== 'Transit' || !this.isTransitRowComplete(event.data)) return;
      const btn = (event.event?.target as HTMLElement)?.closest('button') as HTMLElement
                  ?? event.event?.target as HTMLElement;
      const rect = btn?.getBoundingClientRect();
      if (rect) this.actionMenuPos = { top: rect.bottom + 4, left: rect.right - 180 };
      this.skipNextDocumentClose = true;
      this.deductiblesActionMenuOpen = false;
      this.currencyFlyoutOpen = false;
      this.limitsActionMenuOpen = !this.limitsActionMenuOpen;
    } else if (event.column?.colId === 'currency' && event.data?.section === 'PD') {
      this.openCurrencyFlyout(event, 'limits');
    }
  }

  onDeductiblesCellClicked(event: any): void {
    if (event.column?.colId === '__action') {
      if (event.data?.section !== 'Transit' || !this.isTransitRowComplete(event.data)) return;
      const btn = (event.event?.target as HTMLElement)?.closest('button') as HTMLElement
                  ?? event.event?.target as HTMLElement;
      const rect = btn?.getBoundingClientRect();
      if (rect) this.actionMenuPos = { top: rect.bottom + 4, left: rect.right - 180 };
      this.skipNextDocumentClose = true;
      this.limitsActionMenuOpen = false;
      this.currencyFlyoutOpen = false;
      this.deductiblesActionMenuOpen = !this.deductiblesActionMenuOpen;
    }
  }

  applyTransitModalOpen = false;
  applyTransitModalType: 'limits' | 'deductibles' = 'limits';

  applyToTransitTab(type: 'limits' | 'deductibles'): void {
    this.limitsActionMenuOpen = false;
    this.deductiblesActionMenuOpen = false;
    this.applyTransitModalType = type;
    this.applyTransitModalOpen = true;
  }

  closeApplyTransitModal(): void {
    this.applyTransitModalOpen = false;
  }

  private formatTransitFieldValue(value: number | null, currency: string): string {
    if (value == null) return '—';
    return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }

  get applyTransitFields(): { label: string; value: string }[] {
    if (this.applyTransitModalType === 'limits') {
      const row = this.limitsRowData.find(r => r.section === 'Transit');
      if (!row) return [];
      const isSumInsured = row.limType === 'Sum Insured';
      return [
        { label: 'Limit Value', value: isSumInsured ? 'Amount' : row.limType },
        { label: 'Limit Amount', value: this.formatTransitFieldValue(isSumInsured ? row.limAggValue : row.limValue, row.currency) },
        { label: 'Occurrence', value: row.limOccurrence },
        { label: 'Aggregate Amount (only if entered)', value: this.formatTransitFieldValue(row.limAggValue, row.currency) },
      ];
    }
    const row = this.deductiblesRowData.find(r => r.section === 'Transit');
    if (!row) return [];
    return [
      { label: 'Retention Type', value: row.retentionType },
      { label: 'Deductible Value', value: row.deductibleType },
      { label: 'Deductible Amount', value: this.formatTransitFieldValue(row.dedValue, row.currency) },
      { label: 'Occurrence', value: row.dedOccurrence },
      { label: 'Aggregate Amount (only if entered)', value: this.formatTransitFieldValue(row.dedAggValue, row.currency) },
    ];
  }

  applyToTransitOnlyEmpty(): void {
    this.applyTransitToRows(false);
  }

  applyToTransitOverwriteAll(): void {
    this.applyTransitToRows(true);
  }

  private applyTransitToRows(overwriteAll: boolean): void {
    if (this.applyTransitModalType === 'limits') {
      const src = this.limitsRowData.find(r => r.section === 'Transit');
      if (src) {
        // Sum Insured isn't a valid Limit type in the Transit tab — apply the optional
        // Aggregate Amount as a plain Amount instead (only reachable when it's filled in).
        const srcLimType = src.limType === 'Sum Insured' ? 'Amount' : src.limType;
        const srcLimValue = src.limType === 'Sum Insured' ? src.limAggValue : src.limValue;
        this.transitAllData = this.transitAllData.map(r => {
          if (r.parentId === null) return r;
          return {
            ...r,
            limType: overwriteAll || !r.limType ? srcLimType : r.limType,
            limValue: overwriteAll || r.limValue == null ? srcLimValue : r.limValue,
            limOccurrence: overwriteAll || !r.limOccurrence ? src.limOccurrence : r.limOccurrence,
            limAggValue: overwriteAll || r.limAggValue == null ? src.limAggValue : r.limAggValue,
          };
        });
      }
    } else {
      const src = this.deductiblesRowData.find(r => r.section === 'Transit');
      if (src) {
        this.transitAllData = this.transitAllData.map(r => {
          if (r.parentId === null) return r;
          return {
            ...r,
            retentionType: overwriteAll || !r.retentionType ? src.retentionType : r.retentionType,
            dedLimitType: overwriteAll || !r.dedLimitType ? src.deductibleType : r.dedLimitType,
            dedLimitValue: overwriteAll || r.dedLimitValue == null ? src.dedValue : r.dedLimitValue,
            dedOccurrence: overwriteAll || !r.dedOccurrence ? src.dedOccurrence : r.dedOccurrence,
            dedAggValue: overwriteAll || r.dedAggValue == null ? src.dedAggValue : r.dedAggValue,
          };
        });
      }
    }
    this.transitRowData = this.buildTransitRowData();
    this.applyTransitModalOpen = false;
  }

  onCellClicked(event: any): void {
    if (event.column?.colId === 'currency' && isLeaf(event)) {
      this.openCurrencyFlyout(event, 'coverages');
    } else if (event.column?.colId === '__sublimitsAction') {
      const btn = (event.event?.target as HTMLElement)?.closest('button') as HTMLElement
                  ?? event.event?.target as HTMLElement;
      const rect = btn?.getBoundingClientRect();
      if (rect) this.actionMenuPos = { top: rect.bottom + 4, left: rect.right - 180 };
      this.skipNextDocumentClose = true;
      this.limitsActionMenuOpen = false;
      this.deductiblesActionMenuOpen = false;
      this.currencyFlyoutOpen = false;
      this.sublimitsActionGroupId = event.data?.parentId ?? null;
      this.sublimitsActionMenuOpen = !this.sublimitsActionMenuOpen;
    }
  }

  // ── Right-click "Apply to all" (fields that already have a value) ──
  onGridCellContextMenu(event: any, grid: 'limits' | 'deductibles' | 'coverages'): void {
    if (grid === 'coverages' ? this.sublimitsLocked : this.isDraft) return;
    const field: string | undefined = event.column?.getColId?.() ?? event.column?.colId;
    if (!field || field.startsWith('__')) return;
    if (grid === 'coverages' && !isLeaf(event)) return;

    const colDef = event.column?.getColDef?.() ?? event.colDef;
    const editable = typeof colDef?.editable === 'function' ? colDef.editable(event) : colDef?.editable;
    if (!editable) return;

    const value = event.data?.[field];
    if (value === null || value === undefined || value === '') return;

    event.event?.preventDefault?.();
    this.applyAllMenuPos = { top: event.event.clientY, left: event.event.clientX };
    this.applyAllContext = { grid, field, value };
    this.limitsActionMenuOpen = false;
    this.deductiblesActionMenuOpen = false;
    this.sublimitsActionMenuOpen = false;
    this.currencyFlyoutOpen = false;
    this.applyAllMenuOpen = true;
    this.cdr.detectChanges();
  }

  applyValueToAll(): void {
    const ctx = this.applyAllContext;
    this.applyAllMenuOpen = false;
    this.applyAllContext = null;
    if (!ctx) return;
    const { grid, field, value } = ctx;

    if (grid === 'limits') {
      this.limitsRowData = this.limitsRowData.map(r => {
        const cur = (r as any)[field];
        return cur !== null && cur !== undefined && cur !== '' ? { ...r, [field]: value } : r;
      });
    } else if (grid === 'deductibles') {
      this.deductiblesRowData = this.deductiblesRowData.map(r => {
        const cur = (r as any)[field];
        return cur !== null && cur !== undefined && cur !== '' ? { ...r, [field]: value } : r;
      });
    } else {
      this.allData = this.allData.map(r => {
        if (r.parentId === null) return r;
        const cur = (r as any)[field];
        return cur !== null && cur !== undefined && cur !== '' ? { ...r, [field]: value } : r;
      });
      this.rowData = this.buildRowData();
    }
  }

  isGroupSectionSplit(groupId: string | null, section: 'limits' | 'deductibles'): boolean {
    if (!groupId) return false;
    return section === 'limits' ? !!this.groupLimitsSplit[groupId] : !!this.groupDeductiblesSplit[groupId];
  }

  private openCurrencyFlyout(event: any, grid: 'limits' | 'coverages'): void {
    if (grid === 'coverages' ? this.sublimitsLocked : this.isDraft) return;
    const cell = (event.event?.target as HTMLElement)?.closest('.ag-cell') as HTMLElement;
    const rect = cell?.getBoundingClientRect();
    if (rect) this.currencyFlyoutPos = { top: rect.bottom + 2, left: rect.left };
    this.currencyFlyoutRowId = event.data?.id ?? '';
    this.currencyFlyoutGrid = grid;
    this.currencySearch = '';
    this.skipNextDocumentClose = true;
    this.limitsActionMenuOpen = false;
    this.deductiblesActionMenuOpen = false;
    this.currencyFlyoutOpen = true;
    this.cdr.detectChanges();
    this.scrollSelectedCurrencyIntoView();
  }

  openSubmissionCurrencyFlyout(event: MouseEvent): void {
    // Stays open even when locked (saved/draft-saved) — picking a currency here only
    // relabels the submission currency and shows the info banner; see onCurrencyChange().
    // Note: propagation is NOT stopped here — the click must reach the document listener
    // so skipNextDocumentClose is consumed correctly and outside clicks close the flyout.
    const wrap = (event.target as HTMLElement)?.closest('.meta-currency-select-wrap') as HTMLElement;
    const rect = wrap?.getBoundingClientRect();
    if (rect) this.currencyFlyoutPos = { top: rect.bottom + 2, left: rect.left };
    this.currencyFlyoutRowId = '';
    this.currencyFlyoutGrid = 'submission';
    this.currencySearch = '';
    this.skipNextDocumentClose = true;
    this.limitsActionMenuOpen = false;
    this.deductiblesActionMenuOpen = false;
    this.currencyFlyoutOpen = true;
    this.cdr.detectChanges();
    this.scrollSelectedCurrencyIntoView();
  }

  openOverallCurrencyFlyout(event: MouseEvent): void {
    if (this.isDraft) return;
    const wrap = (event.target as HTMLElement)?.closest('.meta-currency-select-wrap') as HTMLElement;
    const rect = wrap?.getBoundingClientRect();
    if (rect) this.currencyFlyoutPos = { top: rect.bottom + 2, left: rect.left };
    this.currencyFlyoutRowId = '';
    this.currencyFlyoutGrid = 'overall';
    this.currencySearch = '';
    this.skipNextDocumentClose = true;
    this.limitsActionMenuOpen = false;
    this.deductiblesActionMenuOpen = false;
    this.currencyFlyoutOpen = true;
    this.cdr.detectChanges();
    this.scrollSelectedCurrencyIntoView();
  }

  // Keep the selected currency in its natural place in the list, but scroll it into view
  // (centered, no smooth animation) so the user immediately sees which one is selected.
  private scrollSelectedCurrencyIntoView(): void {
    setTimeout(() => {
      const item = this.el.nativeElement.querySelector('.cf-item--checked');
      item?.scrollIntoView({ block: 'center' });
    });
  }

  selectCurrency(code: string): void {
    if (this.currencyFlyoutGrid === 'submission') {
      this.onCurrencyChange(code);
      this.currencyFlyoutOpen = false;
      return;
    }
    if (this.currencyFlyoutGrid === 'limits') {
      // Triggered only from the PD row's Currency cell (Version 1) — converts the whole
      // table so the BI row follows PD's currency automatically. The Deductibles table has
      // no currency picker of its own in Version 1 — it always aligns with Overall Limits.
      this.convertLimitsAndDeductiblesToCurrency(code);
      this.refreshAllGrids();
    } else if (this.currencyFlyoutGrid === 'coverages') {
      // Changing currency on a row only relabels that row's currency — Coverage
      // Sublimits/Deductibles values are never converted.
      this.allData = this.allData.map(r =>
        r.id === this.currencyFlyoutRowId && r.currency !== code ? { ...r, currency: code } : r
      );
      this.rowData = this.buildRowData();
      this.refreshAllGrids();
    } else if (this.currencyFlyoutGrid === 'overall') {
      this.convertLimitsAndDeductiblesToCurrency(code);
      this.refreshAllGrids();
    }
    this.currencyFlyoutOpen = false;
  }

  openMergeLimitsModal(): void {
    this.limitsActionMenuOpen = false;
    this.showMergeLimitsModal = true;
  }

  openMergeDeductiblesModal(): void {
    this.deductiblesActionMenuOpen = false;
    this.showMergeDeductiblesModal = true;
  }

  cancelMergeModal(): void {
    this.showMergeLimitsModal = false;
    this.showMergeDeductiblesModal = false;
  }

  // ── Coverage Sublimits: per-group, per-section split/merge ─────
  onSublimitsSectionAction(section: 'limits' | 'deductibles'): void {
    const groupId = this.sublimitsActionGroupId;
    this.sublimitsActionMenuOpen = false;
    if (!groupId) return;
    if (this.isGroupSectionSplit(groupId, section)) {
      this.pendingSublimitsMerge = { groupId, section };
      this.showSublimitsMergeModal = true;
    } else {
      this.splitSublimitsSection(groupId, section);
      this.triggerSublimitsToast(groupId, section, 'split');
    }
  }

  cancelSublimitsMergeModal(): void {
    this.showSublimitsMergeModal = false;
    this.pendingSublimitsMerge = null;
  }

  confirmSublimitsMerge(): void {
    if (!this.pendingSublimitsMerge) return;
    const { groupId, section } = this.pendingSublimitsMerge;
    this.mergeSublimitsSection(groupId, section);
    this.triggerSublimitsToast(groupId, section, 'merged');
    this.showSublimitsMergeModal = false;
    this.pendingSublimitsMerge = null;
  }

  get pendingSublimitsMergeSectionLabel(): string {
    return this.pendingSublimitsMerge?.section === 'deductibles' ? 'deductible' : 'limit';
  }

  private triggerSublimitsToast(groupId: string, section: 'limits' | 'deductibles', action: 'split' | 'merged'): void {
    const name = this.allData.find(r => r.id === groupId)?.coveragesPerils ?? '';
    this.triggerMergeToast(
      `PD and BI are successfully ${action}`,
      `PD & BI of ${section} of ${name} are successfully ${action}.`,
    );
  }

  private splitSublimitsSection(groupId: string, section: 'limits' | 'deductibles'): void {
    const sectionField: 'limSection' | 'dedSection' = section === 'limits' ? 'limSection' : 'dedSection';
    const result: CoverageRow[] = [];
    for (const row of this.allData) {
      if (row.parentId !== groupId) {
        result.push(row);
        continue;
      }
      if (row.id.endsWith('::bi')) continue; // handled alongside its PD counterpart below
      const pdRow: CoverageRow = { ...row, [sectionField]: 'PD' };
      const existingBi = this.allData.find(r => r.id === row.id + '::bi');
      const biRow: CoverageRow = existingBi
        ? { ...existingBi, [sectionField]: 'BI' }
        : { ...row, id: row.id + '::bi', [sectionField]: 'BI' };
      result.push(pdRow, biRow);
    }
    this.allData = result;
    (section === 'limits' ? this.groupLimitsSplit : this.groupDeductiblesSplit)[groupId] = true;
    this.rowData = this.buildRowData();
  }

  private mergeSublimitsSection(groupId: string, section: 'limits' | 'deductibles'): void {
    const sectionField: 'limSection' | 'dedSection' = section === 'limits' ? 'limSection' : 'dedSection';
    const fields = section === 'limits' ? LIMIT_SECTION_FIELDS : DED_SECTION_FIELDS;
    const otherSplitMap = section === 'limits' ? this.groupDeductiblesSplit : this.groupLimitsSplit;

    if (otherSplitMap[groupId]) {
      // Other section is still split — keep the PD/BI row pair, just collapse this section's values back to shared.
      this.allData = this.allData.map(row => {
        if (row.parentId !== groupId || row.id.endsWith('::bi')) return row;
        return { ...row, [sectionField]: 'PD & BI' };
      });
      this.allData = this.allData.map(row => {
        if (row.parentId !== groupId || !row.id.endsWith('::bi')) return row;
        const pdRow = this.allData.find(r => r.id === baseRowId(row.id));
        const patch: Partial<CoverageRow> = { [sectionField]: 'PD & BI' } as Partial<CoverageRow>;
        fields.forEach(f => { (patch as any)[f] = pdRow ? (pdRow as any)[f] : (row as any)[f]; });
        return { ...row, ...patch };
      });
    } else {
      // Other section already merged (or was never split) — collapse back to a single row.
      this.allData = this.allData.filter(row => !(row.parentId === groupId && row.id.endsWith('::bi')));
      this.allData = this.allData.map(row =>
        row.parentId === groupId ? { ...row, [sectionField]: 'PD & BI' } : row
      );
    }
    (section === 'limits' ? this.groupLimitsSplit : this.groupDeductiblesSplit)[groupId] = false;
    this.rowData = this.buildRowData();
  }

  confirmMergeLimits(): void {
    const pd = this.limitsRowData.find(r => r.section === 'PD')!;
    const bi = this.limitsRowData.find(r => r.section === 'BI')!;
    this.originalLimitsData = [...this.limitsRowData];
    this.limitsRowData = [{
      id: 'lim-pdbi', section: 'PD & BI', currency: pd.currency,
      sumInsured: (pd.sumInsured ?? 0) + (bi.sumInsured ?? 0),
      limType: 'Amount', limValue: null,
      limOccurrence: pd.limOccurrence, limAggValue: null,
      biIp: null, biIpUnit: bi.biIpUnit, biInterest: bi.biInterest,
    }];
    this.limitsMerged = true;
    this.showMergeLimitsModal = false;
    this.recalcLimitsWidth();
    this.triggerMergeToast('PD and BI are successfully merged', 'PD & BI of limits are successfully merged.');
  }

  confirmSplitLimits(): void {
    this.limitsRowData = [...this.originalLimitsData];
    this.limitsMerged = false;
    this.showMergeLimitsModal = false;
    this.recalcLimitsWidth();
    this.triggerMergeToast('PD and BI are successfully split', 'PD & BI of limits are successfully split.');
  }

  confirmMergeDeductibles(): void {
    const pd = this.deductiblesRowData.find(r => r.section === 'PD')!;
    this.originalDeductiblesData = [...this.deductiblesRowData];
    this.deductiblesRowData = [{
      id: 'ded-pdbi', section: 'PD & BI', currency: pd.currency,
      retentionType: pd.retentionType, deductibleType: pd.deductibleType,
      dedValue: null, dedMin: null, dedMax: null,
      dedOccurrence: pd.dedOccurrence, dedAggValue: null,
    }];
    this.deductiblesMerged = true;
    this.showMergeDeductiblesModal = false;
    this.recalcDeductiblesWidth();
    this.triggerMergeToast('PD and BI are successfully merged', 'PD & BI of deductibles are successfully merged.');
  }

  confirmSplitDeductibles(): void {
    this.deductiblesRowData = [...this.originalDeductiblesData];
    this.deductiblesMerged = false;
    this.showMergeDeductiblesModal = false;
    this.recalcDeductiblesWidth();
    this.triggerMergeToast('PD and BI are successfully split', 'PD & BI of deductibles are successfully split.');
  }

  private recalcLimitsWidth(): void {
    setTimeout(() => {
      if (this.limitsGridApi) {
        this.limitsGridApi.autoSizeAllColumns();
        const w = this.limitsGridApi.getColumnState().reduce((s, c) => s + (c.width ?? 0), 0);
        this.limitsGridWidth = w + 'px';
      }
      this.cdr.detectChanges();
    });
  }

  private recalcDeductiblesWidth(): void {
    setTimeout(() => {
      if (this.deductiblesGridApi) {
        this.deductiblesGridApi.autoSizeAllColumns();
        const w = this.deductiblesGridApi.getColumnState().reduce((s, c) => s + (c.width ?? 0), 0);
        this.deductiblesGridWidth = w + 'px';
      }
      this.cdr.detectChanges();
    });
  }

  private triggerMergeToast(message: string, subMessage: string, durationMs = 4000): void {
    this.mergeToastMessage = message;
    this.mergeToastSubMessage = subMessage;
    this.mergeToastVisible = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.mergeToastVisible = false; this.cdr.detectChanges(); }, durationMs);
  }

  onLimitsGridReady(params: GridReadyEvent) {
    this.limitsGridApi = params.api;
    setTimeout(() => {
      // Size every column to fit its header + cell content so nothing gets truncated.
      params.api.autoSizeAllColumns();
      const w = params.api.getColumnState().reduce((s, c) => s + (c.width ?? 0), 0);
      this.limitsGridWidth = w + 'px';
      this.cdr.detectChanges();
    });
  }

  onDeductiblesGridReady(params: GridReadyEvent) {
    this.deductiblesGridApi = params.api;
    setTimeout(() => {
      // Size every column to fit its header + cell content so nothing gets truncated.
      params.api.autoSizeAllColumns();
      const w = params.api.getColumnState().reduce((s, c) => s + (c.width ?? 0), 0);
      this.deductiblesGridWidth = w + 'px';
      this.cdr.detectChanges();
    });
  }

  onLimitsColumnResized(event: any): void {
    if (event.finished) {
      this.recalcLimitsWidth();
    }
  }

  onDeductiblesColumnResized(event: any): void {
    if (event.finished) {
      this.recalcDeductiblesWidth();
    }
  }
  getLimitsRowId = (params: any) => params.data.id;
  getDeductiblesRowId = (params: any) => params.data.id;

  onLimitsCellValueChanged(event: any): void {
    if (event.data?.section === 'Transit') {
      setTimeout(() => {
        const node = this.limitsGridApi.getRowNode(event.data.id);
        if (node) this.limitsGridApi.refreshCells({ rowNodes: [node], columns: ['__action'], force: true });
      });
    }
    if (event.colDef?.field !== 'limType') return;
    if (event.newValue === 'Amount') {
      this.limitsRowData = this.limitsRowData.map(row =>
        row.id === event.data.id ? { ...row, limValue: null } : row
      );
    } else if (event.newValue === 'Sum Insured') {
      // Limit value inherits Sum Insured so downstream consumers of the data (exports,
      // submission) see the actual inherited number, not just a display-only renderer.
      this.limitsRowData = this.limitsRowData.map(row =>
        row.id === event.data.id ? { ...row, limValue: row.sumInsured } : row
      );
    }
    setTimeout(() => {
      const node = this.limitsGridApi.getRowNode(event.data.id);
      if (node) this.limitsGridApi.refreshCells({ rowNodes: [node], columns: ['limValue', 'currency'], force: true });
    });
  }

  onDeductiblesCellValueChanged(event: any): void {
    if (event.data?.section === 'Transit') {
      setTimeout(() => {
        const node = this.deductiblesGridApi.getRowNode(event.data.id);
        if (node) this.deductiblesGridApi.refreshCells({ rowNodes: [node], columns: ['__action'], force: true });
      });
    }
    if (event.colDef?.field !== 'deductibleType') return;
    this.deductiblesRowData = this.deductiblesRowData.map(row =>
      row.id === event.data.id ? { ...row, dedValue: null } : row
    );
    setTimeout(() => {
      const node = this.deductiblesGridApi.getRowNode(event.data.id);
      if (node) this.deductiblesGridApi.refreshCells({ rowNodes: [node], columns: ['dedValue'], force: true });
    });
  }

  overallGridDefaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    cellStyle: { color: '#414141', fontStyle: 'normal', fontFamily: '"Allianz Neo", sans-serif' },
  };

  // A Transit row is "complete" once all its required (non-optional) fields are filled —
  // Aggregate Amount and Min/Max are explicitly optional, so they're excluded from this check.
  private isTransitRowComplete(data: any): boolean {
    if (data == null) return false;
    if ('limType' in data) {
      // Overall Limits row.
      // "Sum Insured" isn't a valid Limit type in the Transit tab (only "Amount" is), so a
      // Transit row set to Sum Insured can't be applied there — unless the optional Aggregate
      // Amount has been filled in, which gives us a concrete Amount-compatible value to apply.
      if (data.limType === 'Sum Insured') return !!data.limOccurrence && data.limAggValue != null;
      return !!data.limType && !!data.limOccurrence
        && (data.limType !== 'Amount' || data.limValue != null);
    }
    if ('deductibleType' in data) {
      // Overall Deductibles row.
      return !!data.retentionType && !!data.deductibleType
        && data.dedValue != null && !!data.dedOccurrence;
    }
    return false;
  }

  private readonly ACTION_COL = {
    headerName: '',
    field: '__action',
    width: 64,
    minWidth: 64,
    maxWidth: 64,
    sortable: false,
    resizable: false,
    editable: false,
    // The action icon only appears on the Transit row, and only becomes clickable once all
    // required data on that row has been filled in.
    cellRenderer: (p: any) => {
      if (p.data?.section !== 'Transit') return '';
      const complete = this.isTransitRowComplete(p.data);
      const fill = complete ? '#006192' : '#B5B5B5';
      const cursor = complete ? 'pointer' : 'not-allowed';
      const disabledAttr = complete ? '' : 'disabled';
      return `<div style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;box-sizing:border-box"><button ${disabledAttr} style="background:none;border:none;cursor:${cursor};padding:0;line-height:1;display:flex"><svg xmlns="http://www.w3.org/2000/svg" width="4" height="16" viewBox="0 0 4 16" fill="none"><path d="M2 4C3.104 4 4 3.104 4 2C4 0.896 3.104 0 2 0C0.896 0 0 0.896 0 2C0 3.104 0.896 4 2 4Z" fill="${fill}"/><path d="M2 6C0.896 6 0 6.896 0 8C0 9.104 0.896 10 2 10C3.104 10 4 9.104 4 8C4 6.896 3.104 6 2 6Z" fill="${fill}"/><path d="M0 14C0 12.896 0.896 12 2 12C3.104 12 4 12.896 4 14C4 15.104 3.104 16 2 16C0.896 16 0 15.104 0 14Z" fill="${fill}"/></svg></button></div>`;
    },
  };

  limitsColDefs: ColDef<OverallLimitRow>[] = this.buildLimitsColDefs();
  deductiblesColDefs: ColDef<OverallDeductibleRow>[] = this.buildDeductiblesColDefs();

  // Version 1 only: a Currency column next to Section, set on the PD row — changing it
  // there also converts the BI row in the same table. Version 2 has no such column; its
  // currency is set solely via the "Currency" field above both tables.
  private limitsCurrencyColDef<T extends { section: string; currency: string }>(): ColDef<T> {
    return {
      field: 'currency',
      headerName: 'Currency',
      width: 110,
      editable: false,
      cellRenderer: (p: any) => p.data?.section === 'PD'
        ? dropCell(p.data.currency, this.isDraft)
        : '',
    } as ColDef<T>;
  }

  // Version 1, Deductibles table only: currency is display-only here — it always follows
  // the Overall Limits table's PD currency (set via limitsCurrencyColDef above), so there's
  // no dropdown/chevron and no click handler. The header info icon explains why.
  private deductiblesCurrencyColDef<T extends { section: string; currency: string }>(): ColDef<T> {
    return {
      field: 'currency',
      headerName: 'Currency',
      width: 110,
      editable: false,
      cellRenderer: (p: any) => p.data?.section === 'PD' ? (p.data.currency ?? '') : '',
      headerComponentParams: {
        innerHeaderComponent: CurrencyInfoHeaderComponent,
        innerHeaderComponentParams: {
          message: 'Currency is inherited from Overall Limits.',
        },
      },
    } as ColDef<T>;
  }

  private buildLimitsColDefs(): ColDef<OverallLimitRow>[] {
    const cols: ColDef<OverallLimitRow>[] = [
      {
        field: 'section',
        headerName: 'Section',
        width: 110,
        editable: false,
        cellStyle: { fontWeight: '600', color: '#1a1a1a', fontFamily: '"Allianz Neo", sans-serif' },
      },
    ];
    if (this.tableVersion === 'v1') cols.push(this.limitsCurrencyColDef<OverallLimitRow>());
    cols.push(
    {
      field: 'sumInsured',
      headerName: 'Sum Insured',
      type: 'rightAligned',
      width: 180,
      editable: false,
      cellRenderer: (p: any) => {
        if (p.data?.sumInsured == null) return '<span style="color:#767676">—</span>';
        const fmt = p.data.sumInsured.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const numStyle = this.isDraft ? 'color:#414141' : 'color:#767676;font-style:italic';
        return `<span style="display:flex;justify-content:space-between;width:100%;box-sizing:border-box"><span>${p.data.currency}</span><span style="${numStyle}">${fmt}</span></span>`;
      },
    },
    {
      field: 'limType',
      headerName: 'Limit Type',
      width: 150,
      editable: () => !this.isDraft,
      cellEditor: 'agSelectCellEditor',
      // "Sum Insured" is no longer a selectable Limit type — the Sum Insured column
      // still shows that value, but Limit type only ever offers "Amount".
      cellEditorParams: { values: ['Amount'] },
      cellRenderer: (p: any) => dropCell(p.value, this.isDraft),
    } as ColDef<OverallLimitRow>,
    {
      field: 'limValue',
      headerName: 'Limit Value',
      type: 'rightAligned',
      width: 180,
      editable: (p: any) => !this.isDraft && p.data?.limType === 'Amount',
      cellEditor: 'agTextCellEditor',
      valueParser: (p: any) => parseShorthand(p.newValue),
      cellRenderer: (p: any) => {
        if (p.data?.limType === 'Sum Insured') {
          const fmt = (p.data.sumInsured ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const numStyle = this.isDraft ? 'color:#414141' : 'color:#767676;font-style:italic';
          return `<span style="display:flex;justify-content:space-between;width:100%;box-sizing:border-box"><span>${p.data.currency || 'EUR'}</span><span style="${numStyle}">${fmt}</span></span>`;
        }
        if (p.data?.limValue == null) return this.isDraft ? numCell(null) : currencyPlaceholderCell(p.data?.currency || 'EUR');
        return numCell(p.data.limValue, p.data.currency || 'EUR');
      },
    },
    {
      field: 'limOccurrence',
      headerName: 'Occurrence',
      width: 170,
      editable: () => !this.isDraft,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: OCCURRENCE_VALUES },
      cellRenderer: (p: any) => dropCell(p.value, this.isDraft),
    },
    {
      field: 'limAggValue',
      headerName: 'Aggregate Amount (Optional)',
      type: 'rightAligned',
      width: 230,
      editable: () => !this.isDraft,
      cellEditor: 'agTextCellEditor',
      valueParser: (p: any) => parseShorthand(p.newValue),
      cellRenderer: (p: any) => {
        if (p.data?.limAggValue != null) return numCell(p.data.limAggValue, p.data.currency || 'EUR');
        if (this.isDraft) return numCell(null);
        return `<span style="display:flex;justify-content:space-between;width:100%"><span>${p.data?.currency || 'EUR'}</span><span style="color:#999;font-style:normal">Annual Amount</span></span>`;
      },
    },
    {
      field: 'biIp',
      headerName: 'BI IP',
      type: 'rightAligned',
      width: 110,
      editable: (p: any) => !this.isDraft && BI_FIELDS_SECTIONS.includes(p.data?.section),
      cellEditor: 'agTextCellEditor',
      valueParser: (p: any) => parseShorthand(p.newValue),
      cellRenderer: (p: any) => {
        if (!BI_FIELDS_SECTIONS.includes(p.data?.section)) return '';
        if (p.value == null) return this.isDraft ? numCell(null) : placeholderCell();
        return String(p.value);
      },
    },
    {
      field: 'biIpUnit',
      headerName: 'BI IP Unit',
      width: 140,
      editable: (p: any) => !this.isDraft && BI_FIELDS_SECTIONS.includes(p.data?.section),
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: BI_IP_UNIT_VALUES },
      cellRenderer: (p: any) => {
        if (!BI_FIELDS_SECTIONS.includes(p.data?.section)) return '';
        return dropCell(p.value, this.isDraft);
      },
    },
    {
      field: 'biInterest',
      headerName: 'BI Interest',
      width: 170,
      minWidth: 120,
      editable: (p: any) => !this.isDraft && BI_FIELDS_SECTIONS.includes(p.data?.section),
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: BI_INTEREST_VALUES },
      cellRenderer: (p: any) => {
        if (!BI_FIELDS_SECTIONS.includes(p.data?.section)) return '';
        if (!p.value) return this.isDraft ? numCell(null) : placeholderCell();
        return dropCell(p.value, this.isDraft);
      },
    },
    this.ACTION_COL as ColDef<OverallLimitRow>,
    );
    return cols;
  }

  private buildDeductiblesColDefs(): ColDef<OverallDeductibleRow>[] {
    const cols: ColDef<OverallDeductibleRow>[] = [
      {
        field: 'section',
        headerName: 'Section',
        width: 110,
        editable: false,
        cellStyle: { fontWeight: '600', color: '#1a1a1a', fontFamily: '"Allianz Neo", sans-serif' },
      },
    ];
    if (this.tableVersion === 'v1') cols.push(this.deductiblesCurrencyColDef<OverallDeductibleRow>());
    cols.push(
    {
      field: 'retentionType',
      headerName: 'Retention Type',
      width: 190,
      editable: () => !this.isDraft,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: RETENTION_TYPE_VALUES },
      cellRenderer: (p: any) => dropCell(p.value, this.isDraft),
    },
    {
      field: 'deductibleType',
      headerName: 'Deductible Type',
      width: 160,
      editable: () => !this.isDraft,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: (p: any) => ({
        values: p.data?.section === 'BI' ? OVERALL_TABLE_DEDUCTIBLE_TYPE_BI
          : p.data?.section === 'PD' ? OVERALL_TABLE_DEDUCTIBLE_TYPE_PD
          : OVERALL_TABLE_DEDUCTIBLE_TYPE_ALL,
      }),
      cellRenderer: (p: any) => dropCell(p.value, this.isDraft),
    } as ColDef<OverallDeductibleRow>,
    {
      field: 'dedValue',
      headerName: 'Deductible Value',
      type: 'rightAligned',
      width: 180,
      editable: () => !this.isDraft,
      cellEditor: 'agTextCellEditor',
      valueParser: (p: any) => parseShorthand(p.newValue),
      cellRenderer: (p: any) => {
        const type = p.data?.deductibleType;
        const isPercent = isPercentDeductibleType(type);
        const isNumber = type === 'Number of days';
        if (p.data?.dedValue == null) {
          if (this.isDraft) return numCell(null);
          if (isPercent) return percentPlaceholderCell();
          if (isNumber) return errCell();
          return currencyPlaceholderCell(p.data?.currency || 'EUR');
        }
        if (isPercent) return percentCell(p.data.dedValue);
        if (isNumber) return plainNumberCell(p.data.dedValue);
        return numCell(p.data.dedValue, p.data.currency || 'EUR');
      },
    },
    {
      field: 'dedMin',
      headerName: 'Min (Optional)',
      type: 'rightAligned',
      width: 170,
      // "Amount" deductibles have no Min/Max range — only other deductible types (percent-based,
      // number of days) can define one.
      editable: (p: any) => !this.isDraft && p.data?.deductibleType !== 'Amount',
      cellEditor: 'agTextCellEditor',
      valueParser: (p: any) => parseShorthand(p.newValue),
      cellRenderer: (p: any) => {
        if (p.data?.deductibleType === 'Amount') return numCell(null);
        if (p.data?.dedMin != null) return numCell(p.data.dedMin, p.data.currency || 'EUR');
        return this.isDraft ? numCell(null) : currencyPlaceholderCell(p.data?.currency || 'EUR');
      },
    },
    {
      field: 'dedMax',
      headerName: 'Max (Optional)',
      type: 'rightAligned',
      width: 170,
      editable: (p: any) => !this.isDraft && p.data?.deductibleType !== 'Amount',
      cellEditor: 'agTextCellEditor',
      valueParser: (p: any) => parseShorthand(p.newValue),
      cellRenderer: (p: any) => {
        if (p.data?.deductibleType === 'Amount') return numCell(null);
        if (p.data?.dedMax != null) return numCell(p.data.dedMax, p.data.currency || 'EUR');
        return this.isDraft ? numCell(null) : currencyPlaceholderCell(p.data?.currency || 'EUR');
      },
    },
    {
      field: 'dedOccurrence',
      headerName: 'Occurrence',
      width: 170,
      editable: () => !this.isDraft,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: OCCURRENCE_VALUES },
      cellRenderer: (p: any) => dropCell(p.value, this.isDraft),
    },
    {
      field: 'dedAggValue',
      headerName: 'Aggregate Amount (Optional)',
      type: 'rightAligned',
      width: 230,
      minWidth: 160,
      editable: () => !this.isDraft,
      cellEditor: 'agTextCellEditor',
      valueParser: (p: any) => parseShorthand(p.newValue),
      cellRenderer: (p: any) => {
        if (p.data?.dedAggValue != null) return numCell(p.data.dedAggValue, p.data.currency || 'EUR');
        if (this.isDraft) return numCell(null);
        return `<span style="display:flex;justify-content:space-between;width:100%"><span>${p.data?.currency || 'EUR'}</span><span style="color:#999;font-style:normal">Annual Amount</span></span>`;
      },
    },
    this.ACTION_COL as ColDef<OverallDeductibleRow>,
    );
    return cols;
  }

  onCurrencyChange(newCurrency: string): void {
    this.previousCurrency = this.selectedCurrency;
    this.selectedCurrency = newCurrency;
    // Before save: values convert silently, no banner. Once saved/draft-saved (even after
    // clicking Edit to come back in), the label still updates and the banner shows instead,
    // but the data stays locked and must not convert.
    this.showCurrencyMessage = this.currencyLocked;
    if (this.currencyLocked) return;
    this.convertAllToCurrency(newCurrency);
  }

  // Version 3 only: a standalone "Change overall currency" dropdown above the Overall Limits
  // section, converting both the Limits and Deductibles tables directly (no per-row picker,
  // no banner step needed).
  get overallCurrency(): string {
    return this.limitsRowData.find(r => r.section === 'PD')?.currency ?? this.limitsRowData[0]?.currency ?? this.selectedCurrency;
  }

  get overallCurrencyLabel(): string {
    const code = this.overallCurrency;
    const name = CURRENCY_LIST.find(c => c.code === code)?.name;
    return name ? `${code} - ${name}` : code;
  }

  // Converts only the Overall Limits/Deductibles tab data — used by both the tab-scoped
  // currency field and the full convertAllToCurrency (submission-level) conversion below.
  private convertLimitsAndDeductiblesToCurrency(code: string): void {
    this.limitsRowData = this.limitsRowData.map(r => {
      if (r.currency === code) return r;
      return {
        ...r,
        currency: code,
        sumInsured: r.sumInsured != null ? convertCurrency(r.sumInsured, r.currency, code) : r.sumInsured,
        limValue: r.limValue != null ? convertCurrency(r.limValue, r.currency, code) : r.limValue,
        limAggValue: r.limAggValue != null ? convertCurrency(r.limAggValue, r.currency, code) : r.limAggValue,
      };
    });

    this.deductiblesRowData = this.deductiblesRowData.map(r => {
      if (r.currency === code) return r;
      return {
        ...r,
        currency: code,
        dedValue: r.dedValue != null ? convertCurrency(r.dedValue, r.currency, code) : r.dedValue,
        dedMin: r.dedMin != null ? convertCurrency(r.dedMin, r.currency, code) : r.dedMin,
        dedMax: r.dedMax != null ? convertCurrency(r.dedMax, r.currency, code) : r.dedMax,
        dedAggValue: r.dedAggValue != null ? convertCurrency(r.dedAggValue, r.currency, code) : r.dedAggValue,
      };
    });
  }

  // Convert Overall Limits/Deductibles from their own current currency to the new one.
  // Coverage Sublimits/Deductibles rows only relabel their currency — never converted,
  // matching the per-row currency picker on that tab.
  private convertAllToCurrency(code: string): void {
    this.convertLimitsAndDeductiblesToCurrency(code);

    this.allData = this.allData.map(r =>
      r.parentId !== null && r.currency !== code ? { ...r, currency: code } : r
    );
    this.rowData = this.buildRowData();
    this.refreshAllGrids();
  }

  saveDraft(): void {
    this.isDraft = true;
    this.lockedMode = 'draft';
    this.currencyLocked = true;
    this.sublimitsLocked = true;
    // Versions 2 and 3 have no per-row currency picker fallback (Version 1 does), so saving a
    // draft with a pending currency change must auto-apply it here rather than leaving it stuck.
    if (this.tableVersion !== 'v1' && this.showCurrencyMessage) {
      this.applyOverallCurrencyChange();
    }
    this.refreshAllGrids();
  }

  exitDraft(): void {
    this.isDraft = false;
    this.sublimitsLocked = false;
    this.refreshAllGrids();
  }

  // Fully undoes the saved/locked state: back to unsaved, editable, and currency
  // changes convert values again instead of just showing the banner.
  resetToUnsaved(): void {
    this.isSaved = false;
    this.isDraft = false;
    this.lockedMode = 'draft';
    this.currencyLocked = false;
    this.showCurrencyMessage = false;
    this.sublimitsLocked = false;
    // While locked, currency changes only relabeled the submission currency without converting
    // values — catch those up now so every grid actually matches the current submission currency.
    this.convertAllToCurrency(this.selectedCurrency);
  }

  private refreshAllGrids(): void {
    setTimeout(() => {
      this.gridApi?.refreshCells({ force: true });
      this.limitsGridApi?.refreshCells({ force: true });
      this.deductiblesGridApi?.refreshCells({ force: true });
      this.cdr.detectChanges();
    });
  }

  save(): void {
    this.saveAttempted = true;
    // Validate all leaf rows — flag any null numeric fields
    this.allData = this.allData.map(row => {
      if (row.parentId === null) return row;
      const errFields = this.REQUIRED_FIELDS.filter(f => {
        const val = (row as any)[f];
        return val == null || val === '' || (typeof val === 'number' && isNaN(val));
      });
      return { ...row, errorFields: errFields };
    });
    this.rowData = this.buildRowData();

    // Reveal error columns (skip ones the user explicitly hid), then open error panel
    const erroredFields = [...new Set(this.allData.flatMap(r => r.errorFields ?? []))];
    if (erroredFields.length > 0) {
      this.applyVisibility(erroredFields, true);
      this.errorPanelOpen = true;
      this.errorPanelTab = 'errors';
    } else {
      this.isDraft = true;
      this.lockedMode = 'final';
      this.isSaved = true;
      this.currencyLocked = true;
      this.sublimitsLocked = true;
      // Versions 2 and 3 have no per-row currency picker fallback (Version 1 does), so saving
      // with a pending currency change must auto-apply it here rather than leaving it stuck.
      if (this.tableVersion !== 'v1' && this.showCurrencyMessage) {
        this.applyOverallCurrencyChange();
      }
      this.refreshAllGrids();
      this.triggerMergeToast('Success', `Alternative: ${this.alternativeId} has been saved successfully.`, 2000);
    }

    this.cdr.detectChanges();
    setTimeout(() => this.gridApi?.refreshCells({ force: true }));
  }
}
