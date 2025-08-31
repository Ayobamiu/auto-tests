import { add, multiply, divide, subtract } from '../calculator';

describe('Calculator Functions', () => {
    describe('add()', () => {
        it('should return the sum of two positive numbers', () => {
            expect(add(1, 2)).toBe(3);
        });

        it('should return the sum of a positive and a negative number', () => {
            expect(add(1, -2)).toBe(-1);
        });

        it('should return the sum of two negative numbers', () => {
            expect(add(-1, -2)).toBe(-3);
        });
    });

    describe('multiply()', () => {
        it('should return the product of two positive numbers', () => {
            expect(multiply(2, 3)).toBe(6);
        });

        it('should return the product of a positive and a negative number', () => {
            expect(multiply(2, -3)).toBe(-6);
        });

        it('should return the product of two negative numbers', () => {
            expect(multiply(-2, -3)).toBe(6);
        });
    });

    describe('divide()', () => {
        it('should return the quotient of two positive numbers', () => {
            expect(divide(6, 3)).toBe(2);
        });

        it('should return the quotient of a positive and a negative number', () => {
            expect(divide(6, -3)).toBe(-2);
        });

        it('should handle division by zero', () => {
            expect(() => divide(6, 0)).toThrowError('Cannot divide by zero');
        });
    });

    describe('subtract()', () => {
        it('should return the difference of two positive numbers', () => {
            expect(subtract(5, 3)).toBe(2);
        });

        it('should return the difference of a positive and a negative number', () => {
            expect(subtract(5, -3)).toBe(8);
        });

        it('should return the difference of two negative numbers', () => {
            expect(subtract(-5, -3)).toBe(-2);
        });
    });
});