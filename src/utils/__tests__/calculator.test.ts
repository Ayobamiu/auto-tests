import { add, multiply, divide } from '../calculator';

describe('Calculator Utility Functions', () => {
    describe('add', () => {
        it('should return the sum of two positive numbers', () => {
            expect(add(2, 3)).toBe(5);
        });

        it('should return the sum of a positive and a negative number', () => {
            expect(add(5, -3)).toBe(2);
        });

        it('should return the sum of two negative numbers', () => {
            expect(add(-2, -3)).toBe(-5);
        });

        it('should return 0 when adding 0 and 0', () => {
            expect(add(0, 0)).toBe(0);
        });
    });

    describe('multiply', () => {
        it('should return the product of two positive numbers', () => {
            expect(multiply(2, 3)).toBe(6);
        });

        it('should return the product of a positive and a negative number', () => {
            expect(multiply(5, -3)).toBe(-15);
        });

        it('should return the product of two negative numbers', () => {
            expect(multiply(-2, -3)).toBe(6);
        });

        it('should return 0 when multiplying any number by 0', () => {
            expect(multiply(5, 0)).toBe(0);
        });
    });

    describe('divide', () => {
        it('should return the quotient of two positive numbers', () => {
            expect(divide(6, 3)).toBe(2);
        });

        it('should return the quotient of a positive and a negative number', () => {
            expect(divide(6, -3)).toBe(-2);
        });

        it('should return the quotient of two negative numbers', () => {
            expect(divide(-6, -3)).toBe(2);
        });
    });
});