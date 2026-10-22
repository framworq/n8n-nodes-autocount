// Generated from the AutoCount Cloud Accounting Integration API spec (swagger v1).
// Line fields each document type accepts on create/update. Used to resend existing lines on update,
// because AutoCount replaces every line of a document on PUT.

export const DETAIL_INPUT_FIELDS: Record<string, string[]> = {
	invoice: ['productCode', 'productVariant', 'accNo', 'description', 'furtherDescription', 'qty', 'unit', 'unitPrice', 'discount', 'taxCode', 'taxAdjustment', 'localTaxAdjustment', 'tariffCode', 'taxExportCountry', 'taxPermitNo', 'localTotalCost', 'yourPONo', 'yourPODate', 'deptNo', 'classificationCode', 'unitType', 'originCountry'],
	creditNote: ['productCode', 'productVariant', 'accNo', 'description', 'furtherDescription', 'qty', 'unit', 'unitPrice', 'discount', 'taxCode', 'tariffCode', 'taxExportCountry', 'taxPermitNo', 'taxAdjustment', 'localTaxAdjustment', 'unitCost', 'goodsReturn', 'yourPONo', 'yourPODate', 'deptNo', 'classificationCode', 'unitType', 'originCountry'],
	quotation: ['productCode', 'productVariant', 'description', 'furtherDescription', 'qty', 'unit', 'unitPrice', 'discount', 'taxCode', 'taxAdjustment', 'localTaxAdjustment', 'deptNo'],
	purchaseInvoice: ['productCode', 'productVariant', 'accNo', 'description', 'furtherDescription', 'qty', 'unit', 'unitPrice', 'discount', 'taxCode', 'taxAdjustment', 'localTaxAdjustment', 'tariffCode', 'taxPermitNo', 'cnAmt', 'ourPONo', 'ourPODate', 'deptNo', 'unitType'],
	purchaseOrder: ['productCode', 'productVariant', 'description', 'furtherDescription', 'qty', 'unit', 'unitPrice', 'discount', 'taxCode', 'taxAdjustment', 'localTaxAdjustment', 'deptNo', 'unitType'],
	purchaseReturn: ['productCode', 'productVariant', 'accNo', 'description', 'furtherDescription', 'qty', 'unit', 'unitPrice', 'discount', 'taxCode', 'taxAdjustment', 'localTaxAdjustment', 'tariffCode', 'taxPermitNo', 'goodsReturn', 'ourPONo', 'ourPODate', 'deptNo', 'unitType'],
	journalEntry: ['accNo', 'toAccountRate', 'ref', 'description', 'furtherDescription', 'dr', 'cr', 'taxCode', 'taxAdjustment', 'localTaxAdjustment', 'tariffCode', 'taxExportCountry', 'taxPermitNo', 'taxBRNo', 'taxRefNo', 'taxRegisterNo', 'taxEntity', 'taxBillDate', 'salesAgent', 'name', 'inclusiveTax', 'deptNo'],
	cashBookEntry: ['accNo', 'toAccountRate', 'description', 'furtherDescription', 'amount', 'taxCode', 'taxAdjustment', 'localTaxAdjustment', 'tariffCode', 'taxExportCountry', 'taxPermitNo', 'taxBRNo', 'taxBName', 'taxRefNo', 'taxRegisterNo', 'taxEntity', 'taxBillDate', 'salesAgent', 'inclusiveTax', 'deptNo'],
	stockAdjustment: ['stockCode', 'description', 'furtherDescription', 'qty', 'unitCost', 'location', 'deptNo'],
	stockTransfer: ['stockCode', 'description', 'furtherDescription', 'qty', 'unitCost', 'deptNo'],
};

export const PAYMENT_DETAIL_INPUT_FIELDS: string[] = ['paymentMethod', 'paymentBy', 'chequeNo', 'floatDay', 'bankCharge', 'toBankRate', 'paymentAmt', 'bankChargeTaxCode', 'bankChargeTaxRate', 'bankChargeTax', 'bankChargeTaxRefNo'];
