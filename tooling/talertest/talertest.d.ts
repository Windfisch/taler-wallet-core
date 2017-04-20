/**
 *
 * @author Florian Dold
 */
export declare type TestFn = (t: TestLib) => void | Promise<void>;
export interface TestLib {
    pass(msg?: string): void;
    fail(msg?: string): void;
    assert(v: any, msg?: string): void;
    assertEqualsStrict(v1: any, v2: any, msg?: string): void;
}
/**
 * Register a test case.
 */
export declare function test(name: string, testFn: TestFn): void;
/**
 * Run all registered test case, producing a TAP stream.
 */
export declare function run(statusCallback?: (m: string) => void): Promise<void>;
