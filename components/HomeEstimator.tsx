"use client";

import { useState } from 'react';
import EstimatorChatbotPanel from '@/components/estimator/EstimatorChatbotPanel';

export default function HomeEstimator({ initialProject = 'roof-replacement', initialZip = '55123' }: { initialProject?: string; initialZip?: string }) {
  const [projectType, setProjectType] = useState(initialProject);
  const [zipCode, setZipCode] = useState(initialZip);
  const [description, setDescription] = useState('');

  return (
    <div>
      <EstimatorChatbotPanel
        projectType={projectType as any}
        zipCode={zipCode}
        description={description}
        onZipCodeChange={(z) => setZipCode(z)}
        onDescriptionChange={(d) => setDescription(d)}
      />
    </div>
  );
}
