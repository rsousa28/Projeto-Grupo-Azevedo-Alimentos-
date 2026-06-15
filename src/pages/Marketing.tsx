import React from 'react';
import DataEntrySection from '../components/DataEntrySection';

export default function Marketing() {
  return (
    <div className="space-y-6">
      <DataEntrySection mode="marketing" isEmbedded={false} />
    </div>
  );
}
