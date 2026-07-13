import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { SparkChart } from "./spark-chart";

const meta = { title: "Money/SparkChart" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const days = (values: number[]) =>
  values.map((value, i) => ({
    date: new Date(Date.now() - (values.length - 1 - i) * 86400e3).toISOString().slice(0, 10),
    value,
  }));

export const ThirtyDays: Story = {
  render: () => (
    <div className="grid w-[56rem] gap-3 sm:grid-cols-3">
      <SparkChart label="Views · 30d" color="#a1a1aa" points={days([3,5,2,8,12,7,4,9,15,11,6,8,14,18,12,9,7,11,16,22,17,13,10,14,19,25,20,16,12,18])} />
      <SparkChart label="Verified installs · 30d" color="#10b981" points={days([0,1,0,2,3,1,0,2,4,3,1,2,3,5,2,1,2,3,4,6,4,3,2,3,5,7,5,4,3,5])} />
      <SparkChart label="Sales · 30d" color="#f59e0b" points={days([0,0,0,1,0,0,0,0,1,0,0,0,0,2,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0,1])} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="w-72">
      <SparkChart label="Sales · 30d" color="#f59e0b" points={days(new Array(30).fill(0))} />
    </div>
  ),
};
