import {
  ClientTransaction,
  generateHeaders,
  getOndemandFileUrl,
  handleXMigrationAsync,
} from './src/index';

const headers = generateHeaders();

const session = {
  async request({
    method,
    url,
    data,
  }: {
    method: string;
    url: string;
    data?: Record<string, string>;
  }) {
    const response = await fetch(url, {
      method,
      headers,
      body: data ? new URLSearchParams(data) : undefined,
    });

    return { content: await response.text() };
  },
};

const homePageHtml = await handleXMigrationAsync(session);
const ondemandFileUrl = getOndemandFileUrl(homePageHtml);
const ondemandResponse = await fetch(ondemandFileUrl, { headers });
const ondemandFileResponse = await ondemandResponse.text();
const transaction = new ClientTransaction(homePageHtml, ondemandFileResponse);
const transactionId = transaction.generateTransactionId(
  'POST',
  '/i/api/1.1/jot/client_event.json',
);

console.log(transactionId);
