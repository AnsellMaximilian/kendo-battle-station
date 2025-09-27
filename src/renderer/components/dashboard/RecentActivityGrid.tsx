import { Grid, GridColumn as Column } from "@progress/kendo-react-grid";

export interface ActivityItem {
  id: string;
  time: string;
  feature: string;
  summary: string;
  status: string;
}

interface RecentActivityGridProps {
  items: ActivityItem[];
}

export const RecentActivityGrid = ({ items }: RecentActivityGridProps) => (
  <Grid
    style={{ height: "100%" }}
    data={items}
    rowHeight={44}
    sortable={false}
  >
    <Column field="time" title="Time" width="115px" />
    <Column field="feature" title="Feature" width="150px" />
    <Column field="summary" title="Summary" />
    <Column field="status" title="Status" width="120px" />
  </Grid>
);
