export function interpolate(
  fromList: number[],
  toList: number[],
  f: number,
): number[] {
  if (fromList.length !== toList.length) {
    throw new Error(
      `Mismatched interpolation arguments ${fromList}: ${toList}`,
    );
  }

  return fromList.map((fromValue, index) =>
    interpolateNum(fromValue, toList[index], f),
  );
}

export function interpolateNum(fromValue: number, toValue: number, f: number) {
  return fromValue * (1 - f) + toValue * f;
}
