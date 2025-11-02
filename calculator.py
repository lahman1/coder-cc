# calculator.py
# Simple command-line calculator

# Basic operations
def add(x, y):
    """Return the sum of x and y"""
    return x + y

def subtract(x, y):
    """Return the difference of x and y"""
    return x - y

def multiply(x, y):
    """Return the product of x and y"""
    return x * y

def divide(x, y):
    """Return the division of x by y"""
    try:
        return x / y
    except ZeroDivisionError:
        return "Error: Cannot divide by zero"

# Main calculator loop
def main():
    while True:
        print("\nSimple Calculator")
        print("1. Add\n2. Subtract\n3. Multiply\n4. Divide\n5. Exit")
        
        choice = input("Choose operation (1-5): ")
        
        if choice == '5':
            print("Goodbye!")
            break
        
        if choice in ['1', '2', '3', '4']:
            try:
                num1 = float(input('Enter first number: '))
                num2 = float(input('Enter second number: '))
                
                if choice == '1':
                    result = add(num1, num2)
                elif choice == '2':
                    result = subtract(num1, num2)
                elif choice == '3':
                    result = multiply(num1, num2)
                else:
                    result = divide(num1, num2)
                
                print(f"\nResult: {result}")
            except ValueError:
                print("Invalid input. Please enter numbers only.")
        else:
            print("Invalid selection. Please choose 1-5")

if __name__ == "__main__":
    main()