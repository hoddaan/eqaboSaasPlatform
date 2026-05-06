const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected');

  const result = await mongoose.connection.collection('rooms').deleteMany({ isActive: false });
  console.log(`✅ Removed ${result.deletedCount} inactive (soft-deleted) rooms`);

  await mongoose.disconnect();
  console.log('Done.');
}

cleanup().catch(err => { console.error('❌', err.message); process.exit(1); });
