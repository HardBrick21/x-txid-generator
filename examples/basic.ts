import {
  ClientTransaction,
  generateHeaders,
  getOndemandFileUrl,
  handleXMigrationAsync,
} from '../src/index';

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
const ondemandFileResponse = await fetch(ondemandFileUrl, { headers }).then(
  (response) => response.text(),
);

const transaction = new ClientTransaction(homePageHtml, ondemandFileResponse);

console.log(
  transaction.generateTransactionId(
    'GET',
    '/i/api/graphql/1VOOyvKkiI3FMmkeDNxM9A/UserByScreenName',
  ),
);
