/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
export type ColorFormat = ColorFormatWithAlpha | ColorFormatWithoutAlpha;
export type ColorFormatWithAlpha = "rgb" | "hsl";
export type ColorFormatWithoutAlpha = "rgba" | "hsla";
export type ColorObject = ColorObjectWithAlpha | ColorObjectWithoutAlpha;
export interface ColorObjectWithAlpha {
  type: ColorFormatWithAlpha;
  values: [number, number, number];
  colorSpace?: "srgb" | "display-p3" | "a98-rgb" | "prophoto-rgb" | "rec-2020";
}
export interface ColorObjectWithoutAlpha {
  type: ColorFormatWithoutAlpha;
  values: [number, number, number, number];
  colorSpace?: "srgb" | "display-p3" | "a98-rgb" | "prophoto-rgb" | "rec-2020";
}

/**
 * Returns a number whose value is limited to the given range.
 * @param {number} value The value to be clamped
 * @param {number} min The lower boundary of the output range
 * @param {number} max The upper boundary of the output range
 * @returns {number} A number in the range [min, max]
 */
function clamp(value: number, min = 0, max = 1): number {
  // if (process.env.NODE_ENV !== 'production') {
  //   if (value < min || value > max) {
  //     console.error(`MUI: The value provided ${value} is out of range [${min}, ${max}].`);
  //   }
  // }

  return Math.min(Math.max(min, value), max);
}

/**
 * Converts a color from CSS hex format to CSS rgb format.
 * @param {string} color - Hex color, i.e. #nnn or #nnnnnn
 * @returns {string} A CSS rgb color string
 */
export function hexToRgb(color: string): string {
  color = color.substr(1);

  const re = new RegExp(`.{1,${color.length >= 6 ? 2 : 1}}`, "g");
  let colors = color.match(re);

  if (colors && colors[0].length === 1) {
    colors = colors.map((n) => n + n);
  }

  return colors
    ? `rgb${colors.length === 4 ? "a" : ""}(${colors
        .map((n, index) => {
          return index < 3
            ? parseInt(n, 16)
            : Math.round((parseInt(n, 16) / 255) * 1000) / 1000;
        })
        .join(", ")})`
    : "";
}

function intToHex(int: number): string {
  const hex = int.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

/**
 * Returns an object with the type and values of a color.
 *
 * Note: Does not support rgb % values.
 * @param {string} color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla()
 * @returns {object} - A MUI color object: {type: string, values: number[]}
 */
export function decomposeColor(color: string): ColorObject {
  const colorSpace = undefined;
  if (color.charAt(0) === "#") {
    return decomposeColor(hexToRgb(color));
  }

  const marker = color.indexOf("(");
  const type = color.substring(0, marker);
  // if (type != 'rgba' && type != 'hsla' && type != 'rgb' && type != 'hsl') {
  // }

  const values = color.substring(marker + 1, color.length - 1).split(",");
  if (type == "rgb" || type == "hsl") {
    return {
      type,
      colorSpace,
      values: [
        parseFloat(values[0]),
        parseFloat(values[1]),
        parseFloat(values[2]),
      ],
    };
  }
  if (type == "rgba" || type == "hsla") {
    return {
      type,
      colorSpace,
      values: [
        parseFloat(values[0]),
        parseFloat(values[1]),
        parseFloat(values[2]),
        parseFloat(values[3]),
      ],
    };
  }
  throw new Error(
    `Unsupported '${color}' color. The following formats are supported: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla()`,
  );
}

/**
 * Converts a color object with type and values to a string.
 * @param {object} color - Decomposed color
 * @param {string} color.type - One of: 'rgb', 'rgba', 'hsl', 'hsla'
 * @param {array} color.values - [n,n,n] or [n,n,n,n]
 * @returns {string} A CSS color string
 */
export function recomposeColor(color: ColorObject): string {
  const { type, values: valuesNum } = color;

  const valuesStr: string[] = [];
  if (type.indexOf("rgb") !== -1) {
    // Only convert the first 3 values to int (i.e. not alpha)
    valuesNum
      .map((n, i) => (i < 3 ? parseInt(String(n), 10) : n))
      .forEach((n, i) => (valuesStr[i] = String(n)));
  } else if (type.indexOf("hsl") !== -1) {
    valuesStr[0] = String(valuesNum[0]);
    valuesStr[1] = `${valuesNum[1]}%`;
    valuesStr[2] = `${valuesNum[2]}%`;
    if (type === "hsla") {
      valuesStr[3] = String(valuesNum[3]);
    }
  }

  return `${type}(${valuesStr.join(", ")})`;
}

/**
 * Converts a color from CSS rgb format to CSS hex format.
 * @param {string} color - RGB color, i.e. rgb(n, n, n)
 * @returns {string} A CSS rgb color string, i.e. #nnnnnn
 */
export function rgbToHex(color: string): string {
  // Idempotent
  if (color.indexOf("#") === 0) {
    return color;
  }

  const { values } = decomposeColor(color);
  return `#${values
    .map((n, i) => intToHex(i === 3 ? Math.round(255 * n) : n))
    .join("")}`;
}

/**
 * Converts a color from hsl format to rgb format.
 * @param {string} color - HSL color values
 * @returns {string} rgb color values
 */
export function hslToRgb(color: string): string {
  const colorObj = decomposeColor(color);
  const { values } = colorObj;
  const h = values[0];
  const s = values[1] / 100;
  const l = values[2] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number, k = (n + h / 30) % 12): number =>
    l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

  if (colorObj.type === "hsla") {
    return recomposeColor({
      type: "rgba",
      values: [
        Math.round(f(0) * 255),
        Math.round(f(8) * 255),
        Math.round(f(4) * 255),
        colorObj.values[3],
      ],
    });
  }

  return recomposeColor({
    type: "rgb",
    values: [
      Math.round(f(0) * 255),
      Math.round(f(8) * 255),
      Math.round(f(4) * 255),
    ],
  });
}
/**
 * The relative brightness of any point in a color space,
 * normalized to 0 for darkest black and 1 for lightest white.
 *
 * Formula: https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
 * @param {string} color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @returns {number} The relative brightness of the color in the range 0 - 1
 */
export function getLuminance(color: string): number {
  const colorObj = decomposeColor(color);

  const rgb2 =
    colorObj.type === "hsl"
      ? decomposeColor(hslToRgb(color)).values
      : colorObj.values;
  const rgb = rgb2.map((val) => {
    val /= 255; // normalized
    return val <= 0.03928 ? val / 12.92 : ((val + 0.055) / 1.055) ** 2.4;
  }) as typeof rgb2;

  // Truncate at 3 digits
  return Number(
    (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]).toFixed(3),
  );
}

/**
 * Calculates the contrast ratio between two colors.
 *
 * Formula: https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
 * @param {string} foreground - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla()
 * @param {string} background - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla()
 * @returns {number} A contrast ratio value in the range 0 - 21.
 */
export function getContrastRatio(
  foreground: string,
  background: string,
): number {
  const lumA = getLuminance(foreground);
  const lumB = getLuminance(background);
  return (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);
}

/**
 * Sets the absolute transparency of a color.
 * Any existing alpha values are overwritten.
 * @param {string} color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @param {number} value - value to set the alpha channel to in the range 0 - 1
 * @returns {string} A CSS color string. Hex input values are returned as rgb
 */
export function alpha(color: string, value: number): string {
  const colorObj = decomposeColor(color);
  value = clamp(value);

  if (colorObj.type === "rgb" || colorObj.type === "hsl") {
    colorObj.type += "a";
  }
  colorObj.values[3] = value;

  return recomposeColor(colorObj);
}

/**
 * Darkens a color.
 * @param {string} color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @param {number} coefficient - multiplier in the range 0 - 1
 * @returns {string} A CSS color string. Hex input values are returned as rgb
 */
export function darken(color: string, coefficient: number): string {
  const colorObj = decomposeColor(color);
  coefficient = clamp(coefficient);

  if (colorObj.type.indexOf("hsl") !== -1) {
    colorObj.values[2] *= 1 - coefficient;
  } else if (
    colorObj.type.indexOf("rgb") !== -1 ||
    colorObj.type.indexOf("color") !== -1
  ) {
    for (let i = 0; i < 3; i += 1) {
      colorObj.values[i] *= 1 - coefficient;
    }
  }
  return recomposeColor(colorObj);
}

/**
 * Lightens a color.
 * @param {string} color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @param {number} coefficient - multiplier in the range 0 - 1
 * @returns {string} A CSS color string. Hex input values are returned as rgb
 */
export function lighten(color: string, coefficient: number): string {
  const colorObj = decomposeColor(color);
  coefficient = clamp(coefficient);

  if (colorObj.type.indexOf("hsl") !== -1) {
    colorObj.values[2] += (100 - colorObj.values[2]) * coefficient;
  } else if (colorObj.type.indexOf("rgb") !== -1) {
    for (let i = 0; i < 3; i += 1) {
      colorObj.values[i] += (255 - colorObj.values[i]) * coefficient;
    }
  } else if (colorObj.type.indexOf("color") !== -1) {
    for (let i = 0; i < 3; i += 1) {
      colorObj.values[i] += (1 - colorObj.values[i]) * coefficient;
    }
  }

  return recomposeColor(colorObj);
}

/**
 * Darken or lighten a color, depending on its luminance.
 * Light colors are darkened, dark colors are lightened.
 * @param {string} color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @param {number} coefficient=0.15 - multiplier in the range 0 - 1
 * @returns {string} A CSS color string. Hex input values are returned as rgb
 */
export function emphasize(color: string, coefficient = 0.15): string {
  return getLuminance(color) > 0.5
    ? darken(color, coefficient)
    : lighten(color, coefficient);
}
