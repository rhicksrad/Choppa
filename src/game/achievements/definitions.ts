export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  sortOrder?: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'rookie-strike',
    title: 'Rookie Strike',
    description: 'Destroy your first hostile unit.',
    sortOrder: 10,
  },
  {
    id: 'campus-liberator',
    title: 'Campus Liberator',
    description: 'Level the alien command campus in Operation Dawnshield.',
    sortOrder: 20,
  },
  {
    id: 'counterattack-crushed',
    title: 'Counterattack Crushed',
    description: 'Trigger the alien counterattack and wipe every invader from the valley.',
    sortOrder: 30,
  },
  {
    id: 'evac-ace',
    title: 'Evacuation Ace',
    description: 'Rescue every survivor in a single mission.',
    sortOrder: 40,
  },
  {
    id: 'wavebreaker',
    title: 'Wavebreaker',
    description: 'Survive every drone wave during Operation Dawnshield.',
    sortOrder: 50,
  },
  {
    id: 'dawnshield-complete',
    title: 'Operation Dawnshield',
    description: 'Complete the first campaign mission.',
    sortOrder: 60,
  },
  {
    id: 'stormbreak-guardian',
    title: 'Stormbreak Guardian',
    description: 'Hold the breakwater without losing a single convoy ship.',
    sortOrder: 70,
  },
  {
    id: 'starfall-complete',
    title: 'Operation Starfall',
    description: 'Crack the mothership shield and secure the breach.',
    sortOrder: 80,
  },
  {
    id: 'light-the-fuse',
    title: 'Light the Fuse',
    description: 'Arm the nuke inside the hivemind well.',
    sortOrder: 90,
  },
  {
    id: 'black-sun-complete',
    title: 'Operation Black Sun',
    description: 'Detonate the nuke and extract from the alien homeworld.',
    sortOrder: 100,
  },
];

export const achievementMap = new Map<string, AchievementDef>(
  ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]),
);
