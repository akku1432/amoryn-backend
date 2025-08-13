# Relationship Type Migration

## Overview
This migration converts the `relationshipType` field in the User model from a string to an array of strings to support multiple selections.

## What Changed
1. **User Model**: `relationshipType: String` → `relationshipType: [String]`
2. **Backend Processing**: Now uses `normalizeHobbies()` instead of `normalizeString()`
3. **Database Schema**: Supports storing multiple relationship type selections

## Running the Migration

### Prerequisites
- MongoDB running
- Environment variables set (MONGODB_URI)
- Node.js installed

### Steps
1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Run the migration**:
   ```bash
   node migrate-relationship-type.js
   ```

3. **Check the output** for any errors or successful updates

### What the Migration Does
- Finds all users with string `relationshipType` fields
- Converts single values to arrays: `"Friendship"` → `["Friendship"]`
- Converts empty strings to empty arrays: `""` → `[]`
- Updates the database schema for future users

## After Migration
- Restart your backend server
- The relationship type field will now properly store arrays
- Users can select up to 2 relationship types
- Data will persist when navigating away and returning to profile

## Rollback (if needed)
If you need to rollback, you can modify the migration script to convert arrays back to strings, but this is not recommended as it would lose user data.
