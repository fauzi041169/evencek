# Custom Fields Implementation Summary

## Objective
Ensure all custom fields for an activity are displayed on the activity edit page and can be added or removed by the user.

## Changes Made

### 1. Activity Model (`app/Models/Activity.php`)
**Modified:** `getCustomFieldsAttribute()` method

**What it does:**
- Loads custom fields from the `customFields()` relationship (modern approach via pivot table)
- **NEW:** Also includes "legacy" custom fields from `column_settings` that are enabled but not in the relationship
- This ensures backward compatibility with activities that have custom columns defined in `column_settings` but not in the `custom_fields` table

**Key Logic:**
```php
// Include legacy custom fields from column_settings
if (!empty($this->column_settings) && is_array($this->column_settings)) {
    foreach ($this->column_settings as $colKey => $enabled) {
        if ($enabled && str_starts_with($colKey, 'col-custom-')) {
            $baseKey = str_replace('col-custom-', '', $colKey);
            // Add to fields array if not already present
        }
    }
}
```

### 2. Activity Controller (`app/Http/Controllers/ActivityController.php`)
**Modified:** `update()` method - Custom Fields sync section

**What it does:**
- When custom fields are saved from the edit page, they are synced to both:
  1. The `custom_fields` table (via pivot table `activity_custom_field`)
  2. The `column_settings` array (for visibility in participant list)
- **NEW:** Automatically adds `col-custom-{key}` entries to `column_settings` when custom fields are added
- **NEW:** Removes obsolete `col-custom-*` entries from `column_settings` when fields are removed

**Key Logic:**
```php
// Sync to column_settings for visibility
$colKey = 'col-custom-' . \Illuminate\Support\Str::kebab($key);
if (!isset($columnSettings[$colKey])) {
    $columnSettings[$colKey] = true; // Enable by default
}

// Cleanup: remove col-custom-* that are no longer in custom_fields
foreach (array_keys($columnSettings) as $ck) {
    if (str_starts_with($ck, 'col-custom-') && !in_array($ck, $customColKeys)) {
        unset($columnSettings[$ck]);
    }
}
```

## How It Works

### Edit Page Flow:
1. User opens `/activity/{id}/edit`
2. `ActivityController::edit()` loads the activity
3. Activity model's `getCustomFieldsAttribute()` is called
4. Returns array of custom fields from:
   - Modern: `custom_fields` table (via relationship)
   - Legacy: `column_settings` array (enabled col-custom-* entries)
5. Frontend displays all custom fields in the edit form

### Save Flow:
1. User adds/removes/modifies custom fields in edit page
2. Form submits to `ActivityController::update()`
3. Controller syncs custom fields to:
   - `custom_fields` table (via pivot)
   - `column_settings` array (for participant list visibility)
4. Both storage methods are kept in sync

### Participant List:
1. Participant list reads `column_settings` to determine which columns to show
2. Custom columns with `col-custom-*` keys are rendered
3. Data is pulled from `ActivityUser.custom_data` JSON column

## Benefits

✅ **Backward Compatibility:** Legacy activities with custom columns in `column_settings` will show their fields in the edit page
✅ **Automatic Sync:** Adding a custom field automatically makes it visible in the participant list
✅ **Clean Removal:** Removing a custom field cleans up both the relationship and column settings
✅ **Unified Interface:** All custom fields (old and new) appear in the same edit interface

## Testing

Run `php test_custom_fields.php` to verify:
- Custom fields are loaded from both sources
- Column settings are properly populated
- Participant data contains the expected custom fields
