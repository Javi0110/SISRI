export interface EventCreateInput {
  notification_id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  grid_id: string;
  watersheds: {
    create: Array<{
      watershed_id: number;
    }>;
  };
  incidents: {
    create: Array<{
      type: string;
      description: string;
    }>;
  };
  affected_properties: {
    create: Array<{
      type: string;
      municipality_id: number;
      neighborhood_id: number | null;
      sector_id: number | null;
      address: string;
    }>;
  };
} 