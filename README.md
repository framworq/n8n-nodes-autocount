# n8n-nodes-autocount

An [n8n](https://n8n.io/) community node for **[AutoCount Cloud Accounting](https://www.autocountsoft.com/pro-cloud-acc.html)**, the cloud accounting software widely used by businesses in Malaysia.

Use it to create invoices from your online store, record payments, keep customers and products in sync, post journals, and trigger workflows when documents change in AutoCount.

> This is an unofficial, community-maintained integration. It is not made, endorsed or supported by Auto Count Sdn Bhd. "AutoCount" is a trademark of its owner.

Built and maintained by **[Framworq](https://framworq.com)**, an AI automation agency in Malaysia. Need AutoCount or MyInvois e-Invoice workflows built for you? See [AutoCount & e-Invoice automation](https://framworq.com/services/autocount-e-invoice-automation).

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Trigger](#trigger) · [How it behaves](#how-it-behaves) · [Examples](#example-workflows) · [Limitations](#limitations) · [Version history](#version-history)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/). In n8n: **Settings → Community Nodes → Install**, and enter `n8n-nodes-autocount`.

## Credentials

You need an AutoCount Cloud Accounting account book and an API key for it.

1. Sign in to [AutoCount Cloud Accounting](https://accounting.autocountcloud.com) and open the company.
2. **Account Book ID**: the number in the address bar after the domain, for example `accounting.autocountcloud.com/`**`12345`**`/…`.
3. Click the **gear icon → Find Your Key ID & API Key → Create API Key**. Copy the **Key ID** and the **API Key**.
4. In n8n, create an **AutoCount Cloud Accounting API** credential with those three values. n8n tests it by reading the company profile.

Each API key belongs to one account book. To work with several companies, create one credential per account book.

## Operations

| Resource | Operations |
|---|---|
| **Sales Invoice** | Create, Get, Get Many, Update, Delete, Void, Get Knock-Off Details |
| **Credit Note** | Create, Get, Get Many, Update, Delete, Void, Get Knock-Off Details |
| **Quotation** | Create, Get, Get Many, Update, Delete, Void, Update Status (Pending / Success / Lost / Closed) |
| **Purchase Invoice** | Create, Get, Get Many, Update, Delete, Void, Get Knock-Off Details |
| **Purchase Order** | Create, Get, Get Many, Update, Delete, Void, Update Status (Open / Closed) |
| **Purchase Return** | Create, Get, Get Many, Update, Delete, Void, Get Knock-Off Details |
| **Cash Book Entry** | Create (payment voucher or official receipt), Get, Get Many, Update, Delete, Void, Get Knock-Off Details |
| **Journal Entry** | Create, Get, Get Many, Update, Delete, Void, Get Knock-Off Details |
| **Stock Adjustment** | Create, Get, Get Many, Update, Delete, Void |
| **Stock Transfer** | Create, Get, Get Many, Update, Delete, Void |
| **Customer** (debtor) | Create, Get, Get Many, Update, Delete |
| **Supplier** (creditor) | Create, Get, Get Many, Update, Delete |
| **Product** | Create, Get, Get Many, Update, Delete, Get Stock Balance |
| **Company** | Get Profile |
| **Lookup** | Get Many: chart of accounts, locations, numbering formats, payment methods, sales agents, departments, areas, tax entities |

**Get Many** on documents can filter by document date, created date, last-modified date, document numbers, customer or supplier codes, and sales agent.

Document lines can be entered in the node (**Define Below**) or passed as an array (**From JSON**), for example mapped from a Shopify order's line items. The JSON uses AutoCount's field names: `accNo`, `productCode`, `description`, `qty`, `unitPrice`, `discount`, `taxCode`, and so on.

The node can also be used as a tool by n8n AI agents.

## Trigger

**AutoCount Trigger** polls AutoCount and starts the workflow for each:

- **Created** document of the chosen type, or
- **Created or Updated** document (edits, voids and approvals included).

On first activation it starts from "now", so existing documents don't all fire at once. It keeps its position using AutoCount's own timestamps, so a document is never emitted twice.

## How it behaves

The AutoCount API has a few quirks. The node handles them so your workflows don't have to:

- **Less typing on create.** Give a customer or supplier code, and the node fills in the name, credit term, address, attention and phone from that record. It uses the account book's default location and today's date (Malaysia time) unless you set them.
- **Update keeps your lines.** AutoCount replaces *every* line of a document on update. Unless you choose to replace them, the node re-sends the existing lines, so changing a remark never wipes an invoice.
- **e-Invoice is never submitted by accident.** On sales invoices and credit notes, *Submit e-Invoice* (MyInvois / LHDN) is always sent as off unless you switch it on.
- **New customers and suppliers are active.** AutoCount creates them as inactive unless told otherwise. The node defaults to active.
- **Full records back.** AutoCount returns only a code when you create something. The node fetches the new record and returns it in full.
- **Rate limits are handled.** AutoCount allows a limited number of requests per minute. The node waits and retries automatically when it hits the limit.
- **Clear errors.** AutoCount's validation messages are shown as they are, for example `AccNo "610-0000" not exists.`
- **Cash book entries:** choose the payment method (e.g. BANK, CASH). The node sets the journal type from it and makes the payment amount equal to the total of the lines.

## Example workflows

Example workflows are in [`examples/`](examples). Import them with **Workflows → Import from File**.

- **[Order to invoice](examples/order-to-invoice.json)**: an authenticated webhook receives an order and the node creates the sales invoice, with lines mapped from the order items.
- **[New invoice summary](examples/new-invoice-alert.json)**: the trigger watches for new sales invoices and builds a one-line summary to send to Slack, Telegram or email.

## Limitations

These come from the AutoCount Cloud Accounting API, not the node:

- GL accounts, credit terms, tax codes and locations can't be created through the API. Set them up in AutoCount first; the node can then use them.
- There is no API endpoint for listing tax codes or credit terms, so those are typed in rather than picked from a list.
- Every sales and purchase line needs a GL account (`accNo`), even when it has a product.
- A product can't be deleted while AutoCount is still calculating stock costs for a recent document. Wait a few seconds and retry.
- AutoCount's free plan limits purchase, accounting and stock documents to 60 each per year.

## Using it with AI agents

When you give the node to an AI agent as a tool, the agent can create, change and delete accounting records. Only connect it to agents that trusted people use. Don't connect it to a public chatbot. Give the agent only the operations it needs.

## Compatibility

Built and tested with n8n 2.x and `n8n-workflow` 2.44, against the AutoCount Cloud Accounting Integration API v1.

## Development

```bash
npm install
npm run dev     # start n8n with the node loaded, at http://localhost:5678
npm run lint
npm run build
```

## Resources

- [AutoCount Cloud Accounting Integration API (Swagger)](https://accounting-api.autocountcloud.com/swagger/index.html)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Version history

See [CHANGELOG.md](CHANGELOG.md).

## About Framworq

[Framworq](https://framworq.com) builds AI automation for businesses in Malaysia: n8n workflows, AutoCount and MyInvois e-Invoice integrations, WhatsApp AI chatbots and custom AI agents. No upfront consultation fee. Free discovery and a free tailored proposal.

Found a bug or need an operation that isn't here? [Open an issue](https://github.com/framworq/n8n-nodes-autocount/issues).

## License

[MIT](LICENSE.md) © Framworq
