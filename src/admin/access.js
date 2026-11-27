/** Admin/staff accounts run the console only — they have no member experience. */
export const isAdmin = (user) => !!user && (user.role === "admin" || user.is_staff === true);
