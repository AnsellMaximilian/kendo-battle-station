import {
  Chart,
  ChartArea,
  ChartLegend,
  ChartSeries,
  ChartSeriesItem,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartTooltip,
} from "@progress/kendo-react-charts";

export interface ProductivityDatum {
  day: string;
  focusMinutes: number;
  breakMinutes: number;
}

interface ProductivityChartProps {
  data: ProductivityDatum[];
}

export const ProductivityChart = ({ data }: ProductivityChartProps) => (
  <Chart style={{ height: 260 }}>
    <ChartArea background="transparent" />
    <ChartLegend position="bottom" orientation="horizontal" />
    <ChartCategoryAxis>
      <ChartCategoryAxisItem categories={data.map((item) => item.day)} />
    </ChartCategoryAxis>
    <ChartValueAxis>
      <ChartValueAxisItem
        min={0}
        line={{ visible: false }}
        majorGridLines={{ visible: true }}
        labels={{ format: "{0} min" }}
      />
    </ChartValueAxis>
    <ChartSeries>
      <ChartSeriesItem
        type="line"
        data={data.map((item) => item.focusMinutes)}
        name="Focused"
        markers={{ visible: true, size: 6 }}
        color="#0a65cc"
      />
      <ChartSeriesItem
        type="line"
        data={data.map((item) => item.breakMinutes)}
        name="Break"
        markers={{ visible: true, size: 6 }}
        color="#60a5fa"
      />
    </ChartSeries>
    <ChartTooltip format="{0} min" />
  </Chart>
);
