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
export interface Context {
  readonly path?: string[];
}

export function renderContext(c?: Context): string {
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

class ObjectCodecBuilder<OutputType, PartialOutputType> {
  private propList: Prop[] = [];

  /**
   * Define a property for the object.
   */
  property<K extends keyof OutputType & string, V extends OutputType[K]>(
    x: K,
    codec: Codec<V>,
  ): ObjectCodecBuilder<OutputType, PartialOutputType & SingletonRecord<K, V>> {
    if (!codec) {
      throw Error("inner codec must be defined");
    }
    this.propList.push({ name: x, codec: codec });
    return this as any;
  }

  /**
   * Return the built codec.
   *
   * @param objectDisplayName name of the object that this codec operates on,
   *   used in error messages.
   */
  build(objectDisplayName: string): Codec<PartialOutputType> {
    const propList = this.propList;
    return {
      decode(x: any, c?: Context): PartialOutputType {
        if (!c) {
          c = {
            path: [`(${objectDisplayName})`],
          };
        }
        if (typeof x !== "object") {
          throw new DecodingError(
            `expected object for ${objectDisplayName} at ${renderContext(
              c,
            )} but got ${typeof x}`,
          );
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
        return obj as PartialOutputType;
      },
    };
  }
}

class UnionCodecBuilder<
  TargetType,
  TagPropertyLabel extends keyof TargetType,
  CommonBaseType,
  PartialTargetType
> {
  private alternatives = new Map<any, Alternative>();

  constructor(
    private discriminator: TagPropertyLabel,
    private baseCodec?: Codec<CommonBaseType>,
  ) {}

  /**
   * Define a property for the object.
   */
  alternative<V>(
    tagValue: TargetType[TagPropertyLabel],
    codec: Codec<V>,
  ): UnionCodecBuilder<
    TargetType,
    TagPropertyLabel,
    CommonBaseType,
    PartialTargetType | V
  > {
    if (!codec) {
      throw Error("inner codec must be defined");
    }
    this.alternatives.set(tagValue, { codec, tagValue });
    return this as any;
  }

  /**
   * Return the built codec.
   *
   * @param objectDisplayName name of the object that this codec operates on,
   *   used in error messages.
   */
  build<R extends PartialTargetType & CommonBaseType = never>(
    objectDisplayName: string,
  ): Codec<R> {
    const alternatives = this.alternatives;
    const discriminator = this.discriminator;
    const baseCodec = this.baseCodec;
    return {
      decode(x: any, c?: Context): R {
        const d = x[discriminator];
        if (d === undefined) {
          throw new DecodingError(
            `expected tag for ${objectDisplayName} at ${renderContext(
              c,
            )}.${discriminator}`,
          );
        }
        const alt = alternatives.get(d);
        if (!alt) {
          throw new DecodingError(
            `unknown tag for ${objectDisplayName} ${d} at ${renderContext(
              c,
            )}.${discriminator}`,
          );
        }
        const altDecoded = alt.codec.decode(x);
        if (baseCodec) {
          const baseDecoded = baseCodec.decode(x, c);
          return { ...baseDecoded, ...altDecoded };
        } else {
          return altDecoded;
        }
      },
    };
  }
}

export class UnionCodecPreBuilder<T> {
  discriminateOn<D extends keyof T, B = {}>(
    discriminator: D,
    baseCodec?: Codec<B>,
  ): UnionCodecBuilder<T, D, B, never> {
    return new UnionCodecBuilder<T, D, B, never>(discriminator, baseCodec);
  }
}

/**
 * Return a builder for a codec that decodes an object with properties.
 */
export function makeCodecForObject<T>(): ObjectCodecBuilder<T, {}> {
  return new ObjectCodecBuilder<T, {}>();
}

export function makeCodecForUnion<T>(): UnionCodecPreBuilder<T> {
  return new UnionCodecPreBuilder<T>();
}

/**
 * Return a codec for a mapping from a string to values described by the inner codec.
 */
export function makeCodecForMap<T>(
  innerCodec: Codec<T>,
): Codec<{ [x: string]: T }> {
  if (!innerCodec) {
    throw Error("inner codec must be defined");
  }
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
 * Return a codec for a list, containing values described by the inner codec.
 */
export function makeCodecForList<T>(innerCodec: Codec<T>): Codec<T[]> {
  if (!innerCodec) {
    throw Error("inner codec must be defined");
  }
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
 * Return a codec for a value that must be a number.
 */
export const codecForNumber: Codec<number> = {
  decode(x: any, c?: Context): number {
    if (typeof x === "number") {
      return x;
    }
    throw new DecodingError(
      `expected number at ${renderContext(c)} but got ${typeof x}`,
    );
  },
};

/**
 * Return a codec for a value that must be a number.
 */
export const codecForBoolean: Codec<boolean> = {
  decode(x: any, c?: Context): boolean {
    if (typeof x === "boolean") {
      return x;
    }
    throw new DecodingError(
      `expected boolean at ${renderContext(c)} but got ${typeof x}`,
    );
  },
};

/**
 * Return a codec for a value that must be a string.
 */
export const codecForString: Codec<string> = {
  decode(x: any, c?: Context): string {
    if (typeof x === "string") {
      return x;
    }
    throw new DecodingError(
      `expected string at ${renderContext(c)} but got ${typeof x}`,
    );
  },
};

/**
 * Codec that allows any value.
 */
export const codecForAny: Codec<any> = {
  decode(x: any, c?: Context): any {
    return x;
  },
};

/**
 * Return a codec for a value that must be a string.
 */
export function makeCodecForConstString<V extends string>(s: V): Codec<V> {
  return {
    decode(x: any, c?: Context): V {
      if (x === s) {
        return x;
      }
      throw new DecodingError(
        `expected string constant "${s}" at ${renderContext(
          c,
        )}  but got ${typeof x}`,
      );
    },
  };
}

export function makeCodecOptional<V>(
  innerCodec: Codec<V>,
): Codec<V | undefined> {
  return {
    decode(x: any, c?: Context): V | undefined {
      if (x === undefined || x === null) {
        return undefined;
      }
      return innerCodec.decode(x, c);
    },
  };
}

export function typecheckedCodec<T = undefined>(c: Codec<T>): Codec<T> {
  return c;
}
