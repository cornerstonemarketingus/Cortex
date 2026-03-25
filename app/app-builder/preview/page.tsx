import BuilderPreviewClient from '@/app/builder/preview/BuilderPreviewClient';

type BuilderBlueprint = 'website' | 'app' | 'business' | 'game';

type AppBuilderPreviewPageProps = {
  searchParams?: Promise<{
    prompt?: string;
    blueprint?: string;
  }>;
};

function normalizeBlueprint(value: string | undefined): BuilderBlueprint {
  if (value === 'website' || value === 'app' || value === 'business' || value === 'game') {
    return value;
  }
  return 'app';
}

export default async function AppBuilderPreviewPage({ searchParams }: AppBuilderPreviewPageProps) {
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
