function rank(code, name, paygrade, category, order) {
  return Object.freeze({ code, name, paygrade, category, order });
}

const branches = {
  army: {
    id: 'army',
    name: 'United States Army',
    shortName: 'Army',
    abbreviation: 'USA',
    color: '#4b5320',
    accent: '#d6b35a',
    motto: 'This We’ll Defend',
    ranks: [
      rank('PVT', 'Private', 'E-1', 'Enlisted', 101),
      rank('PV2', 'Private Second Class', 'E-2', 'Enlisted', 102),
      rank('PFC', 'Private First Class', 'E-3', 'Enlisted', 103),
      rank('SPC', 'Specialist', 'E-4', 'Enlisted', 104),
      rank('CPL', 'Corporal', 'E-4', 'Enlisted', 105),
      rank('SGT', 'Sergeant', 'E-5', 'Enlisted', 106),
      rank('SSG', 'Staff Sergeant', 'E-6', 'Enlisted', 107),
      rank('SFC', 'Sergeant First Class', 'E-7', 'Enlisted', 108),
      rank('MSG', 'Master Sergeant', 'E-8', 'Enlisted', 109),
      rank('1SG', 'First Sergeant', 'E-8', 'Enlisted', 110),
      rank('SGM', 'Sergeant Major', 'E-9', 'Enlisted', 111),
      rank('CSM', 'Command Sergeant Major', 'E-9', 'Enlisted', 112),
      rank('SMA', 'Sergeant Major of the Army', 'E-9', 'Enlisted', 113),
      rank('WO1', 'Warrant Officer 1', 'W-1', 'Warrant Officer', 201),
      rank('CW2', 'Chief Warrant Officer 2', 'W-2', 'Warrant Officer', 202),
      rank('CW3', 'Chief Warrant Officer 3', 'W-3', 'Warrant Officer', 203),
      rank('CW4', 'Chief Warrant Officer 4', 'W-4', 'Warrant Officer', 204),
      rank('CW5', 'Chief Warrant Officer 5', 'W-5', 'Warrant Officer', 205),
      rank('2LT', 'Second Lieutenant', 'O-1', 'Officer', 301),
      rank('1LT', 'First Lieutenant', 'O-2', 'Officer', 302),
      rank('CPT', 'Captain', 'O-3', 'Officer', 303),
      rank('MAJ', 'Major', 'O-4', 'Officer', 304),
      rank('LTC', 'Lieutenant Colonel', 'O-5', 'Officer', 305),
      rank('COL', 'Colonel', 'O-6', 'Officer', 306),
      rank('BG', 'Brigadier General', 'O-7', 'Officer', 307),
      rank('MG', 'Major General', 'O-8', 'Officer', 308),
      rank('LTG', 'Lieutenant General', 'O-9', 'Officer', 309),
      rank('GEN', 'General', 'O-10', 'Officer', 310),
      rank('GA', 'General of the Army', 'Special', 'Officer', 311)
    ]
  },
  marine_corps: {
    id: 'marine_corps',
    name: 'United States Marine Corps',
    shortName: 'Marine Corps',
    abbreviation: 'USMC',
    color: '#8b0000',
    accent: '#d4af37',
    motto: 'Semper Fidelis',
    ranks: [
      rank('PVT', 'Private', 'E-1', 'Enlisted', 101),
      rank('PFC', 'Private First Class', 'E-2', 'Enlisted', 102),
      rank('LCPL', 'Lance Corporal', 'E-3', 'Enlisted', 103),
      rank('CPL', 'Corporal', 'E-4', 'Enlisted', 104),
      rank('SGT', 'Sergeant', 'E-5', 'Enlisted', 105),
      rank('SSGT', 'Staff Sergeant', 'E-6', 'Enlisted', 106),
      rank('GYSGT', 'Gunnery Sergeant', 'E-7', 'Enlisted', 107),
      rank('MSGT', 'Master Sergeant', 'E-8', 'Enlisted', 108),
      rank('1STSGT', 'First Sergeant', 'E-8', 'Enlisted', 109),
      rank('MGYSGT', 'Master Gunnery Sergeant', 'E-9', 'Enlisted', 110),
      rank('SGTMAJ', 'Sergeant Major', 'E-9', 'Enlisted', 111),
      rank('SMMC', 'Sergeant Major of the Marine Corps', 'E-9', 'Enlisted', 112),
      rank('WO', 'Warrant Officer', 'W-1', 'Warrant Officer', 201),
      rank('CWO2', 'Chief Warrant Officer 2', 'W-2', 'Warrant Officer', 202),
      rank('CWO3', 'Chief Warrant Officer 3', 'W-3', 'Warrant Officer', 203),
      rank('CWO4', 'Chief Warrant Officer 4', 'W-4', 'Warrant Officer', 204),
      rank('CWO5', 'Chief Warrant Officer 5', 'W-5', 'Warrant Officer', 205),
      rank('2NDLT', 'Second Lieutenant', 'O-1', 'Officer', 301),
      rank('1STLT', 'First Lieutenant', 'O-2', 'Officer', 302),
      rank('CAPT', 'Captain', 'O-3', 'Officer', 303),
      rank('MAJ', 'Major', 'O-4', 'Officer', 304),
      rank('LTCOL', 'Lieutenant Colonel', 'O-5', 'Officer', 305),
      rank('COL', 'Colonel', 'O-6', 'Officer', 306),
      rank('BGEN', 'Brigadier General', 'O-7', 'Officer', 307),
      rank('MAJGEN', 'Major General', 'O-8', 'Officer', 308),
      rank('LTGEN', 'Lieutenant General', 'O-9', 'Officer', 309),
      rank('GEN', 'General', 'O-10', 'Officer', 310)
    ]
  },
  navy: {
    id: 'navy',
    name: 'United States Navy',
    shortName: 'Navy',
    abbreviation: 'USN',
    color: '#001f3f',
    accent: '#c9a227',
    motto: 'Semper Fortis',
    ranks: [
      rank('SR', 'Seaman Recruit', 'E-1', 'Enlisted', 101),
      rank('SA', 'Seaman Apprentice', 'E-2', 'Enlisted', 102),
      rank('SN', 'Seaman', 'E-3', 'Enlisted', 103),
      rank('PO3', 'Petty Officer Third Class', 'E-4', 'Enlisted', 104),
      rank('PO2', 'Petty Officer Second Class', 'E-5', 'Enlisted', 105),
      rank('PO1', 'Petty Officer First Class', 'E-6', 'Enlisted', 106),
      rank('CPO', 'Chief Petty Officer', 'E-7', 'Enlisted', 107),
      rank('SCPO', 'Senior Chief Petty Officer', 'E-8', 'Enlisted', 108),
      rank('MCPO', 'Master Chief Petty Officer', 'E-9', 'Enlisted', 109),
      rank('FLTCM', 'Fleet Master Chief Petty Officer', 'E-9', 'Enlisted', 110),
      rank('MCPON', 'Master Chief Petty Officer of the Navy', 'E-9', 'Enlisted', 111),
      rank('CWO2', 'Chief Warrant Officer 2', 'W-2', 'Warrant Officer', 202),
      rank('CWO3', 'Chief Warrant Officer 3', 'W-3', 'Warrant Officer', 203),
      rank('CWO4', 'Chief Warrant Officer 4', 'W-4', 'Warrant Officer', 204),
      rank('CWO5', 'Chief Warrant Officer 5', 'W-5', 'Warrant Officer', 205),
      rank('ENS', 'Ensign', 'O-1', 'Officer', 301),
      rank('LTJG', 'Lieutenant Junior Grade', 'O-2', 'Officer', 302),
      rank('LT', 'Lieutenant', 'O-3', 'Officer', 303),
      rank('LCDR', 'Lieutenant Commander', 'O-4', 'Officer', 304),
      rank('CDR', 'Commander', 'O-5', 'Officer', 305),
      rank('CAPT', 'Captain', 'O-6', 'Officer', 306),
      rank('RDML', 'Rear Admiral Lower Half', 'O-7', 'Officer', 307),
      rank('RADM', 'Rear Admiral', 'O-8', 'Officer', 308),
      rank('VADM', 'Vice Admiral', 'O-9', 'Officer', 309),
      rank('ADM', 'Admiral', 'O-10', 'Officer', 310),
      rank('FADM', 'Fleet Admiral', 'Special', 'Officer', 311)
    ]
  },
  air_force: {
    id: 'air_force',
    name: 'United States Air Force',
    shortName: 'Air Force',
    abbreviation: 'USAF',
    color: '#00308f',
    accent: '#a7c6ed',
    motto: 'Aim High … Fly-Fight-Win',
    ranks: [
      rank('AB', 'Airman Basic', 'E-1', 'Enlisted', 101),
      rank('AMN', 'Airman', 'E-2', 'Enlisted', 102),
      rank('A1C', 'Airman First Class', 'E-3', 'Enlisted', 103),
      rank('SRA', 'Senior Airman', 'E-4', 'Enlisted', 104),
      rank('SSGT', 'Staff Sergeant', 'E-5', 'Enlisted', 105),
      rank('TSGT', 'Technical Sergeant', 'E-6', 'Enlisted', 106),
      rank('MSGT', 'Master Sergeant', 'E-7', 'Enlisted', 107),
      rank('SMSGT', 'Senior Master Sergeant', 'E-8', 'Enlisted', 108),
      rank('CMSGT', 'Chief Master Sergeant', 'E-9', 'Enlisted', 109),
      rank('CCM', 'Command Chief Master Sergeant', 'E-9', 'Enlisted', 110),
      rank('CMSAF', 'Chief Master Sergeant of the Air Force', 'E-9', 'Enlisted', 111),
      rank('2DLT', 'Second Lieutenant', 'O-1', 'Officer', 301),
      rank('1STLT', 'First Lieutenant', 'O-2', 'Officer', 302),
      rank('CAPT', 'Captain', 'O-3', 'Officer', 303),
      rank('MAJ', 'Major', 'O-4', 'Officer', 304),
      rank('LTCOL', 'Lieutenant Colonel', 'O-5', 'Officer', 305),
      rank('COL', 'Colonel', 'O-6', 'Officer', 306),
      rank('BRIGGEN', 'Brigadier General', 'O-7', 'Officer', 307),
      rank('MAJGEN', 'Major General', 'O-8', 'Officer', 308),
      rank('LTGEN', 'Lieutenant General', 'O-9', 'Officer', 309),
      rank('GEN', 'General', 'O-10', 'Officer', 310),
      rank('GAF', 'General of the Air Force', 'Special', 'Officer', 311)
    ]
  },
  space_force: {
    id: 'space_force',
    name: 'United States Space Force',
    shortName: 'Space Force',
    abbreviation: 'USSF',
    color: '#101820',
    accent: '#8a8d8f',
    motto: 'Semper Supra',
    ranks: [
      rank('SPC1', 'Specialist 1', 'E-1', 'Enlisted', 101),
      rank('SPC2', 'Specialist 2', 'E-2', 'Enlisted', 102),
      rank('SPC3', 'Specialist 3', 'E-3', 'Enlisted', 103),
      rank('SPC4', 'Specialist 4', 'E-4', 'Enlisted', 104),
      rank('SGT', 'Sergeant', 'E-5', 'Enlisted', 105),
      rank('TSGT', 'Technical Sergeant', 'E-6', 'Enlisted', 106),
      rank('MSGT', 'Master Sergeant', 'E-7', 'Enlisted', 107),
      rank('SMSGT', 'Senior Master Sergeant', 'E-8', 'Enlisted', 108),
      rank('CMSGT', 'Chief Master Sergeant', 'E-9', 'Enlisted', 109),
      rank('CMSSF', 'Chief Master Sergeant of the Space Force', 'E-9', 'Enlisted', 110),
      rank('2DLT', 'Second Lieutenant', 'O-1', 'Officer', 301),
      rank('1STLT', 'First Lieutenant', 'O-2', 'Officer', 302),
      rank('CAPT', 'Captain', 'O-3', 'Officer', 303),
      rank('MAJ', 'Major', 'O-4', 'Officer', 304),
      rank('LTCOL', 'Lieutenant Colonel', 'O-5', 'Officer', 305),
      rank('COL', 'Colonel', 'O-6', 'Officer', 306),
      rank('BRIGGEN', 'Brigadier General', 'O-7', 'Officer', 307),
      rank('MAJGEN', 'Major General', 'O-8', 'Officer', 308),
      rank('LTGEN', 'Lieutenant General', 'O-9', 'Officer', 309),
      rank('GEN', 'General', 'O-10', 'Officer', 310)
    ]
  },
  coast_guard: {
    id: 'coast_guard',
    name: 'United States Coast Guard',
    shortName: 'Coast Guard',
    abbreviation: 'USCG',
    color: '#003478',
    accent: '#e4222b',
    motto: 'Semper Paratus',
    ranks: [
      rank('SR', 'Seaman Recruit', 'E-1', 'Enlisted', 101),
      rank('SA', 'Seaman Apprentice', 'E-2', 'Enlisted', 102),
      rank('SN', 'Seaman', 'E-3', 'Enlisted', 103),
      rank('PO3', 'Petty Officer Third Class', 'E-4', 'Enlisted', 104),
      rank('PO2', 'Petty Officer Second Class', 'E-5', 'Enlisted', 105),
      rank('PO1', 'Petty Officer First Class', 'E-6', 'Enlisted', 106),
      rank('CPO', 'Chief Petty Officer', 'E-7', 'Enlisted', 107),
      rank('SCPO', 'Senior Chief Petty Officer', 'E-8', 'Enlisted', 108),
      rank('MCPO', 'Master Chief Petty Officer', 'E-9', 'Enlisted', 109),
      rank('MCPOCG', 'Master Chief Petty Officer of the Coast Guard', 'E-9', 'Enlisted', 110),
      rank('CWO2', 'Chief Warrant Officer 2', 'W-2', 'Warrant Officer', 202),
      rank('CWO3', 'Chief Warrant Officer 3', 'W-3', 'Warrant Officer', 203),
      rank('CWO4', 'Chief Warrant Officer 4', 'W-4', 'Warrant Officer', 204),
      rank('ENS', 'Ensign', 'O-1', 'Officer', 301),
      rank('LTJG', 'Lieutenant Junior Grade', 'O-2', 'Officer', 302),
      rank('LT', 'Lieutenant', 'O-3', 'Officer', 303),
      rank('LCDR', 'Lieutenant Commander', 'O-4', 'Officer', 304),
      rank('CDR', 'Commander', 'O-5', 'Officer', 305),
      rank('CAPT', 'Captain', 'O-6', 'Officer', 306),
      rank('RDML', 'Rear Admiral Lower Half', 'O-7', 'Officer', 307),
      rank('RADM', 'Rear Admiral', 'O-8', 'Officer', 308),
      rank('VADM', 'Vice Admiral', 'O-9', 'Officer', 309),
      rank('ADM', 'Admiral', 'O-10', 'Officer', 310)
    ]
  }
};

export const BRANCHES = Object.freeze(
  Object.fromEntries(
    Object.entries(branches).map(([key, branch]) => [
      key,
      Object.freeze({ ...branch, ranks: Object.freeze(branch.ranks) })
    ])
  )
);

export const BRANCH_CHOICES = Object.freeze(
  Object.values(BRANCHES).map((branch) => ({ name: branch.name, value: branch.id }))
);

export function getBranch(branchId = 'army') {
  return BRANCHES[branchId] ?? BRANCHES.army;
}

export function getRank(branchId, rankCode) {
  if (!rankCode) return null;
  return getBranch(branchId).ranks.find(
    (candidate) => candidate.code.toLowerCase() === String(rankCode).toLowerCase()
  ) ?? null;
}

export function searchRanks(branchId, query = '') {
  const needle = String(query).trim().toLowerCase();
  const ranks = getBranch(branchId).ranks;
  if (!needle) return ranks.slice(0, 25);

  return ranks
    .filter((candidate) =>
      [candidate.code, candidate.name, candidate.paygrade, candidate.category]
        .some((value) => value.toLowerCase().includes(needle))
    )
    .slice(0, 25);
}

