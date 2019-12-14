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

interface Alternative {
  tagValue: any;
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
  build<R extends (TC & T)>(objectDisplayName: string): Codec<R> {
    const propList = this.propList;
    return {
      decode(x: any, c?: Context): R {
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
        return obj as R;
      },
    };
  }
}

class UnionCodecBuilder<T, D extends keyof T, TC> {
  private alternatives = new Map<any, Alternative>();

  constructor(private discriminator: D) {}

  /**
   * Define a property for the object.
   */
  alternative<V>(
    tagValue: T[D],
    codec: Codec<V>,
  ): UnionCodecBuilder<T, D, TC | V> {
    this.alternatives.set(tagValue, { codec, tagValue });
    return this as any;
  }

  /**
   * Return the built codec.
   *
   * @param objectDisplayName name of the object that this codec operates on,
   *   used in error messages.
   */
  build<R extends TC>(objectDisplayName: string): Codec<R> {
    const alternatives = this.alternatives;
    const discriminator = this.discriminator;
    return {
      decode(x: any, c?: Context): R {
        const d = x[discriminator];
        if (d === undefined) {
          throw new DecodingError(`expected tag for ${objectDisplayName} at ${renderContext(c)}.${discriminator}`);
        }
        const alt = alternatives.get(d);
        if (!alt) {
          throw new DecodingError(`unknown tag for ${objectDisplayName} ${d} at ${renderContext(c)}.${discriminator}`);
        }
        return alt.codec.decode(x);
      }
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
 * Return a codec for a value that must be a string.
 */
export function stringConstCodec<V extends string>(s: V): Codec<V> {
  return {
    decode(x: any, c?: Context): V {
      if (x === s) {
        return x;
      }
      throw new DecodingError(`expected string constant "${s}" at ${renderContext(c)}`);
    }
  }
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

export function unionCodec<T, D extends keyof T>(
  discriminator: D,
): UnionCodecBuilder<T, D, never> {
  return new UnionCodecBuilder<T, D, never>(discriminator);
}
