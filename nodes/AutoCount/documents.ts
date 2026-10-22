/**
 * Every AutoCount document type the node supports. They share one API shape
 * (`/{book}/<path>` with docNo, `/listing`, `/void`), so one set of operations drives them all.
 */

export type LineKind = 'trade' | 'journal' | 'cashBook' | 'stockAdjustment' | 'stockTransfer';

export interface DocumentType {
	/** Resource value in the node UI */
	value: string;
	/** Singular display name */
	name: string;
	/** API path segment */
	path: string;
	/** AutoCount document type code, used for numbering formats */
	docType: string;
	party?: 'debtor' | 'creditor';
	/** Whether the party code must be given (quotations can be made for prospects) */
	partyRequired?: boolean;
	locationField?: 'salesLocation' | 'purchaseLocation';
	lineKind: LineKind;
	/** Whether each line must have a GL account (accNo) */
	lineAccountRequired?: boolean;
	knockOff?: boolean;
	/** Status values for the "Update Status" operation, if the document has one */
	statuses?: Array<{ name: string; value: number; description: string }>;
	/** Listing filters this document accepts besides dates and doc numbers */
	filterSalesAgent?: boolean;
	/** Whether the document can be submitted to MyInvois (LHDN e-Invoice) */
	eInvoice?: boolean;
	/** Header fields shown under "Additional Fields", by key of HEADER_FIELDS */
	headerFields: string[];
}

const salesHeader = [
	'docNo', 'docNoFormatName', 'taxDate', 'creditTerm', 'salesAgent', 'location', 'ref', 'description', 'note',
	'remark1', 'remark2', 'remark3', 'remark4', 'address', 'attention', 'phone1', 'email', 'deliverAddress',
	'deliverContact', 'deliverPhone1', 'currencyRate', 'inclusiveTax', 'isRoundAdj', 'taxEntity', 'taxExemptionNo',
];

const purchaseHeader = [
	'docNo', 'docNoFormatName', 'creditTerm', 'location', 'ref', 'description', 'note', 'remark1', 'remark2', 'remark3',
	'remark4', 'address', 'attention', 'phone1', 'email', 'currencyRate', 'inclusiveTax', 'isRoundAdj', 'taxEntity',
];

export const DOCUMENT_TYPES: DocumentType[] = [
	{
		value: 'invoice',
		name: 'Sales Invoice',
		path: 'invoice',
		docType: 'IV',
		party: 'debtor',
		partyRequired: true,
		locationField: 'salesLocation',
		lineKind: 'trade',
		lineAccountRequired: true,
		knockOff: true,
		filterSalesAgent: true,
		eInvoice: true,
		headerFields: salesHeader,
	},
	{
		value: 'creditNote',
		name: 'Credit Note',
		path: 'creditnote',
		docType: 'CN',
		party: 'debtor',
		partyRequired: true,
		locationField: 'salesLocation',
		lineKind: 'trade',
		lineAccountRequired: true,
		knockOff: true,
		filterSalesAgent: true,
		eInvoice: true,
		headerFields: [...salesHeader, 'ourInvoiceNo', 'reason'],
	},
	{
		value: 'quotation',
		name: 'Quotation',
		path: 'quotation',
		docType: 'QT',
		party: 'debtor',
		partyRequired: false,
		locationField: 'salesLocation',
		lineKind: 'trade',
		filterSalesAgent: true,
		statuses: [
			{ name: 'Pending', value: 0, description: 'Still waiting for the customer' },
			{ name: 'Success', value: 1, description: 'The customer accepted the quotation' },
			{ name: 'Lost', value: 2, description: 'The customer declined; add a lost reason' },
			{ name: 'Closed', value: 3, description: 'No further action' },
		],
		headerFields: [
			...salesHeader.filter((field) => !['taxDate', 'taxEntity'].includes(field)),
			'partyName', 'yourRef', 'validity', 'deliveryTerm', 'paymentTerm', 'cc',
		],
	},
	{
		value: 'purchaseInvoice',
		name: 'Purchase Invoice',
		path: 'purchaseinvoice',
		docType: 'PI',
		party: 'creditor',
		partyRequired: true,
		locationField: 'purchaseLocation',
		lineKind: 'trade',
		lineAccountRequired: true,
		knockOff: true,
		headerFields: [...purchaseHeader, 'taxDate', 'supplierInvoiceNo', 'orgDocDate'],
	},
	{
		value: 'purchaseOrder',
		name: 'Purchase Order',
		path: 'purchaseorder',
		docType: 'PO',
		party: 'creditor',
		partyRequired: true,
		locationField: 'purchaseLocation',
		lineKind: 'trade',
		statuses: [
			{ name: 'Open', value: 0, description: 'Still waiting for the goods or service' },
			{ name: 'Closed', value: 1, description: 'Fully received or no longer needed' },
		],
		headerFields: [...purchaseHeader, 'deliverAddress', 'deliverContact', 'deliverPhone1'],
	},
	{
		value: 'purchaseReturn',
		name: 'Purchase Return',
		path: 'purchasereturn',
		docType: 'PR',
		party: 'creditor',
		partyRequired: true,
		locationField: 'purchaseLocation',
		lineKind: 'trade',
		lineAccountRequired: true,
		knockOff: true,
		headerFields: [...purchaseHeader, 'taxDate', 'supplierInvoiceNo', 'supplierCNNo', 'orgDocDate', 'reason'],
	},
	{
		value: 'journalEntry',
		name: 'Journal Entry',
		path: 'journalentry',
		docType: 'JE',
		lineKind: 'journal',
		lineAccountRequired: true,
		knockOff: true,
		headerFields: ['docNo', 'docNo2', 'docNoFormatName', 'taxDate', 'description', 'note', 'currencyCode', 'currencyRate'],
	},
	{
		value: 'cashBookEntry',
		name: 'Cash Book Entry',
		path: 'payment',
		docType: 'PV',
		lineKind: 'cashBook',
		lineAccountRequired: true,
		knockOff: true,
		headerFields: [
			'docNo', 'docNo2', 'docNoFormatName', 'taxDate', 'dealWith', 'description', 'note', 'currencyCode',
			'currencyRate', 'taxEntity', 'chequeNo',
		],
	},
	{
		value: 'stockAdjustment',
		name: 'Stock Adjustment',
		path: 'stockadjustment',
		docType: 'SA',
		lineKind: 'stockAdjustment',
		headerFields: ['docNo', 'docNoFormatName', 'ref', 'description', 'note', 'remark1', 'remark2', 'remark3', 'remark4'],
	},
	{
		value: 'stockTransfer',
		name: 'Stock Transfer',
		path: 'stocktransfer',
		docType: 'ST',
		lineKind: 'stockTransfer',
		headerFields: [
			'docNo', 'docNoFormatName', 'ref', 'description', 'note', 'reason', 'authorisedBy', 'remark1', 'remark2',
			'remark3', 'remark4',
		],
	},
];

export const DOCUMENT_RESOURCES = DOCUMENT_TYPES.map((doc) => doc.value);

export function getDocumentType(resource: string): DocumentType | undefined {
	return DOCUMENT_TYPES.find((doc) => doc.value === resource);
}
