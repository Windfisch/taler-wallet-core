/*
 This file is part of GNU Taler
 (C) 2018-2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Type-safe codecs for converting from/to JSON.
 */

/**
 * Error thrown when decoding fails.
 */
export class DecodingError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DecodingError.prototype);
    this.name = "DecodingError";
  }
}

/**
 * Context information to show nicer error messages when decoding fails.
 */
interface Context {
  readonly path?: string[];
}

function renderContext(c?: Context): string {
  const p = c?.path;
  if (p) {
    return p.join(".");
  } else {
    return "(unknown)";
  }
}

function joinContext(c: Context | undefined, part: string): Context {
  const path = c?.path ?? [];
  return {
    path: path.concat([part]),
  };
}

/**
 * A codec converts untyped JSON to a typed object.
 */
export interface Codec<V> {
  /**
   * Decode untyped JSON to an object of type [[V]].
   */
  readonly decode: (x: any, c?: Context) => V;
}

type SingletonRecord<K extends keyof any, V> = { [Y in K]: V };

interface Prop {
  name: string;
  codec: Codec<any>;
}

class ObjectCodecBuilder<T, TC> {
  private propList: Prop[] = [];

  /**
   * Define a property for the object.
   */
  property<K extends keyof T & string, V>(
    x: K,
    codec: Codec<V>,
  ): ObjectCodecBuilder<T, TC & SingletonRecord<K, V>> {
    this.propList.push({ name: x, codec: codec });
    return this as any;
  }

  /**
   * Return the built codec.
   *
   * @param objectDisplayName name of the object that this codec operates on,
   *   used in error messages.
   */
  build(objectDisplayName: string): Codec<TC> {
    const propList = this.propList;
    return {
      decode(x: any, c?: Context): TC {
        if (!c) {
          c = {
            path: [`(${objectDisplayName})`],
          };
        }
        const obj: any = {};
        for (const prop of propList) {
          const propRawVal = x[prop.name];
          const propVal = prop.codec.decode(
            propRawVal,
            joinContext(c, prop.name),
          );
          obj[prop.name] = propVal;
        }
        return obj as TC;
      },
    };
  }
}

/**
 * Return a codec for a value that must be a string.
 */
export const stringCodec: Codec<string> = {
  decode(x: any, c?: Context): string {
    if (typeof x === "string") {
      return x;
    }
    throw new DecodingError(`expected string at ${renderContext(c)}`);
  },
};

/**
 * Return a codec for a value that must be a number.
 */
export const numberCodec: Codec<number> = {
  decode(x: any, c?: Context): number {
    if (typeof x === "number") {
      return x;
    }
    throw new DecodingError(`expected number at ${renderContext(c)}`);
  },
};

/**
 * Return a codec for a list, containing values described by the inner codec.
 */
export function listCodec<T>(innerCodec: Codec<T>): Codec<T[]> {
  return {
    decode(x: any, c?: Context): T[] {
      const arr: T[] = [];
      if (!Array.isArray(x)) {
        throw new DecodingError(`expected array at ${renderContext(c)}`);
      }
      for (const i in x) {
        arr.push(innerCodec.decode(x[i], joinContext(c, `[${i}]`)));
      }
      return arr;
    },
  };
}

/**
 * Return a codec for a mapping from a string to values described by the inner codec.
 */
export function mapCodec<T>(innerCodec: Codec<T>): Codec<{ [x: string]: T }> {
  return {
    decode(x: any, c?: Context): { [x: string]: T } {
      const map: { [x: string]: T } = {};
      if (typeof x !== "object") {
        throw new DecodingError(`expected object at ${renderContext(c)}`);
      }
      for (const i in x) {
        map[i] = innerCodec.decode(x[i], joinContext(c, `[${i}]`));
      }
      return map;
    },
  };
}

/**
 * Return a builder for a codec that decodes an object with properties.
 */
export function objectCodec<T>(): ObjectCodecBuilder<T, {}> {
  return new ObjectCodecBuilder<T, {}>();
}
