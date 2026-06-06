export function convertRotationToMatrix(rotation: number): number[] {
  const radians = (rotation * Math.PI) / 180;

  return [
    Math.cos(radians),
    -Math.sin(radians),
    Math.sin(radians),
    Math.cos(radians),
  ];
}
