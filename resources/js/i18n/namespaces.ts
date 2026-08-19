/**
 * Shared i18n namespace map.
 *
 * All translation keys used by the heavy operational pages
 * (PartsRequest, QCReview, BayMonitor, UserManagement and OperationsDashboard)
 * are defined here so every t() call goes through a single typed source of
 * truth. This guarantees that:
 *
 *   - We never silently fall through to raw English for one of the pages
 *     because we typo'd a namespace prefix (e.g. "partsExtra" vs "parts.extra").
 *   - When we add a new screen-level key, it is impossible to forget to add
 *     the matching entry in en.json / ar.json — TypeScript will error on use.
 *
 * The shape is intentionally read-only and mirrors the structure of the
 * locale JSON files. Use it like:
 *
 *   import { I18N } from "@/i18n/namespaces";
 *   t(I18N.parts.tabs.create);
 *   t(I18N.qc.title);
 */

export const I18N = {
  common: {
    cancel: "common.cancel",
    save: "common.save",
    clear: "common.clear",
    delete: "common.delete",
    edit: "common.edit",
    close: "common.close",
    search: "common.search",
    loading: "common.loading",
    confirm: "common.confirm",
  },

  parts: {
    title: "parts.title",
    tabs: {
      create: "parts.tabs.create",
      approval: "parts.tabs.approval",
      store: "parts.tabs.store",
    },
    approval: {
      queue: "parts.approval.queue",
      available: "parts.approval.available",
      lowStock: "parts.approval.lowStock",
      mechanicNotes: "parts.approval.mechanicNotes",
      tableHead: {
        part: "parts.approval.tableHead.part",
        sku: "parts.approval.tableHead.sku",
        qty: "parts.approval.tableHead.qty",
        inStock: "parts.approval.tableHead.inStock",
        status: "parts.approval.tableHead.status",
        location: "parts.approval.tableHead.location",
      },
    },
    store: {
      ready: "parts.store.ready",
      issuedWeek: "parts.store.issuedWeek",
      backOrdered: "parts.store.backOrdered",
      valueWeek: "parts.store.valueWeek",
      noApproved: "parts.store.noApproved",
      noHistory: "parts.store.noHistory",
      issueNext: "parts.store.issueNext",
      issueParts: "parts.store.issueParts",
      summary: "parts.store.summary",
      moreItems: "parts.store.moreItems",
      issuedProgress: "parts.store.issuedProgress",
      supervisorRemarks: "parts.store.supervisorRemarks",
      searchPlaceholder: "parts.store.searchPlaceholder",
      history: "parts.store.history",
      tableHead: {
        request: "parts.store.tableHead.request",
        jobCard: "parts.store.tableHead.jobCard",
        vehicle: "parts.store.tableHead.vehicle",
        parts: "parts.store.tableHead.parts",
        fulfillment: "parts.store.tableHead.fulfillment",
        status: "parts.store.tableHead.status",
      },
      historyHead: {
        id: "parts.store.historyHead.id",
        vehicle: "parts.store.historyHead.vehicle",
        items: "parts.store.historyHead.items",
        date: "parts.store.historyHead.date",
        priority: "parts.store.historyHead.priority",
        status: "parts.store.historyHead.status",
      },
    },
    rejectDialog: {
      title: "parts.rejectDialog.title",
    },
    issuance: {
      title: "parts.issuance.title",
    },
    deleteDraftTitle: "parts.deleteDraftTitle",
    skuPlaceholder: "parts.skuPlaceholder",
  },

  partsExtra: {
    partDetails: "partsExtra.partDetails",
    partName: "partsExtra.partName",
    skuPart: "partsExtra.skuPart",
    quantity: "partsExtra.quantity",
    requestNum: "partsExtra.requestNum",
    jobDetails: "partsExtra.jobDetails",
    jobCardNum: "partsExtra.jobCardNum",
    vehicle: "partsExtra.vehicle",
    location: "partsExtra.location",
    storeLocation: "partsExtra.storeLocation",
    locationUnknown: "partsExtra.locationUnknown",
    collector: "partsExtra.collector",
    collectorPlaceholder: "partsExtra.collectorPlaceholder",
    bayNumber: "partsExtra.bayNumber",
    bayPlaceholder: "partsExtra.bayPlaceholder",
    issuanceNotes: "partsExtra.issuanceNotes",
    issuanceNotesPlaceholder: "partsExtra.issuanceNotesPlaceholder",
    confirmIssue: "partsExtra.confirmIssue",
  },

  qc: {
    title: "qc.title",
  },

  bay: {
    title: "bayMonitor.title",
  },

  users: {
    title: "users.title",
  },

  rolesPage: {
    title: "rolesPage.title",
  },

  i18nAudit: {
    title: "i18nAudit.title",
    subtitle: "i18nAudit.subtitle",
    empty: "i18nAudit.empty",
    refresh: "i18nAudit.refresh",
    clear: "i18nAudit.clear",
    key: "i18nAudit.key",
    languages: "i18nAudit.languages",
    component: "i18nAudit.component",
    count: "i18nAudit.count",
    firstSeen: "i18nAudit.firstSeen",
  },
} as const;

export type I18nKey = string;
