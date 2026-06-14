import { reseedDatabase } from '../server/seed.js';

console.log('Starting manual database reseed...');
reseedDatabase(true)
  .then(() => {
    console.log('Database reseeded successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Reseed failed:', err);
    process.exit(1);
  });
