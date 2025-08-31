import { add, multiply, divide } from '../calculator';

describe('Calculator functions', () => {
    describe('add', () => {
        it('should return the sum of two positive numbers', () => {
            expect(add(1, 2)).toBe(3);
        });

        it('should return the sum of a positive and a negative number', () => {
            expect(add(5, -3)).toBe(2);
        });

        it('should return the sum of two negative numbers', () => {
            expect(add(-4, -6)).toBe(-10);
        });

        it('should return the sum when one of the numbers is zero', () => {
            expect(add(0, 5)).toBe(5);
        });
    });

    describe('multiply', () => {
        it('should return the product of two positive numbers', () => {
            expect(multiply(3, 4)).toBe(12);
        });

        it('should return the product of a positive and a negative number', () => {
            expect(multiply(-2, 3)).toBe(-6);
        });

        it('should return the product of two negative numbers', () => {
            expect(multiply(-3, -3)).toBe(9);
        });

        it('should return zero when one of the numbers is zero', () => {
            expect(multiply(0, 7)).toBe(0);
        });
    });

    describe('divide', () => {
        it('should return the quotient of two positive numbers', () => {
            expect(divide(10, 2)).toBe(5);
        });

        it('should return the quotient of a positive and a negative number', () => {
            expect(divide(-9, 3)).toBe(-3);
        });

        it('should return the quotient of two negative numbers', () => {
            expect(divide(-8, -2)).toBe(4);
        });

        it('should return zero when the numerator is zero', () => {
            expect(divide(0, 5)).toBe(0);
        });

        it('should throw an error when dividing by zero', () => {
            expect(() => divide(5, 0)).toThrowError();
        });
    });
});
