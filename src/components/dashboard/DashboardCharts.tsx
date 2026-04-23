import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { VehicleWithOwner } from '@/lib/types';
import { format, subDays, startOfDay, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardChartsProps {
  vehicles: VehicleWithOwner[];
}

const STATUS_COLORS = {
  recibido: 'hsl(220, 15%, 50%)',
  presupuestar: 'hsl(25, 95%, 53%)',
  presupuestado: 'hsl(190, 85%, 42%)',
  en_reparacion: 'hsl(35, 92%, 50%)',
  pendiente_piezas: 'hsl(0, 72%, 51%)',
  terminado: 'hsl(142, 72%, 40%)',
  entregado: 'hsl(215, 80%, 45%)',
};

const STATUS_LABELS: Record<string, string> = {
  recibido: 'Recibido',
  en_reparacion: 'En Reparación',
  pendiente_piezas: 'Pend. Piezas',
  terminado: 'Terminado',
  entregado: 'Entregado',
};

export function DashboardCharts({ vehicles }: DashboardChartsProps) {
  // Data for status distribution pie chart
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      recibido: 0,
      en_reparacion: 0,
      pendiente_piezas: 0,
      terminado: 0,
      entregado: 0,
    };
    
    vehicles.forEach(v => {
      if (counts[v.status] !== undefined) {
        counts[v.status]++;
      }
    });
    
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status],
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
    })).filter(item => item.value > 0);
  }, [vehicles]);

  // Data for vehicles received per day (last 7 days)
  const vehiclesPerDay = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: startOfDay(date).toISOString(),
        label: format(date, 'EEE', { locale: es }),
        recibidos: 0,
        terminados: 0,
      };
    });

    vehicles.forEach(v => {
      const createdDate = startOfDay(new Date(v.created_at)).toISOString();
      const dayData = last7Days.find(d => d.date === createdDate);
      if (dayData) {
        dayData.recibidos++;
      }
      
      if (v.delivered_at) {
        const deliveredDate = startOfDay(new Date(v.delivered_at)).toISOString();
        const deliveredDayData = last7Days.find(d => d.date === deliveredDate);
        if (deliveredDayData) {
          deliveredDayData.terminados++;
        }
      }
    });

    return last7Days;
  }, [vehicles]);

  // Data for brand distribution
  const brandDistribution = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    
    vehicles.forEach(v => {
      const brand = v.brand.toUpperCase();
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    });
    
    return Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand, count]) => ({
        name: brand,
        count,
      }));
  }, [vehicles]);

  // Average time in each status
  const avgTimeInStatus = useMemo(() => {
    const statusTimes: Record<string, { total: number; count: number }> = {
      recibido: { total: 0, count: 0 },
      en_reparacion: { total: 0, count: 0 },
      pendiente_piezas: { total: 0, count: 0 },
      terminado: { total: 0, count: 0 },
    };

    vehicles.forEach(v => {
      const daysSinceCreation = differenceInDays(new Date(), new Date(v.created_at));
      if (daysSinceCreation > 0 && statusTimes[v.status]) {
        statusTimes[v.status].total += daysSinceCreation;
        statusTimes[v.status].count++;
      }
    });

    return Object.entries(statusTimes).map(([status, data]) => ({
      name: STATUS_LABELS[status],
      dias: data.count > 0 ? Math.round(data.total / data.count) : 0,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
    }));
  }, [vehicles]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Status Distribution Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribución por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Sin datos
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicles per day line chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Actividad Últimos 7 Días</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vehiclesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="recibidos" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Recibidos"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="terminados" 
                  stroke="hsl(var(--status-completed))" 
                  strokeWidth={2}
                  name="Terminados"
                  dot={{ fill: 'hsl(var(--status-completed))' }}
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Brands Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Marcas Más Frecuentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            {brandDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    width={80}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                    name="Vehículos"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Sin datos
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Average Time in Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Promedio Días por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgTimeInStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value} días`, 'Promedio']}
                />
                <Bar 
                  dataKey="dias" 
                  radius={[4, 4, 0, 0]}
                  name="Días"
                >
                  {avgTimeInStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}