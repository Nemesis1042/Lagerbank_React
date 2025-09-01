import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow content-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" style={{color: 'var(--color-text)', opacity: 0.7}}>{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color || 'text-gray-400'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{color: 'var(--color-text)'}}>{value}</div>
      </CardContent>
    </Card>
  );
}