require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed matches
  const matches = [
    {
      league: 'Premier League', leagueCode: 'PL', homeTeam: 'Arsenal', awayTeam: 'Tottenham',
      homeScore: 1, awayScore: 0, status: 'LIVE', startTime: new Date(Date.now() - 67 * 60000), minute: 67,
      odds: [
        { outcome: 'HOME_WIN', label: 'Arsenal Win', value: 1.65 },
        { outcome: 'DRAW', label: 'Draw', value: 3.80 },
        { outcome: 'AWAY_WIN', label: 'Spurs Win', value: 5.50 }
      ]
    },
    {
      league: 'La Liga', leagueCode: 'LL', homeTeam: 'Real Madrid', awayTeam: 'Barcelona',
      homeScore: 0, awayScore: 0, status: 'LIVE', startTime: new Date(Date.now() - 23 * 60000), minute: 23,
      odds: [
        { outcome: 'HOME_WIN', label: 'Madrid Win', value: 2.10 },
        { outcome: 'DRAW', label: 'Draw', value: 3.40 },
        { outcome: 'AWAY_WIN', label: 'Barca Win', value: 2.95 }
      ]
    },
    {
      league: 'UEFA Champions League', leagueCode: 'UCL', homeTeam: 'Man City', awayTeam: 'PSG',
      status: 'UPCOMING', startTime: new Date(Date.now() + 3 * 60 * 60000),
      odds: [
        { outcome: 'HOME_WIN', label: 'City Win', value: 1.95 },
        { outcome: 'DRAW', label: 'Draw', value: 3.60 },
        { outcome: 'AWAY_WIN', label: 'PSG Win', value: 3.75 }
      ]
    },
    {
      league: 'NPFL', leagueCode: 'NPFL', homeTeam: 'Enyimba FC', awayTeam: 'Remo Stars',
      status: 'UPCOMING', startTime: new Date(Date.now() + 24 * 60 * 60000),
      odds: [
        { outcome: 'HOME_WIN', label: 'Enyimba Win', value: 2.20 },
        { outcome: 'DRAW', label: 'Draw', value: 3.10 },
        { outcome: 'AWAY_WIN', label: 'Remo Win', value: 2.80 }
      ]
    },
    {
      league: 'Premier League', leagueCode: 'PL', homeTeam: 'Liverpool', awayTeam: 'Man United',
      status: 'UPCOMING', startTime: new Date(Date.now() + 48 * 60 * 60000),
      odds: [
        { outcome: 'HOME_WIN', label: 'Liverpool Win', value: 1.75 },
        { outcome: 'DRAW', label: 'Draw', value: 4.00 },
        { outcome: 'AWAY_WIN', label: 'United Win', value: 4.50 }
      ]
    },
    {
      league: 'Serie A', leagueCode: 'SA', homeTeam: 'Inter Milan', awayTeam: 'AC Milan',
      status: 'UPCOMING', startTime: new Date(Date.now() + 2 * 24 * 60 * 60000),
      odds: [
        { outcome: 'HOME_WIN', label: 'Inter Win', value: 2.05 },
        { outcome: 'DRAW', label: 'Draw', value: 3.25 },
        { outcome: 'AWAY_WIN', label: 'Milan Win', value: 3.40 }
      ]
    }
  ];

  for (const m of matches) {
    const { odds, ...matchData } = m;
    const match = await prisma.match.upsert({
      where: { id: '00000000-0000-0000-0000-000000000000' },
      update: {},
      create: {
        ...matchData,
        odds: { create: odds.map(o => ({ ...o, isActive: true })) }
      }
    }).catch(async () => {
      // If upsert fails, just create
      return prisma.match.create({
        data: {
          ...matchData,
          odds: { create: odds.map(o => ({ ...o, isActive: true })) }
        }
      });
    });
    console.log(`✅ Match: ${matchData.homeTeam} vs ${matchData.awayTeam}`);
  }

  // Seed demo user
  const pinHash = await bcrypt.hash('1234', 12);
  const demoUser = await prisma.user.upsert({
    where: { phone: '+2348123456789' },
    update: {},
    create: {
      fullName: 'Chukwuemeka Okafor',
      phone: '+2348123456789',
      dateOfBirth: new Date('1995-05-15'),
      state: 'Lagos',
      pinHash,
      kycStatus: 'APPROVED'
    }
  });

  await prisma.wallet.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: { userId: demoUser.id, balance: 4850, totalDeposited: 20000, totalWon: 8200, totalStaked: 12500 }
  });

  await prisma.bsr.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: { userId: demoUser.id, score: 67, level: 'SILVER', winRate: 62, totalBets: 45, wonBets: 28, lostBets: 17, monthlyBets: 24 }
  });

  await prisma.kyc.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: { userId: demoUser.id, status: 'APPROVED', bvn: '22345678901', idType: 'NIN' }
  });

  await prisma.spendingLimit.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: { userId: demoUser.id, monthlyLimit: 15000 }
  });

  // Seed tipsters
  const tipsterUsers = [
    { name: 'OracleNG', phone: '+2348001111111', score: 82, winRate: 74, displayName: 'OracleNG ⭐', price: 1500, subs: 3420, tips: 1240 },
    { name: 'SureBanker', phone: '+2348002222222', score: 76, winRate: 68, displayName: 'SureBanker', price: 1000, subs: 1980, tips: 892 },
    { name: 'ProfitKing', phone: '+2348003333333', score: 71, winRate: 65, displayName: 'ProfitKing', price: 0, subs: 8200, tips: 541, isFree: true },
  ];

  for (const t of tipsterUsers) {
    const user = await prisma.user.upsert({
      where: { phone: t.phone },
      update: {},
      create: {
        fullName: t.name,
        phone: t.phone,
        dateOfBirth: new Date('1990-01-01'),
        state: 'Lagos',
        pinHash,
        kycStatus: 'APPROVED',
        role: 'TIPSTER'
      }
    });

    await prisma.bsr.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, score: t.score, level: t.score >= 75 ? 'GOLD' : 'SILVER', winRate: t.winRate, totalBets: t.tips }
    });

    await prisma.wallet.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });

    await prisma.tipster.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: t.displayName,
        bio: `Top Nigerian tipster with ${t.winRate}% win rate. Specialising in European football.`,
        subscriptionPrice: t.isFree ? null : t.price,
        isFree: !!t.isFree,
        isVerified: true,
        subscriberCount: t.subs,
        totalTips: t.tips
      }
    });

    console.log(`✅ Tipster: ${t.displayName}`);
  }

  console.log('\n✅ Seed complete!');
  console.log('Demo login → Phone: 08123456789 | PIN: 1234');
}

main().catch(console.error).finally(() => prisma.$disconnect());
