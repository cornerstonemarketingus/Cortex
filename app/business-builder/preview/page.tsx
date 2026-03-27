import BuilderPreviewClient from '@/app/builder/preview/BuilderPreviewClient';

type BuilderBlueprint = 'website' | 'app' | 'business';

type BusinessBuilderPreviewPageProps = {
  searchParams?: Promise<{
    prompt?: string;
    blueprint?: string;
  }>;
};

function normalizeBlueprint(value: string | undefined): BuilderBlueprint {
  if (value === 'website' || value === 'app' || value === 'business') {
    return value;
  }
  return 'business';
}

export default async function BusinessBuilderPreviewPage({ searchParams }: BusinessBuilderPreviewPageProps) {
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
