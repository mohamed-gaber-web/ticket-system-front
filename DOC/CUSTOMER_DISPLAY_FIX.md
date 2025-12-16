# Customer ERP Type & Version Number Display Fix

## Problem
The customer list was showing "Unknown" for ERP Type and Version Number names instead of displaying the actual names.

## Root Cause
**Backend vs Frontend Data Mismatch:**

- **Backend** returns customers with **populated objects** for `erpType` and `versionNumber`:
  ```json
  {
    "erpType": {
      "_id": "60d5ec49f1b2c72b8c8e4f1c",
      "name": "SAP",
      "isActive": true
    },
    "versionNumber": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "name": "10.0.0",
      "isActive": true
    }
  }
  ```

- **Frontend** Customer type expected these fields to be **string IDs only**:
  ```typescript
  erpType?: string;
  versionNumber?: string;
  ```

- The `CustomerTable` component was trying to find matches by comparing the entire object against IDs in the Redux store, which would never work.

## Solution

### 1. Updated Customer Type Definition
**File:** `src/types/customer.types.ts`

Added interface definitions for the populated references and updated the Customer interface to accept both string IDs and populated objects:

```typescript
export interface ERPTypeRef {
  _id: string;
  name: string;
  isActive: boolean;
}

export interface VersionNumberRef {
  _id: string;
  name: string;
  isActive: boolean;
}

export interface Customer {
  // ... other fields
  erpType?: ERPTypeRef | string;      // Can be either populated object or ID string
  versionNumber?: VersionNumberRef | string; // Can be either populated object or ID string
  // ... other fields
}
```

### 2. Updated Display Logic
**File:** `src/pages/customers/components/CustomerTable.tsx`

Modified the `getErpTypeName` and `getVersionNumberName` functions to handle both cases:

```typescript
const getErpTypeName = (erpType?: any) => {
  if (!erpType) return 'N/A';

  // If erpType is already a populated object with name - USE IT DIRECTLY
  if (typeof erpType === 'object' && erpType.name) {
    return erpType.name;
  }

  // If erpType is just an ID string, look it up in Redux store
  if (typeof erpType === 'string') {
    const found = erpTypes.find((erp) => erp._id === erpType);
    return found?.name || 'Unknown';
  }

  return 'Unknown';
};
```

## How It Works Now

1. **Backend populates the references** when returning customer data
2. **Frontend receives populated objects** with all the data needed
3. **Display logic checks the data type**:
   - If it's an object with a `name` property → use it directly ✅
   - If it's a string ID → look it up in Redux store
   - If nothing → show 'N/A'

## Benefits

✅ **Works immediately** - No need to wait for Redux store to load
✅ **No extra API calls** - Data comes with the customer list
✅ **Backward compatible** - Still works if backend sends just IDs
✅ **Better performance** - Direct access instead of array lookups

## Testing

After this fix, the customer list should display:
- ✅ Actual ERP Type names (e.g., "SAP", "Oracle ERP")
- ✅ Actual Version Numbers (e.g., "10.0.0", "9.5.2")
- ✅ "N/A" if the fields are empty
- ✅ No more "Unknown" unless there's genuinely missing data

## Files Modified

1. `src/types/customer.types.ts` - Updated type definitions
2. `src/pages/customers/components/CustomerTable.tsx` - Updated display logic
