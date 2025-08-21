// db/schema/index.ts
// Main schema export file combining all tables and relations

// Export all table definitions
export * from './users';
export * from './trips';
export * from './commerce';

// Export all relations
export * from './relations';

// Re-export specific items for easier imports
export { 
  users, 
  userProfiles 
} from './users';

export { 
  trips, 
  tripDays, 
  activities, 
  gems, 
  tripPhotos, 
  promptTemplates 
} from './trips';

export { 
  purchases, 
  userTripCustomizations, 
  userTripNotes, 
  reviews, 
  creatorEarnings 
} from './commerce';

export {
  usersRelations,
  tripsRelations,
} from './relations';