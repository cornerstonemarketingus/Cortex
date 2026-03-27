import BuilderPreviewClient from './BuilderPreviewClient';

type BuilderBlueprint = 'website' | 'app' | 'business';

type BuilderPreviewPageProps = {
  searchParams?: Promise<{
    prompt?: string;
    blueprint?: string;
  }>;
};

function normalizeBlueprint(value: string | undefined): BuilderBlueprint {
  if (value === 'website' || value === 'app' || value === 'business') {
    return value;
  }
  return 'website';
}

export default async function BuilderPreviewPage({ searchParams }: BuilderPreviewPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialPrompt = typeof resolvedParams?.prompt === 'string' ? resolvedParams.prompt : '';
  const initialBlueprint = normalizeBlueprint(resolvedParams?.blueprint);

  return (
    <BuilderPreviewClient
      initialPrompt={initialPrompt}
      initialBlueprint={initialBlueprint}
    />
  );
}