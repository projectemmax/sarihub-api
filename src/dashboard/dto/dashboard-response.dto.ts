export interface DashboardStatsDto {
  orders: number;
  sales: number;
  customers: number;
  pendingReviews: number;
}

export interface DashboardTopProductDto {
  id: string;
  name: string;
  sold?: number;
  revenue?: number;
  image?: string;
}

export interface DashboardReviewDto {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface AnalyticsPointDto {
  label: string;
  revenue: number;
  orders: number;
}

export interface RevenueGrowthDto {
  current: number;
  previous: number;
  growth: number;
}

export interface DashboardAnalyticsDto {
  timeline: AnalyticsPointDto[];
  revenueGrowth: RevenueGrowthDto;
  period: {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };
}

export interface DashboardResponseDto {
  stats: DashboardStatsDto;
  analytics: DashboardAnalyticsDto;
  topProducts: DashboardTopProductDto[];
  pendingReviews: DashboardReviewDto[];
}