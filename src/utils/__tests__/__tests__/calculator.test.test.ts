```js
// tests/calculator.test.ts
import { add, multiply, divide } from '../src/utils/calculator';

describe('add function', () => {
  test('should return the sum of two positive numbers', () => {
    expect(add(3, 5)).toBe(8);
  });

  test('should return the sum of a positive and a negative number', () => {
    expect(add(10, -5)).toBe(5);
  });

  test('should return the sum of two negative numbers', () => {
    expect(add(-3, -5)).toBe(-8);
  });

  test('should return the sum when one of the numbers is zero', () => {
    expect(add(0, 5)).toBe(5);
  });

  test('should return zero when both numbers are zero', () => {
    expect(add(0, 0)).toBe(0);
  });
});

describe('multiply function', () => {
  test('should return the product of two positive numbers', () => {
    expect(multiply(3, 5)).toBe(15);
  });

  test('should return the product of a positive and a negative number', () => {
    expect(multiply(10, -5)).toBe(-50);
  });

  test('should return the product of two negative numbers', () => {
    expect(multiply(-3, -5)).toBe(15);
  });

  test('should return zero when one of the numbers is zero', () => {
    expect(multiply(0, 5)).toBe(0);
  });

  test('should return zero when both numbers are zero', () => {
    expect(multiply(0, 0)).toBe(0);
  });
});

describe('divide function', () => {
  test('should return the quotient of two positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  test('should return the quotient of a positive and a negative number', () => {
    expect(divide(10, -2)).toBe(-5);
  });

  test('should return the quotient of two negative numbers', () => {
    expect(divide(-10, -2)).toBe(5);
  });

  test('should return zero when numerator is zero', () => {
    expect(divide(0, 5)).toBe(0);
  });

  test('should throw an error when dividing by zero', () => {
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
  });

  test('should handle division resulting in a fraction', () => {
    expect(divide(7, 2)).toBeCloseTo(3.5);
  });
});
```