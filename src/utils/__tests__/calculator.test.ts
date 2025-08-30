```js
// tests/calculator.test.ts
import { add, multiply, divide } from '../src/utils/calculator';

describe('Calculator', () => {
  describe('add', () => {
    it('should return the sum of two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should return the sum of a positive and a negative number', () => {
      expect(add(5, -3)).toBe(2);
    });

    it('should return the sum of two negative numbers', () => {
      expect(add(-4, -6)).toBe(-10);
    });

    it('should return the sum when adding zero', () => {
      expect(add(0, 5)).toBe(5);
    });
  });

  describe('multiply', () => {
    it('should return the product of two positive numbers', () => {
      expect(multiply(4, 5)).toBe(20);
    });

    it('should return the product of a positive and a negative number', () => {
      expect(multiply(4, -3)).toBe(-12);
    });

    it('should return the product of two negative numbers', () => {
      expect(multiply(-2, -3)).toBe(6);
    });

    it('should return zero when multiplying by zero', () => {
      expect(multiply(0, 5)).toBe(0);
    });
  });

  describe('divide', () => {
    it('should return the quotient of two positive numbers', () => {
      expect(divide(10, 2)).toBe(5);
    });

    it('should return the quotient of a positive and a negative number', () => {
      expect(divide(10, -2)).toBe(-5);
    });

    it('should return the quotient of two negative numbers', () => {
      expect(divide(-10, -2)).toBe(5);
    });

    it('should return zero when the numerator is zero', () => {
      expect(divide(0, 5)).toBe(0);
    });

    it('should throw an error when dividing by zero', () => {
      expect(() => divide(5, 0)).toThrow();
    });
  });
});
```