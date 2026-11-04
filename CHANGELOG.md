# Changelog

## 0.1.1

- Fix: Lookup → Chart of Accounts and the account dropdown failed with HTTP 415. Requests with an empty body now
  send `{}` as JSON.
- Fix: operation descriptions said "journal entrys" and "cash book entrys".

## 0.1.0

First release.

- AutoCount node: sales invoices, credit notes, quotations, purchase invoices, purchase orders, purchase returns,
  cash book entries, journal entries, stock adjustments and stock transfers (create, get, get many, update, delete,
  void, knock-off details, status updates); customers, suppliers and products; company profile; lookups.
- AutoCount Trigger: polls for created, or created-or-updated, documents.
- Fills customer/supplier details, default location, date and currency rates on create; keeps existing lines on update;
  never submits an e-Invoice unless asked; retries on rate limits.
