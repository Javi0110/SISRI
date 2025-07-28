export interface EventCreateInput {
  notificationId: number;
  title: string;
  description: string;
  date: string;
  gridId: string;
  incidents: Array<{
    type: string;
    description: string;
    watershedId: number;
  }>;
  affected_properties: Array<{
    damages?: string;
    property: {
      create: {
        type: string;
        value: number;
        municipality_id: number;
        neighborhood_id: number | null;
        sector_id: number | null;
        address: string;
      };
    };
  }>;
} 