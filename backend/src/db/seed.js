import defaultDb from './database.js';
import { hashPassword } from '../services/authService.js';
import { addTransaction } from '../services/balanceService.js';

export async function seedDatabase(db = defaultDb) {
  console.log('🌱 Initializing & checking Pashu Khadya Ledger database...');

  // Ensure schema exists
  await db.initSchema();

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'श्री. मारुती पाटील (क्लार्क)';

  // 1. Seed Admin if none exists
  const adminCountRow = await db.prepare('SELECT COUNT(*) as c FROM admins').get();
  const adminCount = adminCountRow ? adminCountRow.c : 0;
  let adminId = 'admin-uuid-1';

  if (adminCount === 0) {
    await db.prepare(`
      INSERT INTO admins (id, username, password_hash, full_name, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(adminId, adminUsername, hashPassword(adminPassword), adminName);
    console.log(`✅ Admin created: username="${adminUsername}"`);
  } else {
    const existing = await db.prepare('SELECT id FROM admins LIMIT 1').get();
    if (existing) adminId = existing.id;
  }

  // 2. Check if demo data should be seeded
  const shouldSeedDemo = process.env.SEED_DEMO_DATA !== 'false';
  if (!shouldSeedDemo) {
    console.log('ℹ️ SEED_DEMO_DATA=false: Running in clean production mode (no demo data).');
    return;
  }

  // Sample Members
  const sampleMembers = [
    {
      id: 'mem-1',
      fullName: 'रमेश दिनकर पाटील (Ramesh Patil)',
      phone: '9876543210',
      village: 'शिरोळी (Shiroli)',
      code: '12'
    },
    {
      id: 'mem-2',
      fullName: 'सुनिता बाबुराव शिंदे (Sunita Shinde)',
      phone: '9822114455',
      village: 'नागाव (Nagaon)',
      code: '15'
    },
    {
      id: 'mem-3',
      fullName: 'तुकाराम गणपती घोरपडे (Tukaram Ghorpade)',
      phone: '9970123456',
      village: 'कसबा बावडा (Kasba Bawada)',
      code: '23'
    },
    {
      id: 'mem-4',
      fullName: 'आनंदा पांडुरंग जाधव (Ananda Jadhav)',
      phone: '9423887766',
      village: 'वडणगे (Vadange)',
      code: '08'
    },
    {
      id: 'mem-5',
      fullName: 'शोभा सुरेश कांबळे (Shobha Kamble)',
      phone: '9158001122',
      village: 'शिरोळी (Shiroli)',
      code: '34'
    }
  ];

  for (const m of sampleMembers) {
    const exists = await db.prepare('SELECT id FROM members WHERE phone_number = ?').get(m.phone);
    if (!exists) {
      await db.prepare(`
        INSERT INTO members (id, full_name, phone_number, village, member_code, current_balance, created_at)
        VALUES (?, ?, ?, ?, ?, 0.00, datetime('now'))
      `).run(m.id, m.fullName, m.phone, m.village, m.code);
    }
  }

  // 3. Seed realistic transactions if none exist
  const txCountRow = await db.prepare('SELECT COUNT(*) as c FROM transactions').get();
  const txCount = txCountRow ? txCountRow.c : 0;
  if (txCount === 0) {
    console.log('📊 Adding realistic historical ledger entries...');

    // Member 1: Ramesh Patil (Feed ₹2400 -> Payment ₹1000 -> Feed ₹1850 -> Balance = ₹3250)
    await addTransaction(db, {
      memberId: 'mem-1',
      date: '2026-02-10',
      type: 'feed_given',
      amount: 2400,
      note: 'सुग्रास पशू खाद्य २ गोणी (2 bags Sugras)',
      adminId
    });
    await addTransaction(db, {
      memberId: 'mem-1',
      date: '2026-02-20',
      type: 'payment',
      amount: 1000,
      note: 'दूध बिलातून जमा (Deducted from milk bill)',
      adminId
    });
    await addTransaction(db, {
      memberId: 'mem-1',
      date: '2026-03-01',
      type: 'feed_given',
      amount: 1850,
      note: 'सरकी ढेप १ गोणी (1 bag Cottonseed cake)',
      adminId
    });

    // Member 2: Sunita Shinde (Feed ₹1600 -> Payment ₹2000 -> in Credit -₹400)
    await addTransaction(db, {
      memberId: 'mem-2',
      date: '2026-02-15',
      type: 'feed_given',
      amount: 1600,
      note: 'मका चुनी १ गोणी (Maize Chuni)',
      adminId
    });
    await addTransaction(db, {
      memberId: 'mem-2',
      date: '2026-03-05',
      type: 'payment',
      amount: 2000,
      note: 'रोख जमा (Cash deposit - overpaid in advance)',
      adminId
    });

    // Member 3: Tukaram Ghorpade (Feed ₹3800 -> Payment ₹1500 -> Balance ₹2300)
    await addTransaction(db, {
      memberId: 'mem-3',
      date: '2026-02-05',
      type: 'feed_given',
      amount: 3800,
      note: 'सुग्रास गोल्ड ३ गोणी (3 bags Sugras Gold)',
      adminId
    });
    await addTransaction(db, {
      memberId: 'mem-3',
      date: '2026-02-28',
      type: 'payment',
      amount: 1500,
      note: 'दूध बिलातून जमा',
      adminId
    });

    // Member 4: Ananda Jadhav (Feed ₹4200 -> Feed ₹1200 -> Balance ₹5400)
    await addTransaction(db, {
      memberId: 'mem-4',
      date: '2026-02-12',
      type: 'feed_given',
      amount: 4200,
      note: 'मिल्क रेशन विशेष खाद्य (Special milk ration)',
      adminId
    });
    await addTransaction(db, {
      memberId: 'mem-4',
      date: '2026-03-02',
      type: 'feed_given',
      amount: 1200,
      note: 'मिनरल मिक्स्चर व खाद्यान्न (Mineral mixture)',
      adminId
    });

    // Member 5: Shobha Kamble (Feed ₹1500 -> Payment ₹1500 -> Balance ₹0)
    await addTransaction(db, {
      memberId: 'mem-5',
      date: '2026-02-18',
      type: 'feed_given',
      amount: 1500,
      note: 'सरकी पेंड १ गोणी',
      adminId
    });
    await addTransaction(db, {
      memberId: 'mem-5',
      date: '2026-03-01',
      type: 'payment',
      amount: 1500,
      note: 'पूर्ण बाकी भरणा (Full payment cleared)',
      adminId
    });

    console.log('✅ Sample ledger history seeded successfully!');
  }

  console.log('🎉 Database is ready to use!');
}

// Run directly if invoked as main
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase().catch(console.error);
}
