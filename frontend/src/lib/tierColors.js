// lib/tierColors.js
export function getTierColor(tierNumber) {
  const hue = (tierNumber * 137.5) % 360; // golden angle spread
  const saturation = 55;
  const bgLightness = 22;
  const textLightness = 78;
  const borderLightness = 45;
  return {
    bg: `hsl(${hue}, ${saturation}%, ${bgLightness}%)`,
    text: `hsl(${hue}, ${saturation}%, ${textLightness}%)`,
    border: `hsl(${hue}, ${saturation}%, ${borderLightness}%)`,
  };
}