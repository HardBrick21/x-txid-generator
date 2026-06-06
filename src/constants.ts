export const ADDITIONAL_RANDOM_NUMBER = 3;
export const DEFAULT_KEYWORD = 'obfiowerehiring';

export const ON_DEMAND_FILE_URL =
  'https://abs.twimg.com/responsive-web/client-web/ondemand.s.{filename}a.js';
export const ON_DEMAND_FILE_REGEX = /,(\d+):["']ondemand\.s["']/m;
export const ON_DEMAND_HASH_PATTERN = ',{}:"([0-9a-f]+)"';
export const INDICES_REGEX = /(\(\w{1}\[(\d{1,2})\],\s*16\))+/gm;
export const MIGRATION_REDIRECTION_REGEX =
  /(http(?:s)?:\/\/(?:www\.)?(?:twitter|x)\.com(?:\/x)?\/migrate[/?]?tok=[a-zA-Z0-9%\-_]+)/m;
