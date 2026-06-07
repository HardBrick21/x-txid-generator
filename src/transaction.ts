import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import {
  ADDITIONAL_RANDOM_NUMBER,
  DEFAULT_KEYWORD,
  INDICES_REGEX,
} from './constants';
import { Cubic } from './cubic-curve';
import { interpolate } from './interpolate';
import { convertRotationToMatrix } from './rotation';
import {
  base64Encode,
  floatToHex,
  isOdd,
  mathRound,
  validateResponse,
} from './utils';

export class ClientTransaction {
  readonly homePageResponse: string;
  readonly ondemandFileResponse: string;
  readonly randomKeyword: string;
  readonly randomNumber: number;
  readonly rowIndex: number;
  readonly keyBytesIndices: number[];
  readonly key: string;
  readonly keyBytes: number[];
  readonly animationKey: string;

  constructor(
    homePageResponse: string,
    ondemandFileResponse: string,
    randomKeyword?: string,
    randomNumber?: number,
  ) {
    validateResponse(homePageResponse);

    if (typeof ondemandFileResponse !== 'string') {
      throw new TypeError('invalid ondemand file response');
    }

    this.homePageResponse = homePageResponse;
    this.ondemandFileResponse = ondemandFileResponse;
    this.randomKeyword = randomKeyword || DEFAULT_KEYWORD;
    this.randomNumber = randomNumber || ADDITIONAL_RANDOM_NUMBER;

    const [rowIndex, keyBytesIndices] = this.getIndices(
      this.ondemandFileResponse,
    );
    this.rowIndex = rowIndex;
    this.keyBytesIndices = keyBytesIndices;
    this.key = this.getKey(this.homePageResponse);
    this.keyBytes = this.getKeyBytes(this.key);
    this.animationKey = this.getAnimationKey(
      this.keyBytes,
      this.homePageResponse,
    );
  }

  getIndices(ondemandFileResponse: string): [number, number[]] {
    const keyByteIndices = Array.from(
      ondemandFileResponse.matchAll(INDICES_REGEX),
      (item) => Number(item[2]),
    );

    if (!keyByteIndices.length) {
      throw new Error("Couldn't get KEY_BYTE indices");
    }

    return [keyByteIndices[0], keyByteIndices.slice(1)];
  }

  getKey(homePageResponse: string): string {
    const $ = cheerio.load(homePageResponse);
    const key = $("meta[name='twitter-site-verification']").attr('content');

    if (!key) {
      throw new Error(
        "Couldn't get [twitter-site-verification] key from the page source",
      );
    }

    return key;
  }

  getKeyBytes(key: string): number[] {
    return Array.from(Buffer.from(key, 'base64'));
  }

  getFrames(homePageResponse: string): string[] {
    const $ = cheerio.load(homePageResponse);

    return $("[id^='loading-x-anim']")
      .toArray()
      .map((frame) => $.html(frame));
  }

  get2dArray(
    keyBytes: Array<number>,
    homePageResponse: string,
    frames?: string[],
  ): number[][] {
    const resolvedFrames = frames ?? this.getFrames(homePageResponse);
    const frame = resolvedFrames[keyBytes[5] % 4];

    if (!frame) {
      throw new Error("Couldn't get animation frame from the page source");
    }

    const $ = cheerio.load(frame);
    const pathRows = $('path')
      .toArray()
      .map((path) => parseAnimationPath($(path).attr('d')))
      .filter((rows) => rows.length > 0)
      .sort((left, right) => right.length - left.length);
    const rows = pathRows[0];

    if (!rows) {
      throw new Error("Couldn't get animation path data from the page source");
    }

    return rows;
  }

  solve(value: number, minValue: number, maxValue: number, rounding: boolean) {
    const result = (value * (maxValue - minValue)) / 255 + minValue;

    return rounding ? Math.floor(result) : Math.round(result * 100) / 100;
  }

  animate(frames: number[], targetTime: number): string {
    const fromColor = [...frames.slice(0, 3), 1].map(Number);
    const toColor = [...frames.slice(3, 6), 1].map(Number);
    const fromRotation = [0.0];
    const toRotation = [this.solve(Number(frames[6]), 60.0, 360.0, true)];
    const frameValues = frames.slice(7);
    const curves = frameValues.map((item, counter) =>
      this.solve(Number(item), isOdd(counter), 1.0, false),
    );
    const cubic = new Cubic(curves);
    const val = cubic.getValue(targetTime);
    const color = interpolate(fromColor, toColor, val).map((value) =>
      Math.max(0, Math.min(255, value)),
    );
    const rotation = interpolate(fromRotation, toRotation, val);
    const matrix = convertRotationToMatrix(rotation[0]);
    const strArr = color
      .slice(0, -1)
      .map((value) => Math.round(value).toString(16));

    for (const value of matrix) {
      let rounded = Math.round(value * 100) / 100;

      if (rounded < 0) {
        rounded = -rounded;
      }

      const hexValue = floatToHex(rounded);

      if (hexValue.startsWith('.')) {
        strArr.push(`0${hexValue}`.toLowerCase());
      } else {
        strArr.push(hexValue ? hexValue.toLowerCase() : '0');
      }
    }

    strArr.push('0', '0');

    return strArr.join('').replace(/[.-]/g, '');
  }

  getAnimationKey(keyBytes: number[], homePageResponse: string): string {
    const totalTime = 4096;
    const rowIndex = keyBytes[this.rowIndex] % 16;
    const frameTime =
      mathRound(
        this.keyBytesIndices.reduce(
          (product, index) => product * (keyBytes[index] % 16),
          1,
        ) / 10,
      ) * 10;
    const arr = this.get2dArray(keyBytes, homePageResponse);
    const frameRow = arr[rowIndex];

    if (!frameRow) {
      throw new Error("Couldn't get animation frame row");
    }

    return this.animate(frameRow, frameTime / totalTime);
  }

  generateTransactionId(
    method: string,
    path: string,
    homePageResponse?: string,
    key?: string,
    animationKey?: string,
    timeNow?: number,
  ): string {
    const resolvedTimeNow =
      timeNow ?? Math.floor((Date.now() - 1682924400 * 1000) / 1000);
    const timeNowBytes = Array.from(
      { length: 4 },
      (_, index) => (resolvedTimeNow >> (index * 8)) & 0xff,
    );
    const resolvedKey =
      key ?? this.key ?? this.getKey(requiredHomePage(homePageResponse));
    const keyBytes = this.getKeyBytes(resolvedKey);
    const resolvedAnimationKey =
      animationKey ??
      this.animationKey ??
      this.getAnimationKey(keyBytes, requiredHomePage(homePageResponse));
    const hash = createHash('sha256')
      .update(
        `${method}!${path}!${resolvedTimeNow}${this.randomKeyword}${resolvedAnimationKey}`,
      )
      .digest();
    const randomNum = Math.floor(Math.random() * 256);
    const bytes = [
      ...keyBytes,
      ...timeNowBytes,
      ...Array.from(hash.slice(0, 16)),
      this.randomNumber,
    ];
    const out = [randomNum, ...bytes.map((item) => item ^ randomNum)];

    return base64Encode(out).replace(/=+$/, '');
  }
}

function requiredHomePage(homePageResponse?: string) {
  if (!homePageResponse) {
    throw new Error('homePageResponse is required');
  }

  return homePageResponse;
}

function parseAnimationPath(pathData?: string): number[][] {
  if (!pathData) {
    return [];
  }

  return pathData
    .slice(9)
    .split('C')
    .map((item) => {
      const normalized = item.replace(/[^\d]+/g, ' ').trim();

      if (!normalized) {
        return [];
      }

      return normalized.split(/\s+/).map((value) => Number.parseInt(value, 10));
    })
    .filter((row) => row.length > 0);
}
