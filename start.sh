#!/bin/sh

# Check if vocabulary mappings exist in the database
echo "Checking if database seeding is needed..."

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
./main -healthcheck 2>/dev/null
while [ $? -ne 0 ]; do
    echo "MongoDB is unavailable - sleeping"
    sleep 2
    ./main -healthcheck 2>/dev/null
done

echo "MongoDB is ready - checking for vocabulary data..."

# Check if vocabulary mappings exist using the main application
VOCAB_COUNT=$(./main -check-vocab 2>/dev/null || echo "0")

if [ "$VOCAB_COUNT" -eq 0 ]; then
    echo "No vocabulary mappings found - seeding database..."
    ./main -seed
    echo "Database seeding completed!"
else
    echo "Vocabulary mappings already exist ($VOCAB_COUNT records) - skipping seeding"
fi

# Start the main application
echo "Starting the application..."
./main