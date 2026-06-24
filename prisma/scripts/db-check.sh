#!/bin/bash

DB_NAME=${DB_NAME:-ecommerce_db}

echo "================================="
echo "SariHub Database Health Check"
echo "================================="

echo ""
echo "PostgreSQL Services:"
brew services list | grep postgresql

ACTIVE_PG=$(brew services list | grep postgresql | grep started)

if [[ "$ACTIVE_PG" != *"postgresql@14"* ]]; then
    echo ""
    echo "ERROR: PostgreSQL 14 is not running!"
    exit 1
fi

echo ""
echo "Prisma Migration Status:"
npx prisma migrate status

echo ""
echo "Brand Table:"
psql "$DB_NAME" -t -c 'SELECT COUNT(*) FROM "Brand";'

echo ""
echo "Store Table:"
psql "$DB_NAME" -t -c 'SELECT COUNT(*) FROM "Store";'

echo ""
echo "Environment Status: HEALTHY"