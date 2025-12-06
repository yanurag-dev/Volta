"""
Generate a test CSV file with clean data for testing imports.
"""
import csv

def generate_test_csv(filename='test_1k.csv', num_rows=1000):
    """Generate a CSV file with specified number of rows."""

    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)

        # Write header
        writer.writerow(['name', 'sku', 'description'])

        # Write data rows
        for i in range(1, num_rows + 1):
            name = f"Product {i}"
            sku = f"SKU-{i:06d}"
            description = f"Description for product {i}"

            writer.writerow([name, sku, description])

    print(f"Generated {filename} with {num_rows} rows")

if __name__ == '__main__':
    # Generate 1K CSV
    generate_test_csv('test_1k.csv', 1000)

    # Also generate smaller test files
    generate_test_csv('test_100.csv', 100)
    generate_test_csv('test_10k.csv', 10000)

    print("Done!")
