# @hardbrick21/x-txid-generator

TypeScript/Node.js generator for X/Twitter `x-client-transaction-id` values.

## Installation

```bash
npm install @hardbrick21/x-txid-generator
```

## Usage

```ts
import {
  ClientTransaction,
  generateHeaders,
  getOndemandFileUrl,
  handleXMigrationAsync,
} from '@hardbrick21/x-txid-generator';

const headers = generateHeaders();

const session = {
  async request({ method, url, data }: { method: string; url: string; data?: Record<string, string> }) {
    const response = await fetch(url, {
      method,
      headers,
      body: data ? new URLSearchParams(data) : undefined,
    });

    return { content: await response.text() };
  },
};

const homePageHtml = await handleXMigrationAsync(session);
const ondemandUrl = getOndemandFileUrl(homePageHtml);
const ondemandResponse = await fetch(ondemandUrl, { headers });
const ondemandFileJs = await ondemandResponse.text();

const transaction = new ClientTransaction(homePageHtml, ondemandFileJs);
const transactionId = transaction.generateTransactionId(
  'POST',
  '/i/api/1.1/jot/client_event.json',
);

console.log(transactionId);
```

## API

- `ClientTransaction` derives keys and generates transaction IDs.
- `generateHeaders()` returns browser-like headers for X requests.
- `getOndemandFileUrl(homePageHtml)` extracts the `ondemand.s.js` asset URL.
- `handleXMigration(session)` handles the synchronous X migration flow.
- `handleXMigrationAsync(session)` handles the asynchronous X migration flow.

The session object may expose `request({ method, url, data })`,
`request(method, url, data)`, or `get(url)` for simple GET-only flows.

## Development

```bash
npm test
npm run build
npm run lint
```
