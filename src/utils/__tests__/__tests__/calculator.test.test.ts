import { add, multiply, divide } from '../calculator';

describe('Calculator Utility Functions', () => {
    describe('add', () => {
        it('should return the sum of two positive numbers', () => {
            expect(add(2, 3)).toBe(5);
        });

        it('should return the sum of two negative numbers', () => {
            expect(add(-2, -3)).toBe(-5);
        });

        it('should return the sum of a positive and a negative number', () => {
            expect(add(2, -3)).toBe(-1);
        });

        it('should return the sum when one of the numbers is zero', () => {
            expect(add(0, 5)).toBe(5);
            expect(add(5, 0)).toBe(5);
        });
    });

    describe('multiply', () => {
        it('should return the product of two positive numbers', () => {
            expect(multiply(2, 3)).toBe(6);
        });

        it('should return the product of two negative numbers', () => {
            expect(multiply(-2, -3)).toBe(6);
        });

        it('should return the product of a positive and a negative number', () => {
            expect(multiply(2, -3)).toBe(-6);
        });

        it('should return zero when one of the numbers is zero', () => {
            expect(multiply(0, 5)).toBe(0);
            expect(multiply(5, 0)).toBe(0);
        });
    });

    describe('divide', () => {
        it('should return the quotient of two positive numbers', () => {
            expect(divide(6, 3)).toBe(2);
        });

        it('should return the quotient of two negative numbers', () => {
            expect(divide(-6, -3)).toBe(2);
        });

        it('should return the quotient of a positive and a negative number', () => {
            expect(divide(6, -3)).toBe(-2);
        });

        it('should handle division by one correctly', () => {
            expect(divide(5, 1)).toBe(5);
        });

        it('should handle division of zero correctly', () => {
            expect(divide(0, 5)).toBe(0);
        });

        it('should throw an error when dividing by zero', () => {
            expect(() => divide(5, 0)).toThrowError('Cannot divide by zero');
        });
    });
});