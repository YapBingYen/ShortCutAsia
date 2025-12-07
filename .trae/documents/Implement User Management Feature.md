I recommend starting with **User Management** to complete the core CRUD functionality.

**Plan: Implement User Management**

1. **Database Functions:**

   * Add `updateUser(id, name)` to `db/index.ts` (and web stub).

   * Add `deleteUser(id)` to `db/index.ts`.

     * *Constraint:* Check if the user has any related expenses/splits before deleting. If they do, block the deletion and return an error.

2. **UI Implementation (`app/manage-users.tsx`):**

   * Create a new modal screen accessible from the Home screen (e.g., a "gear" icon next to "Users").

   * List all users with "Edit" (Pencil) and "Delete" (Trash) icons.

   * **Edit Flow:** Show a prompt or inline input to rename.

   * **Delete Flow:** Show a confirmation alert. If blocked by database (due to existing debts), show an error alert explaining why.

3. **Navigation:**

   * Add a settings/manage icon to the Home screen's "Users" section header.

   * Register the new route in `app/_layout.tsx` as a modal.

