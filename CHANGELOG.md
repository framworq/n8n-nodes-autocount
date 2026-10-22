# Changelog

## Unreleased

- README credits Framworq and lists the master-data-to-transactions example.
- Package no longer ships the TypeScript build cache; author email is john@framworq.com.

## 0.1.0

First release.

- AutoCount node: sales invoices, credit notes, quotations, purchase invoices, purchase orders, purchase returns,
  cash book entries, journal entries, stock adjustments and stock transfers (create, get, get many, update, delete,
  void, knock-off details, status updates); customers, suppliers and products; company profile; lookups.
- AutoCount Trigger: polls for created, or created-or-updated, documents.
- Fills customer/supplier details, default location, date and currency rates on create; keeps existing lines on update;
  never submits an e-Invoice unless asked; retries on rate limits.
