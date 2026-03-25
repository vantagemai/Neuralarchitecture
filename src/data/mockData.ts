export interface FollowerData {
  date: string;
  followers: number;
  gained: number;
  lost: number;
}

export interface PostData {
  id: string;
  type: 'image' | 'video' | 'carousel' | 'reel';
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagementRate: number;
  postedAt: string;
}

export interface StoryData {
  id: string;
  views: number;
  replies: number;
  exits: number;
  tapsForward: number;
  tapsBack: number;
  date: string;
}

export interface DemographicData {
  ageGroup: string;
  male: number;
  female: number;
}

export interface CityData {
  city: string;
  percentage: number;
}

export interface HourlyActivity {
  hour: string;
  engagement: number;
}

export interface WeeklyEngagement {
  day: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

// Follower growth over last 30 days
export const followerGrowth: FollowerData[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 2, i + 1);
  const baseFollowers = 12400 + i * 45 + Math.floor(Math.random() * 80);
  return {
    date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    followers: baseFollowers,
    gained: Math.floor(30 + Math.random() * 70),
    lost: Math.floor(5 + Math.random() * 15),
  };
});

// Recent posts
export const recentPosts: PostData[] = [
  {
    id: '1',
    type: 'reel',
    caption: 'Novo projeto de arquitetura neural em acao!',
    likes: 1842,
    comments: 156,
    shares: 234,
    saves: 412,
    reach: 18420,
    impressions: 24560,
    engagementRate: 14.3,
    postedAt: '2026-03-24',
  },
  {
    id: '2',
    type: 'carousel',
    caption: 'Antes e depois - Transformacao completa',
    likes: 1245,
    comments: 89,
    shares: 167,
    saves: 298,
    reach: 12340,
    impressions: 16780,
    engagementRate: 11.2,
    postedAt: '2026-03-22',
  },
  {
    id: '3',
    type: 'image',
    caption: 'Inspiracao do dia - Design minimalista',
    likes: 967,
    comments: 45,
    shares: 78,
    saves: 189,
    reach: 9870,
    impressions: 13200,
    engagementRate: 8.7,
    postedAt: '2026-03-20',
  },
  {
    id: '4',
    type: 'reel',
    caption: 'Tutorial: Como criar redes neurais visuais',
    likes: 2103,
    comments: 201,
    shares: 345,
    saves: 567,
    reach: 25600,
    impressions: 32100,
    engagementRate: 16.8,
    postedAt: '2026-03-18',
  },
  {
    id: '5',
    type: 'video',
    caption: 'Bastidores do nosso estudio',
    likes: 756,
    comments: 34,
    shares: 56,
    saves: 123,
    reach: 7800,
    impressions: 10200,
    engagementRate: 6.9,
    postedAt: '2026-03-16',
  },
  {
    id: '6',
    type: 'carousel',
    caption: '5 dicas para melhorar seu feed',
    likes: 1456,
    comments: 112,
    shares: 198,
    saves: 345,
    reach: 15200,
    impressions: 19800,
    engagementRate: 12.4,
    postedAt: '2026-03-14',
  },
];

// Stories data (last 7 days)
export const storiesData: StoryData[] = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(2026, 2, 19 + i);
  return {
    id: `story-${i}`,
    views: Math.floor(2000 + Math.random() * 3000),
    replies: Math.floor(10 + Math.random() * 40),
    exits: Math.floor(100 + Math.random() * 300),
    tapsForward: Math.floor(500 + Math.random() * 1000),
    tapsBack: Math.floor(50 + Math.random() * 150),
    date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  };
});

// Demographics
export const demographics: DemographicData[] = [
  { ageGroup: '13-17', male: 3, female: 5 },
  { ageGroup: '18-24', male: 18, female: 22 },
  { ageGroup: '25-34', male: 15, female: 19 },
  { ageGroup: '35-44', male: 8, female: 6 },
  { ageGroup: '45-54', male: 2, female: 1.5 },
  { ageGroup: '55+', male: 0.3, female: 0.2 },
];

// Top cities
export const topCities: CityData[] = [
  { city: 'Sao Paulo', percentage: 24.5 },
  { city: 'Rio de Janeiro', percentage: 15.2 },
  { city: 'Belo Horizonte', percentage: 8.7 },
  { city: 'Curitiba', percentage: 6.3 },
  { city: 'Brasilia', percentage: 5.8 },
  { city: 'Porto Alegre', percentage: 4.9 },
  { city: 'Salvador', percentage: 4.2 },
  { city: 'Recife', percentage: 3.6 },
];

// Hourly activity
export const hourlyActivity: HourlyActivity[] = [
  { hour: '06h', engagement: 120 },
  { hour: '07h', engagement: 280 },
  { hour: '08h', engagement: 450 },
  { hour: '09h', engagement: 620 },
  { hour: '10h', engagement: 540 },
  { hour: '11h', engagement: 480 },
  { hour: '12h', engagement: 780 },
  { hour: '13h', engagement: 650 },
  { hour: '14h', engagement: 420 },
  { hour: '15h', engagement: 380 },
  { hour: '16h', engagement: 460 },
  { hour: '17h', engagement: 590 },
  { hour: '18h', engagement: 820 },
  { hour: '19h', engagement: 950 },
  { hour: '20h', engagement: 1100 },
  { hour: '21h', engagement: 980 },
  { hour: '22h', engagement: 720 },
  { hour: '23h', engagement: 350 },
];

// Weekly engagement
export const weeklyEngagement: WeeklyEngagement[] = [
  { day: 'Seg', likes: 845, comments: 67, shares: 89, saves: 134 },
  { day: 'Ter', likes: 923, comments: 78, shares: 95, saves: 156 },
  { day: 'Qua', likes: 1102, comments: 92, shares: 112, saves: 178 },
  { day: 'Qui', likes: 987, comments: 84, shares: 98, saves: 145 },
  { day: 'Sex', likes: 1245, comments: 105, shares: 134, saves: 201 },
  { day: 'Sab', likes: 1456, comments: 123, shares: 156, saves: 234 },
  { day: 'Dom', likes: 1323, comments: 112, shares: 145, saves: 212 },
];

// Summary metrics
export const summaryMetrics = {
  totalFollowers: 13750,
  followersChange: 1350,
  followersChangePercent: 10.9,
  totalReach: 89230,
  reachChange: 12.4,
  totalImpressions: 116640,
  impressionsChange: 8.7,
  engagementRate: 11.7,
  engagementChange: 2.3,
  profileVisits: 4560,
  profileVisitsChange: 15.2,
  websiteClicks: 342,
  websiteClicksChange: 8.9,
};
