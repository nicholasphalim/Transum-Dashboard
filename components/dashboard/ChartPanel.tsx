'use client';

import { useHalteStore } from '@/store/halteStore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function ChartPanel() {
  const chartHistory = useHalteStore(state => state.chartHistory);

  return (
    <div className="chart-panel">
      <h3 className="chart-panel__title">📊 Grafik Real-time</h3>
      <div className="chart-panel__container">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="time"
              stroke="var(--text-dim)"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-dim)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'var(--text-muted)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }}
            />
            <Line
              type="monotone"
              dataKey="menunggu"
              name="Total Menunggu"
              stroke="var(--accent-green)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--accent-green)' }}
            />
            <Line
              type="monotone"
              dataKey="masuk"
              name="Akum. Masuk"
              stroke="var(--accent-yellow)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4, fill: 'var(--accent-yellow)' }}
            />
            <Line
              type="monotone"
              dataKey="keluar"
              name="Akum. Keluar"
              stroke="var(--accent-red)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4, fill: 'var(--accent-red)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
