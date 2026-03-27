import BuilderPreviewClient from '@/app/builder/preview/BuilderPreviewClient';

type BuilderBlueprint = 'website' | 'app' | 'business';

type WebsiteBuilderPreviewPageProps = {
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

export default async function WebsiteBuilderPreviewPage({ searchParams }: WebsiteBuilderPreviewPageProps) {
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
