import * as cheerio from 'cheerio';
import {
  MIGRATION_REDIRECTION_REGEX,
  ON_DEMAND_FILE_REGEX,
  ON_DEMAND_FILE_URL,
} from './constants';

export type ResponseLike =
  | string
  | Buffer
  | {
      content?: string | Buffer;
      text?: string | Buffer;
    };

export interface RequestOptions {
  method: string;
  url: string;
  data?: Record<string, string>;
}

type MaybePromise<T> = T | Promise<T>;

export interface SessionLike {
  request?: (
    optionsOrMethod: RequestOptions | string,
    url?: string,
    data?: Record<string, string>,
  ) => MaybePromise<ResponseLike>;
  get?: (url: string) => MaybePromise<ResponseLike>;
}

export function mathRound(num: number): number {
  let x = Math.floor(num);

  if (num - x >= 0.5) {
    x = Math.ceil(num);
  }

  return copySign(x, num);
}

export function generateHeaders(): Record<string, string> {
  return {
    Authority: 'x.com',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Referer: 'https://x.com',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'X-Twitter-Active-User': 'yes',
    'X-Twitter-Client-Language': 'en',
  };
}

export function validateResponse(
  response: unknown,
): asserts response is string {
  if (typeof response !== 'string') {
    throw new TypeError(
      `the response object must be string, not ${typeof response}`,
    );
  }
}

export function getMigrationUrl(response: string): RegExpMatchArray | null {
  const $ = cheerio.load(response);
  const refresh = $("meta[http-equiv='refresh']").first().toString();

  return (
    refresh.match(MIGRATION_REDIRECTION_REGEX) ??
    response.match(MIGRATION_REDIRECTION_REGEX)
  );
}

export function getMigrationForm(response: string): RequestOptions | undefined {
  const $ = cheerio.load(response);
  const form = $("form[name='f']").first().length
    ? $("form[name='f']").first()
    : $("form[action='https://x.com/x/migrate']").first();

  if (!form.length) {
    return undefined;
  }

  const url = form.attr('action') ?? 'https://x.com/x/migrate';
  const method = form.attr('method') ?? 'POST';
  const data: Record<string, string> = {};

  form.find('input').each((_, input) => {
    const name = $(input).attr('name');
    if (!name) {
      return;
    }

    data[name] = $(input).attr('value') ?? '';
  });

  return { method, url, data };
}

export function getOndemandFileUrl(response: string): string {
  const onDemandFileIndex = response.match(ON_DEMAND_FILE_REGEX)?.[1];

  if (!onDemandFileIndex) {
    throw new Error("Couldn't get ondemand.s file index");
  }

  const hashRegex = new RegExp(`,${onDemandFileIndex}:["']([0-9a-f]+)["']`);
  const filename = response.match(hashRegex)?.[1];

  if (!filename) {
    throw new Error("Couldn't get ondemand.s file hash");
  }

  return ON_DEMAND_FILE_URL.replace('{filename}', filename);
}

export function handleXMigration(session: SessionLike): string {
  let homePage = getResponseContent(
    callSessionRequestSync(session, { method: 'GET', url: 'https://x.com' }),
  );
  const migrationRedirectionUrl = getMigrationUrl(homePage);

  if (migrationRedirectionUrl) {
    homePage = getResponseContent(
      callSessionRequestSync(session, {
        method: 'GET',
        url: migrationRedirectionUrl[0],
      }),
    );
  }

  const migrationForm = getMigrationForm(homePage);

  if (migrationForm) {
    homePage = getResponseContent(
      callSessionRequestSync(session, migrationForm),
    );
  }

  return homePage;
}

export async function handleXMigrationAsync(
  session: SessionLike,
): Promise<string> {
  let homePage = getResponseContent(
    await callSessionRequestAsync(session, {
      method: 'GET',
      url: 'https://x.com',
    }),
  );
  const migrationRedirectionUrl = getMigrationUrl(homePage);

  if (migrationRedirectionUrl) {
    homePage = getResponseContent(
      await callSessionRequestAsync(session, {
        method: 'GET',
        url: migrationRedirectionUrl[0],
      }),
    );
  }

  const migrationForm = getMigrationForm(homePage);

  if (migrationForm) {
    homePage = getResponseContent(
      await callSessionRequestAsync(session, migrationForm),
    );
  }

  return homePage;
}

export function floatToHex(x: number): string {
  const result: string[] = [];
  let quotient = Math.trunc(x);
  let fraction = x - quotient;
  let value = x;

  while (quotient > 0) {
    quotient = Math.trunc(value / 16);
    const remainder = Math.trunc(value - quotient * 16);

    if (remainder > 9) {
      result.unshift(String.fromCharCode(remainder + 55));
    } else {
      result.unshift(String(remainder));
    }

    value = quotient;
  }

  if (fraction === 0) {
    return result.join('');
  }

  result.push('.');

  while (fraction > 0) {
    fraction *= 16;
    const integer = Math.trunc(fraction);
    fraction -= integer;

    if (integer > 9) {
      result.push(String.fromCharCode(integer + 55));
    } else {
      result.push(String(integer));
    }
  }

  return result.join('');
}

export function isOdd(num: number): -1.0 | 0.0 {
  return num % 2 ? -1.0 : 0.0;
}

export function base64Encode(input: string | Uint8Array | number[]): string {
  return Buffer.from(input as string | Uint8Array).toString('base64');
}

export function base64Decode(input: string): string | number[] {
  if (isStrictBase64(input)) {
    return Buffer.from(input, 'base64').toString();
  }

  return Array.from(Buffer.from(input, 'utf8'));
}

function copySign(value: number, signSource: number) {
  return signSource < 0 || Object.is(signSource, -0)
    ? -Math.abs(value)
    : Math.abs(value);
}

function getResponseContent(response: ResponseLike): string {
  if (typeof response === 'string') {
    return response;
  }

  if (Buffer.isBuffer(response)) {
    return response.toString();
  }

  const content = response.content ?? response.text;

  if (typeof content === 'string') {
    return content;
  }

  if (Buffer.isBuffer(content)) {
    return content.toString();
  }

  throw new TypeError(
    'response must be a string, Buffer, or object with content/text',
  );
}

function callSessionRequestSync(
  session: SessionLike,
  options: RequestOptions,
): ResponseLike {
  const response = callSessionRequest(session, options);

  if (response instanceof Promise) {
    throw new TypeError(
      'session returned a Promise; use handleXMigrationAsync',
    );
  }

  return response;
}

async function callSessionRequestAsync(
  session: SessionLike,
  options: RequestOptions,
): Promise<ResponseLike> {
  return await callSessionRequest(session, options);
}

function callSessionRequest(
  session: SessionLike,
  options: RequestOptions,
): MaybePromise<ResponseLike> {
  if (session.request) {
    if (session.request.length > 1) {
      return session.request(options.method, options.url, options.data);
    }

    return session.request(options);
  }

  if (session.get && options.method.toUpperCase() === 'GET') {
    return session.get(options.url);
  }

  throw new TypeError('session must provide request() or get()');
}

function isStrictBase64(input: string): boolean {
  const normalized = input.replace(/\s+/g, '');

  if (normalized.length === 0 || normalized.length % 4 === 1) {
    return false;
  }

  return /^[A-Za-z0-9+/]+={0,2}$/.test(normalized);
}
